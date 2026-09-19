#!/usr/bin/env python3
"""Praya MCP tools for the provider-independent Builder workspace.

This module deliberately contains no Minecraft or RCON operations. It forwards
bounded design records to the Builder workspace, whose compiler and diagnostics
remain the authority. Imported by server.py for its @mcp.tool() side effects.
"""
from __future__ import annotations

import json
import os
import re
from typing import Any
from urllib.parse import parse_qsl, urlsplit

import httpx

from app import mcp


DEFAULT_WORKSPACE_URL = "https://fragbox.tailab4af9.ts.net:8463"
_ID = re.compile(r"^[a-z0-9-]{1,80}$")
_COMPONENT = re.compile(r"^[A-Za-z0-9_-]{1,80}$")
_HASH = re.compile(r"^[a-f0-9]{64}$")
_FILE = re.compile(r"^[a-z0-9-]+\.png$")
_AUTHOR_FIELDS = {"agent", "model", "effort", "note"}
_MISSING = object()


def _identifier(value: str, label: str) -> str:
    if not isinstance(value, str) or not _ID.fullmatch(value):
        raise ValueError(f"{label} must contain 1-80 lowercase letters, numbers, or hyphens")
    return value


def _component(value: str) -> str:
    if not isinstance(value, str) or not _COMPONENT.fullmatch(value):
        raise ValueError("component_id must contain 1-80 letters, numbers, underscores, or hyphens")
    return value


def _author(value: dict[str, str]) -> dict[str, str]:
    if not isinstance(value, dict) or not value:
        raise ValueError("author is required for Builder writes")
    if not {"agent", "model"}.issubset(value):
        raise ValueError("author.agent and author.model are required for Builder writes")
    unknown = set(value) - _AUTHOR_FIELDS
    if unknown:
        raise ValueError("unknown author field: " + sorted(unknown)[0])
    result: dict[str, str] = {}
    for key, item in value.items():
        if not isinstance(item, str) or not item.strip() or len(item) > 120:
            raise ValueError(f"author.{key} must be non-empty text up to 120 characters")
        result[key] = item.strip()
    return result


