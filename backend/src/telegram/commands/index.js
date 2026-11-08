import { Markup } from 'telegraf';
import { logger } from '../../logging/logger.js';

/** Redact anything that looks like a secret before it reaches a chat. */
export function redact(text) {
  return String(text)
    .replace(/0x[a-fA-F0-9]{64}/g, '0x…(redacted)')
    .replace(/(token|api[_-]?key|secret|password|private[_-]?key)\s*[:=]\s*\S+/gi, '$1: ***');
}

export function statusLine(ok) {
  return ok ? '🟢' : '🔴';
}

/**
 * Registers all administrator commands on the Telegraf bot. Every handler
 * relies on the authorizer middleware installed before this runs.
 */
export function registerCommands(bot, deps) {
  const { config, monitoring, provider, registry, configService, monitor, bus, authorizer } = deps;

  bot.use(authorizer.middleware());

  bot.start((ctx) =>
    ctx.reply(
      'Blower administration bot.\nUse /help to list commands.',
      Markup.keyboard([['/status', '/health'], ['/networks', '/contracts'], ['/transactions', '/logs']]).resize(),
    ),
  );

  bot.help((ctx) =>
    ctx.reply(
      [
        '/status — service summary',
        '/health — deep dependency health',
        '/networks — configured networks',
        '/contracts — registered contracts',
        '/transactions — pending monitored transactions',
        '/logs — recent system events',
        '/reload — reload runtime configuration',
      ].join('\n'),
    ),
  );

  bot.command('status', async (ctx) => {
    const snap = await monitoring.snapshot({ deep: false });
    const lines = [
      `${statusLine(snap.ok)} *blower-backend* (${snap.environment})`,
      `uptime: ${snap.checks.process.uptimeSeconds}s`,
      `memory: ${snap.checks.process.memory.rssMb} MB`,
      `websocket clients: ${snap.checks.websocket.clients}`,
    ];
    await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown' });
  });

  bot.command('health', async (ctx) => {
    const snap = await monitoring.snapshot({ deep: true });
    const chain = snap.checks.blockchain;
    const db = snap.checks.database;
    const lines = [
      `${statusLine(snap.ok)} overall: ${snap.ok ? 'healthy' : 'degraded'}`,
      `${statusLine(chain.ok)} blockchain: ${chain.ok ? `block ${chain.blockNumber} (chain ${chain.chainId})` : chain.error || chain.reason}`,
      `${statusLine(db.ok)} database: ${db.ok ? 'reachable' : db.reason}`,
    ];
    await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown' });
  });

  bot.command('networks', async (ctx) => {
    const { networks } = await import('../../config/networks.js');
    const lines = Object.values(networks).map(
      (n) => `• ${n.name} — chain ${n.chainId} (${n.nativeCurrency.symbol})`,
    );
    await ctx.reply(`Configured networks:\n${lines.join('\n')}`);
  });

  bot.command('contracts', async (ctx) => {
    try {
      const names = await registry.list();
      const results = await registry.verifyDeployment(config.BSC_CHAIN_ID);
      const lines = results.map((r) =>
        r.configured ? `${statusLine(r.deployed)} ${r.name} — ${r.address}` : `⚪ ${r.name} — not configured`,
      );
      await ctx.reply(`Registered contracts (${names.length}):\n${lines.join('\n') || 'none'}`);
    } catch (err) {
      await ctx.reply(`Contract lookup failed: ${redact(err.message)}`);
    }
  });

  bot.command('transactions', async (ctx) => {
    const pending = monitor.pending();
    await ctx.reply(pending.length ? `Pending (${pending.length}):\n${pending.join('\n')}` : 'No pending transactions.');
  });

  bot.command('logs', async (ctx) => {
    const recent = bus.recent(10).reverse();
    const lines = recent.map((e) => `${e.timestamp} ${e.event}`);
    await ctx.reply(lines.length ? lines.join('\n') : 'No recent events.');
  });

  bot.command('reload', async (ctx) => {
    try {
      await configService.init();
      await ctx.reply('✅ Runtime configuration reloaded.');
      logger.info('telegram.reload', { userId: ctx.from.id });
    } catch (err) {
      await ctx.reply(`Reload failed: ${redact(err.message)}`);
    }
  });

  bot.catch((err, ctx) => {
    logger.error('telegram.error', { update: ctx.updateType, error: err.message });
  });

  return bot;
}

export default registerCommands;
