PROBE = "org.govpraya.builder.ai.GeneratorFactoryProbe"


def fields(result):
    assert result.returncode == 0, result.stderr
    return dict(line.split("=", 1) for line in result.stdout.strip().splitlines())


def test_environment_variable_wins_over_every_other_source(run_probe):
    result = run_probe(PROBE, "env=env-key", "envfile=file-key", "inline=inline-key")
    out = fields(result)
    assert out == {"credential": "environment", "value": "env-key", "generator": "present", "warnings": "0"}


def test_key_file_from_environment_is_trimmed(run_probe):
    result = run_probe(PROBE, "envfile=  file-key\n", "inline=inline-key")
    out = fields(result)
    assert out["credential"] == "GEMINI_API_KEY_FILE"
    assert out["value"] == "file-key"
    assert out["warnings"] == "0"


def test_relative_config_key_file_resolves_against_data_folder(run_probe):
    out = fields(run_probe(PROBE, "configfile-relative=relative-key"))
    assert out["credential"] == "gemini.api-key-file"
    assert out["value"] == "relative-key"
    assert out["generator"] == "present"


def test_inline_config_key_still_works_but_warns_without_disclosing_it(run_probe):
    result = run_probe(PROBE, "inline=inline-secret")
    out = fields(result)
    assert out["credential"] == "config.yml inline (deprecated)"
    assert out["generator"] == "present"
    assert out["warnings"] == "1"
    assert "deprecated" in result.stderr
    assert "inline-secret" not in result.stderr


def test_placeholder_and_blank_values_mean_unconfigured(run_probe):
    out = fields(run_probe(PROBE, "env=YOUR_API_KEY_HERE", "inline=   "))
    assert out == {"credential": "absent", "value": "", "generator": "absent", "warnings": "1"}


def test_missing_key_file_fails_closed(run_probe):
    result = run_probe(PROBE, "missingfile=1", "inline=inline-key")
    out = fields(result)
    assert out["credential"] == "absent"
    assert out["generator"] == "absent"
    assert "Could not read key file" in result.stderr


def test_provider_none_disables_generation_without_warnings(run_probe):
    out = fields(run_probe(PROBE, "provider=none", "env=env-key"))
    assert out["generator"] == "absent"
    assert out["warnings"] == "0"


def test_unknown_provider_is_rejected(run_probe):
    result = run_probe(PROBE, "provider=claude", "env=env-key")
    out = fields(result)
    assert out["generator"] == "absent"
    assert "Unknown ai.provider" in result.stderr
