from plan_io import write_plan
"""Alder House: a seven-storey compact tower for the surveyed Terraced east plot."""
import json,collections,pathlib,urllib.request,sys
import os
BASE=os.environ.get('BUILDER_WORKSPACE_URL','http://127.0.0.1:8091').rstrip('/')+'/api/workspace/'
SITE='34dc1bab-e949-45b8-94df-28b81d1cf38d';ORIGIN=[-240,78,-477];DIMS=(20,33,15)
def api(route,body=None):
 req=urllib.request.Request(BASE+route,data=json.dumps(body).encode() if body is not None else None,headers={'Content-Type':'application/json','X-Builder-Write':'1'})
 try:return json.load(urllib.request.urlopen(req,timeout=180))
 except urllib.error.HTTPError as e:raise RuntimeError(e.read().decode()) from e
P={'air':'minecraft:air','frame':'minecraft:smooth_quartz','stone':'minecraft:polished_deepslate','dark':'minecraft:deepslate_tiles','floor':'minecraft:birch_planks','paving':'minecraft:stone_bricks','bronze':'minecraft:brown_terracotta','wood':'minecraft:stripped_spruce_log[axis=y]','pane':'minecraft:black_stained_glass_pane[waterlogged=false]','clear':'minecraft:glass_pane[waterlogged=false]','privacy':'minecraft:light_gray_stained_glass_pane[waterlogged=false]','rail':'minecraft:iron_bars[waterlogged=false]','leaves':'minecraft:birch_leaves[distance=1,persistent=true,waterlogged=false]','lamp':'minecraft:lantern[hanging=false,waterlogged=false]','pendant':'minecraft:lantern[hanging=true,waterlogged=false]','slab':'minecraft:smooth_quartz_slab[type=top,waterlogged=false]','bed-foot':'minecraft:blue_bed[facing=south,occupied=false,part=foot]','bed-head':'minecraft:blue_bed[facing=south,occupied=false,part=head]','counter':'minecraft:spruce_slab[type=top,waterlogged=false]','cooker':'minecraft:polished_blackstone','basin':'minecraft:water_cauldron[level=3]','books':'minecraft:bookshelf','carpet':'minecraft:light_gray_carpet','table':'minecraft:spruce_trapdoor[facing=north,half=top,open=false,powered=false,waterlogged=false]','sign-n':'minecraft:spruce_wall_sign[facing=north,waterlogged=false]','sign-s':'minecraft:spruce_wall_sign[facing=south,waterlogged=false]'}
for facing in ['north','south','east','west']:
 for half in ['lower','upper']:P[f'door-{facing}-{half}']=f'minecraft:spruce_door[facing={facing},half={half},hinge=left,open=false,powered=false]'
 P['stair-'+facing]=f'minecraft:smooth_quartz_stairs[facing={facing},half=bottom,shape=straight,waterlogged=false]'
 P['seat-'+facing]=f'minecraft:spruce_stairs[facing={facing},half=bottom,shape=straight,waterlogged=false]'
cells={};signs=[]
def put(c,x,y,z,m):
 assert all(0<=p<DIMS[i] for i,p in enumerate([x,y,z])),(c,x,y,z)
 cells[x,y,z]=m,c
def box(c,x0,y0,z0,x1,y1,z1,m):
 for y in range(y0,y1):
  for z in range(z0,z1):
   for x in range(x0,x1):put(c,x,y,z,m)
def door(c,x,y,z,facing):
 put(c,x,y,z,'door-'+facing+'-lower');put(c,x,y+1,z,'door-'+facing+'-upper')
def wall(c,x0,z0,x1,z1,y0,y1,m):
 box(c,x0,y0,z0,x1,y1,z0+1,m);box(c,x0,y0,z1-1,x1,y1,z1,m)
 box(c,x0,y0,z0,x0+1,y1,z1,m);box(c,x1-1,y0,z0,x1,y1,z1,m)
# Street-level arrival. The protected roadside sign at [19,1,0] is excluded.
box('entry-path',8,0,0,13,1,3,'paving');box('entry-clearance',8,1,0,13,4,3,'air')
box('entry-step',8,1,2,13,2,3,'stair-south')
for x0,x1 in [(2,7),(14,18)]:
 box('front-planters',x0,0,1,x1,2,2,'stone');box('front-planting',x0,2,1,x1,3,2,'leaves')
