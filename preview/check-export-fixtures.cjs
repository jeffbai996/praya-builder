// Download the actual HTTP export bytes for the opt-in isolated WorldEdit probe.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');

async function main() {
  if(!process.argv[2])throw Error('Usage: node check-export-fixtures.cjs <new-output-directory>');
  const output=path.resolve(process.argv[2]),base=process.env.PREVIEW_TEST_URL||'http://127.0.0.1:8091';
  fs.mkdirSync(output,{recursive:true});
  async function get(route) {
    const response=await fetch(base+route,{signal:AbortSignal.timeout(20000)});
    assert.equal(response.status,200,route);return response;
  }
  const projects=await (await get('/api/projects')).json();let count=0;
  for(const project of projects)for(const revision of project.revisions) {
    const key=`${project.id}/${revision.id}`,stem=`${project.id}-${revision.id}`;
    const artifact=await (await get(`/api/artifact/${key}`)).json();
    assert.equal(artifact.hash,revision.hash);
    const response=await get(`/api/schematic/${key}?hash=${artifact.hash}`);
    assert.equal(response.headers.get('X-Artifact-Hash'),artifact.hash);
    assert.equal(response.headers.get('Content-Type'),'application/octet-stream');
    assert.equal(response.headers.get('Content-Encoding'),null);
    fs.writeFileSync(path.join(output,stem+'.schem'),Buffer.from(await response.arrayBuffer()),{flag:'wx'});
    fs.writeFileSync(path.join(output,stem+'.json'),JSON.stringify(artifact),{flag:'wx'});
    count++;
  }
  console.log(`HTTP_SCHEMATICS_PASS count=${count}`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
