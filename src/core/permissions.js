
import { getUserRole } from '../db/database.js';

function normalizeJid(value) {
  if (!value || typeof value !== 'string') return '';

  return value
    .trim()
    .replace(/:\d+@/, '@')
    .toLowerCase();
}

function getPhoneNumber(jid) {
  return normalizeJid(jid)
    .split('@')[0]
    .replace(/\D/g, '');
}

export function isOwner(sender) {
  const ownerNumber = (process.env.OWNER_NUMBER || '')
    .replace(/\D/g, '');

  if (!ownerNumber) return false;

  return getPhoneNumber(sender) === ownerNumber;
}

export async function isGroupAdmin(socket, chatId, sender) {
  if (!chatId?.endsWith('@g.us')) return false;

  try {
    const metadata = await socket.groupMetadata(chatId);

    const participant = metadata.participants?.find(
      (item) =>
        normalizeJid(item.id) === normalizeJid(sender)
    );

    return Boolean(
      participant?.admin === 'admin' ||
      participant?.admin === 'superadmin'
    );
  } catch {
    return false;
  }
}

export async function checkPermission(command, context) {
  const permissions = command.permissions ?? ['user'];
  const sender = context.sender;

  if (!sender) {
    return {
      allowed: false,
      reason: 'Unable to identify the sender.'
    };
  }

  // The configured owner has access to every command.
  if (isOwner(sender)) {
    return { allowed: true };
  }

  const role = getUserRole(normalizeJid(sender));

  if (permissions.includes('owner')) {
    return {
      allowed: false,
      reason: 'This command is restricted to the bot owner.'
    };
  }

  if (permissions.includes('admin')) {
    if (role !== 'admin') {
      return {
        allowed: false,
        reason: 'This command is restricted to authorized bot admins.'
      };
    }
  }

  if (permissions.includes('groupAdmin')) {
    const allowed = await isGroupAdmin(
      context.socket,
      context.chatId,
      sender
    );

    if (!allowed) {
      return {
        allowed: false,
        reason: 'Only group admins can use this command.'
      };
    }
  }

  return { allowed: true };
}
