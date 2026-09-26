"""Write inspectable plan snapshots with one architectural component per line."""
import json
def write_plan(path,plan):
    lines=['{']
    for i,(key,value) in enumerate(plan.items()):
        suffix=',' if i+1<len(plan) else ''
        if key=='components':
            lines.append('  "components": [')
            lines.extend('    '+json.dumps(c,separators=(',',':'))+(',' if n+1<len(value) else '') for n,c in enumerate(value))
            lines.append('  ]'+suffix)
        else: lines.append('  '+json.dumps(key)+': '+json.dumps(value,separators=(',',':'))+suffix)
    path.write_text('\n'.join(lines+['}'])+'\n')
