#!/usr/bin/env python3
"""Derive smoother BlueMap distance tiles without changing source map tiles."""
from __future__ import annotations

from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path
import argparse
import ctypes
import json
import os
import select
import struct
import tempfile
import time

import numpy as np
from PIL import Image, ImageFilter

TILE_SIZE = 501
FILTERS = {1: (51, 4), 2: (11, 2), 3: (3, 1)}
ALGORITHM = 1
MANIFEST = '.praya-distance-manifest.json'
IN_CLOSE_WRITE = 0x00000008
IN_MOVED_TO = 0x00000080
IN_CREATE = 0x00000100
IN_DELETE = 0x00000200
IN_DELETE_SELF = 0x00000400
IN_MOVE_SELF = 0x00000800
IN_ONLYDIR = 0x01000000
WATCH_MASK = IN_CLOSE_WRITE | IN_MOVED_TO | IN_CREATE | IN_DELETE | IN_DELETE_SELF | IN_MOVE_SELF | IN_ONLYDIR


def coords(path: Path, root: Path) -> tuple[int, int, int]:
    parts = path.relative_to(root).parts
    lod = int(parts[0])
    x_parts, z_parts = [], []
    target = x_parts
    for part in parts[1:]:
        if part.startswith('x'):
            target = x_parts
            part = part[1:]
        elif part.startswith('z'):
            target = z_parts
            part = part[1:]
        target.append(part.removesuffix('.png'))
    return lod, int(''.join(x_parts)), int(''.join(z_parts))


def heights(path: Path) -> np.ndarray:
    pixels = np.asarray(Image.open(path))
    meta = pixels[TILE_SIZE:, :, :]
    unsigned = meta[:, :, 1].astype(np.int32) * 256 + meta[:, :, 2].astype(np.int32)
    return np.where(unsigned >= 32768, unsigned - 65535, unsigned)


def box_blur(values: np.ndarray, radius: int) -> np.ndarray:
    if not radius:
        return values.astype(np.float32)
    padded = np.pad(values.astype(np.float64), radius, mode='edge')
    integral = np.pad(padded.cumsum(0).cumsum(1), ((1, 0), (1, 0)))
    size = radius * 2 + 1
    return (integral[size:, size:] - integral[:-size, size:]
            - integral[size:, :-size] + integral[:-size, :-size]) / (size * size)


def build_one(job: tuple[Path, Path, Path, dict[tuple[int, int, int], Path]]) -> tuple[str, float]:
    source, destination, root, paths = job
    started = time.monotonic()
    lod, x, z = coords(source, root)
    filter_size, blur_radius = FILTERS[lod]
    # Erosion followed by dilation reaches a full filter width beyond the
    # output pixel; the blur adds its own radius.
    pad = filter_size - 1 + blur_radius
    center = heights(source)
    extended = np.pad(center, pad, mode='edge')
    for dz in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if not dx and not dz:
                continue
            neighbor_path = paths.get((lod, x + dx, z + dz))
            if neighbor_path is None:
                continue
            neighbor = heights(neighbor_path)
            y_out = slice(0, pad) if dz < 0 else slice(pad + TILE_SIZE, None) if dz > 0 else slice(pad, pad + TILE_SIZE)
            x_out = slice(0, pad) if dx < 0 else slice(pad + TILE_SIZE, None) if dx > 0 else slice(pad, pad + TILE_SIZE)
            y_in = slice(TILE_SIZE - pad - 1, TILE_SIZE - 1) if dz < 0 else slice(1, pad + 1) if dz > 0 else slice(None)
            x_in = slice(TILE_SIZE - pad - 1, TILE_SIZE - 1) if dx < 0 else slice(1, pad + 1) if dx > 0 else slice(None)
            extended[y_out, x_out] = neighbor[y_in, x_in]
    opened = Image.fromarray(extended.astype(np.int32)).filter(ImageFilter.MinFilter(filter_size)).filter(ImageFilter.MaxFilter(filter_size))
    smoothed = box_blur(np.asarray(opened), blur_radius)[pad:pad + TILE_SIZE, pad:pad + TILE_SIZE]
    result = np.minimum(center, np.rint(smoothed).astype(np.int32))
    encoded = np.where(result < 0, result + 65535, result).astype(np.uint16)
    pixels = np.array(Image.open(source))
    pixels[TILE_SIZE:, :, 1] = encoded >> 8
    pixels[TILE_SIZE:, :, 2] = encoded & 255
    destination.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(prefix='.praya-tile-', suffix='.png', dir=destination.parent)
    os.close(fd)
    try:
        Image.fromarray(pixels).save(temp_name, format='PNG', optimize=True)
        os.replace(temp_name, destination)
    finally:
        if os.path.exists(temp_name):
            os.unlink(temp_name)
    return str(destination), time.monotonic() - started


