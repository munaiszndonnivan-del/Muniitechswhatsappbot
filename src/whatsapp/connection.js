
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState
} from '@whiskeysockets/baileys';

import path from 'node:path';
import { mkdir } from 'node:fs/promises';

const SESSION_DIR = path.resolve(
  process.env.SESSION_DIR || './sessions'
);

const MAX_RECONNECT_DELAY = 30000;
const INITIAL_RECONNECT_DELAY = 2000;

let socket = null;
let reconnectTimer = null;
let reconnectAttempts = 0;
let manuallyStopped = false;
let connecting = false;

function getPairingNumber() {
  const number = (process.env.PAIRING_NUMBER || '')
    .replace(/\D/g, '');

  if (number.length < 8 || number.length > 15) {
    throw new Error(
      'Set PAIRING_NUMBER in your environment using international digits only.'
    );
  }

  return number;
}

function scheduleReconnect(startConnection) {
  if (manuallyStopped || reconnectTimer) return;

  const delay = Math.min(
    INITIAL_RECONNECT_DELAY * (2 ** reconnectAttempts),
    MAX_RECONNECT_DELAY
  );

  reconnectAttempts += 1;

  console.log(
    `[MUNAISZN X] Reconnecting in ${Math.round(delay / 1000)} seconds.`
  );

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;

    try {
      await startConnection();
    } catch (error) {
      console.error(
        '[MUNAISZN X] Reconnection failed:',
        error.message
      );

      scheduleReconnect(startConnection);
    }
  }, delay);
}

export async function startWhatsAppConnection({
  onMessage
} = {}) {
  if (connecting) return socket;

  connecting = true;
  manuallyStopped = false;

  try {
    await mkdir(SESSION_DIR, { recursive: true });

    const { state, saveCreds } =
      await useMultiFileAuthState(SESSION_DIR);

    const currentSocket = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ['MUNAISZN X', 'Chrome', '1.0.0'],
      markOnlineOnConnect: false,
      syncFullHistory: false
    });

    socket = currentSocket;

    currentSocket.ev.on('creds.update', saveCreds);

    currentSocket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === 'connecting') {
        console.log('[MUNAISZN X] Connecting to WhatsApp...');
      }

      if (connection === 'open') {
        reconnectAttempts = 0;
        console.log('[MUNAISZN X] WhatsApp connected successfully.');
      }

      if (connection === 'close') {
        const statusCode =
          lastDisconnect?.error?.output?.statusCode;

        if (statusCode === DisconnectReason.loggedOut) {
          console.error(
            '[MUNAISZN X] WhatsApp session logged out. Re-link the account before reconnecting.'
          );
          return;
        }

        if (!manuallyStopped) {
          scheduleReconnect(startWhatsAppConnection);
        }
      }
    });

    currentSocket.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify' || typeof onMessage !== 'function') {
        return;
      }

      for (const message of messages) {
        try {
          await onMessage(currentSocket, message);
        } catch (error) {
          console.error(
            '[MUNAISZN X] Incoming message callback failed:',
            error
          );
        }
      }
    });

    if (!state.creds.registered) {
      const pairingNumber = getPairingNumber();

      // Wait for the socket to initialize before requesting the code.
      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (manuallyStopped || socket !== currentSocket) {
        return currentSocket;
      }

      const pairingCode =
        await currentSocket.requestPairingCode(pairingNumber);

      console.log('');
      console.log('======================================');
      console.log('       MUNAISZN X PAIRING CODE');
      console.log('======================================');
      console.log(`Code: ${pairingCode}`);
      console.log('Open WhatsApp → Linked Devices');
      console.log('Choose Link with phone number');
      console.log('Enter the code displayed above.');
      console.log('Never share this code with anyone.');
      console.log('======================================');
      console.log('');
    }

    return currentSocket;
  } catch (error) {
    scheduleReconnect(startWhatsAppConnection);
    throw error;
  } finally {
    connecting = false;
  }
}

export async function stopWhatsAppConnection() {
  manuallyStopped = true;

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  const currentSocket = socket;
  socket = null;

  if (currentSocket) {
    try {
      currentSocket.end(
        new Error('MUNAISZN X is shutting down.')
      );
    } catch (error) {
      console.error(
        '[MUNAISZN X] Error while closing connection:',
        error.message
      );
    }
  }
}
