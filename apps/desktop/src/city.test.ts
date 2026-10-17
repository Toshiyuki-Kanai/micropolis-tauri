import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { loadMicropolisMainModule } from '../../micropolis/src/lib/wasm/node';
import { callbackMethodNames } from '../../micropolis/src/lib/wasm/callbacks';
import { createMapMopViews } from '../../micropolis/src/lib/wasm/views';
import type { MicropolisSimulator } from '../../micropolis/src/lib/MicropolisSimulator';
import type { MainModule, Micropolis } from '../../micropolis/src/types/micropolisengine.d';
import { exportCity, importCity, validateCity } from './city';

// Real compiled C++/WASM: verify binary format and no map transpose/data loss.
describe('desktop city file transfer', () => {
  let engine: MainModule;
  let city: Micropolis;
  let sim: MicropolisSimulator;
  beforeAll(async () => {
    engine = await loadMicropolisMainModule();
    city = new engine.Micropolis();
    const callback = Object.fromEntries(callbackMethodNames.map(name => [name, () => {}]));
    city.setCallback(new engine.JSCallback(callback), {});
    city.init();
    expect(city.loadCity('/cities/haight.cty')).toBe(true);
    sim = {
      micropolisengine: engine, micropolis: city,
      syncMapViews: () => true, render: () => {}
    } as unknown as MicropolisSimulator;
  });
  afterAll(() => city?.delete());

  it('saves and reloads map, overlay, time, funds and settings through original C++ code', () => {
    const views = createMapMopViews(engine, city)!;
    views.mapData[37 * 100 + 42] = 21;
    views.mopData[37 * 100 + 42] = 123;
    city.cityTime = 8765;
    city.totalFunds = 123456;
    city.cityTax = 9;
    const before = views.mapData.slice();
    const overlays = views.mopData.slice();
    const bytes = exportCity(sim);
    expect(bytes.length).toBe(51120);
    const saved = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    // C++ loadCity intentionally rescans zones/power and updates some map flags.
    // Assert every saved tile BEFORE that initialization, in original column order.
    expect(Array.from(before)).toEqual(Array.from({ length: 12000 }, (_, i) => saved.getUint16(3120 + i * 2, false)));
    city.clearMap();
    city.totalFunds = 1;
    importCity(sim, bytes, 'Roundtrip.mop');
    const after = createMapMopViews(engine, city)!;
    expect(after.mapData[37 * 100 + 42] & 1023).toBe(21);
    expect(after.mopData).toEqual(overlays);
    expect(city.cityTime).toBe(8765);
    expect(city.totalFunds).toBe(123456);
    expect(city.cityTax).toBe(9);
    expect(city.cityName).toBe('Roundtrip');
  });

  it('rejects malformed size without replacing the current city', () => {
    const before = createMapMopViews(engine, city)!.mapData.slice();
    expect(() => importCity(sim, new Uint8Array(123), 'bad')).toThrow('Invalid city file');
    expect(createMapMopViews(engine, city)!.mapData).toEqual(before);
    expect(() => validateCity(new Uint8Array(27120))).not.toThrow();
  });
});
