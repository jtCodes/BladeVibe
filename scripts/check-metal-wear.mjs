import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {ShaderLib,Texture} from 'three';
import {loadSource} from './load-source.mjs';
const {createMetalWearPixels,METAL_WEAR_SIZE}=loadSource('src/scene/metalWearPattern.ts');
const {applyMetalWear,METAL_WEAR_PRESETS}=loadSource('src/scene/metalWearShader.ts');
const {applyBladeSurfaceFinish}=loadSource('src/scene/bladeSurfaceFinish.ts');
const bytes=createMetalWearPixels();
assert.deepEqual(bytes,createMetalWearPixels());
assert.equal(bytes.length,METAL_WEAR_SIZE**2*4);
assert.deepEqual(Buffer.from(bytes),gunzipSync(readFileSync('src/assets/surfaces/metal-wear.bin')));
for(let channel=0;channel<3;channel++){
 let occupied=0,empty=0;
 for(let i=channel;i<bytes.length;i+=4){if(bytes[i]>16)occupied++;if(bytes[i]===0)empty++;}
 assert(occupied>100&&empty>100,'Every mask needs both detail and untouched metal');
 if(channel===0)assert(occupied/(METAL_WEAR_SIZE**2)<.08,'Scratches must remain sparse');
}
const texture=new Texture();
for(const preset of Object.values(METAL_WEAR_PRESETS)){
 const shader={vertexShader:ShaderLib.physical.vertexShader,fragmentShader:ShaderLib.physical.fragmentShader,uniforms:{}};
 applyBladeSurfaceFinish(shader);
 applyMetalWear(shader,texture,preset);
 assert.equal(shader.uniforms.metalWearMap.value,texture);
 assert.equal(shader.uniforms.metalWear_amount.value,preset.amount);
 assert.equal((shader.fragmentShader.match(/vec3 wearMask=/g)||[]).length,1);
 assert(shader.fragmentShader.indexOf('roughnessFactor=max(roughnessFactor')<shader.fragmentShader.indexOf('float wearScratch='));
 assert(shader.fragmentShader.indexOf('float wearScratch=')<shader.fragmentShader.indexOf('#include <lights_physical_fragment>'));
 assert(shader.fragmentShader.includes('#include <normal_fragment_maps>'));
 assert(shader.fragmentShader.includes('reflectedLight.directSpecular*='));
 assert(shader.vertexShader.includes('metalWearPosition=position;metalWearNormal=normal;'));
}
texture.dispose();
console.log('Metal wear checks passed: deterministic masks, sparse coverage, baked parity, and physical-shader composition for all presets.');
