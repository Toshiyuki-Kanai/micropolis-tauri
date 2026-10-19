import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { fileURLToPath } from 'node:url';

// Compile the original game components directly; no website/server routes.
const gpl = fileURLToPath(new URL('./assets/gpl', import.meta.url));
const safeImages = Object.fromEntries(['classic-sprite-plane.png', 'classic-sprite-chopper.png',
  'classic-sprite-train.png', 'classic-sprite-ship.png', 'classic-sprite-monster.png',
  'classic-sprite-tornado.png', 'classic-sprite-explode.png'].map(name =>
  [`$lib/images/tilesets/${name}`, `${gpl}/${name}`]));
const game = fileURLToPath(new URL('../micropolis/src/lib', import.meta.url));
export default defineConfig({
  resolve: { alias: { '$lib/images/tilesets/all.png': `${gpl}/tiles.png`, ...safeImages, $lib: game }, dedupe: ['svelte'] },
  plugins: [svelte(), viteStaticCopy({ targets: [
    { src: `${game}/micropolisengine.wasm`, dest: '.' },
    { src: `${game}/micropolisengine.data`, dest: '.' },
    { src: '../../LICENSE', dest: 'licenses' },
    { src: '../../Micropolis*License*.md', dest: 'licenses' },
    { src: '../../gpl-3.0.txt', dest: 'licenses' },
    { src: '../../distribution/licenses/*', dest: 'licenses' }
  ] })],
  build: { target: 'safari15', outDir: 'dist' },
  server: { fs: { allow: ['../..'] }, watch: { ignored: ['**/src-tauri/**'] } }
});
