import {BANKAI_RELEASE_TIME} from './bankaiTiming';
import * as THREE from 'three';
import {createDarkAura,type AuraCapsule} from './effects/darkAura';
import {FLOOR_Y} from './sceneDimensions';

export const BANKAI_PRESENCE_HEIGHT=3.3,BANKAI_PRESENCE_DEPTH=10;

/** Bankai staging only. The aura renderer remains independent of this choreography. */
export function createBankaiPresence(scene:THREE.Scene){
 const aura=createDarkAura(73);aura.group.name='Bankai shadow presence';scene.add(aura.group);
 aura.setStyle({density:95,turbulence:.10,edgeBrightness:.20,speed:.30,breakup:.84});
 // Outer contour traced from the supplied raised-sword reference (640 × 480).
 // This guides the flames only: no character artwork or interior features are rendered.
 const contour=[
  [287,69],[296,46],[300,27],[315,12],[333,13],[344,25],[349,58],
  [338,51],[338,66],[354,76],[358,87],[374,100],[370,128],
  [386,171],[399,199],[393,217],[379,234],[394,320],[413,390],
  [391,413],[397,446],[370,458],[359,476],[337,477],[329,465],
  [281,469],[263,479],[242,476],[236,465],[223,451],[227,418],
  [211,409],[198,391],[219,307],[238,237],[251,189],
  [210,262],[185,286],[181,269],[190,246],[228,178],[257,125],
  [260,99],[265,83],[276,76],
 ];
 aura.setOutline(contour.map(([x,y])=>new THREE.Vector2((x-315)/480,(478-y)/480)));
 const v=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
 const shape=(a:THREE.Vector3,b:THREE.Vector3,r:number,s=r):AuraCapsule=>({start:a,end:b,startRadius:r,endRadius:s});
 // Readable costume and pose cues, without anatomical limbs or surface detail.
 const releaseTip=v(0,.73,.18),sleeveTip=v(-.30,.43,.06);
 const shapes=[
  shape(v(-.018,.88,0),v(-.055,1.00,-.01),.014,.003), // sparse rising trace, no closed head contour
  shape(v(-.095,.835,0),v(.095,.835,0),.029,.029), // high scarf/collar above the sloping shoulders
  shape(v(0,.78,0),v(0,.51,0),.08,.059),
  shape(v(0,.51,0),v(0,.12,0),.075,.155), // continuous full-length robe; no leg split or ghost tail
  shape(v(-.11,.79,-.025),v(-.17,.095,-.015),.036,.042), // haori edges retain the full character outline
  shape(v(.11,.79,-.025),v(.17,.095,-.035),.036,.042),
  shape(v(-.14,.80,0),sleeveTip,.070,.045), // one broad sleeve suggests the release pose
  shape(v(-.17,.70,.045),releaseTip,.040,.004), // independent flowing strand, not an articulated forearm
  shape(v(.14,.80,0),v(.31,.40,.015),.070,.045), // opposite hanging sleeve
  shape(v(-.17,.13,0),v(-.24,.33,-.025),.035,.003), // flame tongues rise along the hem
  shape(v(-.06,.83,-.02),v(-.19,.76,-.08),.022,.002), // trailing scarf-like stroke
  shape(v(.17,.12,-.025),v(.24,.29,-.045),.035,.003),
 ];
 // Independent posed copies avoid accumulating drift when scrubbing or replaying.
 const flowingShapes=shapes.map(s=>shape(s.start.clone(),s.end.clone(),s.startRadius,s.endRadius));
 const held=new THREE.Vector3(),gripLocal=new THREE.Vector3();
 const inverse=new THREE.Matrix4();const height=BANKAI_PRESENCE_HEIGHT;
 function configure(origin:{x:number;z:number},releaseGrip:THREE.Vector3){
  aura.group.position.set(origin.x,FLOOR_Y,origin.z-BANKAI_PRESENCE_DEPTH);
  aura.group.scale.setScalar(height);aura.group.updateMatrixWorld(true);
  inverse.copy(aura.group.matrixWorld).invert();held.copy(releaseGrip).applyMatrix4(inverse);
 }
 return {
  configure,
  update(time:number,gripWorld:THREE.Vector3,formationTime:number){
   // No release-triggered elbow/arm pose. Broad aura masses drift continuously.
   gripLocal.copy(gripWorld).applyMatrix4(inverse);
   const release=THREE.MathUtils.smoothstep(time,BANKAI_RELEASE_TIME,BANKAI_RELEASE_TIME+1.55);
   sleeveTip.set(-.30+Math.sin(time*.83)*.014,.43+Math.sin(time*.67+.4)*.016,.04+Math.sin(time*.61)*.012);
   shapes[8].end.set(.31+Math.sin(time*.71+1.3)*.014,.40+Math.sin(time*.89)*.018,.015);
   // After contact, the strand thins and rises away like smoke instead of lowering a hand.
   releaseTip.copy(time<BANKAI_RELEASE_TIME?gripLocal:held);
   releaseTip.x-=release*(.025+Math.sin(time*1.3)*.025);
   releaseTip.y+=release*.18;
   releaseTip.z-=release*.045;
   shapes[7].start.set(-.17+Math.sin(time*.93+.7)*.015,.70+release*.055,.045);
   shapes[7].startRadius=THREE.MathUtils.lerp(.040,.009,release);
   shapes[7].endRadius=THREE.MathUtils.lerp(.004,.001,release);
   // A narrow drifting trace above the collar only suggests the head area.
   shapes[0].end.set(-.055+Math.sin(time*.9)*.018,1.00+Math.sin(time*.7)*.015,-.01);
   // Small flames drift upward beside a stable, grounded robe silhouette.
   shapes[9].end.set(-.24+Math.sin(time*.65)*.02,.33+Math.sin(time*.7)*.025,-.025);
   shapes[10].end.set(-.19-Math.sin(time*.8)*.025,.76+Math.sin(time*.7)*.018,-.08);
   shapes[11].end.set(.24+Math.sin(time*.65+.8)*.02,.29+Math.sin(time*.7)*.025,-.045);
   for(let i=0;i<shapes.length;i++){
    const source=shapes[i],flowing=flowingShapes[i];
    flowing.start.copy(source.start);flowing.end.copy(source.end);
    // Small, out-of-phase local shifts keep the implied figure from becoming a fixed stencil.
    const phase=i*1.73;
    flowing.start.x+=Math.sin(time*.91+phase)*.018;
    flowing.start.z+=Math.sin(time*.63+phase)*.012;
    if(i!==7||time>=BANKAI_RELEASE_TIME){
     flowing.end.x+=Math.sin(time*1.07+phase+.8)*.025;
     flowing.end.y+=Math.sin(time*.79+phase)*.014;
    }
    const swell=1+Math.sin(time*1.13+phase)*.15;
    flowing.startRadius=source.startRadius*swell;flowing.endRadius=source.endRadius*swell;
   }
   aura.setShapes(flowingShapes);
   // Preserve the presence through the formation, then dissolve into the petal release.
   const fade=1-THREE.MathUtils.smoothstep(formationTime,5.5,8.1);
   aura.update(time,fade);
  },
  hide(){aura.update(0,0);},
  dispose:aura.dispose,
 };
}
