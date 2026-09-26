from plan_io import write_plan
"""Adapt the existing Point Tower to Parcel C without moving its upper storeys."""
import json,urllib.request,collections,pathlib,sys
import os
BASE=os.environ.get('BUILDER_WORKSPACE_URL','http://127.0.0.1:8091').rstrip('/')+'/api/workspace/'
def api(route,body=None):
 req=urllib.request.Request(BASE+route,data=json.dumps(body).encode() if body is not None else None,headers={'Content-Type':'application/json','X-Builder-Write':'1'})
 try:return json.load(urllib.request.urlopen(req,timeout=180))
 except urllib.error.HTTPError as e:raise RuntimeError(e.read().decode()) from e
source=api('drafts/2b811046-2da7-42ff-91c4-879ce5d0b7aa');site=api('sites/'+source['siteId'])
plan=source['plan'];palette=dict(plan['palette']);cells={};dims=(27,33,24)
def put(c,x,y,z,m):
 assert 1<=x<26 and 0<=y<33 and 0<=z<24,(c,x,y,z)
 cells[x,y,z]=(m,c)
def box(c,a,b,m):
 for y in range(a[1],b[1]):
  for z in range(a[2],b[2]):
   for x in range(a[0],b[0]):put(c,x,y,z,m)
def expand(ops,c,offset):
 for op in ops:
  if op['op']=='repeat':
   for i in range(op['count']):expand(op['operations'],c,[offset[k]+op['step'][k]*i for k in range(3)])
  else:
   assert op['op']=='box',op
   box(c,[offset[k]+op['min'][k] for k in range(3)],[offset[k]+op['max'][k] for k in range(3)],op['material'])
for c in plan['components']:
 if c['id']=='survey-clearance':continue
 o=c.get('origin',[0,0,0]);expand(c['operations'],c['id'],[o[0],o[1],o[2]+5])
upper={p:v for p,v in cells.items() if p[1]>=5}
palette.update({'court-paving':'minecraft:stone_bricks','court-edge':'minecraft:polished_deepslate','court-leaves':'minecraft:birch_leaves[distance=1,persistent=true,waterlogged=false]','court-air':'minecraft:air','court-step':'minecraft:smooth_quartz_stairs[facing=east,half=bottom,shape=straight,waterlogged=false]','court-door-lower':'minecraft:spruce_door[facing=south,half=lower,hinge=left,open=false,powered=false]','court-door-upper':'minecraft:spruce_door[facing=south,half=upper,hinge=left,open=false,powered=false]','court-seat':'minecraft:spruce_stairs[facing=west,half=bottom,shape=straight,waterlogged=false]','court-light':'minecraft:lantern[hanging=false,waterlogged=false]'})
# North frontage remains at surveyed street height. Its covered passage links both courts.
box('street-arcade',[1,0,0],[3,1,24],'court-paving')
box('street-arcade-clearance',[1,1,0],[3,4,24],'court-air')
for z0,z1 in [(0,9),(20,24)]:
 box('court-foundation',[3,0,z0],[26,1,z1],'court-edge')
 box('court-paving',[3,1,z0],[26,2,z1],'court-paving')
 # Clear the occupied walking volume, including the trees in this survey.
 box('court-clearance',[3,2,z0],[26,5,z1],'court-air')
 box('court-street-steps',[3,1,z0],[4,2,z1],'court-step')
# East entrance court: planted perimeter and two seating pockets; middle stays open.
for a,b in [(4,10),(17,24)]:
 box('entrance-planters',[a,2,0],[b,3,1],'court-edge')
 box('entrance-planting',[a,3,0],[b,4,1],'court-leaves')
 for x in range(a+1,b-1):put('entrance-seating',x,2,2,'court-seat')
