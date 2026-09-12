import {BANKAI_FRONT_Z,BANKAI_ROW_OFFSET} from './sakuraLayout';
import {FLOOR_Y} from './sceneDimensions';
import type {SwordViewState} from './swordViewState';

/** Low, symmetrical aisle view. Keep the existing lens so shared views reproduce it. */
export function getBankaiCameraView(origin:{x:number;z:number},aspect:number,fov:number):Pick<SwordViewState,'camera'|'target'> {
 const tanHalfFov=Math.tan(fov*Math.PI/360);
 // Put the vanishing point near the bottom and let the closest tips leave the frame.
 const pitch=Math.atan(tanHalfFov*.72),eyeHeight=.55;
 // Account for upward tilt when placing the nearest roots at 6% / 94% of the width.
 const distance=(BANKAI_ROW_OFFSET/(.88*aspect*tanHalfFov)+eyeHeight*Math.sin(pitch))/Math.cos(pitch);
 const y=FLOOR_Y+eyeHeight,z=origin.z+BANKAI_FRONT_Z+distance;
 return {camera:[origin.x,y,z],target:[origin.x,y+Math.tan(pitch)*24,z-24]};
}
