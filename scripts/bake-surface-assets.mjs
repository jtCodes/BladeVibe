import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {gzipSync,gunzipSync} from 'node:zlib';

// Preserve the original generator's seeds, call order and Float32 rounding.
// Each gzip payload stores map, roughnessMap, then bumpMap as RGBA8 pixels.
function randomSource(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function createSurfaceBytes(kind){
 const w=kind==='steel'?512:256,h=kind==='steel'?1024:512,random=randomSource(kind==='steel'?49:kind==='gold'?78:96);
 const heights=new Float32Array(w*h),values=new Float32Array(w*h),albedo=new Float32Array(w*h);
 const grain=Array.from({length:w},()=>random());
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=y*w+x,n=random(),cloud=(Math.sin(x*.041+Math.sin(y*.017)*2)+Math.sin(y*.026+x*.013))/4+.5;
  if(kind==='steel'){heights[i]=.48+grain[x]*.025+n*.012;values[i]=.30+grain[x]*.1+cloud*.065+n*.025;albedo[i]=.89+cloud*.06;}
  else if(kind==='gold'){heights[i]=.46+cloud*.04+n*.035;values[i]=.38+cloud*.19+n*.05;albedo[i]=.77+cloud*.19;}
  else {const cell=Math.sin(x*.59+Math.sin(y*.31))*Math.sin(y*.67+Math.sin(x*.28));heights[i]=.45+cell*.11+n*.1;values[i]=.76+cloud*.12+n*.07;albedo[i]=.58+cloud*.28+n*.12;}
 }
 if(kind!=='leather')for(let k=0;k<(kind==='steel'?440:160);k++){
  const x0=random()*w,y0=random()*h,len=4+random()*70,dx=(random()-.5)*(kind==='steel'?.10:.8),depth=.015+random()*.04;
  for(let j=0;j<len;j++){const x=Math.floor(x0+j*dx),y=Math.floor(y0+j);if(x<0||x>=w||y>=h)continue;const i=y*w+x;heights[i]-=depth;values[i]=Math.min(.82,values[i]+.13);}
 }
 const mapBytes=w*h*4,bytes=new Uint8Array(mapBytes*3);
 for(const [index,channel] of [albedo,values,heights].entries()){
  for(let i=0;i<channel.length;i++){
   const v=Math.round(Math.max(0,Math.min(1,channel[i]))*255);
   bytes.set([v,v,v,255],index*mapBytes+i*4);
  }
 }
 return bytes;
}

const check=process.argv.includes('--check');
if(process.argv.slice(2).some(argument=>argument!=='--check'))throw new Error('Usage: node scripts/bake-surface-assets.mjs [--check]');
const outputDirectory=new URL('../src/assets/surfaces/',import.meta.url);
if(!check)await mkdir(outputDirectory,{recursive:true});
for(const kind of ['steel','gold','leather']){
 const output=new URL(`${kind}.bin`,outputDirectory),bytes=createSurfaceBytes(kind);
 if(check){
  const compressed=await readFile(output),actual=gunzipSync(compressed);
  if(!actual.equals(Buffer.from(bytes)))throw new Error(`Stale surface asset: ${fileURLToPath(output)}`);
  console.log(`${kind}: exact ${bytes.byteLength}-byte match (${compressed.byteLength} compressed bytes)`);
 }else{
  const compressed=gzipSync(bytes,{level:9});
  await writeFile(output,compressed);
  console.log(`${kind}: ${bytes.byteLength} bytes -> ${compressed.byteLength} compressed bytes`);
 }
}
