def test_static_fixtures_and_block_entity_guards(run_probe):
    result = run_probe("org.govpraya.builder.generation.PlacementPolicyProbe")
    assert result.returncode == 0, result.stdout + result.stderr
    assert "PLACEMENT_POLICY_PASS" in result.stdout
