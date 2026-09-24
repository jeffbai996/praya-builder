# Praya map independent of Minecraft

Deployed 2026-09-23. The existing URL, `https://fragserv.tailab4af9.ts.net:8448/`, now serves BlueMap's rendered files through a separate user service. Main Praya does not need to run for browsing or plot selection. The Sandbox console links to it as **Main-world reference map**.

## Data and limits

- Source: `/home/jbai/minecraft/praya/bluemap/web`, currently a symlink to `/mnt/wsl-storage/minecraft/praya-bluemap-web` (approximately 2.6 GiB).
- This serves the existing main-world render. It is not a Sandbox map and does not show Sandbox placements.
- The viewer serves BlueMap's high-resolution tiles directly. Its 272 low-resolution distance tiles have a separate derived copy under `/home/jbai/.local/share/praya-map/distance-tiles`; original render files remain unchanged.
- `praya-distance-tiles.service` watches the source tile directories using inotify and rebuilds a changed tile and its neighbors after BlueMap writes them. It does not poll while idle or start Minecraft.
- The renderer still runs with main Praya. Only serving is independent; no offline rendering job was added.
- The host, storage mount, and map service must be available. Stopping Minecraft does not stop this service.
- Saved markers remain available offline. Player requests proxy to BlueMap when available and return an empty object when it is stopped, avoiding stale player locations.

## Map UI update

The map theme uses the Fragify/Fragflix dark palette and self-hosted Plus Jakarta
Sans and Anthropic Sans fonts. Flat **Map**, perspective **3D**, and **Fly** modes
remain available. The Builder integration is collapsed to a small **Builder**
button until opened. The two-corner Studio handoff is unchanged.

The production status can be expanded, moved, minimized, or hidden. Its position
and visibility are stored in the browser; the small info button restores a
hidden status. The distance tile pipeline removes isolated height peaks from
the main world's 3D and Fly views while preserving the original tile colors
and matched tile boundaries. Fly temporarily loads high-resolution
tiles to 500 blocks on desktop and 250 on narrow screens; leaving Fly restores
the previous distance. A manual slider change while flying takes precedence.
BlueMap represents distant terrain as a heightfield, so buildings beyond the
high-resolution tile radius remain simplified. The derived tiles do not alter
BlueMap's original render or Minecraft world data.

The generated `streets`, `street-pins`, and `mrt` marker sets are retired. The
sign scan and marker generator remain as historical source material; do not run
`map-tools/gen_markers.py` to republish those layers. Street geometry will need
a separate verified or manually drawn source. No new street lines are inferred
from signs in this update.

As deployed, Builder Studio on port 8463 is configured for `praya-test` with no
production `mapUrl`. The map can draw and link a plot selection, but Studio
rejects its import. Keep that test-world binding intact; a separate production
Studio connection is needed before the handoff can be accepted.

From a checkout on the Minecraft host, inspect and then apply the map update:

```sh
python3 tools/install-praya-map.py /home/jbai/minecraft/praya /home/jbai/.local/share/praya-map
python3 tools/install-praya-map.py /home/jbai/minecraft/praya /home/jbai/.local/share/praya-map --apply
```

The installer backs up changed files with `.before-map-theme-20260923`, then
updates the BlueMap webapp config, current settings, saved marker data, UI
assets, page metadata, and the independent viewer context. It does not modify
world files or restart a service. Reload the browser to receive the change.
The licensed Anthropic Sans font is copied from the existing local console
installation at apply time; it is not stored in Git.

## Runtime

- `praya-map.service`, enabled in the FragServ WSL user session, has no dependency on either Minecraft unit.
- `praya-distance-tiles.service` maintains the separate low-resolution distance tiles. It can be restarted or run as a one-shot regeneration without affecting Minecraft.
- Nginx binds only to `127.0.0.1:18100`; the existing Windows Tailscale Serve HTTPS 8448 route forwards there. Tailnet exposure is unchanged.
- The plugin's built-in webserver remains on 8100, avoiding port contention when Minecraft starts.
- Nginx 1.24.0-2ubuntu7.18 was downloaded from the configured Ubuntu package repository and extracted under `/home/jbai/.local/share/praya-map/runtime`; it is not a system-wide apt installation. Update this extracted package explicitly for future Nginx security updates.
- Config: `/home/jbai/.local/share/praya-map/nginx.conf`; overlay: `map-context.js` in that directory. Source copies are under `ops/praya-map/`.
- Nginx serves derived main-world LOD 1–3 PNGs when present, and falls back to the original BlueMap PNGs while a derived tile is missing. Tile files are replaced atomically after rebuilding.
- The context label is injected into the served HTML. The UI update modifies
  BlueMap's webroot and configuration, with backups; Minecraft world files are
  not modified.
- Compressed texture/PRBM files use `gzip_static always`; missing tiles return 204. PHP, hidden files and backup files are not served.
- Read-only server status comes from the production console at 5009. Console unavailability does not prevent map browsing.

## Operations and rollback

```sh
systemctl --user status praya-map.service
systemctl --user status praya-distance-tiles.service
~/.local/share/praya-map/runtime/usr/sbin/nginx -t -p ~/.local/share/praya-map/ -c ~/.local/share/praya-map/nginx.conf
systemctl --user reload praya-map.service
```

For a one-shot rebuild after a BlueMap render, or after changing the filter:

```sh
python3 ~/.local/share/praya-map/build-distance-tiles.py ~/minecraft/praya/bluemap/web/maps/world/tiles ~/.local/share/praya-map/distance-tiles
```

The manifest records source size and modification time for each tile. Deleting
the manifest forces a complete rebuild. The watcher rebuilds changed tiles and
their eight neighbors so shared tile edges remain continuous.

To restore the previous hosting arrangement, point Windows Tailscale Serve HTTPS 8448 back at `http://localhost:8100` and disable `praya-map.service`. The map would then depend on Minecraft again. The previous Sandbox panel config is saved at `/home/jbai/.local/share/praya-map/sandbox-panel.before.json`; restore only its map fields if other settings have subsequently changed.

Reference: [BlueMap external webserver documentation](https://bluemap.bluecolored.de/wiki/webserver/ExternalWebserversFile.html).

## Verification

- Nginx configuration check passed. HTTPS 8448 loaded the map with `praya-mc.service` inactive.
- Headless browser check passed: 142 successful terrain-tile responses, no JavaScript errors, plot-selection control present, and working context disclosure at desktop and 390-pixel mobile widths. Screenshots are retained in `/home/jbai/.local/share/praya-map/verified-desktop.png` and `verified-mobile.png`.
- A compressed PRBM response matched the source file byte for byte and decompressed to 1,339,392 bytes. Textures returned gzip encoding, missing tiles returned 204, and offline player data returned `{}`.
- The Sandbox console renders the reference-map link. All 2,060 production world files retained their earlier hashes. Main Praya remained stopped; Sandbox remained running.
