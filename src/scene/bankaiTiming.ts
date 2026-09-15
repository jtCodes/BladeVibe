import {BANKAI_DISSOLVE_AT,BANKAI_RISE_END} from './sakuraLayout';

// The uncut reference releases first, sinks by ~3s, then says Bankai.
export const BANKAI_RELEASE_TIME=.2;
export const BANKAI_SWORD_TIME_SCALE=.4;
export const BANKAI_CAMERA_FOLLOW_END=1.7;

// Keep the completed cage on screen before the final spoken name releases it.
export const BANKAI_FORMATION_START=5.1;
export const BANKAI_PETAL_RELEASE_TIME=12.9;
export const BANKAI_CAGE_HOLD=BANKAI_PETAL_RELEASE_TIME-BANKAI_FORMATION_START-BANKAI_DISSOLVE_AT;
export function bankaiFormationTime(elapsed:number){
 return elapsed<=BANKAI_RISE_END?elapsed:Math.max(BANKAI_RISE_END,elapsed-BANKAI_CAGE_HOLD);
}
