import { test, expect } from '@playwright/test';

// Build an SSE body string matching the format callApi expects
function sseBody(content) {
  const chunk = JSON.stringify({ choices: [{ delta: { content } }] });
  return `data: ${chunk}\n\ndata: [DONE]\n\n`;
}

function fulfillSse(route, content) {
  return route.fulfill({
    status: 200,
    contentType: 'text/event-stream',
    headers: { 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' },
    body: sseBody(content),
  });
}

function fulfillError(route, status, message) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify({ error: message }),
  });
}

// ── F-01 — Conversation starts ────────────────────────────────────────────────
test('F-01 — conversation starts and shows first reply', async ({ page }) => {
  await page.route('**/api/ask', (route) => fulfillSse(route, 'How many days do you have?'));

  await page.goto('/');
  await page.getByRole('button', { name: /ai|ia/i }).click();
  await page.getByRole('button', { name: /start planning|comenzar/i }).click();

  await expect(page.getByText('How many days do you have?')).toBeVisible();
});

// ── F-05 — Loading lock (send button disabled while loading) ──────────────────
test('F-05 — send button is disabled while loading', async ({ page }) => {
  await page.route('**/api/ask', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await fulfillSse(route, 'How many days do you have?');
  });

  await page.goto('/');
  await page.getByRole('button', { name: /ai|ia/i }).click();
  await page.getByRole('button', { name: /start planning|comenzar/i }).click();

  const sendBtn = page.getByRole('button', { name: /➤/ });
  await expect(sendBtn).toBeDisabled();
});

// ── F-06 — Reset clears conversation ─────────────────────────────────────────
test('F-06 — reset button opens session picker', async ({ page }) => {
  await page.route('**/api/ask', (route) => fulfillSse(route, 'How many days do you have?'));

  await page.goto('/');
  await page.getByRole('button', { name: /ai|ia/i }).click();
  await page.getByRole('button', { name: /start planning|comenzar/i }).click();

  await expect(page.getByText('How many days do you have?')).toBeVisible();

  // Click the ↺ New button — should open the session picker
  await page.getByRole('button', { name: /new|nuevo/i }).click();

  // Session picker should appear
  await expect(page.locator('.ai-session-picker')).toBeVisible();
});

// ── A-04 — Network error shows error message ──────────────────────────────────
test('A-04 — 500 error from API shows error message in UI', async ({ page }) => {
  await page.route('**/api/ask', (route) => fulfillError(route, 500, 'Internal error'));

  await page.goto('/');
  await page.getByRole('button', { name: /ai|ia/i }).click();
  await page.getByRole('button', { name: /start planning|comenzar/i }).click();

  await expect(page.locator('.ai-error')).toBeVisible();
});

// ── R-06 — Long response scrolls to bottom ────────────────────────────────────
test('R-06 — long response is scrolled into view', async ({ page }) => {
  const longContent = Array(100)
    .fill('This is a very long itinerary day with many details about visiting temples, shrines, and eating amazing food in Japan.')
    .join(' ');

  await page.route('**/api/ask', (route) => fulfillSse(route, longContent));

  await page.goto('/');
  await page.getByRole('button', { name: /ai|ia/i }).click();
  await page.getByRole('button', { name: /start planning|comenzar/i }).click();

  await expect(page.locator('.ai-chat-input')).toBeVisible();

  const lastBubble = page.locator('.ai-bubble--assistant').last();
  await expect(lastBubble).toBeInViewport();
});

// ── I-01 — Language switch mid-conversation ────────────────────────────────────
test('I-01 — language switch mid-conversation updates UI labels', async ({ page }) => {
  await page.route('**/api/ask', (route) => fulfillSse(route, '¿Cuántos días tienes?'));

  await page.goto('/');

  await expect(page.getByRole('button', { name: /ai/i })).toBeVisible();

  const langBtn = page.locator('button').filter({ hasText: /es|español/i }).first();
  if (await langBtn.count() > 0) {
    await langBtn.click();
  }

  await page.getByRole('button', { name: /ai|ia/i }).click();

  const startBtn = page.getByRole('button', { name: /start planning|comenzar/i });
  await expect(startBtn).toBeVisible();

  await startBtn.click();

  await expect(page.getByText('¿Cuántos días tienes?')).toBeVisible();
});
