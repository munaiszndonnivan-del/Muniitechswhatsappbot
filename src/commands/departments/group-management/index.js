
const DEPARTMENT = 'group-management';
const GROUP_ADMIN = ['groupAdmin'];

function requireGroup(ctx) {
  if (!ctx.isGroup) {
    throw new Error('This command only works inside WhatsApp groups.');
  }
}

function requireArgs(ctx, message) {
  if (!ctx.args?.length) throw new Error(message);
}

function getTargetNumbers(args = []) {
  return [...new Set(
    args
      .map(value => value.replace(/\D/g, ''))
      .filter(number => number.length >= 7 && number.length <= 15)
      .map(number => `${number}@s.whatsapp.net`)
  )];
}

async function getMetadata(ctx) {
  requireGroup(ctx);
  return ctx.socket.groupMetadata(ctx.chatId);
}

function makeCommand(name, description, execute, permissions = GROUP_ADMIN) {
  return { name, description, department: DEPARTMENT, permissions, execute };
}

export const commands = [

  // 1
  makeCommand('groupinfo', 'Show complete group information.', async ctx => {
    const group = await getMetadata(ctx);
    const admins = group.participants.filter(p => p.admin).length;

    return [
      `📋 *${group.subject}*`,
      `Members: ${group.participants.length}`,
      `Admins: ${admins}`,
      `Group ID: ${group.id}`,
      `Description: ${group.desc || 'Not set'}`
    ].join('\n');
  }, ['user']),

  // 2
  makeCommand('groupdescription', 'Display the group description.', async ctx => {
    const group = await getMetadata(ctx);
    return group.desc || 'This group has no description.';
  }, ['user']),

  // 3
  makeCommand('groupadmins', 'List group administrators.', async ctx => {
    const group = await getMetadata(ctx);
    const admins = group.participants.filter(p => p.admin);

    if (!admins.length) return 'No administrators found.';

    return `👑 *GROUP ADMINS*\n${admins.map((p, i) =>
      `${i + 1}. @${p.id.split('@')[0].split(':')[0]}`
    ).join('\n')}`;
  }, ['user']),

  // 4
  makeCommand('groupmembers', 'List group members.', async ctx => {
    const group = await getMetadata(ctx);

    return `👥 *GROUP MEMBERS*\n${group.participants.map((p, i) =>
      `${i + 1}. @${p.id.split('@')[0].split(':')[0]}`
    ).join('\n')}`;
  }, ['user']),

  // 5
  makeCommand('groupcount', 'Count members and administrators.', async ctx => {
    const group = await getMetadata(ctx);
    const admins = group.participants.filter(p => p.admin).length;

    return `Members: ${group.participants.length}\nAdmins: ${admins}\nOther members: ${group.participants.length - admins}`;
  }, ['user']),

  // 6
  makeCommand('groupowner', 'Display the group creator when available.', async ctx => {
    const group = await getMetadata(ctx);
    if (!group.owner) return 'Group creator information is unavailable.';

    return `Group creator: @${group.owner.split('@')[0].split(':')[0]}`;
  }, ['user']),

  // 7
  makeCommand('grouplink', 'Get the group invitation link.', async ctx => {
    const code = await ctx.socket.groupInviteCode(ctx.chatId);
    return `🔗 https://chat.whatsapp.com/${code}`;
  }),

  // 8
  makeCommand('revokelink', 'Revoke the existing invitation link.', async ctx => {
    const code = await ctx.socket.groupRevokeInvite(ctx.chatId);
    return `Old invitation link revoked.\nNew link: https://chat.whatsapp.com/${code}`;
  }),

  // 9
  makeCommand('setgroupname', 'Change the group name.', async ctx => {
    requireArgs(ctx, 'Usage: .setgroupname New Group Name');

    const name = ctx.text.trim();
    if (name.length > 100) throw new Error('Group name is too long.');

    await ctx.socket.groupUpdateSubject(ctx.chatId, name);
    return '✅ Group name updated.';
  }),

  // 10
  makeCommand('setgroupdescription', 'Change the group description.', async ctx => {
    requireArgs(ctx, 'Usage: .setgroupdescription New description');

    if (ctx.text.length > 2048) {
      throw new Error('Description is too long.');
    }

    await ctx.socket.groupUpdateDescription(ctx.chatId, ctx.text.trim());
    return '✅ Group description updated.';
  }),

  // 11
  makeCommand('addmember', 'Add members using international phone numbers.', async ctx => {
    requireArgs(ctx, 'Usage: .addmember 2547XXXXXXXX');

    const targets = getTargetNumbers(ctx.args);
    if (!targets.length) throw new Error('Provide valid international phone numbers.');

    const result = await ctx.socket.groupParticipantsUpdate(
      ctx.chatId, targets, 'add'
    );

    return `Add-member request result:\n${JSON.stringify(result)}`;
  }),

  // 12
  makeCommand('removemember', 'Remove members using international phone numbers.', async ctx => {
    requireArgs(ctx, 'Usage: .removemember 2547XXXXXXXX');

    const targets = getTargetNumbers(ctx.args);
    if (!targets.length) throw new Error('Provide valid international phone numbers.');

    const result = await ctx.socket.groupParticipantsUpdate(
      ctx.chatId, targets, 'remove'
    );

    return `Removal request result:\n${JSON.stringify(result)}`;
  }),

  // 13
  makeCommand('promote', 'Promote members to group administrator.', async ctx => {
    requireArgs(ctx, 'Usage: .promote 2547XXXXXXXX');

    const targets = getTargetNumbers(ctx.args);
    if (!targets.length) throw new Error('Provide valid international phone numbers.');

    const result = await ctx.socket.groupParticipantsUpdate(
      ctx.chatId, targets, 'promote'
    );

    return `Promotion request result:\n${JSON.stringify(result)}`;
  }),

  // 14
  makeCommand('demote', 'Remove administrator privileges from members.', async ctx => {
    requireArgs(ctx, 'Usage: .demote 2547XXXXXXXX');

    const targets = getTargetNumbers(ctx.args);
    if (!targets.length) throw new Error('Provide valid international phone numbers.');

    const result = await ctx.socket.groupParticipantsUpdate(
      ctx.chatId, targets, 'demote'
    );

    return `Demotion request result:\n${JSON.stringify(result)}`;
  }),

  // 15
  makeCommand('mute', 'Restrict group messaging to administrators.', async ctx => {
    await ctx.socket.groupSettingUpdate(ctx.chatId, 'announcement');
    return '🔒 Only group admins can send messages.';
  }),

  // 16
  makeCommand('unmute', 'Allow all members to send group messages.', async ctx => {
    await ctx.socket.groupSettingUpdate(ctx.chatId, 'not_announcement');
    return '🔓 All members can send messages.';
  }),

  // 17
  makeCommand('lockgroup', 'Restrict group information changes to admins.', async ctx => {
    await ctx.socket.groupSettingUpdate(ctx.chatId, 'locked');
    return '🔒 Group settings locked.';
  }),

  // 18
  makeCommand('unlockgroup', 'Allow members to change group information.', async ctx => {
    await ctx.socket.groupSettingUpdate(ctx.chatId, 'unlocked');
    return '🔓 Group settings unlocked.';
  }),

  // 19
  makeCommand('tagall', 'Mention all group members with a message.', async ctx => {
    const group = await getMetadata(ctx);
    const mentions = group.participants.map(p => p.id);

    await ctx.socket.sendMessage(ctx.chatId, {
      text: `📢 *ATTENTION EVERYONE*\n\n${ctx.text.trim() || 'Attention everyone!'}`,
      mentions
    });

    return null;
  }),

  // 20
  makeCommand('hidetag', 'Mention members without displaying a tag list.', async ctx => {
    const group = await getMetadata(ctx);
    const mentions = group.participants.map(p => p.id);

    await ctx.socket.sendMessage(ctx.chatId, {
      text: ctx.text.trim() || '📢 Attention everyone!',
      mentions
    });

    return null;
  }),

  // 21
  makeCommand('poll', 'Create a group poll with multiple options.', async ctx => {
    const parts = ctx.text.split('|').map(p => p.trim()).filter(Boolean);

    if (parts.length < 3) {
      throw new Error('Usage: .poll Question | Option 1 | Option 2');
    }

    const [name, ...values] = parts;

    if (values.length > 12) {
      throw new Error('A poll can have at most 12 options.');
    }

    await ctx.socket.sendMessage(ctx.chatId, {
      poll: { name, values, selectableCount: 1 }
    });

    return null;
  }),

  // 22
  makeCommand('leavegroup', 'Make the bot leave the current group.', async ctx => {
    requireGroup(ctx);
    await ctx.socket.groupLeave(ctx.chatId);
    return null;
  }, ['owner']),

  // 23
  makeCommand('groupdetails', 'Show group name, ID, member count and creation date.', async ctx => {
    const group = await getMetadata(ctx);

    return [
      `Name: ${group.subject}`,
      `ID: ${group.id}`,
      `Participants: ${group.participants.length}`,
      `Created: ${group.creation ? new Date(group.creation * 1000).toLocaleString() : 'Unavailable'}`
    ].join('\n');
  }, ['user']),

  // 24
  makeCommand('groupcreated', 'Show when the group was created.', async ctx => {
    const group = await getMetadata(ctx);

    if (!group.creation) return 'Group creation date is unavailable.';

    return `Group created: ${new Date(group.creation * 1000).toLocaleString()}`;
  }, ['user']),

  // 25
  makeCommand('groupjid', 'Display the unique WhatsApp group ID.', async ctx => {
    const group = await getMetadata(ctx);
    return `Group ID: ${group.id}`;
  }, ['user'])
];
                                                         
