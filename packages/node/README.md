# @appss/sdk-node

Node.js SDK for APPSS analytics. Designed for server-side Telegram bots (Telegraf, grammY) and any Node.js backend.

## Installation

```bash
npm install @appss/sdk-node
```

## Quick start

```ts
import { createAppss } from '@appss/sdk-node';

const appss = createAppss({ apiKey: 'your-api-key' });

appss.track('user-123', 'bot_started');
appss.track('user-456', 'purchase', { amount: 9.99 });
```

Unlike the browser SDK, the Node SDK is **multi-user**: every call takes `distinctId` explicitly, because a single server process handles many users at once.

## Getting your API key

1. Open Creator Hub at [appss.pro](https://appss.pro)
2. Go to your app's detail page
3. Navigate to the **Developer** tab
4. Copy the API key

## API

### `createAppss(config)`

Creates a new client instance. Not a singleton — you can create multiple clients if needed.

```ts
import { createAppss } from '@appss/sdk-node';

const appss = createAppss({
  apiKey: 'your-api-key',
  debug: true,
  onError: (error) => console.error(error.code, error.message),
});
```

### `appss.track(distinctId, event, properties?)`

Sends an event for a specific user.

```ts
appss.track('user-123', 'message_sent', { chat_type: 'private' });
```

### `appss.setSuperProperties(properties)`

Sets properties that are automatically attached to every subsequent event. Useful for environment info, app version, or any context shared across all events.

```ts
appss.setSuperProperties({ env: 'production', app_version: '2.1.0' });

appss.track('user-123', 'action'); // { env: 'production', app_version: '2.1.0', $lib: 'node' }
appss.track('user-456', 'action'); // same super properties attached
```

Super properties override event properties with the same key.

### `appss.resetSuperProperties()`

Clears all super properties.

```ts
appss.resetSuperProperties();
```

### `appss.setUserProperty(distinctId, key, value)`

Sets a single user property. Sends to the server immediately.

```ts
appss.setUserProperty('user-123', 'plan', 'enterprise');
```

### `appss.setUserProperties(distinctId, properties)`

Sets multiple user properties at once.

```ts
appss.setUserProperties('user-123', {
  username: 'johndoe',
  first_name: 'John',
  plan: 'pro',
});
```

### `appss.flush()`

Forces immediate delivery of all queued events.

```ts
await appss.flush();
```

### `appss.destroy()`

Flushes remaining data and shuts down the client.

```ts
await appss.destroy();
```

## Telegraf integration

```ts
import { createAppss, fromTelegrafContext } from '@appss/sdk-node';
import { Telegraf } from 'telegraf';

const bot = new Telegraf(process.env.BOT_TOKEN);
const appss = createAppss({ apiKey: 'your-api-key' });

bot.use((ctx, next) => {
  const user = fromTelegrafContext(ctx);
  if (user) {
    appss.setUserProperties(user.distinctId, user.properties);
  }
  return next();
});

bot.command('start', (ctx) => {
  const user = fromTelegrafContext(ctx);
  if (user) {
    appss.track(user.distinctId, 'bot_started');
  }
  ctx.reply('Welcome!');
});

bot.launch();
```

## grammY integration

```ts
import { createAppss, fromGrammyContext } from '@appss/sdk-node';
import { Bot } from 'grammy';

const bot = new Bot(process.env.BOT_TOKEN);
const appss = createAppss({ apiKey: 'your-api-key' });

bot.use((ctx, next) => {
  const user = fromGrammyContext(ctx);
  if (user) {
    appss.setUserProperties(user.distinctId, user.properties);
  }
  return next();
});

bot.command('start', (ctx) => {
  const user = fromGrammyContext(ctx);
  if (user) {
    appss.track(user.distinctId, 'bot_started');
  }
  ctx.reply('Welcome!');
});

bot.start();
```

## Helper functions

`fromTelegrafContext(ctx)` and `fromGrammyContext(ctx)` extract user data from bot framework context objects. They accept `unknown` and have no peer dependencies on Telegraf or grammY.

Returns `ExtractedContext | null`:

```ts
interface ExtractedContext {
  distinctId: string;
  properties: TelegramUserProperties;
}

interface TelegramUserProperties {
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
  is_premium?: boolean;
  chat_type?: string;
  $start_param?: string;
}
```

| Property | Source |
|----------|--------|
| `distinctId` | `String(ctx.from.id)` |
| `username` | `ctx.from.username` |
| `first_name` | `ctx.from.first_name` |
| `last_name` | `ctx.from.last_name` |
| `language_code` | `ctx.from.language_code` |
| `is_premium` | `ctx.from.is_premium` |
| `chat_type` | `ctx.chat.type` |
| `$start_param` | parsed from `/start <param>` in message text |

Returns `null` if the context doesn't contain a valid user.

## Custom queue

By default, events are stored in an in-memory queue. You can provide your own implementation via the `queue` config option:

```ts
import { createAppss, type IEventQueue } from '@appss/sdk-node';

const customQueue: IEventQueue = {
  enqueue(event) { /* ... */ },
  drain(n) { /* ... */ },
  peek(n) { /* ... */ },
  size() { /* ... */ },
  isEmpty() { /* ... */ },
  clear() { /* ... */ },
};

const appss = createAppss({ apiKey: 'key', queue: customQueue });
```

Note: `IEventQueue` methods are synchronous. If your backing store is async, you'll need a local buffer with background sync.

## Graceful shutdown

The SDK registers `SIGTERM` and `SIGINT` handlers that flush remaining events before exiting (5-second timeout). If you manage process lifecycle yourself, call `appss.destroy()` before shutting down.

## Error handling

All errors are routed through `onError`. In `debug: true` mode, `NotInitializedError` is thrown as an exception.

```ts
import { AppssError, ErrorCode } from '@appss/sdk-node';

const appss = createAppss({
  apiKey: 'key',
  onError: (error: AppssError) => {
    if (error.code === ErrorCode.API_KEY_REVOKED) {
      console.error('API key revoked');
    }
  },
});
```

## What this SDK does NOT do

- **No consent management.** Consent (opt-in/opt-out) is handled by the browser SDK.
- **No user identification.** The caller passes `distinctId` explicitly with every call.
- **No session tracking.** No sessions, session duration, or session IDs.
- **No feature flags.** Pure analytics SDK.
- **No fingerprinting.** No device fingerprints or IP-based geolocation.
- **No automatic event tracking.** The developer decides which events to track.
- **No singleton.** Each `createAppss()` call returns an independent client.

## License

Apache-2.0
