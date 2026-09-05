import json

import pytest


PROBE = "org.govpraya.builder.ai.GeminiProbe"


def response(parts, finish="STOP"):
    return {"candidates": [{"finishReason": finish, "content": {"parts": parts}}]}


def test_text_parts_are_joined_and_thinking_is_excluded(run_probe):
    payload = response([
        {"thought": True, "text": "private reasoning"},
        {"text": '{"blocks":'}, {"text": "[]}"},
    ])
    result = run_probe(PROBE, json.dumps(payload))
    assert result.returncode == 0, result.stderr
    assert result.stdout.strip() == '{"blocks":[]}'


@pytest.mark.parametrize("payload", [
    response([{"text": '{"blocks":'}], "MAX_TOKENS"),
    response([{"text": "partial"}], "SAFETY"),
    response([]),
    response([{"thought": True, "text": "only reasoning"}]),
    {"candidates": []},
    {"promptFeedback": {"blockReason": "SAFETY"}},
])
def test_incomplete_or_blocked_responses_fail_explicitly(run_probe, payload):
    result = run_probe(PROBE, json.dumps(payload))
    assert result.returncode != 0


def test_provider_contract_over_loopback_http(run_probe):
    result = run_probe("org.govpraya.builder.ai.GeminiHttpProbe", "200",
                       json.dumps(response([{"text": '{"name":"Example"}'}])))
    assert result.returncode == 0, result.stderr
    assert result.stdout.strip() == '{"name":"Example"}'


@pytest.mark.parametrize("status", [401, 429, 500])
def test_http_failures_do_not_disclose_response_body(run_probe, status):
    marker = "EXAMPLE_SENSITIVE_RESPONSE_DO_NOT_LOG"
    result = run_probe("org.govpraya.builder.ai.GeminiHttpProbe", str(status), marker)
    assert result.returncode == 2, result.stderr
    assert f"HTTP {status}" in result.stderr
    assert marker not in result.stdout + result.stderr


def test_invalid_success_envelope_reports_a_provider_error(run_probe):
    result = run_probe("org.govpraya.builder.ai.GeminiHttpProbe", "200", "not-json")
    assert result.returncode == 2
    assert "Malformed Gemini response" in result.stderr