for x in (7,13):put('entry-lighting',x,1,0,'lamp')
box('podium-foundation',1,0,3,19,1,14,'stone')
box('podium-slab',1,1,3,19,2,14,'paving')
wall('podium-envelope',1,3,19,14,2,5,'stone')
for x0,x1 in [(2,8),(12,18)]:box('lobby-glazing',x0,2,3,x1,5,4,'clear')
for x in (10,11):door('main-entrance',x,2,3,'north')
box('entrance-canopy',8,5,0,14,6,3,'slab')
for x in (8,13):box('entrance-columns',x,1,1,x+1,5,2,'wood')
for z0,z1 in [(5,8),(10,13)]:
 box('podium-flank-windows',1,2,z0,2,5,z1,'clear');box('podium-flank-windows',18,2,z0,19,5,z1,'clear')
box('podium-rear-glazing',10,2,13,17,5,14,'privacy')
box('lobby-seating',14,2,5,17,3,6,'seat-south');put('lobby-table',15,2,7,'table')
box('lobby-mail-cabinets',3,2,4,7,3,5,'wood')
for x,z in [(4,6),(12,6),(15,11)]:put('lobby-lighting',x,4,z,'pendant')
put('lobby-wayfinding',8,4,8,'sign-n');signs.append({'at':[8,4,8],'lines':['----------','ALDER HOUSE','LOBBY','----------']})
# Six residential levels. A vertical west blade balances the open east loggias.
for s in range(6):
 b=5+s*4;c=f'level-{s+1}'
 box(c+'-floor',2,b,4,17,b+1,14,'floor');wall(c+'-edge',2,4,17,14,b,b+1,'stone')
 wall(c+'-envelope',2,5,17,14,b+1,b+4,'stone')
 for a,e in [(3,8),(10,16)]:box(c+'-front-windows',a,b+1,5,e,b+4,6,'pane')
 # Pale outer vertical ribs and a bronze central blade continue past slab edges.
 for x in (2,8,16):box('vertical-frame',x,b,4,x+1,b+4,5,'frame')
 box('bronze-blade',9,b,4,10,b+4,5,'bronze')
 for z in (7,11):
  box(c+'-west-windows',2,b+1,z,3,b+4,z+2,'pane')
  box('west-fins',1,b,z,2,b+4,z+1,'frame')
 for x0,x1 in [(3,7),(10,12),(14,16)]:box(c+'-rear-windows',x0,b+1,13,x1,b+4,14,'privacy')
 for x in (2,8,12,16):box('rear-piers',x,b,13,x+1,b+4,14,'frame' if x in (2,16) else 'bronze')
 box(c+'-east-windows',16,b+1,6,17,b+4,10,'pane')
 box(c+'-east-window',16,b+1,11,17,b+4,13,'privacy')
 # Two deep balcony on the front, side loggia on alternating floors.
 box(c+'-front-balcony',10,b,3,16,b+1,5,'slab')
 box(c+'-front-rail',10,b+1,3,16,b+2,4,'rail')
 put(c+'-balcony-planter',10,b+1,4,'leaves');door(c+'-balcony-door',13,b+1,5,'north')
 if s%2==0:
  box(c+'-east-loggia',17,b,6,20,b+1,11,'stone')
  box(c+'-east-rail',19,b+1,6,20,b+2,11,'rail')
  for z in (6,10):box(c+'-east-end',17,b+1,z,19,b+2,z+1,'rail')
  door(c+'-loggia-door',16,b+1,9,'east');put(c+'-loggia-seat',17,b+1,7,'seat-east')
 # Individual apartment entrance, kitchen, wet room and living/bed zones.
 door(c+'-apartment-door',9,b+1,8,'east')
 for x,m in [(10,'counter'),(11,'cooker')]:put(c+'-kitchen',x,b+1,12,m)
 put(c+'-kitchen',10,b+1,11,'basin')
 box(c+'-bathroom',12,b+1,10,13,b+4,13,'stone');box(c+'-bathroom',12,b+1,10,16,b+4,11,'stone')
 door(c+'-bathroom-door',14,b+1,10,'north');put(c+'-basin',13,b+1,11,'basin');put(c+'-shower',15,b+1,12,'carpet')
 put(c+'-bed',15,b+1,7,'bed-foot');put(c+'-bed',15,b+1,8,'bed-head');put(c+'-wardrobe',15,b+1,6,'wood')
 put(c+'-sofa',10,b+1,6,'seat-east');put(c+'-sofa',10,b+1,7,'seat-east');put(c+'-coffee-table',12,b+1,7,'table')
 put(c+'-dining',11,b+1,9,'table');put(c+'-dining',12,b+1,9,'seat-west')
 box(c+'-study',4,b+1,6,7,b+2,7,'counter');put(c+'-study-books',3,b+1,6,'books')
 for x,z in [(5,5),(11,8),(14,12),(15,4)]:put(c+'-lighting',x,b+3,z,'pendant')
 put(c+'-wayfinding',5,b+3,8,'sign-s');signs.append({'at':[5,b+3,8],'lines':['--------',f'LEVEL {s+1}','RESIDENCE','--------']})
