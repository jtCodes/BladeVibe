import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {gzipSync,gunzipSync} from 'node:zlib';
import * as THREE from 'three';
import {loadSource} from './load-source.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const source=name=>loadSource(path.join(root,`src/scene/${name}.ts`));
const {createKatanaBladeGeometry}=source('katanaGeometry');
const {createSakuraRandom,createSakuraSurfaceSampler}=source('sakuraPetals');
const {petalBreakup,bankaiPetalBreakup}=source('petalBreakup');
const {SAKURA_COUNTS,SAKURA_FIELDS}=source('sakuraParticleData');
const {FLOOR_Y}=source('sceneDimensions');
const {SHIKAI_HEIGHT,SHIKAI_DISSOLVE_AT,SHIKAI_DISSOLVE_DURATION,BANKAI_HEIGHT,BANKAI_BLADES,BANKAI_DISSOLVE_AT,BANKAI_DISSOLVE_DURATION,createBankaiRows}=source('sakuraLayout');
const check=process.argv.includes('--check');
if(process.argv.slice(2).some(arg=>arg!=='--check'))throw new Error('Usage: node scripts/bake-sakura-assets.mjs [--check]');
const out=path.join(root,'src/assets/sakura');
if(!check)fs.mkdirSync(out,{recursive:true});
for(const kind of Object.keys(SAKURA_COUNTS)){
 const bankai=kind==='bankai',count=SAKURA_COUNTS[kind];
 const geometry=createKatanaBladeGeometry({length:SHIKAI_HEIGHT});
 if(bankai){geometry.computeBoundingBox();const enlargement=BANKAI_HEIGHT/geometry.boundingBox.max.y;geometry.scale(enlargement,enlargement,enlargement);}
 const random=createSakuraRandom(bankai?9721:391),sampleSurface=createSakuraSurfaceSampler(geometry,random);
 const data=Object.fromEntries(Object.entries(SAKURA_FIELDS).map(([name,size])=>[name,new Float32Array(count*size)]));
 const {origins,velocities,spins,releases,sizes,phases,dustPositions,dustVelocity,dustRelease,dustPhase}=data;
 const {placement,dissolveDelays}=createBankaiRows();
 for(let i=0;i<count;i++){
  let p=sampleSurface();while(p.y<=0)p=sampleSurface();
  const row=placement[i%BANKAI_BLADES];
  const threshold=THREE.MathUtils.clamp(1-p.y/(bankai?BANKAI_HEIGHT:SHIKAI_HEIGHT)+(bankai?bankaiPetalBreakup(p.x,p.y,dissolveDelays[i%BANKAI_BLADES]):petalBreakup(p.x,p.y,0)),.003,.997);
  if(bankai){const y=p.y,mirror=-row.side;p.x*=mirror;p.z*=mirror;origins.set([row.side*4.3+p.x,FLOOR_Y+y,row.z+p.z],i*3);}
  else origins.set([p.x,p.y,p.z],i*3);
  const angle=random()*Math.PI*2,launch=.7+random()*2;
  velocities.set([Math.cos(angle)*launch-(bankai?row.side*.65:0),(random()-.5)*1.6,Math.sin(angle)*launch],i*3);
  spins.set([(random()-.5)*3,(random()-.5)*4,(random()-.5)*3],i*3);
  releases[i]=bankai?BANKAI_DISSOLVE_AT+dissolveDelays[i%BANKAI_BLADES]+BANKAI_DISSOLVE_DURATION*threshold:SHIKAI_DISSOLVE_AT+SHIKAI_DISSOLVE_DURATION*threshold;
  sizes[i]=.055+Math.pow(random(),2)*.16;phases[i]=random()*Math.PI*2;
 }
 for(let i=0;i<count*2;i++){
  const origin=i%count;
  dustPositions.set(origins.subarray(origin*3,origin*3+3),i*3);
  dustVelocity.set([velocities[origin*3]*.65+(random()-.5),.2+random()*.8,velocities[origin*3+2]*.65+(random()-.5)],i*3);
  dustRelease[i]=releases[origin];dustPhase[i]=random()*Math.PI*2;
 }
 const bytes=Buffer.concat(Object.keys(SAKURA_FIELDS).map(name=>Buffer.from(data[name].buffer)));
 const destination=path.join(out,`${kind}.bin`),compressed=gzipSync(bytes,{level:9});
 if(check){if(!fs.existsSync(destination)||!gunzipSync(fs.readFileSync(destination)).equals(bytes))throw new Error(`Stale ${kind} asset. Run npm run assets:bake.`);}
 else fs.writeFileSync(destination,compressed);
 console.log(`${kind}: ${bytes.length.toLocaleString()} bytes -> ${compressed.length.toLocaleString()} bytes${check?' (current)':''}`);
 geometry.dispose();
}
