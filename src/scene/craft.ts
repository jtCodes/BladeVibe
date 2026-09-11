import * as THREE from 'three';
import {getSurfacePixels,type SurfaceKind} from './surfaceAssets';

type SurfaceMaps={map:THREE.DataTexture;roughnessMap:THREE.DataTexture;bumpMap:THREE.DataTexture};
const surfaceCache=new WeakMap<THREE.WebGLRenderer,Map<string,SurfaceMaps>>();
// Scene cleanup owns texture disposal; drop references when its renderer retires.
export function clearSurfaceMapCache(renderer:THREE.WebGLRenderer){surfaceCache.delete(renderer)}
export function surfaceMaps(kind:SurfaceKind,renderer: THREE.WebGLRenderer,repeat:[number,number]=[1,1]):SurfaceMaps{
 let cache=surfaceCache.get(renderer);if(!cache){cache=new Map();surfaceCache.set(renderer,cache)}
 const key=`${kind}:${repeat[0]}:${repeat[1]}`,cached=cache.get(key);if(cached)return cached;
 // Tiling variants share pixel data and GPU source, but retain separate UV transforms.
 if(repeat[0]!==1||repeat[1]!==1){
  const base=surfaceMaps(kind,renderer);
  const result={map:base.map.clone(),roughnessMap:base.roughnessMap.clone(),bumpMap:base.bumpMap.clone()};
  for(const texture of Object.values(result))texture.repeat.set(...repeat);
  cache.set(key,result);return result;
 }

 const pixels=getSurfacePixels(kind),{width:w,height:h}=pixels;
 function texture(bytes:Uint8Array<ArrayBuffer>,color=false){const t=new THREE.DataTexture(bytes,w,h);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());if(color)t.colorSpace=THREE.SRGBColorSpace;t.needsUpdate=true;return t;}
 const result={map:texture(pixels.map,true),roughnessMap:texture(pixels.roughnessMap),bumpMap:texture(pixels.bumpMap)};cache.set(key,result);return result;
}
// The blade shoulder continues through the guard into a concealed tang.
export const bladeStations=[[-.14,.12,1],[-.04,.20,1],[0,.27,1],[.55,.27,1],[.84,.263,.97],[3.84,.205,.72],[4.52,.13,.48],[5.02,.0005,.008]];
export function bladeThickness(y: number){for(let i=1;i<bladeStations.length;i++){const a=bladeStations[i-1],b=bladeStations[i];if(y<=b[0])return THREE.MathUtils.lerp(a[2],b[2],THREE.MathUtils.clamp((y-a[0])/(b[0]-a[0]),0,1));}return .008;}
export const bladeCrossSection=[[-1,0],[-.80,.052],[-.30,.082],[-.22,.079],[-.18,.054],[.18,.054],[.22,.079],[.30,.082],[.80,.052],[1,0],[.80,-.052],[.30,-.082],[.22,-.079],[.18,-.054],[-.18,-.054],[-.22,-.079],[-.30,-.082],[-.80,-.052]];
export function createBladeGeometry(){
 const cross=bladeCrossSection;
 const positions=[],uv=[],indices=[],groups=[];
 for(let k=0;k<cross.length;k++){
  const start=indices.length,base=positions.length/3;
  for(const [y,w,t] of bladeStations)for(const [x,z] of [cross[k],cross[(k+1)%cross.length]]){positions.push(x*w*.65,y,z*t*.23);uv.push(x*.5+.5,y/5);}
  for(let j=0;j<bladeStations.length-1;j++){const a=base+j*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
  groups.push([start,indices.length-start,[0,8,9,17].includes(k)?1:[4,13].includes(k)?2:0]);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();for(const group of groups)g.addGroup(group[0],group[1],group[2]);g.computeBoundingSphere();return g;
}
export function createLeatherWrap(){
 const positions=[],uv=[],indices=[],turns=12,segments=768;
 // One continuous, slightly overlapping spiral strip around an oval grip.
 for(let i=0;i<=segments;i++){
  const a=i/segments*Math.PI*2*turns,y=-.18-i/segments*1.32;
  for(let j=0;j<5;j++){const v=j/4,r=.112+Math.sin(v*Math.PI)*.0015;positions.push(Math.cos(a)*r,y+(v-.5)*.118,Math.sin(a)*r*.83);uv.push(i/segments*10,v);}
 }
 for(let i=0;i<segments;i++)for(let j=0;j<4;j++){const a=i*5+j;indices.push(a,a+1,a+5,a+1,a+6,a+5);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
