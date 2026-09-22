from pathlib import Path
import json
import collections


def test_r4_floor_routes_and_paired_beds(run_probe):
    path = Path(__file__).resolve().parents[1] / 'preview/designs/point-tower-2026-09-18/point-tower-r4.plan.json'
    result = run_probe('org.govpraya.builder.plan.PlanProbe', path.read_text())
    assert result.returncode == 0, result.stderr
    artifact = json.loads(result.stdout)
    cells = {(c['x'], c['y'], c['z']): c['block'] for c in artifact['blocks']}
    def free(x, y, z):
        state = cells.get((x, y, z), 'minecraft:air')
        return state == 'minecraft:air' or '_door[' in state or state.endswith('_carpet')
    def reachable(y, start, target):
        queue, seen = collections.deque([start]), {start}
        while queue:
            x, z = queue.popleft()
            for point in [(x-1,z),(x+1,z),(x,z-1),(x,z+1)]:
                xx, zz = point
                if point not in seen and 4 <= xx <= 22 and 6 <= zz <= 13 and free(xx,y,zz) and free(xx,y+1,zz):
                    seen.add(point)
                    queue.append(point)
        return target in seen
    for y in [6,10,14,18,22,26]:
        assert reachable(y, (9,8), (6,12)), ('west bathroom',y)
        if y < 22:
            assert reachable(y, (17,8), (20,12)), ('east bathroom',y)
        else:
            assert reachable(y, (9,8), (17,10)), ('upper study',y)
    beds = [(p,s) for p,s in cells.items() if '_bed[' in s]
    assert len(beds) == 20
    for (x,y,z),state in beds:
        assert 'occupied=false' in state and 'facing=south' in state
        head = 'part=head' in state
        other = cells[x,y,z-1 if head else z+1]
        assert ('part=foot' if head else 'part=head') in other
