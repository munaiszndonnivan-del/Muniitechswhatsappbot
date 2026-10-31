import { isGroupAdmin, isOwner } from '../../../core/permissions.js';

const DEPARTMENT = 'security-anti-abuse';
const GROUP_ADMIN = ['groupAdmin'];
const USER = ['user'];

function makeCommand(name, description, execute, permissions = USER) {
  return { name, description, department: DEPARTMENT, permissions, execute };
}

function requireGroup(ctx) {
  if (!ctx.chatId?.endsWith('@g.us')) {
    throw new Error('This command only works inside WhatsApp groups.');
  }
}

function getMessageContent(message) {
  let content = message?.message;

  for (let i = 0; i < 3; i++) {
    if (content?.ephemeralMessage?.message) {
      content = content.ephemeralMessage.message;
    } else if (content?.viewOnceMessage?.message) {
      content = content.viewOnceMessage.message;
    } else if (content?.viewOnceMessageV2?.message) {
      content = content.viewOnceMessageV2.message;
    } else {
      break;
    }
  }

  return content ?? {};
}

function getMessageText(message) {
  const content = getMessageContent(message);

  return (
    content.conversation ??
    content.extendedTextMessage?.text ??
    content.imageMessage?.caption ??
    content.videoMessage?.caption ??
    content.documentMessage?.caption ??
    content.documentWithCaptionMessage?.message?.documentMessage?.caption ??
    ''
  );
}

function getQuotedMessage(ctx) {
  const content = getMessageContent(ctx.message);
  const contextInfo =
    content.extendedTextMessage?.contextInfo ??
    content.imageMessage?.contextInfo ??
    content.videoMessage?.contextInfo ??
    content.documentMessage?.contextInfo;

  if (!contextInfo?.stanzaId) return null;

  return {
    id: contextInfo.stanzaId,
    participant: contextInfo.participant ?? null,
    remoteJid: ctx.chatId,
    text: getMessageText({
      message: contextInfo.quotedMessage
    }),
    message: contextInfo.quotedMessage ?? {},
    timestamp: contextInfo.quotedMessage?.messageTimestamp ?? null
  };
}

function getInputText(ctx) {
  const supplied = (ctx.args ?? []).join(' ').trim();
  if (supplied) return supplied;

  return getQuotedMessage(ctx)?.text ?? '';
}

function requireText(ctx, usage) {
  const value = getInputText(ctx);

  if (!value) {
    throw new Error(usage);
  }

  return value;
}

function getUrls(text) {
  return text.match(/\b(?:https?:\/\/|www\.)[^\s<>"']+/gi) ?? [];
}

function inspectUrl(rawUrl) {
  const cleaned = rawUrl.replace(/[),.!?;]+$/g, '');
  const candidate = /^https?:\/\//i.test(cleaned)
    ? cleaned
    : `https://${cleaned}`;

  let parsed;

  try {
    parsed = new URL(candidate);
  } catch {
    return {
      url: cleaned,
      valid: false,
      warnings: ['The URL could not be parsed.']
    };
  }

  const warnings = [];
  const hostname = parsed.hostname.toLowerCase();

  if (parsed.protocol !== 'https:') {
    warnings.push('The link does not use HTTPS.');
  }

  if (parsed.username || parsed.password) {
    warnings.push('The URL contains embedded login information.');
  }

  if (hostname.startsWith('xn--') || hostname.includes('.xn--')) {
    warnings.push('The domain uses internationalized/punycode characters.');
  }

  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) {
    warnings.push('The link uses an IP address instead of a normal domain.');
  }

  if (
    /(^|\.)bit\.ly$|(^|\.)tinyurl\.com$|(^|\.)t\.co$|(^|\.)is\.gd$|(^|\.)cutt\.ly$|(^|\.)rb\.gy$/i.test(hostname)
  ) {
    warnings.push('This is a shortened link, so its final destination is hidden.');
  }

  if (
    /login|verify|secure|account|password|wallet|airdrop|claim|bonus|prize|freegift/i.test(
      parsed.pathname + parsed.search
    )
  ) {
    warnings.push('The URL contains words commonly used in deceptive messages.');
  }

  return {
    url: cleaned,
    valid: true,
    hostname,
    protocol: parsed.protocol,
    warnings
  };
}

