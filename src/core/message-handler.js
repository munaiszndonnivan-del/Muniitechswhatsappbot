
import { checkPermission } from './permissions.js';
import { recordCommand } from '../db/database.js';

const PREFIX = '.';
const MAX_MESSAGE_LENGTH = 4000;

function extractMessageText(message) {
  const content = message.message;

  if (!content) return '';

  return (
    content.conversation ||
    content.extendedTextMessage?.text ||
    content.imageMessage?.caption ||
    content.videoMessage?.caption ||
    content.documentMessage?.caption ||
    content.documentWithCaptionMessage?.message
      ?.documentMessage?.caption ||
    ''
  ).trim();
}

function getSender(message) {
  return (
    message.key.participant ||
    message.key.remoteJid ||
    ''
  );
}

function getCommandParts(text) {
  const withoutPrefix = text.slice(PREFIX.length).trim();

  if (!withoutPrefix) return null;

  const parts = withoutPrefix.split(/\s+/);
  const name = parts.shift().toLowerCase();

  return {
    name,
    args: parts,
    text: parts.join(' ')
  };
}

async function sendText(socket, chatId, text, quotedMessage) {
  const safeText = String(text ?? 'Command completed.')
    .slice(0, MAX_MESSAGE_LENGTH);

  await socket.sendMessage(
    chatId,
    { text: safeText },
    quotedMessage ? { quoted: quotedMessage } : {}
  );
}

export async function handleIncomingMessage({
  socket,
  message,
  registry
}) {
  try {
    if (!message?.key || message.key.fromMe) return;

    const chatId = message.key.remoteJid;

    if (
      !chatId ||
      chatId === 'status@broadcast' ||
      chatId.endsWith('@broadcast')
    ) {
      return;
    }

    const sender = getSender(message);
    const text = extractMessageText(message);

    if (!text || !text.startsWith(PREFIX)) return;

    const parsed = getCommandParts(text);

    if (!parsed) return;

    const command = registry.get(parsed.name);

    if (!command) {
      await sendText(
        socket,
        chatId,
        `Unknown command: ${PREFIX}${parsed.name}\nUse .help to see available commands.`,
        message
      );
      return;
    }

    const isGroup = chatId.endsWith('@g.us');

    const context = {
      socket,
      message,
      chatId,
      sender,
      isGroup,
      args: parsed.args,
      text: parsed.text,
      receivedAt: new Date()
    };

    const permission = await checkPermission(
      command,
      context
    );

    if (!permission.allowed) {
      await sendText(
        socket,
        chatId,
        `⛔ ${permission.reason}`,
        message
      );
      return;
    }

    recordCommand(command.name, sender, chatId);

    const result = await command.execute(context);

    if (result === undefined || result === null || result === '') {
      return;
    }

    await sendText(socket, chatId, result, message);
  } catch (error) {
    console.error('[MUNAISZN X] Message handling error:', error);

    const chatId = message?.key?.remoteJid;

    if (chatId && !chatId.endsWith('@broadcast')) {
      try {
        await sendText(
          socket,
          chatId,
          'Something went wrong while processing that command. Please try again.',
          message
        );
      } catch (sendError) {
        console.error(
          '[MUNAISZN X] Could not send error response:',
          sendError
        );
      }
    }
  }
        }
                                 
