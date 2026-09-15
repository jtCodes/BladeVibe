import {BANKAI_CAMERA_FOLLOW_END} from './bankaiTiming';
import {BANKAI_FRONT_Z,BANKAI_ROW_OFFSET} from './sakuraLayout';
import {BANKAI_PRESENCE_DEPTH,BANKAI_PRESENCE_HEIGHT} from './bankaiPresence';
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

/** Timeline-driven dolly: hold the figure close, then reveal the aisle as the cage rises. */
export function getBankaiOpeningView(origin:{x:number;z:number},aspect:number,fov:number,time:number,pullbackEnd:number,followDrop=0):Pick<SwordViewState,'camera'|'target'> {
 const wide=getBankaiCameraView(origin,aspect,fov);
 const t=Math.max(0,Math.min(1,(time-BANKAI_CAMERA_FOLLOW_END)/Math.max(.1,pullbackEnd-BANKAI_CAMERA_FOLLOW_END)));
 const blend=t*t*t*(t*(t*6-15)+10);
 const figureZ=origin.z-BANKAI_PRESENCE_DEPTH,focusY=FLOOR_Y+BANKAI_PRESENCE_HEIGHT*.545;
 const distance=(BANKAI_PRESENCE_HEIGHT*.65)/(Math.tan(fov*Math.PI/360)*Math.min(1,aspect));
 // Track the descending sword gently; the dolly gradually hands framing back to the aisle.
 const trackedY=focusY-Math.min(1.15,Math.max(0,followDrop))*.65;
 const closeCamera=[origin.x,trackedY,figureZ+distance];
 const closeTarget=[origin.x,trackedY,figureZ];
 return {
  camera:wide.camera.map((v,i)=>closeCamera[i]+(v-closeCamera[i])*blend) as [number,number,number],
  target:wide.target.map((v,i)=>closeTarget[i]+(v-closeTarget[i])*blend) as [number,number,number],
 };
}
