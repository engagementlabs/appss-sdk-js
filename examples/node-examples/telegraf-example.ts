import { createAppss, fromTelegrafContext } from '@appss/sdk-node';
import { Telegraf, type Context } from 'telegraf';

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('BOT_TOKEN is required');
  process.exit(1);
}

const appss = createAppss({
  apiKey: process.env.APPSS_API_KEY ?? 'your-api-key',
  debug: true,
  batchSize: 50,
  flushInterval: 10_000,
});

const bot = new Telegraf(BOT_TOKEN);

bot.use(async (ctx, next) => {
  const extracted = fromTelegrafContext(ctx);
  if (extracted) {
    const { distinctId, properties } = extracted;
    appss.setUserProperties(distinctId, { ...properties, platform: 'telegram', last_seen_at: new Date().toISOString() });
    appss.track(distinctId, 'bot_update_received', { update_type: getUpdateType(ctx) });
  }
  await next();
});

function getUpdateType(ctx: Context): string {
  if (ctx.message) return 'message';
  if (ctx.callbackQuery) return 'callback_query';
  if (ctx.inlineQuery) return 'inline_query';
  return 'unknown';
}

bot.start((ctx) => {
  const extracted = fromTelegrafContext(ctx);
  if (!extracted) return;

  const { distinctId, properties } = extracted;
  const startParam = properties['$start_param'] as string | undefined;

  appss.track(distinctId, 'bot_started', { start_param: startParam ?? null, is_deep_link: !!startParam });

  if (startParam) {
    appss.setUserProperties(distinctId, { acquisition_source: startParam });
  }

  ctx.reply('Welcome! Use /help for commands.');
});

bot.help((ctx) => {
  const extracted = fromTelegrafContext(ctx);
  if (extracted) {
    appss.track(extracted.distinctId, 'command_executed', { command: '/help' });
  }
  ctx.reply('/start — Start\n/help — Help\n/settings — Settings');
});

bot.command('settings', (ctx) => {
  const extracted = fromTelegrafContext(ctx);
  if (extracted) {
    appss.track(extracted.distinctId, 'command_executed', { command: '/settings' });
  }
  ctx.reply('Settings:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Language', callback_data: 'settings:language' }, { text: 'Notifications', callback_data: 'settings:notifications' }],
      ],
    },
  });
});

bot.action(/^settings:(.+)$/, (ctx) => {
  const extracted = fromTelegrafContext(ctx);
  if (!extracted) return;
  appss.track(extracted.distinctId, 'settings_opened', { setting: ctx.match[1] });
  ctx.answerCbQuery(`Opened: ${ctx.match[1]}`);
});

bot.on('text', (ctx) => {
  const extracted = fromTelegrafContext(ctx);
  if (!extracted) return;
  appss.track(extracted.distinctId, 'message_sent', { message_length: ctx.message.text.length });
});

bot.on('inline_query', (ctx) => {
  const extracted = fromTelegrafContext(ctx);
  if (!extracted) return;
  appss.track(extracted.distinctId, 'inline_query_sent', { query_length: ctx.inlineQuery.query.length });
});

async function shutdown(signal: string): Promise<void> {
  bot.stop(signal);
  await appss.destroy();
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));

bot.launch().then(() => {
  console.log(`Bot @${bot.botInfo?.username} launched`);
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
