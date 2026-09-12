import * as THREE from 'three';

export interface ClothMaterialOptions {
 color:THREE.ColorRepresentation;
 /** UV U follows the yarn; UV V crosses the tape. Increase repeats for finer fibers. */
 fiberScale?:[number,number];
 normalStrength?:number;
 roughness?:number;
 sheen?:number;
}
type ClothMaps={map:THREE.DataTexture;normalMap:THREE.DataTexture;roughnessMap:THREE.DataTexture};
const cache=new WeakMap<THREE.WebGLRenderer,Map<string,ClothMaps>>();
let pixels:{color:Uint8Array<ArrayBuffer>;normal:Uint8Array<ArrayBuffer>;roughness:Uint8Array<ArrayBuffer>}|undefined;
const width=1024,height=256;

function fiberPixels(){
 if(pixels)return pixels;
 const relief=new Float32Array(width*height),color=new Uint8Array(width*height*4),normal=new Uint8Array(color.length),roughness=new Uint8Array(color.length),tau=Math.PI*2;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const u=x/width,v=y/height;
  const drift=.10*Math.sin(tau*u*2+Math.sin(tau*v*3))+.055*Math.sin(tau*(u*9+v*2));
  const strand=Math.pow(Math.max(0,Math.cos(tau*(v*24+drift))),.7);
  const ply=.5+.5*Math.sin(tau*(v*112+u*3+drift*2));
  const fuzz=.5+.5*Math.sin(tau*(u*191+v*83)+Math.sin(tau*u*17));
  relief[y*width+x]=strand*.65+ply*.07+fuzz*.015;
  const c=Math.round(255*(.92+strand*.055+fuzz*.008));
  const r=Math.round(255*(.95-strand*.065));
  const i=(y*width+x)*4;color.set([c,c,c,255],i);roughness.set([r,r,r,255],i);
 }
 // Tangent-space normals encode yarn slopes directly, independent of model size.
 const sample=(x:number,y:number)=>relief[((y+height)%height)*width+(x+width)%width];
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const nx=(sample(x-1,y)-sample(x+1,y))*1.8,ny=(sample(x,y-1)-sample(x,y+1))*1.8;
  const length=Math.hypot(nx,ny,1),i=(y*width+x)*4;
  normal.set([Math.round((nx/length*.5+.5)*255),Math.round((ny/length*.5+.5)*255),Math.round((1/length*.5+.5)*255),255],i);
 }
 return pixels={color,normal,roughness};
}
function clothMaps(renderer:THREE.WebGLRenderer,repeat:[number,number]):ClothMaps{
 let entries=cache.get(renderer);if(!entries){entries=new Map();cache.set(renderer,entries);}
 const key=repeat.join(':'),existing=entries.get(key);if(existing)return existing;
 const data=fiberPixels();
 function texture(bytes:Uint8Array<ArrayBuffer>,isColor=false){
  const map=new THREE.DataTexture(bytes,width,height);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(...repeat);
  map.minFilter=THREE.LinearMipmapLinearFilter;map.magFilter=THREE.LinearFilter;map.generateMipmaps=true;
  map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  if(isColor)map.colorSpace=THREE.SRGBColorSpace;map.needsUpdate=true;return map;
 }
 const maps={map:texture(data.color,true),normalMap:texture(data.normal),roughnessMap:texture(data.roughness)};
 entries.set(key,maps);return maps;
}
/** Scene cleanup owns texture disposal, just like the shared metal surface maps. */
export function clearClothMaterialCache(renderer:THREE.WebGLRenderer){cache.delete(renderer);}

/** Fine yarn relief plus a broad fiber sheen; no painted checkerboard or metallic response. */
export function createClothMaterial(renderer:THREE.WebGLRenderer,{color,fiberScale=[1,1],normalStrength=.7,roughness=.95,sheen=.8}:ClothMaterialOptions){
 const tint=new THREE.Color(color);
 // A lighter fiber tint makes grazing illumination visible on dark dyed cloth.
 const sheenColor=tint.clone();sheenColor.setRGB(Math.sqrt(tint.r),Math.sqrt(tint.g),Math.sqrt(tint.b));
 return new THREE.MeshPhysicalMaterial({
  color:tint,metalness:0,roughness,specularIntensity:.25,
  sheen,sheenColor,sheenRoughness:.85,anisotropy:.3,
  ...clothMaps(renderer,fiberScale),normalScale:new THREE.Vector2(normalStrength,normalStrength),
 });
}
