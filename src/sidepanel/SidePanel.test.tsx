import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import SidePanel from './SidePanel';

const mockStorage: Record<string, unknown> = {};
let sendMessageMock: ReturnType<typeof vi.fn>;
let storageChangeListener: ((changes: Record<string, { newValue?: unknown }>, areaName: string) => void) | null = null;

const ATS_RESULT = {
  heuristics: { checks: [], score: 80 },
  analysis: { score: 80, summary: 'ok', strengths: [], missingKeywords: [], recommendations: [], skillScores: [] },
  cached: false,
  courses: [],
};

beforeEach(() => {
  // Stateful mock: GET_STATUS reflects the current connection state
  let connected = true;
  sendMessageMock = vi.fn((msg: { type: string }, cb?: (res: unknown) => void) => {
    const responses: Record<string, unknown> = {
      GET_STATUS: { connected },
      GET_PAGE_TEXT: { text: 'job text', url: 'https://example.com/job/1' },
      ANALYZE: ATS_RESULT,
      CONNECT: { connected: true },
      DISCONNECT: { ok: true },
      FEEDBACK: { ok: true },
    };
    if (msg.type === 'DISCONNECT') connected = false;
    if (msg.type === 'CONNECT') connected = true;
    const res = responses[msg.type];
    if (cb) {
      cb(res);
      return undefined;
    }
    return Promise.resolve(res);
  });

  vi.stubGlobal('chrome', {
    runtime: {
      sendMessage: sendMessageMock,
      lastError: null,
      onMessage: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
    storage: {
      local: {
        get: vi.fn(async (key: string) => ({ [key]: mockStorage[key] })),
        set: vi.fn(async (data: Record<string, unknown>) => {
          Object.assign(mockStorage, data);
        }),
        remove: vi.fn(async (key: string) => {
          delete mockStorage[key];
        }),
      },
      onChanged: {
        addListener: vi.fn((cb: typeof storageChangeListener) => {
          storageChangeListener = cb;
        }),
        removeListener: vi.fn(() => {
          storageChangeListener = null;
        }),
      },
    },
    tabs: {
      onActivated: { addListener: vi.fn(), removeListener: vi.fn() },
      onUpdated: { addListener: vi.fn(), removeListener: vi.fn() },
    },
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  storageChangeListener = null;
});

// Helper: resolves the connection status the way the app currently does —
// via a storage change (the only path that triggers refreshStatus on load).
function resolveConnectionViaStorageChange() {
  storageChangeListener?.({ extensionToken: { newValue: 'token' } }, 'local');
}

describe('SidePanel', () => {
  it('should_render_the_brand_title', () => {
    render(<SidePanel />);
    expect(screen.getByText('Radar Unificando')).toBeTruthy();
  });

  it('should_render_loading_state_while_analyzing', () => {
    // Defer the GET_PAGE_TEXT response so the analysis stays in 'loading'
    sendMessageMock.mockImplementation((msg: { type: string }, cb?: (res: unknown) => void) => {
      if (msg.type === 'GET_STATUS') {
        cb?.({ connected: true });
        return undefined;
      }
      if (msg.type === 'GET_PAGE_TEXT') {
        return new Promise(() => {}); // never resolves
      }
      return undefined;
    });

    render(<SidePanel />);
    expect(screen.getByText('Analisando vaga…')).toBeTruthy();
  });

  it('should_render_the_result_after_analysis_completes', async () => {
    render(<SidePanel />);
    await waitFor(() => {
      expect(screen.getByText('MATCH SCORE ATS')).toBeTruthy();
    });
  });

  it('should_render_the_current_page_url', async () => {
    render(<SidePanel />);
    await waitFor(() => {
      expect(screen.getByText('https://example.com/job/1')).toBeTruthy();
    });
  });

  it('should_render_error_view_when_analysis_fails', async () => {
    sendMessageMock.mockImplementation((msg: { type: string }, cb?: (res: unknown) => void) => {
      if (msg.type === 'GET_STATUS') {
        cb?.({ connected: true });
        return undefined;
      }
      if (msg.type === 'GET_PAGE_TEXT') {
        return Promise.resolve({ text: '', url: 'https://example.com' });
      }
      return undefined;
    });

    render(<SidePanel />);
    await waitFor(() => {
      expect(screen.getByText(/Não encontramos texto de vaga/)).toBeTruthy();
    });
  });

  it('should_render_error_view_with_connect_button_when_analysis_returns_NOT_CONNECTED', async () => {
    sendMessageMock.mockImplementation((msg: { type: string }, cb?: (res: unknown) => void) => {
      if (msg.type === 'GET_STATUS') {
        cb?.({ connected: false });
        return undefined;
      }
      if (msg.type === 'GET_PAGE_TEXT') {
        return Promise.resolve({ text: 'job text', url: 'https://example.com' });
      }
      if (msg.type === 'ANALYZE') {
        cb?.({ error: 'NOT_CONNECTED' });
        return undefined;
      }
      return undefined;
    });

    render(<SidePanel />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Conectar conta' })).toBeTruthy();
    });
  });

  it('should_show_connect_button_when_disconnected', async () => {
    sendMessageMock.mockImplementation((msg: { type: string }, cb?: (res: unknown) => void) => {
      if (msg.type === 'GET_STATUS') {
        cb?.({ connected: false });
        return undefined;
      }
      if (msg.type === 'GET_PAGE_TEXT') {
        return Promise.resolve({ text: 'job text', url: 'https://example.com' });
      }
      if (msg.type === 'ANALYZE') {
        cb?.(ATS_RESULT);
        return undefined;
      }
      return undefined;
    });

    render(<SidePanel />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Conectar' })).toBeTruthy();
    });
  });

  it('should_show_disconnect_button_when_connected', async () => {
    render(<SidePanel />);
    resolveConnectionViaStorageChange();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Desconectar' })).toBeTruthy();
    });
  });

  it('should_query_connection_status_on_mount', async () => {
    // REGRA CORRETA: ao abrir o painel, o status de conexão deve ser resolvido
    // via GET_STATUS para que o indicador reflita o estado real.
    render(<SidePanel />);
    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith({ type: 'GET_STATUS' }, expect.any(Function));
    });
  });

  it('should_trigger_reanalysis_when_clicking_reanalyze_button', async () => {
    render(<SidePanel />);
    await waitFor(() => {
      expect(screen.getByText('MATCH SCORE ATS')).toBeTruthy();
    });

    const reanalyzeButton = screen.getByRole('button', { name: 'Reanalisar' });
    fireEvent.click(reanalyzeButton);

    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith({ type: 'GET_PAGE_TEXT' });
    });
  });

  it('should_show_history_count_badge_when_history_exists', async () => {
    mockStorage['analysisHistory'] = [
      { url: 'https://example.com/job/1', title: 'Dev React', score: 85, date: '2024-01-01T00:00:00Z' },
    ];
    render(<SidePanel />);
    await waitFor(() => {
      expect(screen.getByText('1')).toBeTruthy();
    });
  });

  it('should_show_empty_history_message_when_no_history', async () => {
    render(<SidePanel />);
    await waitFor(() => {
      expect(screen.getByText('Histórico')).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: /Histórico/ }));
    expect(screen.getByText('Nenhuma análise ainda.')).toBeTruthy();
  });

  it('should_clear_history_when_clicking_limpar', async () => {
    mockStorage['analysisHistory'] = [
      { url: 'https://example.com/job/1', title: 'Dev React', score: 85, date: '2024-01-01T00:00:00Z' },
    ];
    render(<SidePanel />);
    await waitFor(() => {
      expect(screen.getByText('1')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /Histórico/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Limpar' }));

    await waitFor(() => {
      expect(screen.getByText('Nenhuma análise ainda.')).toBeTruthy();
    });
  });
});