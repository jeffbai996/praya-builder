"""Install the studio handoff in an existing BlueMap webroot without game writes."""
from pathlib import Path
import argparse
import json
import re
from urllib.parse import urlencode, urlparse

parser = argparse.ArgumentParser()
parser.add_argument('server_root', type=Path)
parser.add_argument('studio_url')
args = parser.parse_args()
if urlparse(args.studio_url).scheme not in ('http', 'https'):
    parser.error('Studio URL must use HTTP or HTTPS')
root = args.server_root.resolve()
conf = root / 'plugins/BlueMap/webapp.conf'
settings = root / 'bluemap/web/settings.json'
script = root / 'bluemap/web/builder-studio.js'
source = Path(__file__).resolve().parents[1] / 'preview/bluemap-studio.js'
text = conf.read_text()
match = re.search(r'(?m)^scripts:\s*\[([^\]]*)\]', text)
if not match:
    raise SystemExit('Cannot find the BlueMap scripts list')
entry = 'builder-studio.js?' + urlencode({'studio': args.studio_url})
scripts = json.loads(settings.read_text())
scripts['scripts'] = [s for s in scripts.get('scripts', []) if not s.startswith('builder-studio.js')]
scripts['scripts'].append(entry)
content = re.sub(r'(?m)^\s*"builder-studio\.js[^"\n]*",?\s*$', '', match[1]).strip()
if content and not content.endswith(',') and not content.splitlines()[-1].lstrip().startswith('#'):
    content += ','
updated = text[:match.start()] + 'scripts: [\n' + content + '\n  ' + json.dumps(entry) + '\n]' + text[match.end():]
for target, data in [(conf, updated.encode()), (settings, json.dumps(scripts).encode()), (script, source.read_bytes())]:
    backup = target.with_name(target.name + '.before-builder')
    if target.exists() and not backup.exists():
        backup.write_bytes(target.read_bytes())
    temporary = target.with_name(target.name + '.builder-tmp')
    temporary.write_bytes(data)
    temporary.replace(target)
print('BlueMap studio link installed; reload the map page. Existing config snapshots retained.')
