const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs');
const path=require('node:path');
const {STYLE_VERSION,thumbnailPath,readThumbnail}=require('./thumbnails.cjs');

async function main(){
  const base=process.env.PREVIEW_TEST_URL||'http://127.0.0.1:8091';
  const response=await fetch(base+'/api/projects',{signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error(`Catalogue unavailable (${response.status})`);
  const projects=await response.json();
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,
    args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  let created=0,reused=0,totalBytes=0;
  try{
    const page=await browser.newPage();await page.goto(base+'/thumbnail-render.html');
    for(const project of projects){
      const revision=project.revisions.find(r=>r.id===project.latest);
      if(!/^[a-z0-9-]+$/.test(project.id)||!/^r[0-9]+$/.test(revision?.id)||! /^[a-f0-9]{64}$/.test(revision.hash))throw Error('Invalid catalogue identity');
      const file=thumbnailPath(project.id,revision.id,revision.hash);
      const existing=readThumbnail(project.id,revision.id,revision.hash);
      if(existing){reused++;totalBytes+=existing.length;continue;}
      const result=await page.evaluate(async input=>{
        const {renderThumbnail}=await import('/thumbnail-render.js');return renderThumbnail(input);
      },{project:project.id,revision:revision.id,hash:revision.hash,ceiling:project.layers[0].value});
      if(result.hash!==revision.hash||!result.png.startsWith('data:image/png;base64,'))throw Error('Invalid rendered identity');
      const bytes=Buffer.from(result.png.split(',')[1],'base64');
      fs.mkdirSync(path.dirname(file),{recursive:true});
      // Publish complete bytes in one rename; readers never see a partial PNG.
      const temp=`${file}.${process.pid}.tmp`;fs.writeFileSync(temp,bytes,{flag:'wx'});fs.renameSync(temp,file);
      readThumbnail(project.id,revision.id,revision.hash);created++;totalBytes+=bytes.length;
      console.log(`THUMBNAIL ${project.id}/${revision.id} ${revision.hash.slice(0,12)} ${bytes.length} bytes`);
    }
    console.log(`THUMBNAILS_READY style=${STYLE_VERSION} created=${created} reused=${reused} bytes=${totalBytes}`);
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
