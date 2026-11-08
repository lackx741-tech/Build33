import { Telegraf } from 'telegraf';
import { logger } from '../logging/logger.js';
import { TelegramAuthorizer } from './auth.js';
import { registerCommands } from './commands/index.js';
import { registerNotifications } from './notifications.js';

/**
 * Builds the Telegraf administration bot. Returns null when no token is
 * configured so the rest of the service can run without Telegram.
 */
export function createBot(deps) {
  const { config } = deps;
  if (!config.TELEGRAM_BOT_TOKEN) {
    logger.warn('telegram.disabled — TELEGRAM_BOT_TOKEN not set');
    return null;
  }

  const bot = new Telegraf(config.TELEGRAM_BOT_TOKEN, { handlerTimeout: 10000 });
  const authorizer = new TelegramAuthorizer(config);

  registerCommands(bot, { ...deps, authorizer });
  registerNotifications(bot, deps);

  return bot;
}

export default createBot;
