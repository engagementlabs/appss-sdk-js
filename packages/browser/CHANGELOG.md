# Changelog

## 0.4.10

### Fixed

- **Anonymous ID on insecure origins.** The ID is generated through `uuid()` from `@appss/sdk-core`, so `init()` no longer throws on a plain `http://` page where `crypto.randomUUID()` is unavailable.

### Added

- **Web session properties.** Outside Telegram every event now carries the page address and path, the referrer and its domain, campaign tags, screen and viewport size, device type, browser language and timezone. Collected through the `setEventContextProvider` hook of `@appss/sdk-core`, so properties passed to `track()` still win over the collected ones.
- **Campaign tags for the whole session.** `utm_source`, `utm_medium`, `utm_campaign`, `utm_term` and `utm_content` are remembered in `sessionStorage`, so events after the first one keep the attribution.
- **`reset()`.** Forgets the current user: outside Telegram a fresh anonymous ID is issued, the stored account ID is dropped and super properties are cleared. Call it on logout so events of the next user in the same browser are not glued to the previous one.

### Changed

- **Identity.** `identify()` switches the distinct ID to the account ID and keeps it in `localStorage`, so the user stays identified across page loads and launches. Every change of the ID sends one `$identify` event with the new ID as `distinct_id` and the previous one in the `$anon_distinct_id` property, for the server to link them into one person; identifying the ID already in use sends nothing. `reset()` drops the stored account and goes back to a freshly issued anonymous ID (or to the Telegram ID inside TMA), so the next login links a new anonymous ID to the same account.

Inside Telegram Mini Apps nothing changes: the same set of properties is collected and the distinct ID stays the Telegram user ID.
