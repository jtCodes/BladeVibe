import steelUrl from '../assets/surfaces/steel.bin?url';
import goldUrl from '../assets/surfaces/gold.bin?url';
import leatherUrl from '../assets/surfaces/leather.bin?url';
import {loadBakedBuffer} from './bakedAsset';

export type SurfaceKind='steel'|'gold'|'leather';
interface SurfacePixels {
 width:number;
 height:number;
 map:Uint8Array<ArrayBuffer>;
 roughnessMap:Uint8Array<ArrayBuffer>;
 bumpMap:Uint8Array<ArrayBuffer>;
}
const assets:Record<SurfaceKind,{url:string;width:number;height:number}>={
 steel:{url:steelUrl,width:512,height:1024},
 gold:{url:goldUrl,width:256,height:512},
 leather:{url:leatherUrl,width:256,height:512},
};
const pixels=new Map<SurfaceKind,SurfacePixels>();
const pending=new Map<SurfaceKind,Promise<void>>();

// CPU pixel buffers survive renderer disposal and are reused by later scenes.
// Each renderer still owns its own DataTextures and GPU uploads.
export async function prepareSurfaceAssets(kinds:readonly SurfaceKind[]):Promise<void>{
 await Promise.all(kinds.map(kind=>{
  if(pixels.has(kind))return;
  const loading=pending.get(kind);if(loading)return loading;
  const {url,width,height}=assets[kind],mapBytes=width*height*4;
  const promise=loadBakedBuffer(url,mapBytes*3).then(buffer=>{
   pixels.set(kind,{
    width,height,
    map:new Uint8Array(buffer,0,mapBytes),
    roughnessMap:new Uint8Array(buffer,mapBytes,mapBytes),
    bumpMap:new Uint8Array(buffer,mapBytes*2,mapBytes),
   });
  }).finally(()=>{pending.delete(kind);});
  pending.set(kind,promise);return promise;
 }));
}

export function getSurfacePixels(kind:SurfaceKind):SurfacePixels{
 const result=pixels.get(kind);
 if(!result)throw new Error(`Surface asset "${kind}" was not prepared before scene creation`);
 return result;
}
