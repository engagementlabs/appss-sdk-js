# APPSS SDK

Analytics SDK for tracking user events in Telegram Mini Apps, web applications, and Node.js backends.

## Packages

| Package | Description | npm |
|---------|-------------|-----|
| [`@appss/sdk-core`](./packages/core) | Shared abstractions: abstract client, batching, retry, transport ports | [![npm](https://img.shields.io/npm/v/@appss/sdk-core)](https://www.npmjs.com/package/@appss/sdk-core) |
| [`@appss/sdk-browser`](./packages/browser) | Browser SDK with TMA support, localStorage persistence, sendBeacon transport | [![npm](https://img.shields.io/npm/v/@appss/sdk-browser)](https://www.npmjs.com/package/@appss/sdk-browser) |
| [`@appss/sdk-node`](./packages/node) | Node.js SDK for server-side tracking, Telegram bot helpers (Telegraf, grammY) | [![npm](https://img.shields.io/npm/v/@appss/sdk-node)](https://www.npmjs.com/package/@appss/sdk-node) |

## Quick start

### Browser / Telegram Mini App

```bash
npm install @appss/sdk-browser
```

```ts
import { init, track, identify } from '@appss/sdk-browser';

init({ apiKey: 'your-api-key' });
identify('user-123');
track('page_viewed', { page: '/home' });
```

### Node.js / Telegram Bot

```bash
npm install @appss/sdk-node
```

```ts
import { createAppss } from '@appss/sdk-node';

const appss = createAppss({ apiKey: 'your-api-key' });
appss.track('user-123', 'bot_started');
```

## Architecture

```
@appss/sdk-core (abstract client, ports, batching, retry)
       |
  +-----------+-----------+
  |                       |
@appss/sdk-browser    @appss/sdk-node
(fetch, sendBeacon,   (Node fetch, memory queue,
 localStorage queue,   SIGTERM handler,
 consent, identity,    Telegram helpers)
 TMA support)
```

Core defines the abstract client and platform-agnostic interfaces (`ITransport`, `IEventQueue`, `ILogger`). Browser and Node implement these interfaces for their platforms.

## Getting your API key

1. Open Creator Hub at [appss.pro](https://appss.pro)
2. Go to your app's detail page
3. Navigate to the **Developer** tab
4. Copy the API key

## Development

```bash
yarn install
yarn build        # build all packages
yarn test         # run all tests
yarn typecheck    # type-check all packages
```

### Project structure

```
packages/
  core/           @appss/sdk-core
  browser/        @appss/sdk-browser
  node/           @appss/sdk-node
examples/
  browser-demo/   Browser usage demo
  node-examples/  Telegraf and grammY examples
scripts/
  release.mjs     Automated version bumping and publish detection
```

## License

Apache-2.0
