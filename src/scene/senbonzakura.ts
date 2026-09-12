import * as THREE from 'three';
import {SENBONZAKURA_POMMEL_CENTER_Y,SENBONZAKURA_GRIP_TOP_Y,SENBONZAKURA_GRIP_BOTTOM_Y} from './senbonzakuraDimensions';
import {surfaceMaps} from './craft';

import {KATANA_RADIUS,bend,createKatanaBladeGeometry,createSayaGeometry} from './katanaGeometry';
export {KATANA_RADIUS,createKatanaBladeGeometry,createSayaGeometry} from './katanaGeometry';

// Four times longer than wide: thread scale follows the tape's physical dimensions.
function fabricMaps(renderer:THREE.WebGLRenderer){
 const width=512,height=128,cell=8;
 const color=new Uint8Array(width*height*4),bump=new Uint8Array(color.length),roughness=new Uint8Array(color.length);
 const tau=Math.PI*2;
 // Short rubbed threads, distributed within the repeating weave; no stain color.
 const rubs=[[83,23,25],[218,88,19],[355,49,32],[451,112,14]];
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const ix=Math.floor(x/cell),iy=Math.floor(y/cell);
  const warp=Math.pow(.5+.5*Math.cos(tau*(y+.5)/cell),2);
  const weft=Math.pow(.5+.5*Math.cos(tau*(x+.5)/cell),2);
  const top=(ix+iy)%2===0?warp:weft,under=(ix+iy)%2===0?weft:warp;
  const yarn=.18+.58*top+.16*under;
  const fiber=.5+.5*Math.sin(tau*x/2+Math.sin(tau*y/height)*.5);
  const variation=Math.sin(tau*ix/64+Math.sin(tau*iy/16)*2.)*.015;
  let rub=0;
  for(const [cx,cy,length] of rubs){
   const dx=(x-cx)/length,dy=y-cy-Math.sin(dx*2.)*.5;
   rub=Math.max(rub,Math.exp(-dy*dy*1.7)*Math.max(0,1-dx*dx));
  }
  const c=Math.round(255*THREE.MathUtils.clamp(.86+yarn*.115+fiber*.018+variation+rub*.07,0,1));
  const h=Math.round(255*THREE.MathUtils.clamp(yarn+fiber*.025-rub*.13,0,1));
  const r=Math.round(255*THREE.MathUtils.clamp(.97-top*.09+rub*.025,0,1));
  const i=(y*width+x)*4;color.set([c,c,c,255],i);bump.set([h,h,h,255],i);roughness.set([r,r,r,255],i);
 }
 function texture(data:Uint8Array<ArrayBuffer>,isColor=false){
  const map=new THREE.DataTexture(data,width,height);map.wrapS=map.wrapT=THREE.RepeatWrapping;
  map.magFilter=THREE.LinearFilter;map.minFilter=THREE.LinearMipmapLinearFilter;map.generateMipmaps=true;
  map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  if(isColor)map.colorSpace=THREE.SRGBColorSpace;map.needsUpdate=true;return map;
 }
 return {map:texture(color,true),bumpMap:texture(bump),roughnessMap:texture(roughness)};
}
function raySkinMap(){
 const size=128,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const row=Math.floor(y/8),dx=((x+(row%2)*4)%8)-4,dy=y%8-4;
  const v=Math.round(75+170*Math.pow(Math.max(0,1-(dx*dx+dy*dy)/15),.45));data.set([v,v,v,255],(y*size+x)*4);
 }
 const map=new THREE.DataTexture(data,size,size);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(2,7);map.needsUpdate=true;return map;
}
export function createSenbonzakura(renderer:THREE.WebGLRenderer,sword:THREE.Group){
 const metal=new THREE.MeshPhysicalMaterial({color:0xbfc5cd,metalness:1,roughness:.24,...surfaceMaps('steel',renderer),bumpScale:.00008});
 metal.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec2 katanaUv;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nkatanaUv=uv;');
  shader.fragmentShader='varying vec2 katanaUv;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float boundary=.68+.025*sin(katanaUv.y*280.)+.008*sin(katanaUv.y*611.);
   float line=exp(-pow((katanaUv.x-boundary)*110.,2.));
   diffuseColor.rgb=mix(diffuseColor.rgb*.87,vec3(.78,.80,.82),line*.4);
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   float wave=.68+.025*sin(katanaUv.y*280.)+.009*sin(katanaUv.y*611.);
   float hamon=smoothstep(wave-.012,wave+.012,katanaUv.x);
   roughnessFactor=mix(roughnessFactor,.16,hamon*.8);
   roughnessFactor+=exp(-pow((katanaUv.x-wave)*130.,2.))*.14;`);
 };
 metal.customProgramCacheKey=()=> 'senbonzakura-hamon-v2';
 const spine=new THREE.MeshStandardMaterial({color:0x89949f,metalness:1,roughness:.21});
 const bronze=new THREE.MeshStandardMaterial({color:0x777c65,metalness:.65,roughness:.52});
 const guardMetal=new THREE.MeshStandardMaterial({color:0x686f60,metalness:.58,roughness:.58});
 const cloth=new THREE.MeshStandardMaterial({color:0x858b9f,roughness:1,...fabricMaps(renderer),bumpScale:.0015});
 const skin=new THREE.MeshStandardMaterial({color:0x828574,metalness:.22,roughness:.72,bumpMap:raySkinMap(),bumpScale:.0018});
 const lacquer=new THREE.MeshPhysicalMaterial({color:0xd3d2c9,roughness:.34,metalness:.04,clearcoat:.55,clearcoatRoughness:.24});
 const add=(geometry:THREE.BufferGeometry,material:THREE.Material|THREE.Material[],parent:THREE.Group=sword)=>{const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;};
 add(createKatanaBladeGeometry(),[metal,spine]).name='senbonzakura-blade';
 function collar(y:number,height:number,radius:number,mat:THREE.Material,parent=sword){const m=add(new THREE.CylinderGeometry(radius,radius,height,48),mat,parent);m.scale.z=.72;m.position.y=y;return m;}
 // Habaki and seppa seat the blade directly against the tsuba.
 // The longer sleeve has broad satin-metal facets, with the blade ridge carried through it.
 const habakiMetal=new THREE.MeshStandardMaterial({color:0x777d70,metalness:.62,roughness:.55});
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
 const handle=collar((SENBONZAKURA_GRIP_TOP_Y+SENBONZAKURA_GRIP_BOTTOM_Y)/2,SENBONZAKURA_GRIP_TOP_Y-SENBONZAKURA_GRIP_BOTTOM_Y,.116,skin);
 handle.scale.x=1.04;
 const capCenter=SENBONZAKURA_POMMEL_CENTER_Y,gripStart=-.12,gripEnd=capCenter+.07;
 const wrapStart=-.07,wrapEnd=capCenter+.025;
 // Align the crossed bands on both broad faces; each front opening is centered.
 // A rounded rectangular perimeter keeps the diagonals flat across the handle.
 for(const handedness of [-1,1]){
  const p:number[]=[],uv:number[]=[],idx:number[]=[],segments=1440,turns=12,bandWidth=.07;
  let tapeDistance=0;const previous=new THREE.Vector3(),point=new THREE.Vector3();
  for(let j=0;j<=segments;j++){
   const centerY=THREE.MathUtils.lerp(wrapStart,wrapEnd,j/segments);
   const t=(centerY-gripStart)/(gripEnd-gripStart),phase=t*turns;
   // Smooth the side turn while keeping the front/back diagonals nearly straight.
   const a=phase*Math.PI*2,front=Math.cos(a);
   const x=-handedness*(2/Math.PI)*Math.asin(Math.sin(a));
   const z=Math.sign(front)*Math.sqrt(Math.max(0,1-Math.pow(Math.abs(x),6)));
   point.set(x*.123,centerY,z*.123*.73);
   if(j>0)tapeDistance+=point.distanceTo(previous);previous.copy(point);
   for(let k=0;k<=4;k++){
    const w=k/4,y=centerY+(w-.5)*bandWidth;
    // The concealed ends conform to the oval metal fittings, avoiding protruding corners.
    const guardTuck=THREE.MathUtils.smoothstep(y,-.155,-.10);
    const capTuck=1-THREE.MathUtils.smoothstep(y,capCenter+.087,capCenter+.145);
    const tuck=Math.max(guardTuck,capTuck);
    const radius=THREE.MathUtils.lerp(.123+Math.sin(w*Math.PI)*.0006+(handedness===1?.0012:0),.118,tuck);
    const ovalZ=Math.sign(front)*Math.sqrt(Math.max(0,1-x*x));
    p.push(x*radius,y,THREE.MathUtils.lerp(z,ovalZ,tuck)*radius*.73);uv.push(tapeDistance/(bandWidth*4),w);
   }
  }
  for(let j=0;j<segments;j++)for(let k=0;k<4;k++){const a=j*5+k;idx.push(a,a+1,a+5,a+1,a+6,a+5);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();const mat=cloth.clone();mat.side=THREE.DoubleSide;add(g,mat).name=`senbonzakura-handle-wrap-${handedness}`;
 }
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

 const saya=new THREE.Group();saya.rotation.copy(sword.rotation);add(createSayaGeometry(),lacquer,saya);
 const mouth=add(new THREE.TorusGeometry(.182,.012,8,48),bronze,saya);mouth.rotation.x=Math.PI/2;mouth.scale.y=.46;mouth.position.copy(bend(0,.08,0));
 const tip=collar(5.13,.09,.16,lacquer,saya);tip.position.copy(bend(0,5.13,0));tip.rotation.z=-5.13/KATANA_RADIUS;tip.scale.z=.46;
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
