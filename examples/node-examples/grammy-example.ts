import { createAppss, fromGrammyContext } from '@appss/sdk-node';
import { Bot, type Context, session, type SessionFlavor, InlineKeyboard } from 'grammy';

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

interface SessionData {
  messageCount: number;
  language: string;
}

type BotContext = Context & SessionFlavor<SessionData>;

const bot = new Bot<BotContext>(BOT_TOKEN);

bot.use(session({
  initial: (): SessionData => ({ messageCount: 0, language: 'ru' }),
}));

bot.use(async (ctx, next) => {
  const extracted = fromGrammyContext(ctx);
  if (extracted) {
    const { distinctId, properties } = extracted;
    ctx.session.messageCount += 1;
    appss.setUserProperties(distinctId, { ...properties, platform: 'telegram', last_seen_at: new Date().toISOString() });
    appss.track(distinctId, 'bot_update_received', { session_message_count: ctx.session.messageCount });
  }
  await next();
});

bot.command('start', async (ctx) => {
  const extracted = fromGrammyContext(ctx);
  if (!extracted) return;

  const { distinctId, properties } = extracted;
  const startParam = properties['$start_param'] as string | undefined;

  ctx.session.messageCount = 0;

  appss.track(distinctId, 'bot_started', { start_param: startParam ?? null, is_deep_link: !!startParam });

  if (startParam) {
    appss.setUserProperties(distinctId, { acquisition_source: startParam });
  }

  const keyboard = new InlineKeyboard()
    .text('Settings', 'settings')
    .text('Help', 'help');

  await ctx.reply('Welcome!' + (startParam ? ` Ref: ${startParam}` : ''), { reply_markup: keyboard });
});

bot.command('help', async (ctx) => {
  const extracted = fromGrammyContext(ctx);
  if (extracted) {
    appss.track(extracted.distinctId, 'command_executed', { command: '/help' });
  }
  await ctx.reply('/start — Start\n/help — Help\n/lang — Language');
});

bot.command('lang', async (ctx) => {
  const extracted = fromGrammyContext(ctx);
  if (extracted) {
    appss.track(extracted.distinctId, 'command_executed', { command: '/lang', current_language: ctx.session.language });
  }
  const keyboard = new InlineKeyboard()
    .text('Русский', 'lang:ru')
    .text('English', 'lang:en');

  await ctx.reply('Choose language:', { reply_markup: keyboard });
});

bot.callbackQuery(/^lang:(.+)$/, async (ctx) => {
  const extracted = fromGrammyContext(ctx);
  if (!extracted) return;

  const newLang = ctx.match[1];
  const prevLang = ctx.session.language;
  ctx.session.language = newLang;

  appss.track(extracted.distinctId, 'language_changed', { previous: prevLang, new: newLang });
  appss.setUserProperty(extracted.distinctId, 'preferred_language', newLang);

  await ctx.answerCallbackQuery(`Language: ${newLang}`);
  await ctx.editMessageText(`Language set to ${newLang}`);
});

bot.callbackQuery('settings', async (ctx) => {
  const extracted = fromGrammyContext(ctx);
  if (extracted) {
    appss.track(extracted.distinctId, 'settings_opened');
  }
  await ctx.answerCallbackQuery();
  await ctx.editMessageText('Settings: use /lang to change language');
});

bot.callbackQuery('help', async (ctx) => {
  const extracted = fromGrammyContext(ctx);
  if (extracted) {
    appss.track(extracted.distinctId, 'help_opened');
  }
  await ctx.answerCallbackQuery();
  await ctx.editMessageText('/start — Start\n/help — Help\n/lang — Language');
});

bot.on('message:text', async (ctx) => {
  const extracted = fromGrammyContext(ctx);
  if (!extracted) return;
  appss.track(extracted.distinctId, 'message_sent', { message_length: ctx.message.text.length, session_message_count: ctx.session.messageCount });
});

bot.catch((err) => {
  console.error('Bot error:', err.message);
  appss.track('system', 'bot_error', { error_message: err.message });
});

async function shutdown(): Promise<void> {
  bot.stop();
  await appss.destroy();
}

process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());

bot.start({
  onStart: (botInfo) => console.log(`Bot @${botInfo.username} launched`),
});
