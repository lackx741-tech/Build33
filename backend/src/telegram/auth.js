import { logger } from '../logging/logger.js';

/**
 * Role-based authorization for Telegram operators. Authorization is derived
 * from the configured admin id list; every command handler must check it.
 */
export class TelegramAuthorizer {
  constructor(config) {
    this.adminIds = new Set((config.TELEGRAM_ADMIN_IDS || []).map(String));
  }

  isAuthorized(userId) {
    return this.adminIds.has(String(userId));
  }

  /** Telegraf middleware: reject unauthorized users before any handler runs. */
  middleware() {
    return async (ctx, next) => {
      const userId = ctx.from?.id;
      if (!this.isAuthorized(userId)) {
        logger.warn('telegram.unauthorized', { userId, username: ctx.from?.username });
        await ctx.reply('⛔ Unauthorized. This bot is restricted to configured administrators.');
        return;
      }
      return next();
    };
  }
}

export default TelegramAuthorizer;
