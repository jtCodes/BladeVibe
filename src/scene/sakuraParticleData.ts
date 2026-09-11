// The asset generator and runtime agree on the layout of each float buffer.
export const SAKURA_COUNTS={shikai:3000,bankai:12000} as const;
export const SAKURA_FIELDS={origins:3,velocities:3,spins:3,releases:1,sizes:1,phases:1,dustPositions:6,dustVelocity:6,dustRelease:2,dustPhase:2} as const;
export type SakuraParticleData={ [K in keyof typeof SAKURA_FIELDS]:Float32Array };
export function sakuraByteLength(count:number){return Object.values(SAKURA_FIELDS).reduce((sum,size)=>sum+size,0)*count*Float32Array.BYTES_PER_ELEMENT;}
export function readSakuraData(buffer:ArrayBuffer,count:number):SakuraParticleData{
 if(buffer.byteLength!==sakuraByteLength(count))throw new Error('Invalid Sakura particle asset');
 let offset=0;
 return Object.fromEntries(Object.entries(SAKURA_FIELDS).map(([name,size])=>{
  const view=new Float32Array(buffer,offset,count*size);offset+=view.byteLength;return [name,view];
 })) as SakuraParticleData;
}
