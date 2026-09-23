# Praya map independent of Minecraft

Deployed 2026-09-23. The existing URL, `https://fragserv.tailab4af9.ts.net:8448/`, now serves BlueMap's rendered files through a separate user service. Main Praya does not need to run for browsing or plot selection. The Sandbox console links to it as **Main-world reference map**.

## Data and limits

- Source: `/home/jbai/minecraft/praya/bluemap/web`, currently a symlink to `/mnt/wsl-storage/minecraft/praya-bluemap-web` (approximately 2.6 GiB).
- This serves the existing main-world render. It is not a Sandbox map and does not show Sandbox placements.
- There is no duplicate tile cache or periodic copy. When the existing BlueMap renderer updates files, the independent viewer serves those updates.
- The renderer still runs with main Praya. Only serving is independent; no offline rendering job was added.
- The host, storage mount, and map service must be available. Stopping Minecraft does not stop this service.
- Saved markers remain available offline. Player requests proxy to BlueMap when available and return an empty object when it is stopped, avoiding stale player locations.

## Runtime

- `praya-map.service`, enabled in the FragServ WSL user session, has no dependency on either Minecraft unit.
- Nginx binds only to `127.0.0.1:18100`; the existing Windows Tailscale Serve HTTPS 8448 route forwards there. Tailnet exposure is unchanged.
- The plugin's built-in webserver remains on 8100, avoiding port contention when Minecraft starts.
- Nginx 1.24.0-2ubuntu7.18 was downloaded from the configured Ubuntu package repository and extracted under `/home/jbai/.local/share/praya-map/runtime`; it is not a system-wide apt installation. Update this extracted package explicitly for future Nginx security updates.
- Config: `/home/jbai/.local/share/praya-map/nginx.conf`; overlay: `map-context.js` in that directory. Source copies are under `ops/praya-map/`.
- The context label is injected into the served HTML. BlueMap's generated files and Minecraft world files are not modified.
- Compressed texture/PRBM files use `gzip_static always`; missing tiles return 204. PHP, hidden files and backup files are not served.
- Read-only server status comes from the production console at 5009. Console unavailability does not prevent map browsing.

## Operations and rollback

```sh
systemctl --user status praya-map.service
~/.local/share/praya-map/runtime/usr/sbin/nginx -t -p ~/.local/share/praya-map/ -c ~/.local/share/praya-map/nginx.conf
systemctl --user reload praya-map.service
```

To restore the previous hosting arrangement, point Windows Tailscale Serve HTTPS 8448 back at `http://localhost:8100` and disable `praya-map.service`. The map would then depend on Minecraft again. The previous Sandbox panel config is saved at `/home/jbai/.local/share/praya-map/sandbox-panel.before.json`; restore only its map fields if other settings have subsequently changed.

Reference: [BlueMap external webserver documentation](https://bluemap.bluecolored.de/wiki/webserver/ExternalWebserversFile.html).

## Verification

- Nginx configuration check passed. HTTPS 8448 loaded the map with `praya-mc.service` inactive.
- Headless browser check passed: 142 successful terrain-tile responses, no JavaScript errors, plot-selection control present, and working context disclosure at desktop and 390-pixel mobile widths. Screenshots are retained in `/home/jbai/.local/share/praya-map/verified-desktop.png` and `verified-mobile.png`.
- A compressed PRBM response matched the source file byte for byte and decompressed to 1,339,392 bytes. Textures returned gzip encoding, missing tiles returned 204, and offline player data returned `{}`.
- The Sandbox console renders the reference-map link. All 2,060 production world files retained their earlier hashes. Main Praya remained stopped; Sandbox remained running.
