import * as THREE from 'three';
import {surfaceMaps} from './craft';

export const KATANA_RADIUS=38;
const LENGTH=5.02;
function bend(x:number,y:number,z:number){const a=y/KATANA_RADIUS;return new THREE.Vector3(KATANA_RADIUS*(1-Math.cos(a))+x*Math.cos(a),KATANA_RADIUS*Math.sin(a)-x*Math.sin(a),z);}
const cross=[[-.105,-.022],[-.12,0],[-.105,.022],[-.018,.040],[.135,0],[-.018,-.040]];
export function createKatanaBladeGeometry(options:{straight?:boolean}={}){
 const positions:number[]=[],uv:number[]=[],indices:number[]=[],rows=100;
 const geometry=new THREE.BufferGeometry();
 for(let face=0;face<cross.length;face++){
  const base=positions.length/3,start=indices.length;
  for(let row=0;row<=rows;row++){
   const y=-.08+(LENGTH+.08)*row/rows,taper=1.-.22*Math.max(0,y)/LENGTH;
   const tip=THREE.MathUtils.clamp((y-4.60)/(LENGTH-4.60),0,1);
   for(const [x,z] of [cross[face],cross[(face+1)%cross.length]]){
    const bladeX=(x*(1-tip)+.135*tip)*taper,bladeZ=z*taper*(1-tip);
    const p=options.straight?new THREE.Vector3(bladeX,y,bladeZ):bend(bladeX,y,bladeZ);positions.push(p.x,p.y,p.z);uv.push((x+.12)/.255,y/LENGTH);
   }
  }
  for(let row=0;row<rows;row++){const a=base+row*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
  geometry.addGroup(start,indices.length-start,face===3||face===4?0:1);
 }
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
export function createSayaGeometry(){
 const pos:number[]=[],uv:number[]=[],indices:number[]=[],rows=100,sides=40;
 for(let layer=0;layer<2;layer++)for(let row=0;row<=rows;row++){
  const y=.075+(5.18-.075)*row/rows,taper=1.-.16*row/rows;
  for(let side=0;side<=sides;side++){
   const a=side/sides*Math.PI*2,c=Math.cos(a),s=Math.sin(a);
   const x=Math.sign(c)*Math.pow(Math.abs(c),.7)*(layer?.157:.19)*taper;
   const z=Math.sign(s)*Math.pow(Math.abs(s),.7)*(layer?.055:.080)*taper;
   const p=bend(x,y,z);pos.push(p.x,p.y,p.z);uv.push(side/sides,row/rows);
  }
 }
 const stride=sides+1,layerSize=(rows+1)*stride;
 for(let layer=0;layer<2;layer++)for(let row=0;row<rows;row++)for(let side=0;side<sides;side++){
  const a=layer*layerSize+row*stride+side,b=a+1,c=a+stride,d=c+1;
  if(layer===0)indices.push(a,c,b,b,c,d);else indices.push(a,b,c,b,d,c);
 }
 for(let side=0;side<sides;side++){const a=side,b=a+1,c=layerSize+a,d=c+1;indices.push(a,b,c,b,d,c);}
 // Close the tip; leave the mouth open around its cavity.
 const center=pos.length/3,p=bend(0,5.18,0);pos.push(p.x,p.y,p.z);uv.push(.5,1);
 for(let side=0;side<sides;side++){const a=rows*stride+side;indices.push(center,a,a+1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
function fabricMap(){
 const size=128,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const v=140+Math.sin(x*Math.PI*.5)*30+Math.sin(y*Math.PI*.5)*24;const i=(y*size+x)*4;data.set([v,v,v,255],i);}
 const map=new THREE.DataTexture(data,size,size);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(5,1);map.needsUpdate=true;return map;
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
 const bronze=new THREE.MeshStandardMaterial({color:0xb8aa61,metalness:.92,roughness:.28});
 const guardMetal=new THREE.MeshStandardMaterial({color:0x252923,metalness:.95,roughness:.31});
 const cloth=new THREE.MeshStandardMaterial({color:0x9280c5,roughness:.91,bumpMap:fabricMap(),bumpScale:.0011});
 const skin=new THREE.MeshStandardMaterial({color:0x9c904d,metalness:.42,roughness:.57,bumpMap:raySkinMap(),bumpScale:.0018});
 const lacquer=new THREE.MeshPhysicalMaterial({color:0xf0efeb,roughness:.21,metalness:.04,clearcoat:.9,clearcoatRoughness:.12});
 const add=(geometry:THREE.BufferGeometry,material:THREE.Material|THREE.Material[],parent:THREE.Group=sword)=>{const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;};
 add(createKatanaBladeGeometry(),[metal,spine]).name='senbonzakura-blade';
 function collar(y:number,height:number,radius:number,mat:THREE.Material,parent=sword){const m=add(new THREE.CylinderGeometry(radius,radius,height,48),mat,parent);m.scale.z=.72;m.position.y=y;return m;}
 // Habaki and seppa seat the blade directly against the tsuba.
 const habakiMetal=bronze.clone();habakiMetal.bumpMap=raySkinMap();habakiMetal.bumpMap.repeat.set(3,2);habakiMetal.bumpScale=.0005;
 const habaki=add(new THREE.BoxGeometry(.255,.105,.087),habakiMetal);habaki.position.set(.007,.10,0);
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
 collar(-.115,.13,.127,bronze);
 const handle=collar(-.91,1.48,.116,skin);
 handle.scale.x=1.04;
 // Two crossing physical cotton bands leave diamond windows over the ray skin.
 for(const handedness of [-1,1]){
  const p:number[]=[],uv:number[]=[],idx:number[]=[],segments=900,turns=7;
  for(let j=0;j<=segments;j++){
   const t=j/segments,a=t*Math.PI*2*turns*handedness;
   for(let k=0;k<=4;k++){
    const w=k/4,r=.123+Math.sin(w*Math.PI)*.0018+(handedness===1?.001:0);
    p.push(Math.cos(a)*r,-.19-t*1.43+(w-.5)*.075,Math.sin(a)*r*.73);uv.push(t*turns*3,w);
   }
  }
  for(let j=0;j<segments;j++)for(let k=0;k<4;k++){const a=j*5+k;idx.push(a,a+1,a+5,a+1,a+6,a+5);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();const mat=cloth.clone();mat.side=THREE.DoubleSide;add(g,mat);
 }
 const capProfile=[[0,-.10],[.08,-.10],[.112,-.085],[.124,-.06],[.124,.075]].map(([r,y])=>new THREE.Vector2(r,y));
 const cap=add(new THREE.LatheGeometry(capProfile,48),bronze);cap.position.y=-1.69;cap.scale.z=.72;
 for(const face of [-1,1])for(const y of [-.66,-1.15]){const m=add(new THREE.SphereGeometry(.024,12,8),bronze);m.scale.set(.6,1.8,.35);m.position.set(0,y,face*.090);}
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
