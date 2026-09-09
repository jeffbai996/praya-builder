const test=require('node:test'),assert=require('node:assert/strict');
test('presets compose only from user text and never invent it',async()=>{
 const {compose,presets}=await import('./sign-presets.js');
 for(const p of presets){const r=compose(p.id,{});assert.equal(r.empty,true,p.id);assert.equal(r.lines.length,4);assert.ok(r.lines.every(l=>l.length<=24),p.id);}
 assert.deepEqual(compose('centered',{a:'Please wait',b:'to be seated'}).lines,['------------','Please wait','to be seated','------------']);
 assert.deepEqual(compose('framed',{a:'Please wait',b:'to be seated'}).lines,['------------','Please wait','to be seated','------------']);
 assert.deepEqual(compose('identity',{a:'microsoft',b:'store',c:'18 commonwealth'}).lines,['microsoft','store','---------','18 commonwealth']);
 assert.deepEqual(compose('plaque',{numbers:'10, 12,14',street:'Commonwealth Av',second:'聯邦大道'}).lines,['| 10 | 12 | 14 |','----','Commonwealth Av','聯邦大道']);
 assert.deepEqual(compose('street',{street:'Commonwealth Av.',second:'聯邦大道',range:'0-51',direction:'east'}).lines,['----------------','Commonwealth Av.','聯邦大道','        0-51 ->']);
 assert.equal(compose('custom',{l1:'ab'}).lines[0],'ab');
 assert.equal(compose('custom',{l1:'x'.repeat(40)}).lines[0].length,24);
});
