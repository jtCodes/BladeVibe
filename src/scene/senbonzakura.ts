import * as THREE from 'three';
import {SENBONZAKURA_BLADE_LENGTH,SENBONZAKURA_SAYA_LENGTH,SENBONZAKURA_POMMEL_CENTER_Y,SENBONZAKURA_GRIP_TOP_Y,SENBONZAKURA_GRIP_BOTTOM_Y} from './senbonzakuraDimensions';
import {surfaceMaps} from './craft';
import {createSatinMetal} from './metalMaterials';
import {createClothMaterial} from './clothMaterials';

import {KATANA_RADIUS,bend,createKatanaBladeGeometry,createSayaGeometry} from './katanaGeometry';
export {KATANA_RADIUS,createKatanaBladeGeometry,createSayaGeometry} from './katanaGeometry';

// Lengthwise grain distinguishes the exposed stained-wood grip from the woven wrap.
function gripWoodMaps(renderer:THREE.WebGLRenderer){
 const width=256,height=512,color=new Uint8Array(width*height*4),bump=new Uint8Array(color.length),roughness=new Uint8Array(color.length);
 const tau=Math.PI*2;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const u=x/width,v=y/height;
  const bend=.22*Math.sin(tau*v)+.08*Math.sin(tau*(v*3+u*2));
  const broad=.5+.5*Math.sin(tau*u*12+bend);
  const grain=Math.pow(.5+.5*Math.sin(tau*u*43+bend*3+.35*Math.sin(tau*u*7)),12);
  const fiber=Math.pow(.5+.5*Math.sin(tau*u*97+bend*4),18);
  const shade=.94-broad*.04-grain*.10-fiber*.035;
  const i=(y*width+x)*4,c=Math.round(shade*255);
  color.set([c,Math.round(c*.99),Math.round(c*.97),255],i);
  const h=Math.round(145-grain*65-fiber*22),r=Math.round(255*(.86+grain*.07+broad*.025));
  bump.set([h,h,h,255],i);roughness.set([r,r,r,255],i);
 }
 function texture(data:Uint8Array<ArrayBuffer>,isColor=false){
  const map=new THREE.DataTexture(data,width,height);map.wrapS=map.wrapT=THREE.RepeatWrapping;
  map.magFilter=THREE.LinearFilter;map.minFilter=THREE.LinearMipmapLinearFilter;map.generateMipmaps=true;
  map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  if(isColor)map.colorSpace=THREE.SRGBColorSpace;map.needsUpdate=true;return map;
 }
 return {map:texture(color,true),bumpMap:texture(bump),roughnessMap:texture(roughness)};
}
export function createSenbonzakura(renderer:THREE.WebGLRenderer,sword:THREE.Group){
 const metal=new THREE.MeshPhysicalMaterial({color:0xbfc5cd,metalness:1,roughness:.24,...surfaceMaps('steel',renderer),bumpScale:.00008});
 metal.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec2 katanaUv;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nkatanaUv=uv;');
  shader.fragmentShader='varying vec2 katanaUv;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   // UV x=0 is the short cutting bevel; the broad opposite face is dark.
   float boundary=.20+.028*sin(katanaUv.y*160.)+.006*sin(katanaUv.y*320.);
   float edgeAA=max(fwidth(katanaUv.x)*1.2,.003);
   float cuttingSteel=1.-smoothstep(boundary-edgeAA,boundary+edgeAA,katanaUv.x);
   float line=1.-smoothstep(.003,.003+edgeAA,abs(katanaUv.x-boundary));
   diffuseColor.rgb*=mix(.20,1.10,cuttingSteel);
   diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.80),line*.45);
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   roughnessFactor=mix(.30,.17,cuttingSteel)+roughnessFactor*.12;
   roughnessFactor+=line*.045;`);
 };
 metal.customProgramCacheKey=()=> 'senbonzakura-short-edge-hamon-v5';
 const spine=new THREE.MeshStandardMaterial({color:0x3d4044,metalness:1,roughness:.30});
 const bronze=createSatinMetal(renderer,{color:0x777c65});
 const guardMetal=createSatinMetal(renderer,{color:0x686f60,roughnessScale:1});
 // Soft fiber sheen and fine lengthwise yarn relief match the wrapping reference.
 const cloth=createClothMaterial(renderer,{color:0x858b9f});
 const gripWood=new THREE.MeshPhysicalMaterial({color:0x828574,metalness:0,roughness:1,specularIntensity:.18,...gripWoodMaps(renderer),bumpScale:.0004});
 const lacquer=new THREE.MeshPhysicalMaterial({color:0xd3d2c9,roughness:.34,metalness:.04,clearcoat:.55,clearcoatRoughness:.24});
 const add=(geometry:THREE.BufferGeometry,material:THREE.Material|THREE.Material[],parent:THREE.Group=sword)=>{const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;};
 add(createKatanaBladeGeometry({length:SENBONZAKURA_BLADE_LENGTH}),[metal,spine]).name='senbonzakura-blade';
 function collar(y:number,height:number,radius:number,mat:THREE.Material,parent=sword){const m=add(new THREE.CylinderGeometry(radius,radius,height,48),mat,parent);m.scale.z=.72;m.position.y=y;return m;}
 // Habaki and seppa seat the blade directly against the tsuba.
 // The longer sleeve has broad satin-metal facets, with the blade ridge carried through it.
 const habakiMetal=createSatinMetal(renderer,{color:0x777d70,roughnessScale:.9});
 const habakiSection=new THREE.Shape();
 const sleeveCross=[[-.128,-.037],[-.128,.037],[-.018,.052],[.142,.042],[.142,-.042],[-.018,-.052]];
 sleeveCross.forEach(([x,z],i)=>i?habakiSection.lineTo(x,-z):habakiSection.moveTo(x,-z));habakiSection.closePath();
 const habakiGeometry=new THREE.ExtrudeGeometry(habakiSection,{depth:.143,steps:1,bevelEnabled:true,bevelThickness:.002,bevelSize:.002,bevelSegments:2});
 habakiGeometry.rotateX(-Math.PI/2);
 const habaki=add(habakiGeometry,habakiMetal);habaki.name='senbonzakura-habaki';habaki.position.y=.042;
 collar(.032,.016,.18,bronze);collar(-.032,.016,.18,bronze);
 const outline=new THREE.Shape();outline.moveTo(-.34,-.255);outline.lineTo(.34,-.255);outline.lineTo(.34,.255);outline.lineTo(-.34,.255);outline.closePath();
 const opening=[[.075,.19],[.285,.19],[.285,.065],[.195,.065],[.195,.13],[.075,.13]];
 for(const sx of [-1,1])for(const sz of [-1,1]){
  const hole=new THREE.Path();opening.forEach(([x,z],i)=>i?hole.lineTo(x*sx,z*sz):hole.moveTo(x*sx,z*sz));hole.closePath();outline.holes.push(hole);
  // Brass piping follows each stepped cutout on both faces.
  for(const face of [-1,1]){
   const pts=opening.map(([x,z])=>new THREE.Vector3(x*sx,face*.028,z*sz));pts.push(pts[0].clone());
   for(let i=1;i<pts.length;i++){const direction=pts[i].clone().sub(pts[i-1]);const trim=add(new THREE.CylinderGeometry(.0028,.0028,direction.length(),6),bronze);trim.position.copy(pts[i-1]).addScaledVector(direction,.5);trim.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());}
  }
 }
 const tsuba=add(new THREE.ExtrudeGeometry(outline,{depth:.04,bevelEnabled:true,bevelThickness:.006,bevelSize:.007,bevelSegments:2,steps:1}),guardMetal);tsuba.rotation.x=Math.PI/2;tsuba.position.y=.02;
 // Fine inset border, in the same plane as the rectangular guard.
 for(const face of [-1,1]){
  const points=[new THREE.Vector3(-.316,face*.028,-.231),new THREE.Vector3(.316,face*.028,-.231),new THREE.Vector3(.316,face*.028,.231),new THREE.Vector3(-.316,face*.028,.231),new THREE.Vector3(-.316,face*.028,-.231)];
  add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points,false,'catmullrom',0),64,.003,4,false),bronze);
 }
 // A low, softly beveled collar seats the cloth immediately behind the guard.
 const collarProfile=[[0,-.108],[.124,-.108],[.131,-.104],[.134,-.097],[.134,-.05],[.131,-.04],[0,-.04]];
 const collarGeometry=new THREE.LatheGeometry(collarProfile.map(([r,y])=>new THREE.Vector2(r,y)),96);collarGeometry.scale(1,1,.72);
 add(collarGeometry,bronze).name='senbonzakura-handle-collar';
 // A straight rounded rectangle gives the grip distinct broad faces and soft corners.
 const gripSection=new THREE.Shape(),hw=.112,hd=.070,cr=.057;
 gripSection.moveTo(-hw+cr,-hd);gripSection.lineTo(hw-cr,-hd);
 gripSection.absarc(hw-cr,-hd+cr,cr,-Math.PI/2,0,false);
 gripSection.lineTo(hw,hd-cr);gripSection.absarc(hw-cr,hd-cr,cr,0,Math.PI/2,false);
 gripSection.lineTo(-hw+cr,hd);gripSection.absarc(-hw+cr,hd-cr,cr,Math.PI/2,Math.PI,false);
 gripSection.lineTo(-hw,-hd+cr);gripSection.absarc(-hw+cr,-hd+cr,cr,Math.PI,Math.PI*1.5,false);gripSection.closePath();
 const gripGeometry=new THREE.ExtrudeGeometry(gripSection,{depth:SENBONZAKURA_GRIP_TOP_Y-SENBONZAKURA_GRIP_BOTTOM_Y,steps:1,curveSegments:12,bevelEnabled:false});
 gripGeometry.rotateX(Math.PI/2);gripGeometry.translate(0,SENBONZAKURA_GRIP_TOP_Y,0);gripGeometry.computeVertexNormals();
 const handle=add(gripGeometry,gripWood);handle.name='senbonzakura-grip-core';
 // Folded tsukamaki covers both narrow sides; only the face diamonds expose the core.
 const contactSurface=new THREE.Mesh(handle.geometry,handle.material);
 contactSurface.position.copy(handle.position);contactSurface.scale.copy(handle.scale);contactSurface.updateMatrixWorld(true);
 const contactRay=new THREE.Raycaster(),origin=new THREE.Vector3(),direction=new THREE.Vector3();
 const normalMatrix=new THREE.Matrix3().getNormalMatrix(contactSurface.matrixWorld);
 const capCenter=SENBONZAKURA_POMMEL_CENTER_Y,wrapStart=-.07,wrapEnd=capCenter+.025;
 const diamonds=12,pitch=(wrapStart-wrapEnd)/diamonds,diamondHalfWidth=.070,diamondHalfHeight=.043;
 const around=192,across=6,section:{point:THREE.Vector3;normal:THREE.Vector3;opening:number}[]=[];
 for(let j=0;j<=around;j++){
  if(j===around){section.push(section[0]);continue;}
  const angle=j/around*Math.PI*2;
  origin.set(Math.sin(angle),(SENBONZAKURA_GRIP_TOP_Y+SENBONZAKURA_GRIP_BOTTOM_Y)/2,Math.cos(angle));
  direction.set(-origin.x,0,-origin.z).normalize();contactRay.set(origin,direction);
  const hit=contactRay.intersectObject(contactSurface,false)[0];
  if(!hit)throw new Error('Cloth wrapping could not reach the grip surface');
  section.push({point:hit.point.clone(),normal:hit.face!.normal.clone().applyNormalMatrix(normalMatrix),opening:diamondHalfHeight*Math.max(0,1-Math.abs(hit.point.x)/diamondHalfWidth)});
 }
 const wrapPositions:number[]=[],wrapUvs:number[]=[],wrapIndices:number[]=[];
 for(let band=0;band<=diamonds;band++)for(let layer=0;layer<2;layer++){
  const base=wrapPositions.length/3;
  for(let j=0;j<=around;j++){
   const {point,normal,opening}=section[j];
   const top=band===0?wrapStart:wrapStart-(band-.5)*pitch-opening;
   const bottom=band===diamonds?wrapEnd:wrapStart-(band+.5)*pitch+opening;
   // Two overlapping pieces form a real diagonal fold; its direction alternates.
   const fold=.5+(band%2===0?1:-1)*.18*(point.x/.112)*Math.sign(point.z);
   const from=layer===0?0:fold-.025,to=layer===0?fold+.025:1;
   for(let k=0;k<=across;k++){
    const t=k/across,v=THREE.MathUtils.lerp(from,to,t),y=THREE.MathUtils.lerp(top,bottom,v);
    const endFade=THREE.MathUtils.smoothstep(y,wrapEnd,wrapEnd+.055)*(1-THREE.MathUtils.smoothstep(y,wrapStart-.055,wrapStart));
    const crown=Math.sin(t*Math.PI)*(layer===0?.00085:.0011);
    const rolledEdge=layer===1?Math.exp(-t*9)*.0022:Math.exp(-Math.min(t,1-t)*12)*.00025;
    const thickness=.00065+(crown+rolledEdge)*endFade;
    wrapPositions.push(point.x+normal.x*thickness,y,point.z+normal.z*thickness);
    wrapUvs.push(j/around+band*.381966,v+band*.173205);
   }
  }
  for(let j=0;j<around;j++)for(let k=0;k<across;k++){
   const a=base+j*(across+1)+k;wrapIndices.push(a,a+1,a+across+1,a+1,a+across+2,a+across+1);
  }
 }
 const wrapGeometry=new THREE.BufferGeometry();
 wrapGeometry.setAttribute('position',new THREE.Float32BufferAttribute(wrapPositions,3));
 wrapGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(wrapUvs,2));wrapGeometry.setIndex(wrapIndices);wrapGeometry.computeVertexNormals();
 const wrapMaterial=cloth.clone();wrapMaterial.side=THREE.DoubleSide;
 add(wrapGeometry,wrapMaterial).name='senbonzakura-handle-wrap-folded';
 // The lower shoulder rises beside the wrap end; the outline comes from the metal's shape.
 const capRadius=.129,capLipRadius=.135;
 // A rounded crown joins the straight cap walls tangentially, without a flat end face.
 const capProfile:number[][]=Array.from({length:25},(_,i)=>{
  const angle=i/24*Math.PI/2;
  return [capRadius*Math.sin(angle),-.038-.062*Math.cos(angle)];
 });
 capProfile.push([capRadius,.045],[capLipRadius,.055],[capLipRadius,.08],[.13,.087],[.122,.087]);
 const profile:THREE.Vector2[]=[];
 // Subdivide the shoulder so its rise beside the oval remains smooth.
 for(let i=0;i<capProfile.length-1;i++){
  const [r0,y0]=capProfile[i],[r1,y1]=capProfile[i+1],steps=Math.max(1,Math.ceil(Math.abs(y1-y0)/.003));
  for(let j=0;j<steps;j++){const t=j/steps;profile.push(new THREE.Vector2(THREE.MathUtils.lerp(r0,r1,t),THREE.MathUtils.lerp(y0,y1,t)));}
 }
 profile.push(new THREE.Vector2(...capProfile[capProfile.length-1] as [number,number]));
 const shoulderY=(x:number,y:number)=>{
  const besideOval=1-THREE.MathUtils.smoothstep(Math.abs(x),.02,.064);
  const alongRim=THREE.MathUtils.smoothstep(y,-.04,.025)*(1-THREE.MathUtils.smoothstep(y,.055,.087));
  return y-.026*besideOval*alongRim;
 };
 const capGeometry=new THREE.LatheGeometry(profile,128);capGeometry.scale(1,1,.72);
 const capVertices=capGeometry.getAttribute('position');
 for(let i=0;i<capVertices.count;i++){
  capVertices.setY(i,shoulderY(capVertices.getX(i),capVertices.getY(i)));
 }
 capGeometry.computeVertexNormals();
 const cap=add(capGeometry,bronze);cap.name='senbonzakura-pommel';cap.position.y=capCenter;
 // Fit the wrap end to the raised face instead of leaving it suspended above it.
 function capFace(x:number,y:number){
  for(let i=1;i<profile.length;i++){
   const a=profile[i-1],b=profile[i],ya=shoulderY(x,a.y),yb=shoulderY(x,b.y);
   if(yb>ya&&y>=ya&&y<=yb){
    const radius=THREE.MathUtils.lerp(a.x,b.x,(y-ya)/(yb-ya));
    return .72*Math.sqrt(Math.max(0,radius*radius-x*x));
   }
  }
  return capRadius*.72;
 }
 for(const face of [-1,1]){
  const endGeometry=new THREE.SphereGeometry(1,48,32),vertices=endGeometry.getAttribute('position');
  for(let i=0;i<vertices.count;i++){
   const x=vertices.getX(i)*.022,y=vertices.getY(i)*.057+.027;
   const z=capFace(x,y)-.0015+vertices.getZ(i)*.009;
   vertices.setXYZ(i,x,y,face*z);
  }
  // Mirroring the rear wrap end also reverses triangle winding.
  if(face===-1){const indices=endGeometry.index!;for(let i=0;i<indices.count;i+=3){const b=indices.getX(i+1);indices.setX(i+1,indices.getX(i+2));indices.setX(i+2,b);}}
  endGeometry.computeVertexNormals();
  const end=add(endGeometry,cloth);end.name=`senbonzakura-pommel-wrap-end-${face}`;end.position.y=capCenter;
 }

 const saya=new THREE.Group();saya.rotation.copy(sword.rotation);add(createSayaGeometry(SENBONZAKURA_SAYA_LENGTH),lacquer,saya);
 const mouth=add(new THREE.TorusGeometry(.182,.012,8,48),bronze,saya);mouth.rotation.x=Math.PI/2;mouth.scale.y=.46;mouth.position.copy(bend(0,.08,0));
 const sayaTip=SENBONZAKURA_SAYA_LENGTH-.05;
 const tip=collar(sayaTip,.09,.16,lacquer,saya);tip.position.copy(bend(0,sayaTip,0));tip.rotation.z=-sayaTip/KATANA_RADIUS;tip.scale.z=.46;
 // Wide woven sageo: two broad wraps, folded loops, a central knot, and tails.
 for(const y of [.53,.72]){
  const wrap=collar(y,.135,.197,cloth,saya);wrap.position.copy(bend(0,y,0));wrap.rotation.z=-y/KATANA_RADIUS;wrap.scale.z=.46;
 }
 const ribbonMaterial=cloth.clone();ribbonMaterial.side=THREE.DoubleSide;
 function ribbon(points:THREE.Vector3[],width:number){
  const curve=new THREE.CatmullRomCurve3(points),pos:number[]=[],uv:number[]=[],idx:number[]=[],rows=64;
  const across=new THREE.Vector3(),normal=new THREE.Vector3(0,0,1);
  for(let j=0;j<=rows;j++){
   const t=j/rows,p=curve.getPoint(t),tangent=curve.getTangent(t);across.crossVectors(tangent,normal);
   if(across.lengthSq()<.001)across.set(1,0,0);else across.normalize();
   for(let k=0;k<=6;k++){const v=k/6,q=p.clone().addScaledVector(across,(v-.5)*width);q.z+=Math.sin(v*Math.PI)*.006;pos.push(q.x,q.y,q.z);uv.push(t*3,v);}
  }
  for(let j=0;j<rows;j++)for(let k=0;k<6;k++){const a=j*7+k;idx.push(a,a+1,a+7,a+1,a+8,a+7);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();add(g,ribbonMaterial,saya);
 }
 for(const direction of [-1,1]){
  ribbon([new THREE.Vector3(.03,.64,.105),new THREE.Vector3(.035,.64+direction*.22,.16),new THREE.Vector3(.025,.64+direction*.35,.15),new THREE.Vector3(-.015,.64+direction*.30,.11),new THREE.Vector3(-.025,.64,.105)],.105);
 }
 ribbon([new THREE.Vector3(.04,.66,.13),new THREE.Vector3(.11,.91,.14),new THREE.Vector3(.13,1.15,.10),new THREE.Vector3(.15,1.28,.10)],.09);
 ribbon([new THREE.Vector3(-.03,.65,.13),new THREE.Vector3(-.10,.91,.14),new THREE.Vector3(-.09,1.13,.11)],.09);
 const knot=add(new THREE.SphereGeometry(.067,24,16),cloth,saya);knot.scale.set(1,.7,.65);knot.position.set(.015,.64,.14);
 return saya;
}
