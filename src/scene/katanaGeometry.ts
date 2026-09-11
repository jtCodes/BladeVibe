import * as THREE from 'three';

export const KATANA_RADIUS=38;
const LENGTH=5.02;
export function bend(x:number,y:number,z:number){const a=y/KATANA_RADIUS;return new THREE.Vector3(KATANA_RADIUS*(1-Math.cos(a))+x*Math.cos(a),KATANA_RADIUS*Math.sin(a)-x*Math.sin(a),z);}
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
