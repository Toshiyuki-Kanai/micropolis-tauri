#!/usr/bin/env python3
"""Losslessly pack the original GPL release's XPMs for the existing web renderer.
Requires Pillow for regeneration only. No game/map/simulation data is changed.
"""
from pathlib import Path
import json
import ast
import re
from PIL import Image


def read_xpm(path):
    # Preserve XPM whitespace keys and 16-bit/channel colours (old XPMs).
    strings = [ast.literal_eval(re.match(r'"(?:[^"\\]|\\.)*"', line).group(0)) for line in path.read_text().splitlines()
               if line.startswith('"')]
    width, height, colours, cpp = map(int, strings[0].split())
    palette = {}
    for entry in strings[1:1 + colours]:
        key, definition = entry[:cpp], entry[cpp:]
        colour = re.search(r'\bc\s+(\S+)', definition).group(1)
        if colour == 'None': rgba = (0, 0, 0, 0)
        elif colour.startswith('#'):
            hexcode = colour[1:]; digits = len(hexcode) // 3
            rgba = tuple(round(int(hexcode[i * digits:(i + 1) * digits], 16) * 255 / (16 ** digits - 1)) for i in range(3)) + (255,)
        else: raise ValueError(f'Unsupported XPM colour: {colour}')
        palette[key] = rgba
    rows = strings[1 + colours:]
    assert len(rows) == height and all(len(row) == width * cpp for row in rows), path
    image = Image.new('RGBA', (width, height))
    image.putdata([palette[row[i:i + cpp]] for row in rows for i in range(0, len(row), cpp)])
    return image

root = Path(__file__).resolve().parents[1]
source = root / 'distribution/source-assets/micropolis-gpl'
output = root / 'apps/desktop/assets/gpl'
output.mkdir(parents=True, exist_ok=True)
with read_xpm(source / 'tiles.xpm') as tiles:
    assert tiles.size == (16, 960 * 16)
    tiles.convert('RGBA').save(output / 'tiles.png')
for manifest in sorted((root / 'apps/micropolis/src/lib/sprites/manifests/classic').glob('*.json')):
    spec = json.loads(manifest.read_text())
    width, height = spec['frameWidth'], spec['frameHeight']
    atlas = Image.new('RGBA', (width * len(spec['frames']), height))
    for frame in spec['frames']:
        index = frame['index']
        with read_xpm(source / f"obj{spec['engineType']}-{index}.xpm") as image:
            assert image.size == (width, height), (manifest.name, image.size)
            atlas.paste(image.convert('RGBA'), (frame['atlas']['x'], frame['atlas']['y']))
    atlas.save(output / spec['sheet'])
print('Packed original GPL tile atlas and 7 sprite atlases.')
