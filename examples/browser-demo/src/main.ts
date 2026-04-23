import {
  init,
  identify,
  track,
  setUserProperty,
  setUserProperties,
  flush,
  optOut,
  optIn,
  isOptedOut,
  destroy,
} from '@appss/sdk-browser';

init({
  apiKey: 'demo-api-key',
  debug: true,
  batchSize: 25,
  flushInterval: 15_000,
  onError: (error) => {
    log(`onError: ${error.message} [${error.code}]`, 'warn');
  },
});

log('SDK initialized', 'info');

bind('btn-page-view', () => {
  track('page_view', { page: '/demo', referrer: document.referrer || 'direct' });
  log('Tracked: page_view', 'event');
});

bind('btn-purchase', () => {
  const amount = Math.round(Math.random() * 10000) / 100;
  track('purchase', { amount, currency: 'USD', item: 'premium_subscription' });
  log(`Tracked: purchase ($${amount})`, 'event');
});

bind('btn-custom', () => {
  const name = `custom_event_${Date.now() % 1000}`;
  track(name, { timestamp: new Date().toISOString() });
  log(`Tracked: ${name}`, 'event');
});

bind('btn-reidentify', () => {
  identify('user-42');
  log('Re-identified as user-42', 'info');
});

bind('btn-props', () => {
  setUserProperty('plan', 'pro');
  setUserProperties({ company: 'Acme Inc', role: 'developer', signup_date: '2024-01-15' });
  log('Set user properties: plan, company, role, signup_date', 'info');
});

bind('btn-flush', async () => {
  log('Flushing...', 'info');
  await flush();
  log('Flush complete', 'info');
});

bind('btn-consent', () => {
  if (isOptedOut()) {
    optIn();
    log('Opted IN — tracking resumed', 'info');
  } else {
    optOut();
    log('Opted OUT — events will be dropped', 'warn');
  }
});

bind('btn-destroy', async () => {
  await destroy();
  log('SDK destroyed', 'warn');
});

function bind(id: string, handler: () => void | Promise<void>): void {
  document.getElementById(id)?.addEventListener('click', () => void handler());
}

function log(message: string, type: 'info' | 'event' | 'warn' = 'info'): void {
  const el = document.getElementById('log');
  if (!el) return;
  const time = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = `log-entry log-${type}`;
  entry.textContent = `[${time}] ${message}`;
  el.appendChild(entry);
  el.scrollTop = el.scrollHeight;
}
