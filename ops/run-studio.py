#!/usr/bin/env python3
"""Run studio under systemd using its existing private runtime configuration."""
import json, os
from pathlib import Path

root=Path(__file__).resolve().parents[1]
runtime=root/'preview/.workspace/runtime.json'
config=json.loads(runtime.read_text())
if not isinstance(config,dict) or any(not isinstance(v,str) for v in config.values()):
    raise SystemExit('Expected a string environment mapping in private runtime.json')
node=Path(os.environ.get('BUILDER_NODE',str(Path.home()/'.nvm/versions/node/v20.20.2/bin/node')))
if not node.is_file(): raise SystemExit('Configured Node runtime is missing')
environment=os.environ.copy();environment.update(config)
environment['PATH']=str(Path(environment['JAVA_HOME'])/'bin')+':'+str(node.parent)+':'+environment.get('PATH','')
os.chdir(root/'preview')
os.execve(str(node),[str(node),'server.cjs'],environment)
