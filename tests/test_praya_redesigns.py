"""Clinic and residential redesigns preserve identity without the old facades."""
import json
import subprocess

import pytest

from test_irregular_designs import ROOT, compile_design
from test_braemar_revision import test_enlarged_rooms_and_landings_remain_reachable as check_clinic_routes
from test_braemar_revision import test_logo_matches_the_reference_from_the_public_front as check_logo


@pytest.fixture(scope='module')
def clinic(run_probe):
    return compile_design(run_probe, 'braemar', 'r2')


@pytest.fixture(scope='module')
def homes(run_probe):
    return compile_design(run_probe, 'postmodern', 'r1')


def test_clinic_uses_logo_without_wordmark_geometry(clinic):
    ids = {c['id'] for c in clinic['components']}
    assert not ids & {'clinic-lettering', 'identity-monument', 'signage-fascia', 'entrance-sign'}
    assert {'entry-portal', 'civic-cornice', 'medical-sign'} <= ids
    check_logo(clinic)
    assert any(b['block'] == 'minecraft:terracotta' for b in clinic['blocks'])


def test_postmodern_clinic_keeps_its_care_rooms_accessible(clinic):
    check_clinic_routes(clinic)


def test_rosedale_is_rebuilt_in_praya_materials_and_massing(homes):
    ids = {c['id'] for c in homes['components']}
    assert {'residential-frame', 'balconies', 'roof-garden', 'address-marker'} <= ids
    assert not ids & {'crown', 'portal'}
    assert {f'homes-{i}' for i in range(1, 7)} <= ids
    blocks = {b['block'] for b in homes['blocks']}
    assert not blocks & {'minecraft:pink_terracotta', 'minecraft:smooth_sandstone', 'minecraft:glass'}
    assert {'minecraft:deepslate_bricks', 'minecraft:smooth_quartz', 'minecraft:bricks'} <= blocks
    assert any('stained_glass_pane[' in b for b in blocks)


def test_rosedale_all_six_levels_and_studios_are_reachable(homes):
    from collections import deque
    cells = {(b['x'], b['y'], b['z']): b['block'] for b in homes['blocks']}
    def empty(p):
        return cells.get(p, 'minecraft:air') == 'minecraft:air'
    seen, queue = {(16, 1, 1)}, deque([(16, 1, 1)])
    while queue:
        x, y, z = queue.popleft()
        for dx, dz in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
            for dy in [-1, 0, 1]:
                p = (x+dx, y+dy, z+dz)
                px, py, pz = p
                if (p not in seen and 0 <= px < 32 and 1 <= py < 31 and 0 <= pz < 32
                        and empty(p) and empty((px, py+1, pz)) and not empty((px, py-1, pz))):
                    seen.add(p); queue.append(p)
    targets = {(18, y, 19) for y in [2, 6, 10, 14, 18, 22]}
    targets |= {(x, y, 18) for y in [2, 6, 10, 14, 18] for x in [12, 20]}
    assert targets <= seen, targets-seen


@pytest.mark.parametrize('project,revision,expected', [
    ('braemar', 'r1', 'd7ae97c459bde882d658dbdf3f8d9d360ded713ad87ebddcbc065283b10eb0d7'),
    ('postmodern', 'r0', 'b1ef4e21e2e5a264c582a07b0d46bf461350671b52f9bcf46b314d36b53ea260'),
])
def test_superseded_designs_stay_immutable(project, revision, expected, run_probe):
    assert compile_design(run_probe, project, revision)['hash'] == expected


@pytest.mark.parametrize('fixture', ['clinic', 'homes'])
def test_redesigns_fit_budget_and_render(request, fixture):
    artifact = request.getfixturevalue(fixture)
    assert 5000 < len(artifact['blocks']) <= 10000
    result = subprocess.run(['node', '-e',
        "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{"
        "const m=require('./preview/mesh.cjs').meshArtifact(JSON.parse(s),32);"
        "console.log(m.sections.reduce((n,p)=>n+p.positions.length,0));});"],
        cwd=ROOT, input=json.dumps(artifact), text=True, capture_output=True, check=True)
    assert int(result.stdout) > 0
