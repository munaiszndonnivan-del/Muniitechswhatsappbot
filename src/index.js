
import { loadCommands } from './core/command-loader.js';
import { commandRegistry } from './core/command-registry.js';
import { handleIncomingMessage } from './core/message-handler.js';
import {
  startWhatsAppConnection,
  stopWhatsAppConnection
} from './whatsapp/connection.js';
import { closeDatabase } from './db/database.js';

let shuttingDown = false;

async function startBot() {
  console.log('');
  console.log('================================');
  console.log('       MUNAISZN X STARTING');
  console.log('================================');

  try {
    const loadedCount = await loadCommands();

    console.log(
      `[MUNAISZN X] Loaded ${loadedCount} commands.`
    );

    console.log(
      `[MUNAISZN X] Registered ${commandRegistry.count()} unique commands.`
    );

    await startWhatsAppConnection({
      onMessage: (socket, message) =>
        handleIncomingMessage({
          socket,
          message,
          registry: commandRegistry
        })
    });
  } catch (error) {
    console.error(
      '[MUNAISZN X] Startup failed:',
      error
    );

    await shutdown(1);
  }
}

async function shutdown(exitCode = 0) {
  if (shuttingDown) return;

  shuttingDown = true;

  console.log('[MUNAISZN X] Shutting down...');

  try {
    await stopWhatsAppConnection();
  } catch (error) {
    console.error(
      '[MUNAISZN X] WhatsApp shutdown error:',
      error
    );
    exitCode = 1;
  }

  try {
    closeDatabase();
  } catch (error) {
    console.error(
      '[MUNAISZN X] Database shutdown error:',
      error
    );
    exitCode = 1;
  }

  console.log('[MUNAISZN X] Shutdown complete.');

  process.exitCode = exitCode;
}

process.once('SIGINT', () => shutdown(0));
process.once('SIGTERM', () => shutdown(0));

process.on('unhandledRejection', (reason) => {
  console.error(
    '[MUNAISZN X] Unhandled promise rejection:',
    reason
  );
});

process.on('uncaughtException', (error) => {
  console.error(
    '[MUNAISZN X] Uncaught exception:',
    error
  );

  shutdown(1);
});

startBot();
