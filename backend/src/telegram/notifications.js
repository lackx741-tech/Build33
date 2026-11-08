import { logger } from '../logging/logger.js';
import { redact } from './commands/index.js';

/**
 * Subscribes to the event bus and forwards selected events to every
 * authorized administrator. Never forwards raw error objects or secrets.
 */
export function registerNotifications(bot, { bus, config }) {
  const adminIds = (config.TELEGRAM_ADMIN_IDS || []).map(String);
  if (adminIds.length === 0) {
    logger.warn('telegram.notifications disabled — no TELEGRAM_ADMIN_IDS configured');
    return;
  }

  const send = async (text) => {
    await Promise.all(
      adminIds.map((id) =>
        bot.telegram.sendMessage(id, text, { parse_mode: 'Markdown' }).catch((err) =>
          logger.warn('telegram.notify failed', { id, error: err.message }),
        ),
      ),
    );
  };

  bus.on('transaction.confirmed', (e) =>
    send(`✅ *Transaction confirmed*\n\`${e.payload.txHash}\`\nblock ${e.payload.blockNumber}`));

  bus.on('transaction.failed', (e) =>
    send(`❌ *Transaction failed*\n\`${e.payload.txHash}\`\nreason: ${redact(e.payload.reason || 'reverted')}`));

  bus.on('system.error', (e) => send(`⚠️ *System error*\n${redact(e.payload.message || 'unknown')}`));

  bus.on('system.health', (e) => {
    if (!e.payload.ok) send('🔴 *Health check degraded* — use /health for details.');
  });

  logger.info('telegram.notifications registered', { recipients: adminIds.length });
}

export default registerNotifications;