def fingerprint(path: Path) -> str:
    stat = path.stat()
    return f'{stat.st_size}:{stat.st_mtime_ns}'


def build(source: Path, destination: Path, workers: int, limit: int = 0) -> tuple[int, int]:
    paths = {coords(path, source): path for lod in FILTERS for path in (source / str(lod)).rglob('*.png')}
    manifest_path = destination / MANIFEST
    try:
        manifest = json.loads(manifest_path.read_text())
    except (FileNotFoundError, ValueError):
        manifest = {}
    old = manifest.get('files', {}) if manifest.get('algorithm') == ALGORITHM else {}
    current = {str(path.relative_to(source)): fingerprint(path) for path in paths.values()}
    changed = {relative for relative, signature in current.items()
               if old.get(relative) != signature or not (destination / relative).is_file()}
    changed_coords = {coords(source / relative, source) for relative in changed}
    affected = set(changed_coords)
    for lod, x, z in changed_coords:
        affected.update((lod, x + dx, z + dz) for dx in (-1, 0, 1) for dz in (-1, 0, 1))
    items = [paths[key] for key in sorted(affected) if key in paths]
    if limit:
        items = items[:limit]
    jobs = [(path, destination / path.relative_to(source), source, paths) for path in items]
    started = time.monotonic()
    with ProcessPoolExecutor(max_workers=workers) as pool:
        for index, result in enumerate(as_completed(pool.submit(build_one, job) for job in jobs), 1):
            path, seconds = result.result()
            if index % 25 == 0 or index == len(jobs):
                print(f'{index}/{len(jobs)} tiles, {time.monotonic() - started:.1f}s elapsed, last {seconds:.2f}s: {path}', flush=True)
    if not limit:
        for relative in old.keys() - current.keys():
            stale = destination / relative
            if stale.is_file():
                stale.unlink()
        destination.mkdir(parents=True, exist_ok=True)
        fd, temp_name = tempfile.mkstemp(prefix='.praya-manifest-', dir=destination)
        try:
            with os.fdopen(fd, 'w') as stream:
                json.dump({'algorithm': ALGORITHM, 'files': current}, stream, sort_keys=True)
            os.replace(temp_name, manifest_path)
        finally:
            if os.path.exists(temp_name):
                os.unlink(temp_name)
    return len(items), len(paths)


def watch(source: Path, destination: Path, workers: int) -> None:
    if not (source / '1').is_dir():
        raise FileNotFoundError(f'BlueMap distance tile source unavailable: {source}')
    libc = ctypes.CDLL(None, use_errno=True)
    fd = libc.inotify_init1(os.O_CLOEXEC)
    if fd < 0:
        raise OSError(ctypes.get_errno(), 'inotify_init1')
    watched: set[Path] = set()

    def add_directories() -> None:
        for lod in FILTERS:
            parent = source / str(lod)
            if not parent.is_dir():
                continue
            for path in (parent, *parent.rglob('*')):
                if path in watched or not path.is_dir():
                    continue
                if libc.inotify_add_watch(fd, os.fsencode(path), WATCH_MASK) < 0:
                    raise OSError(ctypes.get_errno(), f'inotify_add_watch {path}')
                watched.add(path)

    try:
        add_directories()
        count, total = build(source, destination, workers)
        print(f'distance tiles ready: {count} rebuilt, {total} source tiles', flush=True)
        poller = select.poll()
        poller.register(fd, select.POLLIN)
        while True:
            poller.poll()
            os.read(fd, 1024 * 1024)
            # Coalesce a burst of BlueMap writes; no periodic scan while idle.
            while poller.poll(2000):
                os.read(fd, 1024 * 1024)
            watched.clear()
            add_directories()
            count, total = build(source, destination, workers)
            print(f'distance tiles refreshed: {count} rebuilt, {total} source tiles', flush=True)
    finally:
        os.close(fd)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=Path)
    parser.add_argument('destination', type=Path)
    parser.add_argument('--workers', type=int, default=4)
    parser.add_argument('--limit', type=int, default=0)
    parser.add_argument('--watch', action='store_true')
    args = parser.parse_args()
    if args.watch:
        if args.limit:
            parser.error('--limit is not supported with --watch')
        watch(args.source, args.destination, args.workers)
    else:
        count, total = build(args.source, args.destination, args.workers, args.limit)
        print(f'distance tiles ready: {count} rebuilt, {total} source tiles', flush=True)


if __name__ == '__main__':
    main()
