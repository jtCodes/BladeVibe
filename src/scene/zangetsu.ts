import {createClothPhysics} from './clothPhysics';
import * as THREE from 'three';
import {surfaceMaps} from './craft';

// Broad original Zangetsu: straight spine, scooped heel and long curved cutting edge.
export function createZangetsuBladeGeometry(){
 // Continue the blade as a solid tang inside the entire wrapped grip.
 const stations=[[-1.87,.15,.065],[-1.5,.15,.035],[-.8,.16,.009],[-.2,.18,0],[-.12,.20,0],[0,.22,0],[.10,.22,-.012],[.20,.12,-.035],[.30,.16],[.40,.40],[.48,1.38]];
 for(let i=1;i<=96;i++){const t=i/96;stations.push([.48+t*7.52,1.38*(1-Math.pow(t,2.8))+.002]);}
 const cross=[[0,-1],[0,1],[.69,1],[1,0],[.69,-1]];
 const pos:number[]=[],uv:number[]=[],idx:number[]=[];
 const g=new THREE.BufferGeometry();
 for(let face=0;face<cross.length;face++){
  const base=pos.length/3,start=idx.length;
  for(const [y,width,tangCenter] of stations){
   const thickness=y<=0?.035:THREE.MathUtils.lerp(.035,.065,Math.min(1,y/.2))*(1-.9*Math.pow(Math.max(0,y)/8,3));
   for(const [u,z] of [cross[face],cross[(face+1)%cross.length]]){
    pos.push((tangCenter===undefined?-.13:tangCenter-width*.5)+u*width,y,z*thickness);uv.push(u,y/8);
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
 // Wear changes the weave relief and roughness, never the cloth's white albedo.
 const wearWidth=256,wearHeight=512,wearPixels=new Uint8Array(wearWidth*wearHeight*4),roughPixels=new Uint8Array(wearWidth*wearHeight*4);
 const hash=(x:number,y:number)=>{const n=Math.sin(x*127.1+y*311.7+19.3)*43758.5453;return n-Math.floor(n);};
 function noise(x:number,y:number){
  const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
  const sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix,iy),hash(ix+1,iy),sx),THREE.MathUtils.lerp(hash(ix,iy+1),hash(ix+1,iy+1),sx),sy);
 }
 for(let y=0;y<wearHeight;y++)for(let x=0;x<wearWidth;x++){
  const u=x/wearWidth,v=y/wearHeight;
  const abrasion=THREE.MathUtils.smoothstep(noise(u*11,v*17),.45,.82);
  const warp=Math.sin(x*Math.PI*.5+noise(u*8,v*4)*.4),weft=Math.cos(y*Math.PI*.5);
  const looseFiber=Math.pow(Math.max(0,noise(u*110,v*5)-.42),2)*.45;
  const relief=.5+warp*weft*(.12-.08*abrasion)+looseFiber+(hash(x,y)-.5)*.025;
  const value=Math.round(255*THREE.MathUtils.clamp(relief,0,1)),rough=Math.round(255*(.90+.09*abrasion));
  const offset=(y*wearWidth+x)*4;
  wearPixels.set([value,value,value,255],offset);roughPixels.set([rough,rough,rough,255],offset);
 }
 function fabricTexture(data:Uint8Array){
  const texture=new THREE.DataTexture(data,wearWidth,wearHeight);
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;
  texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());texture.needsUpdate=true;return texture;
 }
 const wear=fabricTexture(wearPixels),wearRoughness=fabricTexture(roughPixels);
 const cloth=new THREE.MeshPhysicalMaterial({color:0xeeeDEA,roughness:1,roughnessMap:wearRoughness,sheen:.22,sheenRoughness:.9,sheenColor:0xffffff,bumpMap:wear,bumpScale:.004,side:THREE.DoubleSide});

 // A flattened, waisted grip with a gently swept, flared butt.
 function gripSurface(y:number,angle:number,lift=0){
  const t=THREE.MathUtils.clamp((-y-.05)/1.83,0,1);
  const flare=THREE.MathUtils.smoothstep(t,.86,1);
  const width=.13-.045*Math.sin(t*Math.PI*.8)+.028*flare;
  const depth=.073-.016*Math.sin(t*Math.PI)+.008*flare;
  const centerX=.045*t*t+.025*flare;
  const c=Math.cos(angle),z=Math.sin(angle);
  return new THREE.Vector3(centerX+Math.sign(c)*Math.pow(Math.abs(c),.65)*(width+lift),y,Math.sign(z)*Math.pow(Math.abs(z),.65)*(depth+lift));
 }
 const gripPos:number[]=[],gripUV:number[]=[],gripIdx:number[]=[],gripRows=64,gripSides=32;
 for(let row=0;row<=gripRows;row++)for(let col=0;col<=gripSides;col++){
  const t=row/gripRows,p=gripSurface(.005-t*1.885,col/gripSides*Math.PI*2);
  gripPos.push(p.x,p.y,p.z);gripUV.push(col/gripSides,t);
 }
 for(let row=0;row<gripRows;row++)for(let col=0;col<gripSides;col++){
  const a=row*(gripSides+1)+col,b=a+gripSides+1;gripIdx.push(a,b,a+1,a+1,b,b+1);
 }
 for(const row of [0,gripRows]){
  const center=gripPos.length/3,p=gripSurface(row===0?.005:-1.88,0);p.x=row===0?0:.07;
  gripPos.push(p.x,p.y,0);gripUV.push(.5,.5);
  for(let col=0;col<gripSides;col++){const a=row*(gripSides+1)+col;if(row===0)gripIdx.push(center,a,a+1);else gripIdx.push(center,a+1,a);}
 }
 // The core is solid steel under the cloth; orient its faces outward.
 for(let i=0;i<gripIdx.length;i+=3){const b=gripIdx[i+1];gripIdx[i+1]=gripIdx[i+2];gripIdx[i+2]=b;}
 const gripGeometry=new THREE.BufferGeometry();gripGeometry.setAttribute('position',new THREE.Float32BufferAttribute(gripPos,3));gripGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(gripUV,2));gripGeometry.setIndex(gripIdx);gripGeometry.computeVertexNormals();add(gripGeometry,dark);
 const gripWrapStart=.069,gripWrapTravel=1.90,gripBandWidth=.128;
 // The cloth hugs the sides of the solid metal core; its end faces remain steel.
 // Its overlap lines follow a continuous helix without opening gaps in the skin.
 const tightWrap=gripGeometry.toNonIndexed(),tightPosition=tightWrap.getAttribute('position'),tightNormal=tightWrap.getAttribute('normal');
 for(let i=0;i<tightPosition.count;i++)tightPosition.setXYZ(i,tightPosition.getX(i)+tightNormal.getX(i)*.0008,tightPosition.getY(i)+tightNormal.getY(i)*.0008,tightPosition.getZ(i)+tightNormal.getZ(i)*.0008);
 // Keep the helix on the long sides, never across the flat end faces.
 const wrapSides=new Float32Array(tightPosition.count);
 for(let i=0;i<tightPosition.count;i+=3){
  const low=Math.min(tightPosition.getY(i),tightPosition.getY(i+1),tightPosition.getY(i+2));
  const high=Math.max(tightPosition.getY(i),tightPosition.getY(i+1),tightPosition.getY(i+2));
  const side=high-low>.003?1:0;wrapSides.fill(side,i,i+3);
 }
 tightWrap.setAttribute('wrapSide',new THREE.BufferAttribute(wrapSides,1));
 // Side triangles precede the caps. Leave the solid metal caps uncovered.
 tightWrap.setDrawRange(0,gripRows*gripSides*6);
 const gripCloth=cloth.clone();
 gripCloth.onBeforeCompile=shader=>{
  shader.vertexShader='attribute float wrapSide;varying float gripSide;varying vec2 gripUV;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n gripUV=uv;gripSide=wrapSide;');
  shader.fragmentShader='varying float gripSide;varying vec2 gripUV;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float turn=fract(gripUV.x-gripUV.y*16.);
   float edgeDistance=min(turn,1.-turn);
   float aa=max(fwidth(turn),.002);
   float seam=1.-smoothstep(.013,.013+aa,edgeDistance);
   float overlap=1.-smoothstep(.018,.10,turn);
   float lip=exp(-pow((turn-.045)/.021,2.));
   diffuseColor.rgb*=1.+gripSide*(-seam*.38-overlap*.07+lip*.035);
  `);
 };
 gripCloth.customProgramCacheKey=()=> 'zangetsu-single-layer-grip-v2';
 add(tightWrap,gripCloth);
 const path=new THREE.CatmullRomCurve3([new THREE.Vector3(.135,-1.8,0),new THREE.Vector3(.16,-1.85,.45),new THREE.Vector3(1.7,-3,.65),new THREE.Vector3(.9,-5.1,-.25),new THREE.Vector3(1.9,-7.1,.45),new THREE.Vector3(1.3,-9.2,.25)]);
 const tailSegments=72;
 const ribbonPos:number[]=[],ribbonUV:number[]=[],ribbonIdx:number[]=[];
 // Sparse, directional rips: a sharp bite followed by a longer loose point.
 const tears=[[[.18,.34],[.43,.45],[.76,.30]],[[.29,.27],[.61,.38],[.87,.44]]];
 function tornEdge(t:number,side:number){
  let profile=1;
  for(const [at,depth] of tears[side]){
   const d=t-at;
   if(d>-.018&&d<.04)profile-=depth*(d<0?1+d/.018:1-d/.04);
   const scrap=t-(at+.043);
   if(Math.abs(scrap)<.018)profile+=.20*(1-Math.abs(scrap)/.018);
  }
  return profile;
 }
 for(let i=0;i<=tailSegments;i++){
  const t=i/tailSegments,p=path.getPoint(t),tangent=path.getTangent(t),side=new THREE.Vector3(-tangent.y,tangent.x,Math.sin(t*8)*.55).normalize();
  const widths=[-1,1].map(sign=>{
   const edge=tornEdge(t,sign>0?1:0);
   const irregular=1+.09*Math.sin(t*19+sign)+.045*Math.sin(t*71+sign*3);
   const taper=1-THREE.MathUtils.smoothstep(t,sign>0?.88:.96,1)*.97;
   return i===0?.115:.16*irregular*edge*taper;
  });
  const normal=new THREE.Vector3().crossVectors(tangent,side).normalize();
  for(let j=0;j<5;j++){
   const v=j/4,offset=THREE.MathUtils.lerp(-widths[0],widths[1],v);
   const q=p.clone().addScaledVector(side,offset).addScaledVector(normal,Math.sin(v*Math.PI)*.045*Math.sin(t*16));
   // Share the exact final cross-section of the grip spiral: no gap at the cap.
   if(i===0)q.copy(gripSurface(THREE.MathUtils.clamp(gripWrapStart-gripWrapTravel+(v-.5)*gripBandWidth,-1.88,.005),Math.PI*32,.0008));
   ribbonPos.push(q.x,q.y,q.z);ribbonUV.push(v,t*8);
  }
 }
 for(let i=0;i<tailSegments;i++)for(let j=0;j<4;j++){const a=i*5+j;ribbonIdx.push(a,a+1,a+5,a+1,a+6,a+5);}
 const ribbon=new THREE.BufferGeometry();ribbon.setAttribute('position',new THREE.Float32BufferAttribute(ribbonPos,3));ribbon.setAttribute('uv',new THREE.Float32BufferAttribute(ribbonUV,2));ribbon.setIndex(ribbonIdx);ribbon.computeVertexNormals();const looseCloth=cloth.clone();
 looseCloth.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec2 clothEdgeUV;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n clothEdgeUV=uv;');
  shader.fragmentShader='varying vec2 clothEdgeUV;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
   float fiber=fract(sin(floor(clothEdgeUV.y*430.)*17.31)*43758.5453);
   if(min(clothEdgeUV.x,1.-clothEdgeUV.x)<.012*fiber*fiber)discard;
   float along=clothEdgeUV.y/8.;
   float splitWidth=smoothstep(.915,1.,along)*.24;
   float splitCenter=.43+.06*sin(along*31.);
   if(along>.915&&abs(clothEdgeUV.x-splitCenter)<splitWidth)discard;
  `);
 };
 looseCloth.customProgramCacheKey=()=> 'zangetsu-ripped-fabric-v2';
 const tail=add(ribbon,looseCloth);tail.name='zangetsu-cloth-tail';

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
 const bandCloth=cloth.clone();bandCloth.color.set(0xe8e6e1);bandCloth.bumpScale=.003;
 // Shade overlap seams in the strip's own UVs, so they follow the winding
 // and its moving loose end instead of looking painted across the blade.
 bandCloth.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec2 wrapUV;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n wrapUV=uv;');
  shader.fragmentShader='varying vec2 wrapUV;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float v=wrapUV.y;
   float fiber=fract(sin(floor(wrapUV.x*430.)*17.31)*43758.5453);
   if(min(v,1.-v)<.008*fiber*fiber)discard;
   float seam=(1.-smoothstep(.015,.15,v))*.28+smoothstep(.91,.995,v)*.17;
   float lip=exp(-pow((v-.17)/.065,2.))*.065;
   float fabric=.965+.035*sin(wrapUV.x*5.7+sin(wrapUV.x*2.3));
   float creases=.04*sin(v*21.+sin(wrapUV.x*9.)*.65)*sin(v*3.14159);
   diffuseColor.rgb*=fabric*(1.-seam+lip+creases);
  `);
 };
 bandCloth.customProgramCacheKey=()=> 'zangetsu-frayed-layered-cloth-v2';
 const band=new THREE.Mesh(bandGeometry,bandCloth);band.castShadow=true;band.receiveShadow=true;band.frustumCulled=false;covering.add(band);
 let coverage=0,targetCoverage=0,speed=0,elapsed=0,configured=false,lastHead=-1,feed=0;
 const tailAttribute=ribbon.getAttribute('position') as THREE.BufferAttribute;
 const handleLeft=new THREE.Vector3().fromBufferAttribute(tailAttribute,0),handleRight=new THREE.Vector3().fromBufferAttribute(tailAttribute,4);
 const seamLeft=new THREE.Vector3().fromArray(bandPos,0),seamRight=new THREE.Vector3().fromArray(bandPos,12);
 const seamCenter=seamLeft.clone().add(seamRight).multiplyScalar(.5);
 const handleCenter=handleLeft.clone().add(handleRight).multiplyScalar(.5);
 // The strip is anchored at the far handle end; the loop feeds the blade base.
 const feedCurve=new THREE.CubicBezierCurve3(handleCenter,new THREE.Vector3(.145,-1.84,.65),new THREE.Vector3(.65,-.75,.3),seamCenter);
 const clothPhysics=createClothPhysics(tail,sword);
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