def _mapping(value: dict[str, Any], label: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValueError(f"{label} must be an object")
    # Fail locally on values httpx could not encode and detach caller-owned data.
    try:
        return json.loads(json.dumps(value))
    except (TypeError, ValueError) as error:
        raise ValueError(f"{label} must be JSON-compatible") from error


class BuilderWorkspace:
    """Small async HTTP adapter, with injectable transport for contract tests."""

    def __init__(self, base_url: str | None = None, *, transport: httpx.AsyncBaseTransport | None = None):
        raw = (base_url or os.environ.get("BUILDER_WORKSPACE_URL") or DEFAULT_WORKSPACE_URL).rstrip("/")
        parsed = urlsplit(raw)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc or parsed.path not in {"", "/"} or parsed.query or parsed.fragment:
            raise ValueError("BUILDER_WORKSPACE_URL must be an http(s) origin")
        self.base_url = raw
        self.origin = f"{parsed.scheme}://{parsed.netloc}"
        self.transport = transport

    def absolute(self, path: str) -> str:
        return self.origin + path

    async def request(self, route: str, body: Any = _MISSING) -> Any:
        if not isinstance(route, str) or not route or route.startswith("/") or ".." in route or "://" in route:
            raise ValueError("invalid Builder workspace route")
        write = body is not _MISSING
        headers = {"X-Builder-Write": "1"} if write else {}
        timeout = httpx.Timeout(120.0, connect=15.0)
        async with httpx.AsyncClient(transport=self.transport, timeout=timeout, follow_redirects=False) as client:
            response = await client.request(
                "POST" if write else "GET",
                f"{self.base_url}/api/workspace/{route}",
                headers=headers,
                json=body if write else None,
            )
        try:
            data = response.json()
        except ValueError as error:
            raise RuntimeError(f"Builder workspace returned invalid JSON ({response.status_code})") from error
        if not response.is_success:
            message = data.get("error") if isinstance(data, dict) else None
            raise RuntimeError(message or f"Builder workspace request failed ({response.status_code})")
        return data


_workspace = BuilderWorkspace()


def _sheet_index(index: str, expected_artifact: str | None = None) -> tuple[str, str, str]:
    if not isinstance(index, str):
        raise RuntimeError("Builder review has no sheet manifest")
    parsed = urlsplit(index)
    match = re.fullmatch(r"/api/workspace/artifacts/([a-f0-9]{64})/sheet/index\.json", parsed.path)
    query = parse_qsl(parsed.query, keep_blank_values=True)
    if parsed.scheme or parsed.netloc or parsed.fragment or not match or len(query) != 1 or query[0][0] != "review" or not _HASH.fullmatch(query[0][1]):
        raise RuntimeError("Builder review returned an invalid sheet manifest path")
    artifact, review = match[1], query[0][1]
    if expected_artifact and artifact != expected_artifact:
        raise RuntimeError("Builder review sheet does not match the requested design")
    return index.removeprefix("/api/workspace/"), artifact, review


def _sheet_links(manifest: dict[str, Any], *, artifact: str | None = None, review: str | None = None) -> dict[str, Any]:
    if not isinstance(manifest, dict):
        raise RuntimeError("Builder review returned an invalid sheet manifest")
    artifact = manifest.get("artifactHash") if artifact is None else artifact
    review = manifest.get("reviewHash") if review is None else review
    if not _HASH.fullmatch(artifact or "") or not _HASH.fullmatch(review or ""):
        raise RuntimeError("Builder review returned an invalid sheet identity")
    if manifest.get("artifactHash") != artifact or manifest.get("reviewHash") != review or not isinstance(manifest.get("views"), list):
        raise RuntimeError("Builder review sheet identity changed while loading")
    prefix = f"/api/workspace/artifacts/{artifact}/sheet/"
    suffix = f"?review={review}"
    output = json.loads(json.dumps(manifest))
    for view in output["views"]:
        if not isinstance(view, dict) or not _FILE.fullmatch(view.get("file", "")):
            raise RuntimeError("Builder review returned an invalid sheet view")
        expected = prefix + view["file"] + suffix
        if view.get("url") != expected:
            raise RuntimeError("Builder review returned an unexpected sheet image path")
        view["url"] = _workspace.absolute(expected)
    output["indexUrl"] = _workspace.absolute(prefix + "index.json" + suffix)
    return output


@mcp.tool()
async def builder_context(draft_id: str | None = None, include_parts: bool = False) -> dict:
    """Get Builder surveys, drafts, saved versions and limits, or one draft's complete agent context."""
    route = "context" if draft_id is None else f"drafts/{_identifier(draft_id, 'draft_id')}/context"
    context = await _workspace.request(route)
    if include_parts:
        context["partLibrary"] = await _workspace.request("parts")
    return context


@mcp.tool()
async def builder_site(site_id: str) -> dict:
    """Get one immutable surveyed site, including exact captured blocks and plot metadata."""
    return await _workspace.request(f"sites/{_identifier(site_id, 'site_id')}")


@mcp.tool()
async def builder_post_plan(
    plan: dict[str, Any],
    author: dict[str, str],
    site_id: str | None = None,
    transform: dict[str, Any] | None = None,
    brief: str = "",
    parent_hash: str | None = None,
) -> dict:
    """Compile a structured plan as a new draft. This does not place blocks in a world."""
    if not isinstance(brief, str) or len(brief) > 12000:
        raise ValueError("brief must be text up to 12000 characters")
    body: dict[str, Any] = {"plan": _mapping(plan, "plan"), "author": _author(author), "brief": brief}
    if site_id is not None:
        body["siteId"] = _identifier(site_id, "site_id")
    if transform is not None:
        body["transform"] = _mapping(transform, "transform")
    if parent_hash is not None:
        if not _HASH.fullmatch(parent_hash):
            raise ValueError("parent_hash must be a SHA-256 artifact hash")
        body["parentHash"] = parent_hash
    return await _workspace.request("drafts", body)


@mcp.tool()
async def builder_edit(
    draft_id: str,
    expected_version: int,
    author: dict[str, str],
    plan: dict[str, Any] | None = None,
    palette: dict[str, Any] | None = None,
    component_id: str | None = None,
    variant: dict[str, Any] | None = None,
) -> dict:
    """Compile a full-plan or scoped component/material edit against an exact draft version."""
    if isinstance(expected_version, bool) or not isinstance(expected_version, int) or expected_version < 1:
        raise ValueError("expected_version must be a positive integer")
    if plan is None and palette is None and variant is None:
        raise ValueError("builder_edit requires plan, palette, or variant")
    body: dict[str, Any] = {"expectedVersion": expected_version, "author": _author(author)}
    if plan is not None:
        body["plan"] = _mapping(plan, "plan")
    if palette is not None:
        body["palette"] = _mapping(palette, "palette")
    if component_id is not None:
        body["componentId"] = _component(component_id)
    if variant is not None:
        body["variant"] = _mapping(variant, "variant")
    return await _workspace.request(f"drafts/{_identifier(draft_id, 'draft_id')}/edit", body)


@mcp.tool()
async def builder_review(draft_id: str) -> dict:
    """Run the normal context retrieval path for a draft's diagnostics, access, site caps and sheet identity."""
    return await _workspace.request(f"drafts/{_identifier(draft_id, 'draft_id')}/context")


@mcp.tool()
async def builder_save(
    draft_id: str,
    expected_version: int,
    candidate_hash: str,
    idempotency_key: str,
    author: dict[str, str],
) -> dict:
    """Save an exact valid candidate as an immutable revision, recording the saving actor separately."""
    if isinstance(expected_version, bool) or not isinstance(expected_version, int) or expected_version < 1:
        raise ValueError("expected_version must be a positive integer")
    if not _HASH.fullmatch(candidate_hash or ""):
        raise ValueError("candidate_hash must be a SHA-256 artifact hash")
    if not isinstance(idempotency_key, str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,100}", idempotency_key):
        raise ValueError("idempotency_key must contain 1-100 letters, numbers, underscores, or hyphens")
    body = {"expectedVersion": expected_version, "candidateHash": candidate_hash, "idempotencyKey": idempotency_key, "author": _author(author)}
    return await _workspace.request(f"drafts/{_identifier(draft_id, 'draft_id')}/save", body)


@mcp.tool()
async def builder_sheet(draft_id: str | None = None, revision_id: str | None = None) -> dict:
    """Get review-sheet metadata and absolute PNG links for exactly one draft or saved revision; returns no image bytes."""
    if (draft_id is None) == (revision_id is None):
        raise ValueError("provide exactly one of draft_id or revision_id")
    if draft_id is not None:
        context = await _workspace.request(f"drafts/{_identifier(draft_id, 'draft_id')}/context")
        candidate = context.get("candidateHash") if isinstance(context, dict) else None
        if not _HASH.fullmatch(candidate or ""):
            raise RuntimeError("Builder review returned no candidate identity")
        route, artifact, review = _sheet_index(context.get("sheet", {}).get("index"), candidate)
        return _sheet_links(await _workspace.request(route), artifact=artifact, review=review)
    manifest = await _workspace.request(f"revisions/{_identifier(revision_id, 'revision_id')}/sheet")
    return _sheet_links(manifest)
