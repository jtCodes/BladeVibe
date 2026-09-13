import * as THREE from 'three';
import wearUrl from '../assets/surfaces/metal-wear.bin?url';
import {loadBakedBuffer} from './bakedAsset';
import {METAL_WEAR_SIZE} from './metalWearPattern';
let pixels:Uint8Array<ArrayBuffer>|undefined,pending:Promise<void>|undefined;
const textures=new WeakMap<THREE.WebGLRenderer,THREE.DataTexture>();
export function prepareMetalWear(){
 if(pixels)return Promise.resolve();
 return pending??=loadBakedBuffer(wearUrl,METAL_WEAR_SIZE*METAL_WEAR_SIZE*4)
  .then(buffer=>{pixels=new Uint8Array(buffer);}).finally(()=>{pending=undefined;});
}
export function metalWearTexture(renderer:THREE.WebGLRenderer){
 const cached=textures.get(renderer);if(cached)return cached;
 if(!pixels)throw new Error('Metal wear must be prepared before creating metal materials');
 const texture=new THREE.DataTexture(pixels,METAL_WEAR_SIZE,METAL_WEAR_SIZE);
 texture.name='Metal wear masks';texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
 texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;
 texture.generateMipmaps=true;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 texture.colorSpace=THREE.NoColorSpace;texture.needsUpdate=true;textures.set(renderer,texture);return texture;
}
// Uniform textures are not discoverable by the scene's material-map traversal.
export function disposeMetalWear(renderer:THREE.WebGLRenderer){textures.get(renderer)?.dispose();textures.delete(renderer);}
