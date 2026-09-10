import * as THREE from 'three';
import {FLOOR_Y,METERS_PER_UNIT} from './swordPhysics';

// A small world-space cloth grid. Both sides have independent mass so the strip
// can fold and twist, rather than behaving like a rigid ribbon along a spline.
export function createClothPhysics(mesh:THREE.Mesh,sword:THREE.Group){
 const geometry=mesh.geometry,attribute=geometry.getAttribute('position') as THREE.BufferAttribute;
 attribute.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;
 const rest=Array.from({length:attribute.count},(_,i)=>new THREE.Vector3().fromBufferAttribute(attribute,i));
 const points=rest.map(p=>p.clone()),previous=rest.map(p=>p.clone());
 const links:{a:number;b:number;length:number;stiffness:number}[]=[];
 function link(a:number,b:number,stiffness=1){links.push({a,b,length:rest[a].distanceTo(rest[b]),stiffness});}
 const columns=5,rows=rest.length/columns;
 for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
  const i=row*columns+col;
  if(col>0)link(i-1,i);
  if(row>0){link(i-columns,i);if(col>0){link(i-columns-1,i);link(i-columns,i-1);}}
  if(row>1)link(i-columns*2,i,.12);
  if(col>1)link(i-2,i,.10);
 }
 const inverse=new THREE.Matrix4(),pinA=new THREE.Vector3(),pinB=new THREE.Vector3(),lastPin=new THREE.Vector3();
 const delta=new THREE.Vector3(),local=new THREE.Vector3(),before=new THREE.Vector3();
 const center=new THREE.Vector3(),tangent=new THREE.Vector3(),across=new THREE.Vector3(),normal=new THREE.Vector3(),folded=new THREE.Vector3();
 let initialized=false,accumulator=0,time=0,shadowTime=0;
 function pin(){for(let i=0;i<columns;i++){points[i].copy(rest[i]).applyMatrix4(sword.matrixWorld);previous[i].copy(points[i]);}}
 function collide(p:THREE.Vector3,old:THREE.Vector3){
  if(p.y<FLOOR_Y+.025){p.y=FLOOR_Y+.025;old.x=THREE.MathUtils.lerp(old.x,p.x,.65);old.z=THREE.MathUtils.lerp(old.z,p.z,.65);old.y=p.y;}
  local.copy(p).applyMatrix4(inverse);
  // Keep the loose fabric outside the blade faces and wrapped grip.
  const y=local.y;
  if(y>=-.12&&y<=8){
   const t=THREE.MathUtils.clamp((y-.48)/7.52,0,1),width=1.38*(1-Math.pow(t,2.8))+.002;
   if(local.x>-.15&&local.x<-.13+width+.025&&Math.abs(local.z)<.10){
    local.z=(local.z<0?-1:1)*.10;p.copy(local).applyMatrix4(sword.matrixWorld);
   }
  }else if(y<-.12&&y>-1.8){
   const r=Math.hypot(local.x,local.z/ .8);
   if(r<.155){if(r<.0001)local.z=.124;else{local.x*=.155/r;local.z*=.155/r;}p.copy(local).applyMatrix4(sword.matrixWorld);}
  }
 }
 return {update(dt:number){
  sword.updateWorldMatrix(true,false);inverse.copy(sword.matrixWorld).invert();
  pinA.copy(rest[0]).applyMatrix4(sword.matrixWorld);pinB.copy(rest[1]).applyMatrix4(sword.matrixWorld);
  if(!initialized){
   for(let i=0;i<points.length;i++){points[i].copy(rest[i]).applyMatrix4(sword.matrixWorld);previous[i].copy(points[i]);}
   lastPin.copy(pinA);initialized=true;
  }
  // Display resets are teleports, not an impulse that should stretch the fabric.
  delta.subVectors(pinA,lastPin);
  if(delta.lengthSq()>4)for(let i=0;i<points.length;i++){points[i].add(delta);previous[i].add(delta);}
  lastPin.copy(pinA);pin();
  const step=1/90;accumulator+=Math.min(dt,.05);
  while(accumulator>=step){
   time+=step;
   for(let i=columns;i<points.length;i++){
    const p=points[i];before.copy(p);delta.subVectors(p,previous[i]).multiplyScalar(.987);
    p.add(delta);previous[i].copy(before);
    p.y-=9.81/METERS_PER_UNIT*.20*step*step;
    // Stylized air support keeps the long, light cloth streaming. Spatial gusts
    // act differently across the grid, producing folds instead of a rigid sheet.
    p.x+=(15+7*Math.sin(time*.8+p.y*.8))*step*step;
    p.z+=(5*Math.sin(time*1.5+p.x*.9+p.y*.6)+3*Math.sin((i%columns)*Math.PI/4)*Math.sin(time*2.3-Math.floor(i/columns)*.22))*step*step;
   }
   for(let iteration=0;iteration<12;iteration++){
    pin();
    for(const constraint of links){
     const a=points[constraint.a],b=points[constraint.b];delta.subVectors(b,a);
     const distance=delta.length();if(distance<1e-7)continue;
     const wa=constraint.a<columns?0:1,wb=constraint.b<columns?0:1,total=wa+wb;if(!total)continue;
     delta.multiplyScalar((distance-constraint.length)/distance*constraint.stiffness/total);
     if(wa)a.add(delta);if(wb)b.sub(delta);
    }
    for(let i=columns;i<points.length;i++)collide(points[i],previous[i]);
   }
   pin();accumulator-=step;
  }
  // Give the render surface a folded cross-section along the simulated centerline.
  // The old distance grid straightened into a flat sheet under tension; this
  // retained fabric curl keeps actual surface normals turning through the light.
  for(let row=0;row<rows;row++){
   const i=row*columns,left=points[i],right=points[i+columns-1];
   center.copy(left).add(right).multiplyScalar(.5);
   const prev=Math.max(0,row-1)*columns+2,next=Math.min(rows-1,row+1)*columns+2;
   tangent.subVectors(points[next],points[prev]).normalize();
   across.subVectors(right,left);const width=across.length();across.normalize();
   normal.crossVectors(tangent,across).normalize();
   const attachment=THREE.MathUtils.smoothstep(row,0,5);
   const twist=attachment*(.95*Math.sin(row*.19-time*.65)+.4*Math.sin(row*.39+time*.4));
   across.applyAxisAngle(tangent,twist);normal.crossVectors(tangent,across).normalize();
   const curl=attachment*width*(.28+.12*Math.sin(row*.27-time*.8));
   for(let col=0;col<columns;col++){
    const v=col/(columns-1),offset=(v-.5)*width;
    folded.copy(center).addScaledVector(across,offset).addScaledVector(normal,Math.sin(v*Math.PI)*curl);
    if(row===0)folded.copy(points[i+col]);
    folded.y=Math.max(FLOOR_Y+.025,folded.y);
    local.copy(folded).applyMatrix4(inverse);attribute.setXYZ(i+col,local.x,local.y,local.z);
   }
  }
  attribute.needsUpdate=true;geometry.computeVertexNormals();
  shadowTime+=dt;if(shadowTime>1/20){sword.userData.shadowRevision=(sword.userData.shadowRevision??0)+1;shadowTime=0;}
 }};
}