function scanText(text) {
  const warnings = [];
  const urls = getUrls(text);

  if (urls.length > 3) {
    warnings.push('The message contains an unusually high number of links.');
  }

  if (/(verify your account|confirm your password|send your otp|share your pin)/i.test(text)) {
    warnings.push('The message asks for sensitive account information.');
  }

  if (/(you have won|claim your prize|free money|urgent payment|account suspended)/i.test(text)) {
    warnings.push('The message uses common prize, payment or account-pressure language.');
  }

  if (/(send money now|pay to unlock|pay a small fee to receive)/i.test(text)) {
    warnings.push('The message contains a suspicious payment request.');
  }

  if (/(whatsapp support|customer care|security team).{0,50}(password|otp|pin)/i.test(text)) {
    warnings.push('The message may be impersonating a support or security team.');
  }

  return { warnings, urls };
}

function getParticipantNumber(jid = '') {
  return String(jid).split('@')[0].split(':')[0];
}

function formatWarnings(warnings) {
  if (!warnings.length) {
    return 'No obvious warning indicators were detected by these basic checks. This does not prove the content is safe.';
  }

  return warnings.map((warning, index) => `${index + 1}. ⚠️ ${warning}`).join('\n');
}

async function getGroupMetadata(ctx) {
  requireGroup(ctx);
  return ctx.socket.groupMetadata(ctx.chatId);
}

