// Timing and placement are shared with the offline asset generator so surface
// breakup and precomputed particle release times stay in agreement.
export const SHIKAI_HEIGHT=5.02,SHIKAI_DISSOLVE_AT=.85,SHIKAI_DISSOLVE_DURATION=1.9;
export const BANKAI_HEIGHT=12,BANKAI_PAIRS=24,BANKAI_BLADES=BANKAI_PAIRS*2;
export const BANKAI_ROW_OFFSET=4.3,BANKAI_FRONT_Z=2,BANKAI_ROW_SPACING=2.05;
export const BANKAI_RISE_STAGGER=.1,BANKAI_DISSOLVE_WINDOW=.65;
export const BANKAI_RISE_END=(BANKAI_PAIRS-1)*BANKAI_RISE_STAGGER+2.1;
export const BANKAI_DISSOLVE_AT=BANKAI_RISE_END+1.1,BANKAI_DISSOLVE_DURATION=1.9;
export const BANKAI_DISSOLVE_END=BANKAI_DISSOLVE_AT+BANKAI_DISSOLVE_WINDOW+BANKAI_DISSOLVE_DURATION;
export function createBankaiRows(){
 const delays=new Float32Array(BANKAI_BLADES);
 for(let i=0;i<BANKAI_BLADES;i++)delays[i]=(BANKAI_PAIRS-1-Math.floor(i/2))*BANKAI_RISE_STAGGER;
 const dissolveDelays=Float32Array.from(delays,delay=>{
  const depth=delay/((BANKAI_PAIRS-1)*BANKAI_RISE_STAGGER);
  return BANKAI_DISSOLVE_WINDOW*(1-Math.pow(1-depth,2));
 });
 const placement=Array.from({length:BANKAI_BLADES},(_,i)=>({side:i%2===0?-1:1,z:BANKAI_FRONT_Z-Math.floor(i/2)*BANKAI_ROW_SPACING,delay:delays[i]}));
 return {delays,dissolveDelays,placement};
}
