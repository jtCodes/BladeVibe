import {createClothPhysics} from './clothPhysics';
import * as THREE from 'three';
import {surfaceMaps} from './craft';

// Broad original Zangetsu: straight spine, scooped heel and long curved cutting edge.
export function createZangetsuBladeGeometry(){
 const stations=[[-.12,.13],[0,.13],[.10,.11],[.20,.07],[.30,.16],[.40,.40],[.48,1.38]];
 for(let i=1;i<=96;i++){const t=i/96;stations.push([.48+t*7.52,1.38*(1-Math.pow(t,2.8))+.002]);}
 const cross=[[0,-1],[0,1],[.69,1],[1,0],[.69,-1]];
 const pos:number[]=[],uv:number[]=[],idx:number[]=[];
 const g=new THREE.BufferGeometry();
 for(let face=0;face<cross.length;face++){
  const base=pos.length/3,start=idx.length;
  for(const [y,width] of stations){
   const thickness=.065*(1-.9*Math.pow(Math.max(0,y)/8,3));
   for(const [u,z] of [cross[face],cross[(face+1)%cross.length]]){
    pos.push(-.13+u*width,y,z*thickness);uv.push(u,y/8);
   }
  }
  for(let row=0;row<stations.length-1;row++){const a=base+row*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}
  g.addGroup(start,idx.length-start,face===2||face===3?1:0);
 }
 g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}

