import {BANKAI_DISSOLVE_AT,BANKAI_DISSOLVE_END,BANKAI_RISE_END} from './sakuraLayout';

// The uncut reference releases first, sinks by ~3s, then says Bankai.
export const BANKAI_RELEASE_TIME=.05;
export const BANKAI_SWORD_CONTACT_TIME=1;
export const BANKAI_SWORD_SUBMERGED_TIME=3;

// Keep the completed cage on screen before the final spoken name releases it.
export const BANKAI_FORMATION_COMPLETE_TIME=9;
export const BANKAI_FORMATION_START=BANKAI_FORMATION_COMPLETE_TIME-BANKAI_RISE_END;
export const BANKAI_CAMERA_FOLLOW_END=BANKAI_FORMATION_START;
export const BANKAI_PETAL_RELEASE_TIME=13;
export const BANKAI_PETAL_RUSH_TIME=21;
export const BANKAI_BREAKUP_EARLY_PROGRESS=.65;
export const BANKAI_CAGE_HOLD=BANKAI_PETAL_RELEASE_TIME-BANKAI_FORMATION_START-BANKAI_DISSOLVE_AT;
export function bankaiFormationTime(elapsed:number){
 const time=elapsed+BANKAI_FORMATION_START;
 if(time<BANKAI_PETAL_RELEASE_TIME)return elapsed<=BANKAI_RISE_END?elapsed:Math.max(BANKAI_RISE_END,elapsed-BANKAI_CAGE_HOLD);
 if(time>=BANKAI_PETAL_RUSH_TIME)return BANKAI_DISSOLVE_END+time-BANKAI_PETAL_RUSH_TIME;
 // Establish the petal cloud earlier; retain the accelerated final second.
 const age=time-BANKAI_PETAL_RELEASE_TIME,early=BANKAI_BREAKUP_EARLY_PROGRESS,slowRate=early/7;
 const fast=Math.max(0,age-7);
 const progress=age<=7?age*slowRate:early+slowRate*fast+(1-early-slowRate)*fast*fast;
 return BANKAI_DISSOLVE_AT+(BANKAI_DISSOLVE_END-BANKAI_DISSOLVE_AT)*progress;
}

/** Audio-clock motion: accelerating drop, then a continuous, decelerating sink. */
export function bankaiSwordDepth(time:number,fallDistance:number,sinkDepth:number){
 const duration=BANKAI_SWORD_CONTACT_TIME-BANKAI_RELEASE_TIME;
 if(time<=BANKAI_SWORD_CONTACT_TIME){
  const t=Math.max(0,(time-BANKAI_RELEASE_TIME)/duration);
  return fallDistance*t*t;
 }
 const sinkDuration=BANKAI_SWORD_SUBMERGED_TIME-BANKAI_SWORD_CONTACT_TIME;
 const t=Math.min(1,(time-BANKAI_SWORD_CONTACT_TIME)/sinkDuration);
 const entryTangent=Math.min(3*sinkDepth,2*fallDistance/duration*sinkDuration);
 return fallDistance+(-2*t*t*t+3*t*t)*sinkDepth+(t*t*t-2*t*t+t)*entryTangent;
}
