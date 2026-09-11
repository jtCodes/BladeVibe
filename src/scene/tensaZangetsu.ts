import * as THREE from 'three';
import {createKatanaBladeGeometry} from './senbonzakura';
import {surfaceMaps} from './craft';

/** Anime Bankai proportions, shared by the visible blade and its collider. */
export function createTensaZangetsuBladeGeometry(){
 const geometry=createKatanaBladeGeometry({straight:true});
 geometry.scale(.8,1.3,.85);
 return geometry;
}
export function createTensaZangetsu(renderer:THREE.WebGLRenderer,sword:THREE.Group){
 const steel=new THREE.MeshStandardMaterial({color:0x171d25,metalness:.55,roughness:.86,...surfaceMaps('steel',renderer),roughnessMap:null,envMapIntensity:.22,bumpScale:.00008});
 const bevel=new THREE.MeshStandardMaterial({color:0x343e4b,metalness:.55,roughness:.8,envMapIntensity:.22});
 const fittings=new THREE.MeshStandardMaterial({color:0x101319,metalness:.4,roughness:.9,envMapIntensity:.15});
 const guardMaterial=new THREE.MeshStandardMaterial({color:0x030303,metalness:.25,roughness:.92,envMapIntensity:.1});
 // Keep this black finish neutral under warm studio lights and atmospheric fog.
 guardMaterial.onBeforeCompile=shader=>{
  shader.fragmentShader=shader.fragmentShader.replace('#include <dithering_fragment>',`#include <dithering_fragment>
   gl_FragColor.rgb=vec3(dot(gl_FragColor.rgb,vec3(.2126,.7152,.0722)));
  `);
 };
 guardMaterial.customProgramCacheKey=()=> 'tensa-neutral-black-guard-v1';
 const red=new THREE.MeshStandardMaterial({color:0x500b16,roughness:.88,...surfaceMaps('leather',renderer),roughnessMap:null,envMapIntensity:.12,bumpScale:.0005});
 const cotton=new THREE.MeshStandardMaterial({color:0x111216,roughness:.94,...surfaceMaps('leather',renderer),roughnessMap:null,envMapIntensity:.1,bumpScale:.00065,side:THREE.DoubleSide});
 const add=(geometry:THREE.BufferGeometry,material:THREE.Material|THREE.Material[])=>{const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;sword.add(mesh);return mesh;};
 add(createTensaZangetsuBladeGeometry(),[bevel,steel]).name='tensa-zangetsu-blade';
 // The bent arms are one extruded metal outline, including the open slots.
 const shape=new THREE.Shape();
 const outline=[[-.4,-.4],[.08,-.4],[.08,-.08],[.32,-.08],[.32,-.4],[.4,-.4],[.4,.08],[.08,.08],[.08,.32],[.4,.32],[.4,.4],[-.08,.4],[-.08,.08],[-.32,.08],[-.32,.4],[-.4,.4],[-.4,-.08],[-.08,-.08],[-.08,-.32],[-.4,-.32]];
 outline.forEach(([x,y],i)=>i?shape.lineTo(x,y*.82):shape.moveTo(x,y*.82));shape.closePath();
 const guard=add(new THREE.ExtrudeGeometry(shape,{depth:.052,bevelEnabled:true,bevelThickness:.006,bevelSize:.006,bevelSegments:2}),guardMaterial);guard.rotation.x=Math.PI/2;guard.position.y=.026;guard.name='tensa-manji-guard';
 const habaki=add(new THREE.BoxGeometry(.205,.12,.078),fittings);habaki.position.set(.006,.094,0);
 function collar(y:number,height:number,radius:number,material:THREE.Material){const m=add(new THREE.CylinderGeometry(radius,radius,height,48),material);m.scale.z=.74;m.position.y=y;return m;}
 collar(-.10,.12,.126,fittings);
 collar(-.96,1.62,.115,red);
 // Opposed cloth helices form actual raised crossings and red diamond openings.
 for(const handedness of [-1,1]){
  const positions:number[]=[],uv:number[]=[],indices:number[]=[],segments=800,turns=8;
  for(let row=0;row<=segments;row++){
   const t=row/segments,a=t*Math.PI*2*turns*handedness;
   for(let col=0;col<=4;col++){
    const w=col/4,r=.119+Math.sin(w*Math.PI)*.0018+(handedness===1?.001:0);
    positions.push(Math.cos(a)*r,-.175-t*1.55+(w-.5)*.085,Math.sin(a)*r*.74);uv.push(t*turns*3,w);
   }
  }
  for(let row=0;row<segments;row++)for(let col=0;col<4;col++){const a=row*5+col;indices.push(a,a+1,a+5,a+1,a+6,a+5);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();add(geometry,cotton);
 }
 collar(-1.77,.10,.125,fittings);
 const eye=add(new THREE.TorusGeometry(.033,.010,8,24),fittings);eye.position.set(.119,-1.79,0);
 // Real interlocking oval links, with alternating planes; the chain hangs from the butt.
 for(let i=0;i<9;i++){
  const link=add(new THREE.TorusGeometry(.039,.008,8,24),fittings);
  link.scale.y=1.5;
  link.rotation.y=i%2?Math.PI/2:0;
  link.position.set(.15+.06*Math.sin(Math.min(i/4,1)*Math.PI/2),-1.83+.075*i,0);
  link.rotation.z=-.18*Math.max(0,1-i/4);
 }
 return new THREE.Group(); // This exposed form has no cloth covering or scabbard.
}
