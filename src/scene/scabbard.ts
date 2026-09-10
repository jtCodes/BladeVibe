import * as THREE from 'three';
// y, outer half-width, outer half-depth. The cavity clears the blade with a leather-covered wooden wall.
// Seat just below the guard (blade-facing surface at y=.0475).
const MOUTH_Y = .05;
const profiles = [[MOUTH_Y,.25,.095],[.92,.25,.095],[1.22,.24,.09],[3.8,.20,.08],[4.65,.13,.075],[5.14,.06,.065]];
const segments=32;
function perimeter(width:number,depth:number,i:number){
 const angle=i/segments*Math.PI*2;
 // A superellipse gives broad leather faces and softly rounded corners.
 return [width*Math.sign(Math.cos(angle))*Math.pow(Math.abs(Math.cos(angle)),.55),depth*Math.sign(Math.sin(angle))*Math.pow(Math.abs(Math.sin(angle)),.55)];
}
export function createScabbardGeometry(){
 const positions:number[]=[],uv:number[]=[],indices:number[]=[];
 for(const inner of [false,true])for(const [y,width,depth] of profiles)for(let i=0;i<=segments;i++){
  const [x,z]=perimeter(width-(inner?.045:0),depth-(inner?.035:0),i);
  positions.push(x,y,z);uv.push(i/segments,y/2);
 }
 const stride=segments+1,layer=profiles.length*stride;
 for(let side=0;side<2;side++)for(let row=0;row<profiles.length-1;row++)for(let i=0;i<segments;i++){
  const a=side*layer+row*stride+i,b=a+1,c=a+stride,d=c+1;
  if(side===0)indices.push(a,c,b,b,c,d);else indices.push(a,b,c,b,d,c);
 }
 // Join both surfaces at the mouth; the cavity stays open.
 for(let i=0;i<segments;i++)indices.push(i,i+1,layer+i,i+1,layer+i+1,layer+i);
 // A solid end cap beyond the blade tip closes the scabbard.
 const end=(profiles.length-1)*stride;
 const center=positions.length/3;positions.push(0,profiles.at(-1)![0],0);uv.push(.5,1);
 for(let i=0;i<segments;i++)indices.push(center,end+i,end+i+1);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
export function createScabbard(leather: THREE.Material, metal: THREE.Material){
 const group=new THREE.Group();group.rotation.z=Math.PI-.16;
 const body=new THREE.Mesh(createScabbardGeometry(),leather);body.castShadow=true;body.receiveShadow=true;group.add(body);
 function band(y:number,width:number,depth:number){
  const points=Array.from({length:segments},(_,i)=>{const [x,z]=perimeter(width,depth,i);return new THREE.Vector3(x,y,z)});
  const curve=new THREE.CatmullRomCurve3(points,true);
  for(const dy of [-.055,.055]){const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,96,.012,6,true),metal);mesh.position.y=dy;mesh.castShadow=true;group.add(mesh)}
 }
 band(MOUTH_Y+.067,.255,.10);band(4.91,.095,.072);
 const tip=new THREE.Mesh(new THREE.SphereGeometry(1,24,12),metal);tip.scale.set(.065,.085,.069);tip.position.y=5.14;tip.castShadow=true;group.add(tip);
 const threadMaterial=new THREE.MeshStandardMaterial({color:0x92765b,roughness:.95});
 for(let y=1.28;y<4.7;y+=.085){
  let a=profiles[2],b=profiles[3];for(let j=3;j<profiles.length;j++){if(y<=profiles[j][0]){a=profiles[j-1];b=profiles[j];break}}
  const t=(y-a[0])/(b[0]-a[0]),w=THREE.MathUtils.lerp(a[1],b[1],t),d=THREE.MathUtils.lerp(a[2],b[2],t);
  const stitch=new THREE.Mesh(new THREE.CapsuleGeometry(.0025,.026,2,5),threadMaterial);stitch.position.set(w*.32,y,d*.995);stitch.rotation.z=-.55;group.add(stitch);
 }
 return group;
}
