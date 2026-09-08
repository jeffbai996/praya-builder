const {gunzipSync}=require('node:zlib');

// Bound lengths before allocating. A small compressed file can describe a huge NBT array.
function readSchematic(bytes) {
 if(!Buffer.isBuffer(bytes)||bytes.length>8*1024*1024)throw Error('Schematic input limit exceeded');
 const data=bytes[0]===31&&bytes[1]===139?gunzipSync(bytes,{maxOutputLength:16*1024*1024}):bytes;
 if(data.length>16*1024*1024)throw Error('Expanded schematic limit exceeded');
 let offset=0,nodes=0;
 function take(size){if(!Number.isSafeInteger(size)||size<0||offset+size>data.length)throw Error('Truncated NBT');const start=offset;offset+=size;return start;}
 const byte=()=>data.readUInt8(take(1));
 const short=()=>data.readInt16BE(take(2));
 const int=()=>data.readInt32BE(take(4));
 const text=()=>{const size=data.readUInt16BE(take(2));return data.toString('utf8',take(size),offset);};
 function count(){const n=int();if(n<0||n>1048576)throw Error('NBT collection limit exceeded');return n;}
 function value(type,depth=0){
  if(depth>32||++nodes>1048576)throw Error('NBT complexity limit exceeded');
  if(type===1)return data.readInt8(take(1));if(type===2)return short();if(type===3)return int();
  if(type===4){take(8);return null;}if(type===5)return data.readFloatBE(take(4));if(type===6)return data.readDoubleBE(take(8));
  if(type===7){const n=count();return data.subarray(take(n),offset);}if(type===8)return text();
  if(type===9){const t=byte(),n=count();if(t===0&&n)throw Error('Invalid NBT list');return Array.from({length:n},()=>value(t,depth+1));}
  if(type===10){const out=Object.create(null);for(;;){const t=byte();if(t===0)return out;const key=text();if(Object.hasOwn(out,key))throw Error('Duplicate NBT key');out[key]=value(t,depth+1);}}
  if(type===11){const n=count();take(n*4);const start=offset-n*4;return Array.from({length:n},(_,i)=>data.readInt32BE(start+i*4));}
  if(type===12){const n=count();take(n*8);return null;}throw Error('Unsupported NBT tag');
 }
 if(byte()!==10)throw Error('Expected NBT compound');text();const root=value(10);
 if(offset!==data.length)throw Error('Trailing NBT data');
 return root.Schematic||root;
}
module.exports={readSchematic};
