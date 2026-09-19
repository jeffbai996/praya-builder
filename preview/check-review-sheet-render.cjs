const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

async function main(){
  const modulePath=process.env.PLAYWRIGHT_MODULE;if(!modulePath)throw Error('PLAYWRIGHT_MODULE is required');
  const {chromium}=require(modulePath),browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH});
  const page=await browser.newPage({viewport:{width:1100,height:900}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  const source=fs.readFileSync(path.join(__dirname,'review-sheet-render.js'),'utf8');
  await page.route('**/review-sheet-render.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:source}));
  try{
    const base=process.env.PREVIEW_BASE_URL||'http://127.0.0.1:8091';await page.goto(base+'/thumbnail-render.html');
    const result=await page.evaluate(async()=>{
      const THREE=await import('/vendor/three/build/three.module.js');
      const renderer=await import('/review-sheet-render.js?fixture=1');
      const section=(sx,sy,sz)=>{
        const geometry=new THREE.BoxGeometry(1,1,1);geometry.translate(.5,.5,.5);
        const positions=Array.from(geometry.attributes.position.array),colors=positions.map(()=>.78);
        return {sx,sy,sz,positions,normals:Array.from(geometry.attributes.normal.array),colors,uvs:Array.from(geometry.attributes.uv.array),indices:Array.from(geometry.index.array)};
      };
      const mesh={hash:'a'.repeat(64),ceiling:64,sections:[section(1,0,1),section(4,4,4)],dimensions:{x:8,y:6,z:6}};
      const diagnostics=[
        {rule:'walk.door-unreachable',version:1,severity:'error',component:'entry',at:[1,1,1],message:'blocked',hint:'fixture'},
        {rule:'roof.uncovered',version:1,severity:'warning',component:'roof',at:[4,4,4],message:'open',hint:'fixture'},
      ];
      const components=[{id:'entry',role:'A very long entrance and circulation component name that must be bounded inside the label strip'},{id:'roof',role:'Roof'}];
      const name='Extremely long synthetic review-sheet design name '.repeat(20);
      const input={mesh,dimensions:mesh.dimensions,diagnostics,components,name};
      const exteriors=[];for(const view of renderer.REVIEW_EXTERIORS){const image=await renderer.renderReviewView({...input,view});exteriors.push({id:view.id,hash:image.hash,ceiling:image.ceiling,kind:image.kind,type:image.projection.type,pngHash:image.pngHash});}
      const elevations=[];for(const view of renderer.REVIEW_ELEVATIONS){const image=await renderer.renderReviewView({...input,view});elevations.push({id:view.id,kind:image.kind,type:image.projection.type});}
      const planView={id:'plan-0',label:'Ground floor plan',kind:'plan',floor:0,ceiling:2};
      const plan=await renderer.renderReviewView({...input,view:planView}),repeat=await renderer.renderReviewView({...input,view:planView});
      const full=await renderer.renderReviewView({...input,view:{...planView,id:'plan-full',ceiling:6}});
      const dimensions=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve([image.naturalWidth,image.naturalHeight]);image.onerror=reject;image.src=plan.png;});
      let invalid;try{await renderer.renderReviewView({...input,view:{id:'bad',kind:'exterior',preset:'bogus'}});}catch(error){invalid=error.message;}
      return {exteriors,elevations,plan:{png:plan.png,hash:plan.hash,pngHash:plan.pngHash,ceiling:plan.ceiling,kind:plan.kind,projection:plan.projection,markers:plan.markers,markerItems:plan.markerItems,diagnosticCount:plan.diagnosticCount,labels:plan.labels},repeatHash:repeat.pngHash,full:{pngHash:full.pngHash,markers:full.markers,diagnosticCount:full.diagnosticCount},dimensions,invalid};
    });
    assert.equal(result.exteriors.length,6);for(const image of result.exteriors){assert.equal(image.hash,'a'.repeat(64));assert.equal(image.ceiling,64);assert.equal(image.kind,'exterior');assert.equal(image.type,'perspective');assert.match(image.pngHash,/^[a-f0-9]{64}$/);}
    assert.equal(result.elevations.length,4);for(const image of result.elevations){assert.equal(image.kind,'elevation');assert.equal(image.type,'orthographic');}
    assert.deepEqual(result.dimensions,[960,760]);assert.equal(result.plan.hash,'a'.repeat(64));assert.equal(result.plan.ceiling,2);assert.equal(result.plan.kind,'plan');assert.equal(result.plan.projection.type,'orthographic');assert.equal(result.plan.projection.clipCeiling,2);
    assert.equal(result.plan.markers,1);assert.equal(result.plan.diagnosticCount,1);assert.deepEqual(result.plan.markerItems[0].at,[1,1,1]);assert(result.plan.markerItems[0].x>0&&result.plan.markerItems[0].x<960);assert(result.plan.markerItems[0].y>0&&result.plan.markerItems[0].y<640);
    assert.equal(result.plan.pngHash,result.repeatHash,'same input is byte-stable in one browser session');assert.notEqual(result.plan.pngHash,result.full.pngHash,'the higher plan cut renders different geometry');assert.equal(result.full.markers,2);assert.equal(result.full.diagnosticCount,2);
    assert(result.plan.labels.title.endsWith('…'));assert(result.plan.labels.legend.length<120);assert.equal(result.invalid,'Unknown exterior preset');assert.deepEqual(errors,[]);
    const output=path.join(__dirname,'test-output');fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'review-sheet-plan.png'),Buffer.from(result.plan.png.split(',')[1],'base64'));
    console.log(`REVIEW_SHEET_RENDER_PASS views=${result.exteriors.length+result.elevations.length+2} markers=${result.plan.markers} bytes=${Buffer.from(result.plan.png.split(',')[1],'base64').length}`);
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
