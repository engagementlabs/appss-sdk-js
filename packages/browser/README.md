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

The SDK automatically identifies the user (Telegram user ID in TMA, or a persistent anonymous ID otherwise), collects the properties of the environment, queues events, and sends them in batches. Once `identify()` is called, the account ID is remembered across page loads until `reset()`.

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

Overrides the auto-detected user ID. Pass the same account ID your product sends to other analytics systems — otherwise the data cannot be cross-checked.

```ts
identify('user-42');
```

Calling it is optional: until then the SDK uses the ID of the platform it runs on (the Telegram user ID inside TMA) or a random persistent ID stored in localStorage.

Whenever `identify()` changes the current ID, the SDK sends one `$identify` event: its `distinct_id` is the new ID and the `$anon_distinct_id` property holds the ID used before — the server links the two into one person. The following events carry the new ID only. Calling `identify()` with the ID already in use sends nothing.

The account ID is remembered in localStorage, so the user stays identified across page loads and the link is not sent again. `reset()` drops it and goes back to the anonymous ID (or the Telegram ID inside TMA), so the next login links the freshly issued anonymous ID — one account can collect several anonymous IDs this way. Inside TMA the starting ID is the Telegram user ID, and `identify()` links it to the account in the same way.

### `reset()`

Forgets the current user. Outside TMA a fresh anonymous ID is issued, the stored account ID is dropped and the collected super properties are cleared, so events of the next user in the same browser are not glued to the previous one. Call it on logout.

```ts
reset();
track('page_viewed'); // sent under a new anonymous ID
```

Inside TMA the distinct ID goes back to the Telegram user ID.

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

## Platforms

The SDK detects the environment it runs in and asks it for three things: the ID of the current user, the user properties to send once at `init()`, and the properties to attach to every event.

| | Telegram Mini App | Web page |
|---|---|---|
| Detected by | `window.Telegram.WebApp.initDataUnsafe.user` | fallback, always available |
| User ID | Telegram user ID | random persistent anonymous ID |
| User properties | the TMA table below | none |
| Event properties | none | the web table below |

## Auto-collected properties (TMA)

When running inside a Telegram Mini App, the SDK sends the following user properties from `window.Telegram.WebApp` once at `init()`:

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

## Auto-collected properties (web)

When `window.Telegram.WebApp` is not available, the SDK collects the following properties and attaches them to **every** event:

| Property | Source |
|----------|--------|
| `$current_url` | `location.href` |
| `$pathname` | `location.pathname` |
| `$referrer` | `document.referrer`, `$direct` when empty |
| `$referring_domain` | hostname of `document.referrer`, `$direct` when empty |
| `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` | URL query, remembered in sessionStorage for the whole session |
| `$screen_width`, `$screen_height` | `screen.width` / `screen.height` |
| `$viewport_width`, `$viewport_height` | `innerWidth` / `innerHeight` |
| `$device_type` | `Mobile` / `Tablet` / `Desktop`, from `navigator.userAgent` |
| `$browser_language` | `navigator.language` |
| `$timezone` | `Intl.DateTimeFormat().resolvedOptions().timeZone` |

Everything except the campaign tags is collected anew for each event, so page and viewport changes are reflected. Campaign tags are read from the URL and remembered for the session — an event that happens after the user navigates away from the landing URL still carries the attribution. Properties passed to `track()` win over the collected ones.

Inside TMA these properties are **not** collected: the set of Telegram properties above is the only thing the SDK adds.

## Storage

| Key | Storage | Contents | Cleared by |
|-----|---------|----------|------------|
| `__appss_anonymous_id` | localStorage | anonymous ID | `reset()` |
| `__appss_distinct_id` | localStorage | account ID passed to `identify()` | `reset()` |
| `__appss_campaign` | sessionStorage | campaign tags of the session | closing the tab |
| `__appss_consent_opted_out` | localStorage | opt-out flag | `optIn()` |
| `__appss_queue` | localStorage | events waiting to be sent | successful delivery |

If storage is unavailable (private mode, blocked third-party cookies in an iframe), the SDK keeps working with in-memory values and reports the failure through the logger in `debug` mode. In that case the anonymous ID is regenerated on every page load.

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

- **No session tracking.** The SDK does not track sessions, session duration, or session IDs. Campaign tags are the only thing scoped to the browser session.
- **No feature flags.** This is a pure analytics SDK.
- **No client-side identity resolution.** The SDK reports the two IDs in a `$identify` event and leaves the merging to the server; it never rewrites already sent events.
- **No fingerprinting.** The SDK does not collect device fingerprints, IP-based geolocation, or any PII beyond what is explicitly passed by the developer or available from the Telegram WebApp API.
- **No automatic page view tracking.** The developer decides which events to track.
- **No A/B testing or experimentation.**

## License

MIT
