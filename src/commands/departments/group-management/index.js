
const DEPARTMENT = 'group-management';
const GROUP_ADMIN = ['groupAdmin'];

function requireGroup(context) {
  if (!context.isGroup) {
    throw new Error('This command can only be used in a WhatsApp group.');
  }
}

function requireArgs(context, message) {
  if (!context.args?.length) {
    throw new Error(message);
  }
}

function getTargetNumbers(args = []) {
  return args
    .map((value) => value.replace(/\D/g, ''))
    .filter((number) => number.length >= 7 && number.length <= 15)
    .map((number) => `${number}@s.whatsapp.net`);
}

async function getMetadata(context) {
  requireGroup(context);
  return context.socket.groupMetadata(context.chatId);
}

function makeCommand(name, description, execute, permissions = GROUP_ADMIN) {
  return {
    name,
    description,
    department: DEPARTMENT,
    permissions,
    execute
  };
}

export const commands = [
  makeCommand('groupinfo', 'Show group information.', async (ctx) => {
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

  makeCommand('groupname', 'Display the current group name.', async (ctx) => {
    const group = await getMetadata(ctx);
    return `Group name: ${group.subject}`;
  }, ['user']),

  makeCommand('groupdescription', 'Display the group description.', async (ctx) => {
    const group = await getMetadata(ctx);
    return group.desc || 'This group has no description.';
  }, ['user']),

  makeCommand('groupadmins', 'List group administrators.', async (ctx) => {
    const group = await getMetadata(ctx);
    const admins = group.participants.filter(p => p.admin);

    if (!admins.length) return 'No administrators were found.';

    return `👑 *GROUP ADMINS*\n${admins.map((p, i) =>
      `${i + 1}. @${p.id.split('@')[0].split(':')[0]}`
    ).join('\n')}`;
  }),

  makeCommand('groupmembers', 'List group members.', async (ctx) => {
    const group = await getMetadata(ctx);

    return `👥 *GROUP MEMBERS*\n${group.participants.map((p, i) =>
      `${i + 1}. @${p.id.split('@')[0].split(':')[0]}`
    ).join('\n')}`;
  }),

  makeCommand('groupcount', 'Count group members and admins.', async (ctx) => {
    const group = await getMetadata(ctx);
    const admins = group.participants.filter(p => p.admin).length;

    return `Members: ${group.participants.length}\nAdmins: ${admins}\nOther members: ${group.participants.length - admins}`;
  }, ['user']),

  makeCommand('groupowner', 'Display the group creator when available.', async (ctx) => {
    const group = await getMetadata(ctx);

    if (!group.owner) return 'WhatsApp did not provide the group creator information.';

    return `Group creator: @${group.owner.split('@')[0].split(':')[0]}`;
  }, ['user']),

  makeCommand('grouplink', 'Get the group invitation link.', async (ctx) => {
    const code = await ctx.socket.groupInviteCode(ctx.chatId);
    return `🔗 https://chat.whatsapp.com/${code}`;
  }),

  makeCommand('revokelink', 'Revoke the current group invitation link.', async (ctx) => {
    const code = await ctx.socket.groupRevokeInvite(ctx.chatId);
    return `The old invitation link has been revoked.\nNew link: https://chat.whatsapp.com/${code}`;
  }),

  makeCommand('setgroupname', 'Change the group name.', async (ctx) => {
    requireArgs(ctx, 'Usage: .setgroupname New Group Name');

    const name = ctx.text.trim();

    if (name.length > 100) throw new Error('Group name is too long.');

    await ctx.socket.groupUpdateSubject(ctx.chatId, name);
    return '✅ Group name updated.';
  }),

  makeCommand('setgroupdescription', 'Change the group description.', async (ctx) => {
    requireArgs(ctx, 'Usage: .setgroupdescription New description');

    if (ctx.text.length > 2048) {
      throw new Error('Group description is too long.');
    }

    await ctx.socket.groupUpdateDescription(ctx.chatId, ctx.text.trim());
    return '✅ Group description updated.';
  }),

  makeCommand('addmember', 'Add members using international phone numbers.', async (ctx) => {
    requireArgs(ctx, 'Usage: .addmember 2547XXXXXXXX');

    const targets = getTargetNumbers(ctx.args);
    if (!targets.length) throw new Error('Provide valid international phone numbers.');

    const result = await ctx.socket.groupParticipantsUpdate(
      ctx.chatId,
      targets,
      'add'
    );

    return `Add-member request completed.\n${JSON.stringify(result)}`;
  }),

  makeCommand('removemember', 'Remove members using international phone numbers.', async (ctx) => {
    requireArgs(ctx, 'Usage: .removemember 2547XXXXXXXX');

    const targets = getTargetNumbers(ctx.args);
    if (!targets.length) throw new Error('Provide valid international phone numbers.');

    const result = await ctx.socket.groupParticipantsUpdate(
      ctx.chatId,
      targets,
      'remove'
    );

    return `Removal request completed.\n${JSON.stringify(result)}`;
  }),

  makeCommand('promote', 'Promote members to group administrator.', async (ctx) => {
    requireArgs(ctx, 'Usage: .promote 2547XXXXXXXX');

    const targets = getTargetNumbers(ctx.args);
    if (!targets.length) throw new Error('Provide valid international phone numbers.');

    const result = await ctx.socket.groupParticipantsUpdate(
      ctx.chatId,
      targets,
      'promote'
    );

    return `Promotion request completed.\n${JSON.stringify(result)}`;
  }),

  makeCommand('demote', 'Remove administrator privileges from members.', async (ctx) => {
    requireArgs(ctx, 'Usage: .demote 2547XXXXXXXX');

    const targets = getTargetNumbers(ctx.args);
    if (!targets.length) throw new Error('Provide valid international phone numbers.');

    const result = await ctx.socket.groupParticipantsUpdate(
      ctx.chatId,
      targets,
      'demote'
    );

    return `Demotion request completed.\n${JSON.stringify(result)}`;
  }),

  makeCommand('mute', 'Restrict the group so only admins can send messages.', async (ctx) => {
    await ctx.socket.groupSettingUpdate(ctx.chatId, 'announcement');
    return '🔒 Only group admins can now send messages.';
  }),

  makeCommand('unmute', 'Allow all group members to send messages.', async (ctx) => {
    await ctx.socket.groupSettingUpdate(ctx.chatId, 'not_announcement');
    return '🔓 All group members can now send messages.';
  }),

  makeCommand('lockgroup', 'Restrict group information changes to admins.', async (ctx) => {
    await ctx.socket.groupSettingUpdate(ctx.chatId, 'locked');
    return '🔒 Group settings are now restricted to admins.';
  }),

  makeCommand('unlockgroup', 'Allow members to change group information.', async (ctx) => {
    await ctx.socket.groupSettingUpdate(ctx.chatId, 'unlocked');
    return '🔓 Group settings are now open to members.';
  }),

  makeCommand('tagall', 'Mention all group members with a message.', async (ctx) => {
    const group = await getMetadata(ctx);
    const mentions = group.participants.map(p => p.id);

    const message = ctx.text.trim() || 'Attention everyone!';

    await ctx.socket.sendMessage(ctx.chatId, {
      text: `📢 *ATTENTION EVERYONE*\n\n${message}`,
      mentions
    });

    return null;
  }),

  makeCommand('hidetag', 'Mention all members without displaying a visible tag list.', async (ctx) => {
    const group = await getMetadata(ctx);
    const mentions = group.participants.map(p => p.id);

    await ctx.socket.sendMessage(ctx.chatId, {
      text: ctx.text.trim() || '📢 Attention everyone!',
      mentions
    });

    return null;
  }),

  makeCommand('poll', 'Create a group poll with multiple options.', async (ctx) => {
    const parts = ctx.text.split('|').map(p => p.trim()).filter(Boolean);

    if (parts.length < 3) {
      throw new Error('Usage: .poll Question | Option 1 | Option 2');
    }

    const [name, ...values] = parts;

    if (values.length > 12) {
      throw new Error('A poll can have at most 12 options.');
    }

    await ctx.socket.sendMessage(ctx.chatId, {
      poll: {
        name,
        values,
        selectableCount: 1
      }
    });

    return null;
  }),

  makeCommand('leavegroup', 'Make the bot leave the current group.', async (ctx) => {
    requireGroup(ctx);
    await ctx.socket.groupLeave(ctx.chatId);
    return null;
  }, ['owner']),

  makeCommand('announceonly', 'Enable announcement mode for the group.', async (ctx) => {
    await ctx.socket.groupSettingUpdate(ctx.chatId, 'announcement');
    return 'Announcement mode enabled.';
  }),

  makeCommand('chatopen', 'Allow all members to send group messages.', async (ctx) => {
    await ctx.socket.groupSettingUpdate(ctx.chatId, 'not_announcement');
    return 'Group messaging is open to all members.';
  }),

  makeCommand('groupdetails', 'Show the group subject, ID and participant count.', async (ctx) => {
    const group = await getMetadata(ctx);

    return [
      `Name: ${group.subject}`,
      `ID: ${group.id}`,
      `Participants: ${group.participants.length}`,
      `Created: ${group.creation ? new Date(group.creation * 1000).toLocaleString() : 'Not available'}`
    ].join('\n');
  }, ['user']),

  makeCommand('admincount', 'Count the administrators in the group.', async (ctx) => {
    const group = await getMetadata(ctx);
    const count = group.participants.filter(p => p.admin).length;

    return `👑 This group has ${count} administrator(s).`;
  }, ['user'])
];
                                           
