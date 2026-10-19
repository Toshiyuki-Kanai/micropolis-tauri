#!/usr/bin/env python3
"""Create the corresponding desktop source snapshot, excluding unused/unverified art."""
import hashlib
import json
import subprocess
import tarfile
import tomllib
from pathlib import Path

root = Path(__file__).resolve().parents[1]
out = root / 'build/release/0.1.0'
out.mkdir(parents=True, exist_ok=True)
metadata = json.loads(subprocess.check_output(['cargo', 'metadata', '--locked', '--offline',
    '--filter-platform', 'aarch64-apple-darwin', '--format-version', '1',
    '--manifest-path', str(root / 'apps/desktop/src-tauri/Cargo.toml')]))
nodes = {n['id']: n for n in metadata['resolve']['nodes']}
ids = set()
def walk(key):
    if key in ids: return
    ids.add(key)
    for dep in nodes[key]['deps']:
        if any(k['kind'] is None for k in dep['dep_kinds']): walk(dep['pkg'])
walk(metadata['resolve']['root'])
lock = tomllib.loads((root / 'apps/desktop/src-tauri/Cargo.lock').read_text())
checksums = {(p['name'], p['version']):p.get('checksum') for p in lock['package']}
paths = subprocess.check_output(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], cwd=root).split(b'\0')
prefixes = ('apps/desktop/', 'apps/micropolis/src/', 'packages/micropolis-engine/',
            'packages/render-core/', 'packages/tile-renderer/', 'content/micropolis/cities/',
            'distribution/', 'script/', '.codex/environments/')
root_files = {'package.json','pnpm-lock.yaml','pnpm-workspace.yaml','tsconfig.base.json',
              'rust-toolchain.toml','README.md','README.macOS.md','LICENSE',
              'MicropolisGPLLicenseNotice.md','MicropolisPublicNameLicense.md','gpl-3.0.txt','.gitignore'}
app_configs = {'package.json','svelte.config.js','vite.config.ts','tsconfig.json','vitest.config.ts'}
files = []
for raw in paths:
    if not raw: continue
    name = raw.decode()
    if name.startswith('apps/micropolis/src/lib/images/'): continue
    if name in {'distribution/0.1.0/READINESS.ja.md', 'distribution/0.1.0/release-plan.json', 'distribution/0.1.0/RELEASE-NOTES.md'}: continue
    selected = name.startswith(prefixes) or name in root_files or (
        name.startswith('apps/micropolis/') and name.split('/')[-1] in app_configs and name.count('/') == 2)
    if selected and (root / name).is_file(): files.append(name)
base = 'Micropolis-0.1.0-source'
manifest = {}
archive = out / f'{base}.tar.gz'
with tarfile.open(archive, 'w:gz') as tar:
    for name in sorted(set(files)):
        p = root / name
        manifest[name] = hashlib.sha256(p.read_bytes()).hexdigest()
        tar.add(p, arcname=f'{base}/{name}', recursive=False)
    for package in metadata['packages']:
        if package['id'] not in ids or not package['source']: continue
        source = Path(package['manifest_path']).parent
        cached = source.parents[1].parent / 'cache' / source.parent.name / f"{package['name']}-{package['version']}.crate"
        data = cached.read_bytes()
        digest = hashlib.sha256(data).hexdigest()
        assert digest == checksums[(package['name'], package['version'])], cached.name
        name = f'dependencies/rust/{cached.name}'
        manifest[name] = digest
        tar.add(cached, arcname=f'{base}/{name}', recursive=False)
    for name in ['svelte','@tauri-apps/api','@tauri-apps/plugin-dialog','@tauri-apps/plugin-fs','@fontsource/fira-mono']:
        package_root = (root / 'apps/desktop/node_modules' / name).resolve()
        for p in sorted(package_root.rglob('*')):
            if p.is_file() and 'node_modules' not in p.relative_to(package_root).parts:
                dest = f'dependencies/javascript/{name}/{p.relative_to(package_root)}'
                manifest[dest] = hashlib.sha256(p.read_bytes()).hexdigest()
                tar.add(p, arcname=f'{base}/{dest}', recursive=False)
(out / 'source-file-sha256.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(archive, archive.stat().st_size, 'bytes;', len(manifest), 'source/dependency files')
