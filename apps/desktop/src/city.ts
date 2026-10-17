import type { MicropolisSimulator } from '../../micropolis/src/lib/MicropolisSimulator';
import { micropolisReactive } from '../../micropolis/src/lib/MicropolisReactive.svelte';

export const CITY_SIZES = [27120, 51120]; // classic .cty / engine extended .mop
const temporaryPath = '/desktop-transfer.mop';

type FileSystem = {
  readFile(path: string): Uint8Array;
  writeFile(path: string, bytes: Uint8Array): void;
  unlink(path: string): void;
};

function engineFS(simulator: MicropolisSimulator): FileSystem {
  return (simulator.micropolisengine as unknown as { FS: FileSystem }).FS;
}

export function validateCity(bytes: Uint8Array): void {
  if (!CITY_SIZES.includes(bytes.byteLength)) {
    throw new Error('Invalid city file. Select a classic .cty (27120 bytes) or .mop (51120 bytes).');
  }
}

// Use the original C++ format, including all history and map overlay data.
export function exportCity(simulator: MicropolisSimulator): Uint8Array {
  const fs = engineFS(simulator);
  try {
    const city = simulator.micropolis as typeof simulator.micropolis & { saveFile(path: string): boolean };
    if (!city?.saveFile(temporaryPath)) throw new Error('The engine could not save this city.');
    const bytes = fs.readFile(temporaryPath).slice();
    validateCity(bytes);
    return bytes;
  } finally {
    try { fs.unlink(temporaryPath); } catch { /* Not created if saving failed. */ }
  }
}

export function importCity(simulator: MicropolisSimulator, bytes: Uint8Array, name: string): void {
  validateCity(bytes); // Reject invalid size before touching the live city.
  const fs = engineFS(simulator);
  try {
    fs.writeFile(temporaryPath, bytes);
    if (!simulator.micropolis!.loadCity(temporaryPath)) throw new Error('The engine could not load this city.');
    simulator.micropolis!.setCityName(name.replace(/\.(cty|mop)$/i, ''));
    simulator.syncMapViews();
    micropolisReactive.syncFromEngine();
    simulator.render();
  } finally {
    try { fs.unlink(temporaryPath); } catch { /* Keep the original error. */ }
  }
}
