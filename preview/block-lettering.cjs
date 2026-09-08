// Compact architectural lettering: real block cells, not a browser overlay.
const glyphs={
  B:['110','101','110','101','110'], C:['11','10','10','11'], H:['101','101','111','101','101'],
  I:['1','1','1','1'], L:['10','10','10','11'], N:['1001','1101','1011','1001'],
  '↓':['010','010','111','010'],
  '1':['01','11','01'], '2':['11','01','10'], '3':['11','01','11'],
};
function letterPixels(text){
  const pixels=[];let offset=0;
  for(const letter of text){
    const glyph=glyphs[letter];if(!glyph)throw Error(`Unsupported block letter: ${letter}`);
    glyph.forEach((row,v)=>[...row].forEach((pixel,u)=>{if(pixel==='1')pixels.push([offset+u,v]);}));
    offset+=glyph[0].length+1;
  }
  return pixels;
}
function northLettering(block,text,x,top,z,material){
  for(const [u,v] of letterPixels(text))block([x-u,top-v,z],material);
}
module.exports={letterPixels,northLettering};
