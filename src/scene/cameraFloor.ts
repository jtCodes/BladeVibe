import type {Vector3} from 'three';
import {FLOOR_Y} from './sceneDimensions';

// Leave clearance for the near plane and the small surface ripples.
export const CAMERA_FLOOR_CLEARANCE=.15;
export function constrainCameraToFloor(position:Vector3,target:Vector3):boolean {
 const minimum=FLOOR_Y+CAMERA_FLOOR_CLEARANCE;
 let changed=false;
 if(position.y<minimum){position.y=minimum;changed=true;}
 if(target.y<FLOOR_Y){target.y=FLOOR_Y;changed=true;}
 return changed;
}
