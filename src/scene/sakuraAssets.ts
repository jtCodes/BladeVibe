import shikaiUrl from '../assets/sakura/shikai.bin?url';
import bankaiUrl from '../assets/sakura/bankai.bin?url';
import {loadBakedBuffer} from './bakedAsset';
import {SAKURA_COUNTS,readSakuraData,sakuraByteLength,type SakuraParticleData} from './sakuraParticleData';
type SakuraKind=keyof typeof SAKURA_COUNTS;
let pending:Promise<void>|undefined;
let assets:Record<SakuraKind,SakuraParticleData>|undefined;
export function prepareSakuraAssets():Promise<void>{
 return pending??=(async()=>{
  const [shikai,bankai]=await Promise.all([shikaiUrl,bankaiUrl].map((url,index)=>{
   const count=index===0?SAKURA_COUNTS.shikai:SAKURA_COUNTS.bankai;
   return loadBakedBuffer(url,sakuraByteLength(count)).then(buffer=>readSakuraData(buffer,count));
  }));
  assets={shikai,bankai};
 })().catch(error=>{pending=undefined;throw error;});
}
// Arrays are shared as immutable CPU data; meshes, attributes and GPU resources
// remain owned by each scene, so disposing a preview cannot break another viewer.
export function getSakuraData(kind:SakuraKind):SakuraParticleData{
 if(!assets)throw new Error('Sakura assets must be loaded before creating the effect');
 return assets[kind];
}
