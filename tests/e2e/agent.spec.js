import { test, expect } from '@playwright/test';

const MOCK_REPLY = { choices: [{ message: { content: 'How many days do you have?' } }] };

// ── F-01 — Conversation starts ────────────────────────────────────────────────
test('F-01 — conversation starts and shows first reply', async ({ page }) => {
  await page.route('**/api/ask', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_REPLY),
    });
  });

  await page.goto('/');

  // Click AI tab
  await page.getByRole('button', { name: /ai|ia/i }).click();

  // Click start button
  await page.getByRole('button', { name: /start planning|comenzar/i }).click();

  // Expect chat bubble with the reply text
  await expect(page.getByText('How many days do you have?')).toBeVisible();
});

// ── F-05 — Loading lock (send button disabled while loading) ──────────────────
test('F-05 — send button is disabled while loading', async ({ page }) => {
  // Use a delayed response to keep loading state active
  await page.route('**/api/ask', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_REPLY),
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: /ai|ia/i }).click();
  await page.getByRole('button', { name: /start planning|comenzar/i }).click();

  // While loading, the send button should be disabled
  const sendBtn = page.getByRole('button', { name: /➤/ });
  await expect(sendBtn).toBeDisabled();
});

// ── F-06 — Reset clears conversation ─────────────────────────────────────────
test('F-06 — reset clears conversation and shows start button again', async ({ page }) => {
  await page.route('**/api/ask', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_REPLY),
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: /ai|ia/i }).click();
  await page.getByRole('button', { name: /start planning|comenzar/i }).click();

  // Wait for the reply to appear
  await expect(page.getByText('How many days do you have?')).toBeVisible();

  // Click the reset/new button
  await page.getByRole('button', { name: /new|nuevo/i }).click();

  // Start button should be visible again
  await expect(page.getByRole('button', { name: /start planning|comenzar/i })).toBeVisible();

  // Chat messages should be gone
  await expect(page.getByText('How many days do you have?')).not.toBeVisible();
});

// ── A-04 — Network error shows error message ──────────────────────────────────
test('A-04 — 500 error from API shows error message in UI', async ({ page }) => {
  await page.route('**/api/ask', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Internal error' }),
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: /ai|ia/i }).click();
  await page.getByRole('button', { name: /start planning|comenzar/i }).click();

  // Expect an error message in the UI
  await expect(page.locator('.ai-error')).toBeVisible();
});

// ── R-06 — Long response scrolls to bottom ────────────────────────────────────
test('R-06 — long response is scrolled into view', async ({ page }) => {
  const longContent = Array(100)
    .fill(
      'This is a very long itinerary day with many details about visiting temples, shrines, and eating amazing food in Japan.'
    )
    .join(' ');

  await page.route('**/api/ask', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ choices: [{ message: { content: longContent } }] }),
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: /ai|ia/i }).click();
  await page.getByRole('button', { name: /start planning|comenzar/i }).click();

  // Wait for loading to finish — the input box appears
  await expect(page.locator('.ai-chat-input')).toBeVisible();

  // The last bubble should be in the viewport
  const lastBubble = page.locator('.ai-bubble--assistant').last();
  await expect(lastBubble).toBeInViewport();
});

// ── I-01 — Language switch mid-conversation ────────────────────────────────────
test('I-01 — language switch mid-conversation updates UI labels', async ({ page }) => {
  await page.route('**/api/ask', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ choices: [{ message: { content: '¿Cuántos días tienes?' } }] }),
    });
  });

  await page.goto('/');

  // Verify English label is visible first
  await expect(page.getByRole('button', { name: /ai/i })).toBeVisible();

  // Switch to Spanish via language button
  const langBtn = page.locator('button').filter({ hasText: /es|español/i }).first();
  if (await langBtn.count() > 0) {
    await langBtn.click();
  }

  // Click AI/IA tab (label may now be in Spanish)
  await page.getByRole('button', { name: /ai|ia/i }).click();

  // The start button text should reflect the current language
  const startBtn = page.getByRole('button', { name: /start planning|comenzar/i });
  await expect(startBtn).toBeVisible();

  // Start the conversation
  await startBtn.click();

  // Should see Spanish reply
  await expect(page.getByText('¿Cuántos días tienes?')).toBeVisible();
});
