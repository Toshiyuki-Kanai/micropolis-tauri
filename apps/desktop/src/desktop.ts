import { isTauri } from '@tauri-apps/api/core';
import { Menu, MenuItem, PredefinedMenuItem, Submenu } from '@tauri-apps/api/menu';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { open, save, confirm, message } from '@tauri-apps/plugin-dialog';
import { readFile, writeFile } from '@tauri-apps/plugin-fs';
import type { MicropolisSimulator } from '../../micropolis/src/lib/MicropolisSimulator';
import { exportCity, importCity, validateCity } from './city';

function simulator(): MicropolisSimulator {
  const store = (globalThis as unknown as { __MICROPOLIS_SINGLETON__?: { simulator?: MicropolisSimulator } }).__MICROPOLIS_SINGLETON__;
  if (!store?.simulator?.micropolis) throw new Error('The city is still loading. Please try again shortly.');
  return store.simulator;
}

let busy = false;
async function withPausedCity(action: (sim: MicropolisSimulator) => Promise<void>) {
  if (busy) return;
  busy = true;
  let sim: MicropolisSimulator | undefined;
  let paused = false;
  try {
    sim = simulator();
    paused = sim.paused;
    sim.setPaused(true);
    await action(sim);
  } catch (error) {
    await message(String(error), { title: 'Micropolis', kind: 'error' });
  } finally {
    if (sim && !paused) sim.setPaused(false);
    busy = false;
  }
}

export async function initializeDesktop() {
  if (!isTauri()) return; // The same entry also supports browser/WebKit testing.
  const appWindow = getCurrentWindow();
  const saveCity = () => withPausedCity(async sim => {
    const path = await save({ title: 'Save City', defaultPath: `${sim.micropolis!.cityName || 'City'}.mop`,
      filters: [{ name: 'Micropolis City (with overlays)', extensions: ['mop'] }] });
    if (path) await writeFile(path, exportCity(sim));
  });
  const loadCity = () => withPausedCity(async sim => {
    const path = await open({ title: 'Open City', multiple: false, directory: false,
      filters: [{ name: 'Micropolis City', extensions: ['cty', 'mop'] }] });
    if (typeof path !== 'string') return;
    const bytes = await readFile(path);
    // Validate before asking to replace the current city.
    validateCity(bytes);
    if (await confirm('Replace the current city? Unsaved changes will be lost.', { title: 'Open City', kind: 'warning' })) {
      importCity(sim, bytes, path.split('/').pop()!);
    }
  });
  const menu = await Menu.new({ items: [
    await Submenu.new({ text: 'Micropolis', items: [
      await PredefinedMenuItem.new({ item: { About: { name: 'Micropolis', version: '0.1.0',
        copyright: '© 1989–2007 Electronic Arts Inc. and Micropolis contributors. Modified Tauri distribution. GPL-3.0-or-later; no warranty. Micropolis is a registered trademark of Micropolis GmbH, used under the Micropolis Public Name License. Licenses and corresponding source: see the Licenses folder included with this app.' } } }),
      await MenuItem.new({ text: 'Licenses and Source…', action: () => { void import('@tauri-apps/api/webviewWindow').then(async ({ WebviewWindow }) => { if (!(await WebviewWindow.getByLabel('licenses'))) new WebviewWindow('licenses', { url: 'licenses/index.html', title: 'Micropolis — Licenses and Source', width: 850, height: 700 }); }); } }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await PredefinedMenuItem.new({ item: 'Hide' }),
      await PredefinedMenuItem.new({ item: 'HideOthers' }),
      await PredefinedMenuItem.new({ item: 'ShowAll' }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await MenuItem.new({ text: 'Quit Micropolis', accelerator: 'CmdOrCtrl+Q', action: () => { void appWindow.close(); } })
    ] }),
    await Submenu.new({ text: 'File', items: [
      await MenuItem.new({ text: 'Open City…', accelerator: 'CmdOrCtrl+O', action: () => { void loadCity(); } }),
      await MenuItem.new({ text: 'Save City As…', accelerator: 'CmdOrCtrl+Shift+S', action: () => { void saveCity(); } }),
      await MenuItem.new({ text: 'Save City…', accelerator: 'CmdOrCtrl+S', action: () => { void saveCity(); } })
    ] }),
    await Submenu.new({ text: 'Edit', items: [
      await PredefinedMenuItem.new({ item: 'Cut' }),
      await PredefinedMenuItem.new({ item: 'Copy' }),
      await PredefinedMenuItem.new({ item: 'Paste' }),
      await PredefinedMenuItem.new({ item: 'SelectAll' })
    ] }),
    await Submenu.new({ text: 'Window', items: [
      await PredefinedMenuItem.new({ item: 'Minimize' }),
      await PredefinedMenuItem.new({ item: 'Maximize' })
    ] })
  ] });
  await menu.setAsAppMenu();
  await appWindow.onCloseRequested(handleCloseRequest);
}

// Tauri awaits this handler and calls Window.destroy() if default is allowed.
// Do not call close() here: that would emit another close request.
export async function handleCloseRequest(event: { preventDefault(): void }) {
  if (busy) {
    event.preventDefault();
    return;
  }
  busy = true;
  let sim: MicropolisSimulator | undefined;
  let wasPaused = true;
  try {
    // Quitting must also work while the engine is still loading.
    try { sim = simulator(); } catch { /* No active city to pause yet. */ }
    if (sim) {
      wasPaused = sim.paused;
      sim.setPaused(true);
    }
    const confirmed = await confirm('Quit Micropolis? Any changes since your last save will be lost.', {
      title: 'Micropolis', kind: 'warning'
    });
    if (!confirmed) event.preventDefault();
    else if (isTauri()) {
      // Closing the main game must also close the auxiliary license window.
      const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      const legalWindow = await WebviewWindow.getByLabel('licenses');
      await legalWindow?.destroy();
    }
  } catch (error) {
    event.preventDefault();
    await message(String(error), { title: 'Micropolis', kind: 'error' });
  } finally {
    if (sim && !wasPaused) sim.setPaused(false);
    busy = false;
  }
}
