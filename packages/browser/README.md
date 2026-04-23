# @appss/sdk-browser

Browser SDK for APPSS analytics. Works in any browser environment, with built-in support for Telegram Mini Apps.

## Installation

```bash
npm install @appss/sdk-browser
```

## Quick start

```ts
import { init, track } from '@appss/sdk-browser';

init({ apiKey: 'your-api-key' });

track('page_view', { page: '/home' });
```

The SDK automatically identifies the user (Telegram user ID in TMA, or a persistent anonymous ID otherwise), queues events, and sends them in batches.

## Getting your API key

1. Open Creator Hub at [appss.pro](https://appss.pro)
2. Go to your app's detail page
3. Navigate to the **Developer** tab
4. Copy the API key

## API

### `init(config)`

Initializes the SDK. Call once at app startup.

```ts
init({
  apiKey: 'your-api-key',
  endpoint: 'https://your-ingest-server.com', // optional, has default
  debug: true,                                 // optional, logs to console
  batchSize: 50,                               // optional, events per batch
  flushInterval: 10000,                        // optional, ms between auto-flushes
  retry: {                                     // optional
    maxRetries: 5,
    baseBackoffMs: 1000,
    maxBackoffMs: 16000,
  },
  onError: (error) => {                        // optional
    console.error(error.code, error.message);
  },
});
```

### `track(event, properties?)`

Sends a custom event.

```ts
track('purchase', { amount: 9.99, currency: 'USD' });
track('button_click', { button_id: 'cta-hero' });
track('level_complete');
```

### `identify(distinctId)`

Overrides the auto-detected user ID.

```ts
identify('user-42');
```

In Telegram Mini Apps, `identify` is called automatically with the Telegram user ID. Outside TMA, a random persistent ID is generated and stored in localStorage.

### `setUserProperty(key, value)` / `setUserProperties(props)`

Sets user properties. Each call sends an immediate request to the server.

```ts
setUserProperty('plan', 'pro');

setUserProperties({
  company: 'Acme',
  role: 'developer',
  signup_date: '2024-01-15',
});
```

### `flush()`

Forces immediate delivery of queued events. Normally not needed — the SDK flushes automatically by timer and on page hide.

```ts
await flush();
```

### `optOut()` / `optIn()` / `isOptedOut()`

GDPR consent controls. When opted out, all `track()` calls are silently dropped. Events already in the queue remain there but are not sent until the user opts back in.

```ts
optOut();
track('ignored');      // silently dropped
optIn();               // resumes tracking
console.log(isOptedOut()); // false
```

### `destroy()`

Flushes remaining data and tears down the SDK. After calling `destroy()`, all other methods will throw until `init()` is called again.

```ts
await destroy();
```

## Auto-collected properties (TMA)

When running inside a Telegram Mini App, the SDK automatically collects the following user properties from `window.Telegram.WebApp`:

| Property | Source |
|----------|--------|
| `first_name` | `initDataUnsafe.user.first_name` |
| `last_name` | `initDataUnsafe.user.last_name` |
| `username` | `initDataUnsafe.user.username` |
| `language_code` | `initDataUnsafe.user.language_code` |
| `is_premium` | `initDataUnsafe.user.is_premium` |
| `platform` | `Telegram.WebApp.platform` |
| `tg_webapp_version` | `Telegram.WebApp.version` |
| `color_scheme` | `Telegram.WebApp.colorScheme` |
| `$start_param` | `initDataUnsafe.start_param` |

If `window.Telegram.WebApp` is not available (SDK loaded outside TMA), these properties are not collected. The developer is responsible for setting properties manually in that case.

## Offline queue & persistence

- Events are stored in a **localStorage-backed queue** that survives page reloads and browser restarts.
- The queue is flushed by timer (default 10 seconds) or when it reaches `batchSize`.
- On `visibilitychange: hidden` or `pagehide`, remaining events are sent via `navigator.sendBeacon` for reliable delivery during page unload. Payloads exceeding the ~64KB sendBeacon limit are automatically split into smaller batches.
- Queue size is capped at ~4MB. On overflow, the oldest events are dropped and `onError` is called with a `QueueOverflowError`.
- Duplicate delivery is safe — the server deduplicates by `$insert_id` (a UUID generated per event).

## Error handling

All errors are routed through the `onError` callback if provided. In `debug: true` mode, lifecycle errors (`NotInitializedError`, `NotIdentifiedError`) are thrown as exceptions instead of being silently logged — this helps catch integration mistakes during development.

```ts
import { AppssError, ErrorCode } from '@appss/sdk-browser';

init({
  apiKey: 'key',
  debug: true,
  onError: (error: AppssError) => {
    switch (error.code) {
      case ErrorCode.API_KEY_REVOKED:
        // API key was revoked, SDK stops sending
        break;
      case ErrorCode.NETWORK_ERROR:
        // transient network issue, SDK will retry
        break;
      case ErrorCode.QUEUE_OVERFLOW:
        // localStorage full, oldest events dropped
        break;
    }
  },
});
```

## Bundle size

The SDK targets **< 10 KB min+gzip** with **zero runtime dependencies**. The only dependency is `@appss/sdk-core`, which is a shared internal module.

## What this SDK does NOT do

- **No session tracking.** The SDK does not track sessions, session duration, or session IDs.
- **No feature flags.** This is a pure analytics SDK.
- **No `reset()`.** There is no method to clear user identity mid-session. Call `destroy()` and `init()` again if needed.
- **No fingerprinting.** The SDK does not collect device fingerprints, IP-based geolocation, or any PII beyond what is explicitly passed by the developer or available from the Telegram WebApp API.
- **No automatic page view tracking.** The developer decides which events to track.
- **No A/B testing or experimentation.**

## License

MIT
