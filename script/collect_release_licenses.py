#!/usr/bin/env python3
"""Collect license texts for the pinned macOS dependency graph, without secrets."""
import json
import shutil
import subprocess
import html
from pathlib import Path

root = Path(__file__).resolve().parents[1]
out = root / 'distribution/licenses'
metadata = json.loads(subprocess.check_output([
    'cargo', 'metadata', '--locked', '--offline', '--filter-platform', 'aarch64-apple-darwin',
    '--format-version', '1', '--manifest-path', str(root / 'apps/desktop/src-tauri/Cargo.toml')]))
nodes = {n['id']: n for n in metadata['resolve']['nodes']}
ids = set()
def walk(key):
    if key in ids: return
    ids.add(key)
    for dep in nodes[key]['deps']:
        if any(kind['kind'] is None for kind in dep['dep_kinds']): walk(dep['pkg'])
walk(metadata['resolve']['root'])
rows = []
# Standard MIT permission text; preserve each package's own notices as well.
mit_permission = (root / 'apps/desktop/node_modules/svelte/LICENSE.md').read_text().split('\n\n', 1)[1]
for package in sorted(metadata['packages'], key=lambda p: (p['name'], p['version'])):
    if package['id'] not in ids or not package['source']: continue
    name, version = package['name'], package['version']
    source = Path(package['manifest_path']).parent
    destination = out / 'rust' / f'{name}-{version}'
    destination.mkdir(parents=True, exist_ok=True)
    originals = [p for p in source.iterdir() if p.is_file() and p.name.upper().startswith(
        ('LICENSE', 'LICENCE', 'COPYING', 'NOTICE', 'COPYRIGHT'))]
    for directory in ['LICENSES', 'licenses']:
        if (source / directory).is_dir():
            originals.extend(p for p in (source / directory).rglob('*') if p.is_file())
    for p in originals:
        target = destination / p.relative_to(source)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(p, target)
    fallback = out / 'rust-upstream' / f'{name}-{version}'
    if not originals:
        if not fallback.is_dir(): raise RuntimeError(f'Missing license: {name}-{version}')
        for p in fallback.iterdir(): shutil.copyfile(p, destination / p.name)
        # objc2 upstream supplies SPDX declarations + a licensing explanation.
        # Include the standard permission text and exact author metadata as well.
        if package['repository'] == 'https://github.com/madsmtm/objc2':
            (destination / 'MIT-permission.txt').write_text(
                f"Package: {name} {version}\nDeclared license: {package['license']}\n"
                f"Authors (Cargo metadata): {', '.join(package['authors'])}\n"
                'MIT is selected where alternative licenses are offered.\n'
                'The original upstream licensing explanation is included in LICENSE.md.\n\n' + mit_permission)
    rows.append({'ecosystem': 'rust', 'name': name, 'version': version,
        'declaredLicense': package['license'], 'authors': package['authors'],
        'repository': package['repository'],
        'sourceArchive': f'https://static.crates.io/crates/{name}/{name}-{version}.crate',
        'noticeDirectory': f'rust/{name}-{version}'})
for name in ['svelte', '@tauri-apps/api', '@tauri-apps/plugin-dialog', '@tauri-apps/plugin-fs']:
    source = root / 'apps/desktop/node_modules' / name
    package = json.loads((source / 'package.json').read_text())
    destination = out / 'javascript' / name.replace('/', '__')
    destination.mkdir(parents=True, exist_ok=True)
    for p in source.iterdir():
        if p.is_file() and p.name.upper().startswith(('LICENSE', 'NOTICE', 'COPYING')):
            shutil.copyfile(p, destination / p.name)
    if name.startswith('@tauri-apps/'):
        # Plugins' npm archives contain SPDX but not the complete permission text.
        for p in (root / 'apps/desktop/node_modules/@tauri-apps/api').glob('LICENSE-*'):
            shutil.copyfile(p, destination / p.name)
    rows.append({'ecosystem': 'javascript', 'name': name, 'version': package['version'],
        'declaredLicense': package['license'], 'noticeDirectory': 'javascript/' + name.replace('/', '__')})
# Rust standard-library attribution (not the developer's toolchain or binaries).
rustc = Path(subprocess.check_output(['rustc', '--print', 'sysroot'], text=True).strip())
rust_docs = rustc / 'share/doc/rust'
shutil.copyfile(rust_docs / 'COPYRIGHT-library.html', out / 'Rust-standard-library-COPYRIGHT.html')
shutil.copytree(rust_docs / 'licenses', out / 'rust-standard-library-licenses', dirs_exist_ok=True)
(out / 'dependency-inventory.json').write_text(json.dumps(rows, indent=2) + '\n')
# Emscripten and its linked C/C++ runtime components.
em = root / '.tools/emsdk/upstream/emscripten'
for name in ['LICENSE', 'AUTHORS', 'system/lib/libc/musl/COPYRIGHT',
             'system/lib/libcxx/LICENSE.TXT', 'system/lib/libcxxabi/LICENSE.TXT',
             'system/lib/compiler-rt/LICENSE.TXT', 'system/lib/libunwind/LICENSE.TXT']:
    source = em / name
    if source.is_file():
        target = out / 'emscripten' / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
intro = '''<!doctype html><html lang="en"><meta charset="utf-8"><title>Micropolis — Licenses and Source</title>
<style>body{font:16px system-ui;line-height:1.6;max-width:960px;margin:32px auto;padding:0 24px}a{overflow-wrap:anywhere}</style>
<h1>Micropolis 0.1.0 — Licenses and Source</h1>
<p>Modified Tauri distribution based on MicropolisCore. Copyright © 1989–2007 Electronic Arts Inc. and Micropolis contributors. Provided without warranty. You may redistribute and modify it under GPL-3.0-or-later with the original EA additional terms.</p>
<p>Micropolis is a registered trademark of Micropolis Corporation (Micropolis GmbH), used as a courtesy of the owner under the Micropolis Public Name License. No endorsement by EA, Maxis, or Micropolis GmbH is claimed.</p>
<p>The distribution uses only graphics from the original GPL release. Unverified additional tile sets are excluded. The complete corresponding source snapshot is in the Source folder on the distribution disk image, including the original graphics and dependency source archives. The same source must accompany the GitHub release. No proprietary game assets are required to rebuild this desktop distribution.</p>
<p>Fira Mono remains under the SIL Open Font License 1.1. Libraries retain their respective licenses. MIT is selected where offered as an alternative; conjunctive licenses and notices are retained.</p><ul>'''
files = sorted(p.relative_to(out) for p in out.rglob('*') if p.is_file() and p.name != 'index.html')
links = '\n'.join(f'<li><a href="{html.escape(p.as_posix(), quote=True)}">{html.escape(p.as_posix())}</a></li>' for p in files)
(out / 'index.html').write_text(intro + links + '</ul></html>\n')
print(f'Collected notices for {len(rows)} macOS Rust/JavaScript packages plus font and Rust standard library.')
