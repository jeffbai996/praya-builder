"""Successor designs improve every elevation and retain usable room routes."""
from collections import deque

import pytest

from test_irregular_designs import compile_design
from test_mansion import test_all_bedrooms_living_spaces_and_roof_have_walkable_connections as check_house_routes
from test_praya_redesigns import test_rosedale_all_six_levels_and_studios_are_reachable as check_home_routes


@pytest.fixture(scope='module')
def homes(run_probe):
    return compile_design(run_probe, 'postmodern', 'r2')


@pytest.fixture(scope='module')
def house(run_probe):
    return compile_design(run_probe, 'mansion', 'r1')


def reachable(artifact, start):
    cells = {(b['x'], b['y'], b['z']): b['block'] for b in artifact['blocks']}
    dims = artifact['dimensions']
    def empty(p):
        return cells.get(p, 'minecraft:air') == 'minecraft:air'
    seen, queue = {start}, deque([start])
    while queue:
        x, y, z = queue.popleft()
        for dx, dz in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
            for dy in [-1, 0, 1]:
                p = (x+dx, y+dy, z+dz)
                px, py, pz = p
                if (p not in seen and 0 <= px < dims['x'] and 1 <= py < dims['y']-1
                        and 0 <= pz < dims['z'] and empty(p) and empty((px, py+1, pz))
                        and not empty((px, py-1, pz))):
                    seen.add(p); queue.append(p)
    return seen


def test_every_rosedale_studio_has_bathroom_fittings_and_access(homes):
    check_home_routes(homes)
    cells = homes['blocks']
    for floor in range(1, 6):
        owned = [b for b in cells if b['component'] == f'homes-{floor}']
        assert sum(b['block'] == 'minecraft:cauldron' for b in owned) >= 2
        assert sum(b['block'].startswith('minecraft:smoker[') for b in owned) == 2
        assert any('white_stained_glass_pane[' in b['block'] for b in owned)
    targets = {(x, 2+floor*4, 23) for floor in range(5) for x in (12, 20)}
    targets |= {(18, 2+floor*4, 28) for floor in range(6)}
    assert targets <= reachable(homes, (16, 1, 1)), targets-reachable(homes, (16, 1, 1))


def test_house_keeps_domestic_routes_and_adds_accessible_rear_terraces(house):
    check_house_routes(house)
    assert {(24, 2, 35), (24, 8, 35)} <= reachable(house, (21, 1, 0))
    ids = {b['component'] for b in house['blocks']}
    assert {'garden-elevation', 'side-screens', 'interior-joinery'} <= ids


@pytest.mark.parametrize('project,revision,parent', [('postmodern', 'r2', 'r1'), ('mansion', 'r1', 'r0')])
def test_both_side_and_rear_elevations_gain_built_detail(project, revision, parent, run_probe):
    current, previous = (compile_design(run_probe, project, r) for r in (revision, parent))
    old = {(b['x'], b['y'], b['z']): b['block'] for b in previous['blocks']}
    changed = [b for b in current['blocks'] if b['block'] != 'minecraft:air'
               and old.get((b['x'], b['y'], b['z'])) != b['block']]
    west, east, rear = (5, 27, 26) if project == 'postmodern' else (5, 39, 33)
    assert sum(b['x'] <= west and b['z'] > 12 for b in changed) > 45
    assert sum(b['x'] >= east and b['z'] > 12 for b in changed) > 45
    assert sum(b['z'] >= rear for b in changed) > 120
    assert len(current['blocks']) <= 10000
    assert current['dimensions'] == previous['dimensions']
    for identity in ['address-marker'] if project == 'postmodern' else ['entrance-marker', 'pool']:
        assert [b for b in current['blocks'] if b['component'] == identity] == [b for b in previous['blocks'] if b['component'] == identity]


@pytest.mark.parametrize('project,revision,expected', [
    ('postmodern', 'r1', '07fd22963d1bdbd83d0113df40cb943d7ebe74315b21c15ddc869665ae04a863'),
    ('mansion', 'r0', '8ffe4a99d56f4a5feb70de878146e4a195b50b3a3444a28e5895159d7150c660'),
])
def test_parent_designs_remain_immutable(project, revision, expected, run_probe):
    assert compile_design(run_probe, project, revision)['hash'] == expected
