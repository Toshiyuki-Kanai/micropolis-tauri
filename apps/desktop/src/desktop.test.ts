import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { isTauri } from '@tauri-apps/api/core';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { confirm, message } from '@tauri-apps/plugin-dialog';
import { handleCloseRequest } from './desktop';

vi.mock('@tauri-apps/api/core', async importOriginal => ({ ...(await importOriginal<typeof import('@tauri-apps/api/core')>()), isTauri: vi.fn(() => false) }));
vi.mock('@tauri-apps/api/webviewWindow', () => ({ WebviewWindow: { getByLabel: vi.fn() } }));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  confirm: vi.fn(), message: vi.fn(), open: vi.fn(), save: vi.fn()
}));

const runtime = globalThis as unknown as { __MICROPOLIS_SINGLETON__?: unknown };
afterEach(() => {
  delete runtime.__MICROPOLIS_SINGLETON__;
  vi.resetAllMocks();
});

describe('desktop close request regression', () => {
  it('closes the auxiliary license window when quitting the game', async () => {
    vi.mocked(isTauri).mockReturnValue(true);
    vi.mocked(confirm).mockResolvedValue(true);
    const destroy = vi.fn().mockResolvedValue(undefined);
    vi.mocked(WebviewWindow.getByLabel).mockResolvedValue({ destroy } as unknown as WebviewWindow);
    const preventDefault = vi.fn();
    await handleCloseRequest({ preventDefault });
    expect(destroy).toHaveBeenCalledOnce();
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('keeps the license window when quitting is cancelled', async () => {
    vi.mocked(isTauri).mockReturnValue(true);
    vi.mocked(confirm).mockResolvedValue(false);
    const preventDefault = vi.fn();
    await handleCloseRequest({ preventDefault });
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(WebviewWindow.getByLabel).not.toHaveBeenCalled();
  });

  it('allows Tauri to destroy the window after confirmation, without issuing another close request', async () => {
    const setPaused = vi.fn();
    runtime.__MICROPOLIS_SINGLETON__ = { simulator: { micropolis: {}, paused: false, setPaused } };
    vi.mocked(confirm).mockResolvedValue(true);
    const preventDefault = vi.fn();
    await handleCloseRequest({ preventDefault });
    expect(preventDefault).not.toHaveBeenCalled();
    expect(setPaused.mock.calls).toEqual([[true], [false]]);
    // onCloseRequested in Tauri's JS API calls destroy(), which is not in core:default.
    const config = JSON.parse(readFileSync(new URL('../src-tauri/tauri.conf.json', import.meta.url), 'utf8'));
    expect(config.app.security.capabilities[0].permissions).toContain('core:window:allow-destroy');
  });

  it('keeps the window when the user cancels', async () => {
    vi.mocked(confirm).mockResolvedValue(false);
    const preventDefault = vi.fn();
    await handleCloseRequest({ preventDefault });
    expect(preventDefault).toHaveBeenCalledOnce();
  });

  it('can quit before the city finishes initializing', async () => {
    vi.mocked(confirm).mockResolvedValue(true);
    const preventDefault = vi.fn();
    await handleCloseRequest({ preventDefault });
    expect(preventDefault).not.toHaveBeenCalled();
    expect(message).not.toHaveBeenCalled();
  });

  it('prevents overlapping quit dialogs and permits another attempt after cancellation', async () => {
    let answer!: (confirmed: boolean) => void;
    vi.mocked(confirm).mockReturnValueOnce(new Promise(resolve => { answer = resolve; }));
    const first = vi.fn(), second = vi.fn();
    const pending = handleCloseRequest({ preventDefault: first });
    await handleCloseRequest({ preventDefault: second });
    expect(second).toHaveBeenCalledOnce();
    expect(confirm).toHaveBeenCalledOnce();
    answer(false);
    await pending;
    expect(first).toHaveBeenCalledOnce();
    vi.mocked(confirm).mockResolvedValue(true);
    const retry = vi.fn();
    await handleCloseRequest({ preventDefault: retry });
    expect(retry).not.toHaveBeenCalled();
  });
});