export const commands = [
  makeCommand('scanlink', 'Check links in a message for common warning indicators.', async ctx => {
    const text = requireText(ctx, 'Usage: .scanlink URL or reply to a message containing a link');
    const urls = getUrls(text);

    if (!urls.length) {
      throw new Error('No recognizable web links were found.');
    }

    return urls.slice(0, 10).map((url, index) => {
      const result = inspectUrl(url);

      return [
        `*Link ${index + 1}:* ${result.url}`,
        result.valid ? `Domain: ${result.hostname}` : 'Invalid or unreadable URL',
        formatWarnings(result.warnings)
      ].join('\n');
    }).join('\n\n');
  }),

  makeCommand('checkurl', 'Inspect one URL and display its basic structure.', async ctx => {
    const text = requireText(ctx, 'Usage: .checkurl https://example.com');
    const result = inspectUrl(text.split(/\s+/)[0]);

    if (!result.valid) {
      return `URL could not be inspected.\n${formatWarnings(result.warnings)}`;
    }

    return [
      `URL: ${result.url}`,
      `Domain: ${result.hostname}`,
      `Protocol: ${result.protocol}`,
      `Warnings:\n${formatWarnings(result.warnings)}`
    ].join('\n');
  }),

  makeCommand('checkdomain', 'Extract and inspect the domain in a URL.', async ctx => {
    const text = requireText(ctx, 'Usage: .checkdomain https://example.com');
    const result = inspectUrl(text.split(/\s+/)[0]);

    if (!result.valid) throw new Error('That does not appear to be a valid URL.');

    return [
      `Domain: ${result.hostname}`,
      `Protocol: ${result.protocol}`,
      `Note: This checks URL structure only. It does not verify domain ownership or reputation.`
    ].join('\n');
  }),

  makeCommand('checkinvite', 'Inspect a WhatsApp group invitation link.', async ctx => {
    const text = requireText(ctx, 'Usage: .checkinvite WhatsApp invitation link');
    const match = text.match(/https?:\/\/chat\.whatsapp\.com\/([A-Za-z0-9_-]+)/i);

    if (!match) {
      return 'No recognizable WhatsApp group invitation link was found.';
    }

    return [
      'WhatsApp invitation link detected.',
      `Invite code length: ${match[1].length} characters`,
      'Do not join unfamiliar groups or share personal information with unknown members.',
      'This check does not verify the group owner or the group’s safety.'
    ].join('\n');
  }),

  makeCommand('phishingcheck', 'Look for common phishing indicators in text or a quoted message.', async ctx => {
    const text = requireText(ctx, 'Usage: .phishingcheck message text or reply to a message');
    const result = scanText(text);
    const warnings = [...result.warnings];

    for (const url of result.urls.slice(0, 5)) {
      warnings.push(...inspectUrl(url).warnings);
    }

    return `*PHISHING INDICATOR CHECK*\n${formatWarnings([...new Set(warnings)])}`;
  }),

  makeCommand('spamcheck', 'Check text for common spam patterns.', async ctx => {
    const text = requireText(ctx, 'Usage: .spamcheck message text or reply to a message');
    const warnings = [];
    const words = text.toLowerCase().match(/\b[\w']+\b/g) ?? [];
    const uniqueWords = new Set(words);

    if (words.length >= 10 && uniqueWords.size / words.length < 0.4) {
      warnings.push('The message repeats a small set of words unusually often.');
    }

    if ((text.match(/https?:\/\//gi) ?? []).length >= 3) {
      warnings.push('The message contains three or more web links.');
    }

    if (/(forwarded many times|share this with everyone|send to all your contacts)/i.test(text)) {
      warnings.push('The message encourages mass forwarding.');
    }

    if (/(limited offer|act now|hurry up|last chance)/i.test(text)) {
      warnings.push('The message uses urgency-based promotional language.');
    }

    return `*SPAM INDICATOR CHECK*\n${formatWarnings(warnings)}`;
  }),

  makeCommand('capscheck', 'Measure excessive uppercase text.', async ctx => {
    const text = requireText(ctx, 'Usage: .capscheck message text or reply to a message');
    const letters = text.match(/[a-z]/gi) ?? [];
    const uppercase = text.match(/[A-Z]/g) ?? [];
    const percentage = letters.length
      ? Math.round((uppercase.length / letters.length) * 100)
      : 0;

    return [
      `Letters: ${letters.length}`,
      `Uppercase letters: ${uppercase.length}`,
      `Uppercase percentage: ${percentage}%`,
      percentage >= 70 && letters.length >= 10
        ? '⚠️ This message uses unusually high uppercase text.'
        : 'No unusually high uppercase usage detected.'
    ].join('\n');
  }),

  makeCommand('scanmentions', 'Inspect the number of people mentioned in a message.', async ctx => {
    const content = getMessageContent(ctx.message);
    const contextInfo = content.extendedTextMessage?.contextInfo ??
      content.imageMessage?.contextInfo ??
      content.videoMessage?.contextInfo;

    const mentions = contextInfo?.mentionedJid ?? [];

    return [
      `Mentions detected: ${mentions.length}`,
      mentions.length > 10
        ? '⚠️ This message mentions many people and may be disruptive.'
        : 'The mention count is not unusually high.',
      mentions.length
        ? mentions.map((jid, index) => `${index + 1}. @${getParticipantNumber(jid)}`).join('\n')
        : 'No mentions were detected.'
    ].join('\n');
  }),

  makeCommand('scanforward', 'Check whether a quoted message was forwarded.', async ctx => {
    const quoted = getQuotedMessage(ctx);

    if (!quoted) {
      throw new Error('Reply to a message first, then use .scanforward');
    }

    const content = quoted.message;
    const contextInfo =
      content.extendedTextMessage?.contextInfo ??
      content.imageMessage?.contextInfo ??
      content.videoMessage?.contextInfo;

    const forwarded = Boolean(
      contextInfo?.isForwarded ||
      Number(contextInfo?.forwardingScore) > 0
    );

    return forwarded
      ? '⚠️ The quoted message contains forwarding indicators. Its original source has not been verified.'
      : 'No forwarding indicator was found in the quoted message.';
  }),

  makeCommand('scanmedia', 'Inspect the type and basic properties of quoted media.', async ctx => {
    const quoted = getQuotedMessage(ctx);

    if (!quoted) {
      throw new Error('Reply to an image, video, audio, document or sticker, then use .scanmedia');
    }

    const content = getMessageContent({ message: quoted.message });
    const mediaTypes = [
      ['imageMessage', 'Image'],
      ['videoMessage', 'Video'],
      ['audioMessage', 'Audio'],
      ['documentMessage', 'Document'],
      ['stickerMessage', 'Sticker']
    ];

    const detected = mediaTypes.find(([key]) => content[key]);

    if (!detected) {
      return 'The quoted message does not contain a supported media type.';
    }

    const media = content[detected[0]];

    return [
      `Media type: ${detected[1]}`,
      media.mimetype ? `MIME type: ${media.mimetype}` : null,
      media.fileLength ? `File size: ${media.fileLength} bytes` : null,
      media.fileName ? `File name: ${media.fileName}` : null,
      'This check does not scan the actual file contents for malware.'
    ].filter(Boolean).join('\n');
  }),

  makeCommand('scanmessage', 'Run basic text and link checks on a message.', async ctx => {
    const text = requireText(ctx, 'Usage: .scanmessage message text or reply to a message');
    const result = scanText(text);
    const warnings = [...result.warnings];

    for (const url of result.urls.slice(0, 5)) {
      warnings.push(...inspectUrl(url).warnings);
    }

    return [
      '*MESSAGE SECURITY CHECK*',
      `Characters: ${text.length}`,
      `Links found: ${result.urls.length}`,
      `Warnings:\n${formatWarnings([...new Set(warnings)])}`
    ].join('\n');
  }),

  makeCommand('checkphone', 'Check the format of an international phone number.', async ctx => {
    const value = requireText(ctx, 'Usage: .checkphone 254712345678');
    const digits = value.replace(/[+\s()-]/g, '');

    if (!/^\d{8,15}$/.test(digits)) {
      return 'Invalid format. Use 8–15 digits in international format, without extensions.';
    }

    return [
      `Number format: Valid-looking international format`,
      `Digits: ${digits.length}`,
      `Normalized number: +${digits}`,
      'This does not confirm that the number is active, belongs to a person, or is trustworthy.'
    ].join('\n');
  }),

  makeCommand('checkjid', 'Identify the type of a WhatsApp JID.', async ctx => {
    const jid = requireText(ctx, 'Usage: .checkjid number@s.whatsapp.net');
    const value = jid.trim().toLowerCase();

    if (value.endsWith('@g.us')) {
      return 'JID type: WhatsApp group';
    }

    if (value.endsWith('@s.whatsapp.net')) {
      return 'JID type: WhatsApp individual account';
    }

    if (value.endsWith('@lid')) {
      return 'JID type: WhatsApp LID identifier. It is not necessarily a phone number.';
    }

    return 'Unrecognized or unsupported JID format.';
  }),

  makeCommand('senderinfo', 'Display basic information about the command sender.', async ctx => {
    const sender = ctx.sender ?? 'Unavailable';

    return [
      `Sender identifier: ${sender}`,
      `Chat type: ${ctx.chatId?.endsWith('@g.us') ? 'Group' : 'Individual chat'}`,
      `Configured bot owner: ${isOwner(sender) ? 'Yes' : 'No'}`
    ].join('\n');
  }),

  makeCommand('groupaudit', 'Review basic group security settings and membership.', async ctx => {
    const group = await getGroupMetadata(ctx);
    const admins = group.participants.filter(p => p.admin);
    const warnings = [];

    if (!admins.length) warnings.push('No group administrators were identified.');
    if (admins.length === 1) warnings.push('Only one administrator was identified. Consider having a trusted backup admin.');
    if (group.participants.length > 200) warnings.push('Large groups may require additional moderation.');

    return [
      `Group: ${group.subject}`,
      `Members: ${group.participants.length}`,
      `Administrators: ${admins.length}`,
      `Invite code: Not retrieved`,
      `Audit notes:\n${formatWarnings(warnings)}`
    ].join('\n');
  }),

  makeCommand('adminaudit', 'List group administrators and check their count.', async ctx => {
    const group = await getGroupMetadata(ctx);
    const admins = group.participants.filter(p => p.admin);

    return [
      `Administrators found: ${admins.length}`,
      admins.length
        ? admins.map((p, index) => `${index + 1}. @${getParticipantNumber(p.id)}`).join('\n')
        : 'No administrators were identified.'
    ].join('\n');
  }),

  makeCommand('membercheck', 'Check whether a phone number is currently in the group.', async ctx => {
    requireGroup(ctx);

    const value = requireText(ctx, 'Usage: .membercheck 254712345678');
    const digits = value.replace(/\D/g, '');

    if (!/^\d{7,15}$/.test(digits)) {
      throw new Error('Provide a phone number containing 7–15 digits.');
    }

    const group = await ctx.socket.groupMetadata(ctx.chatId);
    const member = group.participants.find(
      p => getParticipantNumber(p.id) === digits
    );

    return member
      ? `This number matches a group participant.\nRole: ${member.admin ? 'Administrator' : 'Member'}`
      : 'No matching participant was found. WhatsApp privacy identifiers may prevent some number matches.';
  }),

  makeCommand('quotedinfo', 'Display basic information about a replied-to message.', async ctx => {
    const quoted = getQuotedMessage(ctx);

    if (!quoted) {
      throw new Error('Reply to a message first, then use .quotedinfo');
    }

    const content = getMessageContent({ message: quoted.message });

    return [
      `Message ID: ${quoted.id}`,
      `Sender: ${quoted.participant ?? 'Not provided'}`,
      `Text characters: ${quoted.text.length}`,
      `Message type: ${Object.keys(content).find(key => key.endsWith('Message')) ?? 'Text or unknown'}`
    ].join('\n');
  }),

  makeCommand('messageage', 'Show the age of a quoted message when its timestamp is available.', async ctx => {
    const quoted = getQuotedMessage(ctx);

    if (!quoted) {
      throw new Error('Reply to a message first, then use .messageage');
    }

    const timestamp = Number(quoted.timestamp);

    if (!Number.isFinite(timestamp) || timestamp <= 0) {
      return 'The quoted message timestamp is unavailable.';
    }

    const ageSeconds = Math.max(0, Math.floor(Date.now() / 1000 - timestamp));
    const hours = Math.floor(ageSeconds / 3600);
    const minutes = Math.floor((ageSeconds % 3600) / 60);

    return `Approximate message age: ${hours} hours and ${minutes} minutes.`;
  }),

  makeCommand('linkaudit', 'Summarize all links in text and flag common URL risks.', async ctx => {
    const text = requireText(ctx, 'Usage: .linkaudit message text or reply to a message');
    const urls = getUrls(text);

    if (!urls.length) return 'No web links were found.';

    return urls.slice(0, 10).map((url, index) => {
      const result = inspectUrl(url);

      return [
        `${index + 1}. ${result.url}`,
        result.valid ? `Host: ${result.hostname}` : 'Host: Unable to parse',
        result.warnings.length
          ? `Warnings: ${result.warnings.join('; ')}`
          : 'No basic URL warning indicators found.'
      ].join('\n');
    }).join('\n\n');
  }),

  makeCommand('deletequoted', 'Delete a quoted group message when the bot has permission.', async ctx => {
    requireGroup(ctx);

    const quoted = getQuotedMessage(ctx);

    if (!quoted) {
      throw new Error('Reply to the message you want deleted, then use .deletequoted');
    }

    await ctx.socket.sendMessage(ctx.chatId, {
      delete: {
        remoteJid: ctx.chatId,
        fromMe: false,
        id: quoted.id,
        participant: quoted.participant ?? undefined
      }
    });

    return 'Deletion request sent to WhatsApp.';
  }, GROUP_ADMIN),

  makeCommand('report', 'Send a message report to the group administrators.', async ctx => {
    requireGroup(ctx);

    const quoted = getQuotedMessage(ctx);
    const details = (ctx.args ?? []).join(' ').trim();

    if (!quoted && !details) {
      throw new Error('Reply to a message or provide report details. Example: .report suspicious link');
    }

    const group = await ctx.socket.groupMetadata(ctx.chatId);
    const admins = group.participants.filter(p => p.admin);
    const mentions = admins.map(p => p.id);

    if (!admins.length) {
      throw new Error('No group administrators were found to receive this report.');
    }

    const reportText = [
      '🚨 *GROUP SECURITY REPORT*',
      `Reported by: @${getParticipantNumber(ctx.sender)}`,
      details ? `Details: ${details}` : null,
      quoted ? `Quoted message ID: ${quoted.id}` : null,
      'Please review this report.'
    ].filter(Boolean).join('\n');

    await ctx.socket.sendMessage(ctx.chatId, {
      text: reportText,
      mentions: [ctx.sender, ...mentions]
    });

    return null;
  }),

  makeCommand('checkpermissions', 'Check whether you are the configured owner or a group administrator.', async ctx => {
    const owner = isOwner(ctx.sender);
    const groupAdmin = ctx.chatId?.endsWith('@g.us')
      ? await isGroupAdmin(ctx.socket, ctx.chatId, ctx.sender)
      : false;

    return [
      `Bot owner: ${owner ? 'Yes' : 'No'}`,
      `Group administrator: ${groupAdmin ? 'Yes' : 'No'}`,
      `Chat type: ${ctx.chatId?.endsWith('@g.us') ? 'Group' : 'Private'}`
    ].join('\n');
  }),

  makeCommand('checkbotadmin', 'Check whether the bot account is a group administrator.', async ctx => {
    const group = await getGroupMetadata(ctx);
    const botJid = ctx.socket.user?.id;

    if (!botJid) {
      return 'The bot account identifier is unavailable.';
    }

    const normalizedBot = getParticipantNumber(botJid);
    const bot = group.participants.find(
      p => getParticipantNumber(p.id) === normalizedBot
    );

    if (!bot) {
      return 'The bot account was not found in the group participant list.';
    }

    return bot.admin
      ? '✅ The bot is a group administrator.'
      : '⚠️ The bot is a group member, not an administrator.';
  }),

  makeCommand('securityhelp', 'List the available Security & Anti-Abuse commands.', async () => {
    return [
      '*SECURITY & ANTI-ABUSE COMMANDS*',
      '.scanlink',
      '.checkurl',
      '.checkdomain',
      '.checkinvite',
      '.phishingcheck',
      '.spamcheck',
      '.capscheck',
      '.scanmentions',
      '.scanforward',
      '.scanmedia',
      '.scanmessage',
      '.checkphone',
      '.checkjid',
      '.senderinfo',
      '.groupaudit',
      '.adminaudit',
      '.membercheck',
      '.quotedinfo',
      '.messageage',
      '.linkaudit',
      '.deletequoted',
      '.report',
      '.checkpermissions',
      '.checkbotadmin',
      '.securityhelp',
      '',
      'Some checks are heuristic and cannot guarantee that content is safe.'
    ].join('\n');
  })
];