for x in (5,10,17,23):put('court-lighting',x,2,4,'court-light')
# West garden court with a continuous two-block promenade and a rear lobby entrance.
for a,b in [(5,10),(17,24)]:
 box('garden-planters',[a,2,23],[b,3,24],'court-edge')
 box('garden-planting',[a,3,23],[b,4,24],'court-leaves')
for x in (6,19):put('garden-seating',x,2,22,'court-seat')
for x in (4,12,24):put('garden-lighting',x,2,23,'court-light')
put('garden-entrance',13,2,19,'court-door-lower');put('garden-entrance',13,3,19,'court-door-upper')
# Clear trees and higher terrain only within the built footprint and landscaped courts.
for b in site['blocks']:
 wx,wy,wz=[b[k]+site['origin'][i] for i,k in enumerate(['x','y','z'])]
 x,y,z=wz-410,wy-63,23-(wx+303)
 if not(1<=x<26 and 0<=y<33 and 0<=z<24):continue
 enclosed=(1<=x<26 and 9<=z<20 and 2<=y<8) or (3<=x<24 and 11<=z<20 and 2<=y<33)
 outside=(z<9 or z>=20 or x<3) and 2<=y<12
 if (enclosed or outside) and (x,y,z) not in cells:put('parcel-survey-clearance',x,y,z,'court-air')
assert all(cells[p]==v for p,v in upper.items()),'Upper-storey changes are outside this adaptation'
def cuboids(entries):
 remaining=dict(entries);result=[]
 while remaining:
  x,y,z=min(remaining,key=lambda p:(p[1],p[2],p[0]));m=remaining[x,y,z];xx=x+1
  while remaining.get((xx,y,z))==m:xx+=1
  zz=z+1
  while all(remaining.get((a,y,zz))==m for a in range(x,xx)):zz+=1
  yy=y+1
  while all(remaining.get((a,yy,b))==m for a in range(x,xx) for b in range(z,zz)):yy+=1
  for a in range(x,xx):
   for b in range(y,yy):
    for c in range(z,zz):del remaining[a,b,c]
  result.append({'op':'box','min':[x,y,z],'max':[xx,yy,zz],'material':m})
 return result
groups=collections.defaultdict(dict)
for p,(m,c) in cells.items():groups[c][p]=m
out={**plan,'plan_id':plan['plan_id'],'revision':'courtyard-r1','name':'Point Tower · Parcel C courtyard','description':'Point Tower with an east entrance court, a planted west courtyard, and a north street arcade. Upper-storey geometry retained in place. No basement or parking excavation.','dimensions':dict(zip('xyz',dims)),'palette':palette,'components':[{'id':c,'role':c.replace('-',' '),'origin':[0,0,0],'operations':cuboids(entries)} for c,entries in groups.items()],'signs':[{**s,'at':[s['at'][0],s['at'][1],s['at'][2]+5]} for s in plan.get('signs',[])]}
write_plan(pathlib.Path(__file__).with_name('parcel-c-courtyard.plan.json'),out)
print('PLAN',len(cells),'cells',len(groups),'components; upper storeys preserved',len(upper))
if '--post' in sys.argv:
 record=(pathlib.Path(__file__).resolve().parents[2]/'.workspace'/'parcel-c-courtyard-0925.json')
 if record.exists():
  d=api('drafts/'+json.loads(record.read_text())['draft']);d=api('drafts/'+d['id']+'/edit',{'expectedVersion':d['version'],'plan':out})
 else:d=api('drafts',{'plan':out,'siteId':site['id'],'transform':{'origin':[-303,63,410],'turns':1},'parentHash':source['candidate']['hash'],'author':{'agent':'astra','model':'gpt-6-astra'},'brief':out['description']})
 record.write_text(json.dumps({'draft':d['id']}))
 print('DRAFT',d['id'],d['valid']);print('ERRORS',json.dumps([e for e in d['diagnostics'] if e['severity']=='error']));print('ASSESSMENT',json.dumps((d.get('assessment')or{}).get('errors'))[:1000])