export function createZangetsu(renderer:THREE.WebGLRenderer,sword:THREE.Group){
 const steelMaps=surfaceMaps('steel',renderer);
 const dark=new THREE.MeshStandardMaterial({color:0x161c22,metalness:.8,roughness:.36,bumpMap:steelMaps.bumpMap,bumpScale:.0004});
 const edge=new THREE.MeshPhysicalMaterial({color:0xe4e9ee,metalness:1,roughness:.23,anisotropy:.35,anisotropyRotation:Math.PI/2,bumpMap:steelMaps.bumpMap,bumpScale:.0002});
 function add(g:THREE.BufferGeometry,m:THREE.Material|THREE.Material[]){const mesh=new THREE.Mesh(g,m);mesh.castShadow=true;mesh.receiveShadow=true;sword.add(mesh);return mesh;}
 add(createZangetsuBladeGeometry(),[dark,edge]).name='zangetsu-blade';
 // Fine woven relief rather than painted dark lines on the white binding.
 const pixels=new Uint8Array(64*64*4);
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){const value=155+Math.round(35*Math.sin(x*Math.PI/2)*Math.cos(y*Math.PI/2));pixels.set([value,value,value,255],(y*64+x)*4);}
 const weave=new THREE.DataTexture(pixels,64,64);weave.wrapS=weave.wrapT=THREE.RepeatWrapping;weave.repeat.set(3,14);weave.needsUpdate=true;
 // Seeded fabric wear is generated once and shared by the grip, loose strip,
 // and winding. Color variation stays attached to the cloth as it moves.
 const wearWidth=256,wearHeight=512,wearPixels=new Uint8Array(wearWidth*wearHeight*4);
 const hash=(x:number,y:number)=>{const n=Math.sin(x*127.1+y*311.7+19.3)*43758.5453;return n-Math.floor(n);};
 function noise(x:number,y:number){
  const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
  const sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix,iy),hash(ix+1,iy),sx),THREE.MathUtils.lerp(hash(ix,iy+1),hash(ix+1,iy+1),sx),sy);
 }
 for(let y=0;y<wearHeight;y++)for(let x=0;x<wearWidth;x++){
  const u=x/wearWidth,v=y/wearHeight;
  const mottling=noise(u*12,v*24)*.65+noise(u*39,v*71)*.35;
  const stain=THREE.MathUtils.smoothstep(mottling,.53,.78);
  const faded=THREE.MathUtils.smoothstep(noise(u*23+7,v*19),.58,.85)*.04;
  const speck=hash(x,y)>.996?.13:0;
  const grain=(hash(x+17,y+9)-.5)*.025;
  const shade=1-stain*.28-speck+grain;
  const offset=(y*wearWidth+x)*4;
  wearPixels.set([Math.round(255*THREE.MathUtils.clamp(shade+faded,0,1)),Math.round(255*THREE.MathUtils.clamp(shade-stain*.035+faded,0,1)),Math.round(255*THREE.MathUtils.clamp(shade-stain*.07+faded,0,1)),255],offset);
 }
 const wear=new THREE.DataTexture(wearPixels,wearWidth,wearHeight);wear.colorSpace=THREE.SRGBColorSpace;
 wear.wrapS=wear.wrapT=THREE.RepeatWrapping;wear.magFilter=THREE.LinearFilter;wear.minFilter=THREE.LinearMipmapLinearFilter;wear.generateMipmaps=true;
 wear.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());wear.needsUpdate=true;
 const cloth=new THREE.MeshPhysicalMaterial({color:0xeeeae2,map:wear,roughness:.92,sheen:.22,sheenRoughness:.9,sheenColor:0xfff5e5,bumpMap:weave,bumpScale:.0015,side:THREE.DoubleSide});
 const grip=add(new THREE.CylinderGeometry(.12,.13,1.8,32),cloth);grip.position.y=-.95;grip.scale.z=.8;
 const pos:number[]=[],uv:number[]=[],idx:number[]=[],segments=640;
 for(let i=0;i<=segments;i++){
  const t=i/segments,a=t*Math.PI*2*16;
  for(let j=0;j<3;j++){const v=j/2,r=.132+.003*Math.sin(v*Math.PI);pos.push(Math.cos(a)*r,-.08-t*1.72+(v-.5)*.128,Math.sin(a)*r*.8);uv.push(t*3,v);}
 }
 for(let i=0;i<segments;i++)for(let j=0;j<2;j++){const a=i*3+j;idx.push(a,a+1,a+3,a+1,a+4,a+3);}
 const wrap=new THREE.BufferGeometry();wrap.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));wrap.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));wrap.setIndex(idx);wrap.computeVertexNormals();add(wrap,cloth);
 const path=new THREE.CatmullRomCurve3([new THREE.Vector3(.135,-1.8,0),new THREE.Vector3(.16,-1.85,.45),new THREE.Vector3(1.7,-3,.65),new THREE.Vector3(.9,-5.1,-.25),new THREE.Vector3(1.9,-7.1,.45),new THREE.Vector3(1.3,-9.2,.25)]);
 const tailSegments=72;
 const ribbonPos:number[]=[],ribbonUV:number[]=[],ribbonIdx:number[]=[];
 for(let i=0;i<=tailSegments;i++){
  const t=i/tailSegments,p=path.getPoint(t),tangent=path.getTangent(t),side=new THREE.Vector3(-tangent.y,tangent.x,Math.sin(t*8)*.55).normalize();
  const widths=[-1,1].map(sign=>{
   const nick=Math.pow(Math.max(0,Math.sin(t*53+sign*2.7)),18)*.12;
   const irregular=1+.09*Math.sin(t*19+sign)+.045*Math.sin(t*71+sign*3);
   const taper=1-THREE.MathUtils.smoothstep(t,sign>0?.88:.96,1)*.97;
   return i===0?.115:.16*(irregular-nick)*taper;
  });
  const normal=new THREE.Vector3().crossVectors(tangent,side).normalize();
  for(let j=0;j<5;j++){
   const v=j/4,offset=THREE.MathUtils.lerp(-widths[0],widths[1],v);
   const q=p.clone().addScaledVector(side,offset).addScaledVector(normal,Math.sin(v*Math.PI)*.045*Math.sin(t*16));
   // Share the exact final cross-section of the grip spiral: no gap at the cap.
   if(i===0)q.set(.132+.003*Math.sin(v*Math.PI),-1.8+(v-.5)*.128,0);
   ribbonPos.push(q.x,q.y,q.z);ribbonUV.push(v,t*8);
  }
 }
 for(let i=0;i<tailSegments;i++)for(let j=0;j<4;j++){const a=i*5+j;ribbonIdx.push(a,a+1,a+5,a+1,a+6,a+5);}
 const ribbon=new THREE.BufferGeometry();ribbon.setAttribute('position',new THREE.Float32BufferAttribute(ribbonPos,3));ribbon.setAttribute('uv',new THREE.Float32BufferAttribute(ribbonUV,2));ribbon.setIndex(ribbonIdx);ribbon.computeVertexNormals();const tail=add(ribbon,cloth);tail.name='zangetsu-cloth-tail';
 const clothPhysics=createClothPhysics(tail,sword);
 // A continuous overlapping bandage follows the broad blade, including its tip.
 const covering=new THREE.Group();covering.name='zangetsu-blade-wrapping';
 const bandPos:number[]=[],bandUV:number[]=[],bandIdx:number[]=[];
 const turns=27,steps=turns*64,pitch=8.3/turns;
 function clothPoint(y:number,angle:number){
  const t=THREE.MathUtils.clamp((y-.48)/7.52,0,1);
  const width=1.38*(1-Math.pow(t,2.8))+.002;
  const c=Math.cos(angle),s=Math.sin(angle);
  // Flattened rounded cross section, leaving room over both faces and the sharp edge.
  const x=-.13+width*.5+Math.sign(c)*Math.pow(Math.abs(c),.25)*(width*.5+.025);
  const z=Math.sign(s)*Math.pow(Math.abs(s),.25)*(.065*(1-.9*Math.pow(Math.max(0,Math.min(8,y))/8,3))+.025);
  return [x,y,z];
 }
 for(let i=0;i<=steps;i++){
  const a=Math.PI+i/64*Math.PI*2,center=-.12+i/steps*8.3;
  for(let j=0;j<5;j++){
   const v=j/4,y=THREE.MathUtils.clamp(center+(v-.5)*pitch*1.16,-.12,8.08);
   const p=clothPoint(y,a);p[2]+=Math.sign(p[2])*(.012*Math.sin(v*Math.PI)+.006*(1-v));
   bandPos.push(...p);bandUV.push(i/64,v);
  }
 }
 for(let i=0;i<steps;i++)for(let j=0;j<4;j++){const a=i*5+j;bandIdx.push(a,a+1,a+5,a+1,a+6,a+5);}
 // Reserve a connected free end beyond the last wound turn. It feeds onto the
 // blade while wrapping and peels away along the same spiral when unwrapping.
 const freeSteps=160,totalSteps=steps+freeSteps;
 const restingPositions=new Float32Array(bandPos);
 const animatedPositions=new Float32Array((totalSteps+1)*5*3);
 animatedPositions.set(bandPos);
 const restingUV=new Float32Array(bandUV);
 const animatedUV=new Float32Array((totalSteps+1)*5*2);animatedUV.set(bandUV);
 for(let i=steps;i<totalSteps;i++)for(let j=0;j<4;j++){const a=i*5+j;bandIdx.push(a,a+1,a+5,a+1,a+6,a+5);}
 const bandGeometry=new THREE.BufferGeometry();
 const bandAttribute=new THREE.BufferAttribute(animatedPositions,3).setUsage(THREE.DynamicDrawUsage);
 const uvAttribute=new THREE.BufferAttribute(animatedUV,2).setUsage(THREE.DynamicDrawUsage);
 bandGeometry.setAttribute('position',bandAttribute);bandGeometry.setAttribute('uv',uvAttribute);bandGeometry.setIndex(bandIdx);
 const bandCloth=cloth.clone();bandCloth.color.set(0xded9ce);bandCloth.bumpScale=.003;
 // Shade overlap seams in the strip's own UVs, so they follow the winding
 // and its moving loose end instead of looking painted across the blade.
 bandCloth.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec2 wrapUV;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n wrapUV=uv;');
  shader.fragmentShader='varying vec2 wrapUV;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float v=wrapUV.y;
   float seam=(1.-smoothstep(.015,.15,v))*.28+smoothstep(.91,.995,v)*.17;
   float lip=exp(-pow((v-.17)/.065,2.))*.065;
   float fabric=.965+.035*sin(wrapUV.x*5.7+sin(wrapUV.x*2.3));
   float creases=.04*sin(v*21.+sin(wrapUV.x*9.)*.65)*sin(v*3.14159);
   diffuseColor.rgb*=fabric*(1.-seam+lip+creases);
  `);
 };
 bandCloth.customProgramCacheKey=()=> 'zangetsu-layered-cloth-v1';
 const band=new THREE.Mesh(bandGeometry,bandCloth);band.castShadow=true;band.receiveShadow=true;band.frustumCulled=false;covering.add(band);
 let coverage=0,targetCoverage=0,speed=0,elapsed=0,configured=false,lastHead=-1,feed=0;
 const tailAttribute=ribbon.getAttribute('position') as THREE.BufferAttribute;
 const handleLeft=new THREE.Vector3().fromBufferAttribute(tailAttribute,0),handleRight=new THREE.Vector3().fromBufferAttribute(tailAttribute,4);
 const seamLeft=new THREE.Vector3().fromArray(bandPos,0),seamRight=new THREE.Vector3().fromArray(bandPos,12);
 const seamCenter=seamLeft.clone().add(seamRight).multiplyScalar(.5);
 const handleCenter=handleLeft.clone().add(handleRight).multiplyScalar(.5);
 // The strip is anchored at the far handle end; the loop feeds the blade base.
 const feedCurve=new THREE.CubicBezierCurve3(handleCenter,new THREE.Vector3(.145,-1.84,.65),new THREE.Vector3(.65,-.75,.3),seamCenter);
 const feedPoint=new THREE.Vector3(),feedWidth=new THREE.Vector3(),handleWidth=handleRight.clone().sub(handleLeft),seamWidth=seamRight.clone().sub(seamLeft);
 const loopTangent=new THREE.Vector3(),loopNormal=new THREE.Vector3(),loopDown=new THREE.Vector3(),loopInverse=new THREE.Matrix4();
 const outward=new THREE.Vector3(),side=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
 covering.userData.setUnwrapped=(amount:number)=>{
  targetCoverage=1-THREE.MathUtils.clamp(amount,0,1);
  if(!configured){coverage=targetCoverage;feed=coverage>0?1:0;configured=true;}
 };
 covering.userData.updateCloth=(dt:number)=>{
  clothPhysics.update(dt);elapsed+=dt;
  // Pull the existing handle tail into position first, then extend that same
  // strip into the winding. On release it becomes the simulated loose tail again.
  const feedTarget=targetCoverage>0||coverage>0?1:0;
  feed=THREE.MathUtils.clamp(feed+Math.sign(feedTarget-feed)*Math.min(Math.abs(feedTarget-feed),dt*1.25),0,1);
  const blend=feed*feed*(3-2*feed);
  if(feed>0){
   loopDown.set(0,-1,0).transformDirection(loopInverse.copy(sword.matrixWorld).invert());
   for(let i=1;i<=tailSegments;i++){
    const t=i/tailSegments,envelope=Math.sin(t*Math.PI);
    feedCurve.getPoint(t,feedPoint);feedCurve.getTangent(t,loopTangent);
    feedWidth.copy(handleWidth).lerp(seamWidth,t);
    // Slack, irregular creases and torsion replace the perfectly smooth strap.
    feedPoint.addScaledVector(loopDown,.24*envelope*envelope);
    feedPoint.x+=envelope*(.075*Math.sin(t*18+.25*Math.sin(elapsed*.8))+.022*Math.sin(t*39));
    feedPoint.z+=envelope*(.095*Math.sin(t*12+1)+.02*Math.sin(elapsed*.9-t*7));
    feedWidth.applyAxisAngle(loopTangent,envelope*(.85*Math.sin(t*13)+.18*Math.sin(elapsed*.7-t*6)));
    loopNormal.crossVectors(loopTangent,feedWidth).normalize();
    const crease=envelope*(.025+.033*Math.sin(t*23));
    for(let j=0;j<5;j++){
     const index=i*5+j,offset=j/4-.5;
     tailAttribute.setXYZ(index,
      THREE.MathUtils.lerp(tailAttribute.getX(index),feedPoint.x+feedWidth.x*offset+loopNormal.x*Math.sin(j/4*Math.PI)*crease,blend),
      THREE.MathUtils.lerp(tailAttribute.getY(index),feedPoint.y+feedWidth.y*offset+loopNormal.y*Math.sin(j/4*Math.PI)*crease,blend),
      THREE.MathUtils.lerp(tailAttribute.getZ(index),feedPoint.z+feedWidth.z*offset+loopNormal.z*Math.sin(j/4*Math.PI)*crease,blend));
    }
   }
   tailAttribute.needsUpdate=true;ribbon.computeVertexNormals();
  }
  const nextCoverage=feed<1&&targetCoverage>coverage?coverage:targetCoverage;
  const distance=nextCoverage-coverage;
  speed=THREE.MathUtils.damp(speed,Math.sign(distance)*Math.min(.16,Math.sqrt(Math.abs(distance)*.16)),7,dt);
  const advance=speed*Math.min(dt,.05);
  if(Math.abs(distance)<.00005||Math.abs(advance)>=Math.abs(distance)){coverage=nextCoverage;speed=0;}
  else coverage=THREE.MathUtils.clamp(coverage+advance,0,1);
  const head=coverage*steps,wound=Math.floor(head),angle=Math.PI+head/64*Math.PI*2;
  if(head===lastHead&&(coverage===0||coverage===1))return;
  lastHead=head;
  // Restore settled turns; only the contact turn and free cloth deform.
  animatedPositions.set(restingPositions.subarray(0,(wound+1)*15));
  animatedUV.set(restingUV.subarray(0,(wound+1)*10));
  const headY=-.12+coverage*8.3;
  outward.set(Math.cos(angle),0,Math.sin(angle));
  const extension=THREE.MathUtils.smoothstep(coverage,0,.025)*(1-THREE.MathUtils.smoothstep(coverage,.975,1));
  for(let i=0;i<=freeSteps;i++){
   const t=i/freeSteps,peel=1-Math.exp(-t*7),arc=angle+t*4.2;
   const radius=extension*(t*2.5);
   const curl=extension*Math.sin(t*Math.PI)*Math.sin(elapsed*3-t*8)*.20;
   side.copy(up).multiplyScalar(Math.cos(t*2.5)).addScaledVector(outward,Math.sin(t*2.5)).normalize();
   for(let j=0;j<5;j++){
    const v=j/4,width=(v-.5)*pitch*1.16;
    const root=clothPoint(THREE.MathUtils.clamp(headY+width,-.12,8.08),angle);root[2]+=Math.sign(root[2])*(.012*Math.sin(v*Math.PI)+.006*(1-v));
    const x=root[0]+Math.cos(arc)*radius+side.x*width*peel;
    const y=root[1]+extension*(t*.8-t*t*1.7)+curl+(side.y-1)*width*peel;
    const z=root[2]+Math.sin(arc)*radius+side.z*width*peel+curl*.65;
    const row=wound+i;
    bandAttribute.setXYZ(row*5+j,x,y,z);uvAttribute.setXY(row*5+j,head/64+t*3,v);
   }
  }
  const count=coverage===0?0:coverage===1?steps:wound+freeSteps;
  bandGeometry.setDrawRange(0,count*24);bandAttribute.needsUpdate=true;uvAttribute.needsUpdate=true;bandGeometry.computeVertexNormals();
  sword.userData.shadowRevision=(sword.userData.shadowRevision??0)+1;
 };
 return covering;
}
