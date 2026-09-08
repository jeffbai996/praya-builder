"""The mansion combines reference-led massing with inspectable domestic detail."""
import json
import subprocess
from collections import deque

import pytest

from test_irregular_designs import ROOT, compile_design


@pytest.fixture(scope="module")
def house(run_probe):
    return compile_design(run_probe, 'mansion', 'r0')


def test_mansion_has_a_bounded_irregular_plan_and_domestic_programme(house):
    assert house['dimensions'] == {'x': 44, 'y': 24, 'z': 40}
    assert 5000 < len(house['blocks']) <= 10000
    assert {'living-room', 'dining-hall', 'kitchen', 'study', 'primary-suite',
            'bedroom-two', 'bedroom-three', 'bathrooms', 'stairs', 'roof-lounge',
            'pool', 'entrance-marker'} <= {c['id'] for c in house['components']}
    cells = {(b['x'], b['y'], b['z']): b for b in house['blocks']}
    assert cells.get((21, 7, 18), {}).get('block', 'minecraft:air') == 'minecraft:air'
    assert cells[(10, 7, 18)]['component'] == 'envelope'
    assert cells[(31, 7, 18)]['component'] == 'envelope'


def test_furniture_has_thin_armrests_bedding_lamps_and_fittings(house):
    blocks = [b['block'] for b in house['blocks']]
    assert any('oak_trapdoor[' in b and 'open=true' in b for b in blocks)
    assert any('smooth_quartz_stairs[' in b for b in blocks)
    assert 'minecraft:light_gray_carpet' in blocks
    assert 'minecraft:white_carpet' in blocks
    assert any('lantern[' in b for b in blocks)
    assert any('tripwire_hook[' in b for b in blocks)
    assert 'minecraft:cauldron' in blocks
    assert not any('wall_sign[' in b for b in blocks), 'Invisible renderer sign models must not stand in for armrests'


def test_house_prefers_tinted_panes_and_retains_an_address_marker(house):
    blocks = [b['block'] for b in house['blocks']]
    tinted = sum('stained_glass_pane[' in b for b in blocks)
    clear = sum(b.startswith('minecraft:glass_pane[') for b in blocks)
    assert tinted > clear > 0
    assert 'minecraft:glass' not in blocks
    assert sum(b['component'] == 'entrance-marker' for b in house['blocks']) > 10


def test_all_bedrooms_living_spaces_and_roof_have_walkable_connections(house):
    cells = {(b['x'], b['y'], b['z']): b['block'] for b in house['blocks']}
    def empty(p):
        return cells.get(p, 'minecraft:air') == 'minecraft:air'
    seen, queue = {(21, 1, 0)}, deque([(21, 1, 0)])
    while queue:
        x, y, z = queue.popleft()
        for dx, dz in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
            for dy in [-1, 0, 1]:
                p = (x+dx, y+dy, z+dz)
                px, py, pz = p
                if (p not in seen and 0 <= px < 44 and 1 <= py < 23 and 0 <= pz < 40
                        and empty(p) and empty((px, py+1, pz)) and not empty((px, py-1, pz))):
                    seen.add(p); queue.append(p)
    targets = [(21, 2, 14), (13, 2, 20), (12, 2, 29), (30, 2, 18),
               (24, 8, 30), (12, 8, 20), (31, 8, 18), (31, 8, 28),
               (24, 14, 32), (16, 14, 29)]
    assert set(targets) <= seen, f'Unreachable: {set(targets)-seen}'


def test_mansion_meshes_with_existing_renderer_assets(house):
    result = subprocess.run(['node', '-e',
        "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{"
        "const m=require('./preview/mesh.cjs').meshArtifact(JSON.parse(s),24);"
        "console.log(m.sections.reduce((n,p)=>n+p.positions.length,0));});"],
        cwd=ROOT, input=json.dumps(house), text=True, capture_output=True, check=True)
    assert int(result.stdout) > 0


def test_clinic_r1_is_unchanged_by_the_new_house(run_probe):
    assert compile_design(run_probe, 'braemar', 'r1')['hash'] == 'd7ae97c459bde882d658dbdf3f8d9d360ded713ad87ebddcbc065283b10eb0d7'