# Continuous circulation core, repeated independently of facade treatments.
for level,b in enumerate([1,5,9,13,17,21,25]):
 box(f'core-{level}',3,b+1,8,4,b+4,12,'stone');box(f'core-{level}',9,b+1,8,10,b+4,12,'stone')
 box(f'core-{level}',3,b+1,11,10,b+4,12,'stone');box(f'core-{level}',7,b+1,9,9,b+4,11,'dark')
 if level:
  box(f'core-{level}',4,b+1,7,9,b+4,8,'stone')
  door(f'level-{level}-apartment-door',9,b+1,8,'east')
 put('stairs',4,b,9,'stair-south');put('stairs',4,b+1,10,'stair-south');put('stairs',5,b+1,10,'stone')
 if level==0:put('stairs',6,b+1,10,'stone')
 put('stairs',6,b+2,10,'stair-north');put('stairs',6,b+3,9,'stair-north')
 for x,z in [(6,9),(6,10),(5,10)]:put('stair-opening',x,b+4,z,'air')
 put(f'core-light-{level}',7,b+3,8,'pendant')
# Roof terrace, with a short enclosed stair overrun and screened plant.
box('roof-slab',2,29,4,17,30,14,'stone')
wall('roof-parapet',2,4,17,14,30,31,'rail')
wall('roof-stair-house',3,7,10,12,30,32,'wood');box('roof-stair-cap',3,32,7,10,33,12,'slab')
door('roof-access',9,30,8,'east')
for x,z in [(6,9),(6,10),(5,10)]:put('stair-opening',x,29,z,'air')
box('roof-garden',11,30,12,16,31,13,'leaves');box('roof-seating',12,30,5,15,31,6,'seat-south')
put('roof-table',13,30,7,'table');put('roof-lighting',15,30,10,'lamp')
box('roof-plant',4,30,12,8,31,13,'dark')
# Survey clearance and grounded foundations stay inside the selected plot.
site=api('sites/'+SITE)
for e in site['blocks']:
 x,y,z=[e[k]+site['origin'][i]-ORIGIN[i] for i,k in enumerate(['x','y','z'])]
 if not all(0<=p<DIMS[i] for i,p in enumerate([x,y,z])):continue
 enclosed=(1<=x<19 and 3<=z<14 and 2<=y<7) or (1<=x<20 and 3<=z<14 and 5<=y<33)
 arrival=1<=x<19 and 0<=z<3 and 1<=y<7
 if (enclosed or arrival) and (x,y,z) not in cells:put('survey-clearance',x,y,z,'air')
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
plan={'schema_version':1,'plan_id':'alder-house','revision':'r1','name':'Alder House','description':'Seven-storey modern tower beside Terraced Residences. Six compact apartments above a shared lobby, continuous stairs to a planted roof terrace, pale vertical fins, bronze blades and recessed balconies.','dimensions':dict(zip('xyz',DIMS)),'palette':P,'components':[{'id':c,'role':c.replace('-',' '),'origin':[0,0,0],'operations':cuboids(v)} for c,v in groups.items()],'signs':signs}
plan['spaces']=[{'id':f'landing-{level}','min':[4,b+1,8],'max':[9,b+3,9]} for level,b in enumerate([1,5,9,13,17,21,25])]+[{'id':'roof-landing','min':[6,30,8],'max':[9,32,9]}]
write_plan(pathlib.Path(__file__).with_name('alder-house.plan.json'),plan);print('PLAN',len(cells),len(groups))
if '--post' in sys.argv:
 record=(pathlib.Path(__file__).resolve().parents[2]/'.workspace'/'alder-house-0925.json')
 if record.exists():
  d=api('drafts/'+json.loads(record.read_text())['draft']);d=api('drafts/'+d['id']+'/edit',{'expectedVersion':d['version'],'plan':plan})
 else:d=api('drafts',{'plan':plan,'siteId':SITE,'transform':{'origin':ORIGIN,'turns':0},'author':{'agent':'astra','model':'gpt-6-astra'},'brief':plan['description']})
 record.write_text(json.dumps({'draft':d['id']}));print('DRAFT',d['id'],d['valid']);print('ERRORS',json.dumps([e for e in d['diagnostics'] if e['severity']=='error']));print('ASSESSMENT',json.dumps((d.get('assessment')or{}).get('errors'))[:1000])
