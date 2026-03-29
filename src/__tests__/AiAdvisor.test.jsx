import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import AiAdvisor from '../components/AiAdvisor.jsx';
import { LangProvider } from '../../src/i18n.jsx';

const sampleSpots = [
  {
    name: 'Tokyo',
    prefecture: 'Tokyo',
    region: 'Kanto',
    crowdCategory: 'tourist',
    totalVisits: 1000,
  },
];

const defaultProps = {
  filteredSpots: sampleSpots,
  filter: {},
  mode: 'all',
  crowdFilter: 'all',
  lang: 'en',
};

function renderAdvisor(props = {}) {
  return render(
    <LangProvider>
      <AiAdvisor {...defaultProps} {...props} />
    </LangProvider>
  );
}

function mockFetchSuccess(content = 'How many days do you have?') {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ message: { content } }],
    }),
  });
}

function mockFetchError(status = 500, errorMessage = 'Internal Server Error') {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: async () => ({ error: errorMessage }),
  });
}

beforeEach(() => {
  // jsdom doesn't implement scrollIntoView
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── F-04 / F-05 — Loading lock ───────────────────────────────────────────────

describe('F-04 / F-05 — Loading lock', () => {
  it('while loading is true, calling handleSend does not add new messages', async () => {
    // Set up a fetch that never resolves during the test
    let resolveFirst;
    const slowFetch = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveFirst = () =>
          resolve({
            ok: true,
            status: 200,
            json: async () => ({
              choices: [{ message: { content: 'How many days?' } }],
            }),
          });
      })
    );
    vi.stubGlobal('fetch', slowFetch);

    renderAdvisor();

    // Click the start button to trigger loading
    const startBtn = screen.getByRole('button', { name: /start planning/i });
    fireEvent.click(startBtn);

    // While loading, find the send button (it should be in the chat now)
    // The input and send button appear only after started=true
    // Since we clicked start, started becomes true immediately
    // but loading is also true so the send button should be disabled
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /➤/ })).toBeDisabled();
    });

    // Resolve the fetch so the component doesn't hang
    act(() => resolveFirst());
  });

  it('start button is disabled when filteredSpots is empty', () => {
    renderAdvisor({ filteredSpots: [] });
    const startBtn = screen.getByRole('button', { name: /start planning/i });
    expect(startBtn).toBeDisabled();
  });
});

// ── A-03 — Empty API response ─────────────────────────────────────────────────

describe('A-03 — Empty API response', () => {
  it('when /api/ask returns empty content string, component handles it gracefully', async () => {
    vi.stubGlobal('fetch', mockFetchSuccess(''));
    renderAdvisor();

    const startBtn = screen.getByRole('button', { name: /start planning/i });
    fireEvent.click(startBtn);

    // Component should not crash; it should enter the started/chat state
    await waitFor(() => {
      // The chat container should be present (started=true)
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });
});

// ── F-06 — Reset ──────────────────────────────────────────────────────────────

describe('F-06 — Reset', () => {
  it('after starting and receiving a reply, clicking reset clears messages and resets state', async () => {
    vi.stubGlobal('fetch', mockFetchSuccess('How many days do you have?'));
    renderAdvisor();

    const startBtn = screen.getByRole('button', { name: /start planning/i });
    fireEvent.click(startBtn);

    // Wait for the reply to appear
    await waitFor(() => {
      expect(screen.getByText('How many days do you have?')).toBeInTheDocument();
    });

    // Click reset
    const resetBtn = screen.getByRole('button', { name: /new/i });
    fireEvent.click(resetBtn);

    // After reset, start button should be visible again and chat messages gone
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /start planning/i })).toBeInTheDocument();
    });
    expect(screen.queryByText('How many days do you have?')).not.toBeInTheDocument();
  });
});

// ── R-06 — API error shown ────────────────────────────────────────────────────

describe('R-06 — API error shown', () => {
  it('when /api/ask returns 500, error message appears in the UI', async () => {
    vi.stubGlobal('fetch', mockFetchError(500, 'Internal Server Error'));
    renderAdvisor();

    const startBtn = screen.getByRole('button', { name: /start planning/i });
    fireEvent.click(startBtn);

    // Should show the error message returned from the API
    await waitFor(() => {
      expect(screen.getByText('Internal Server Error')).toBeInTheDocument();
    });
  });
});
