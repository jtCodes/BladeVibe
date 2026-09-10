import * as THREE from 'three';

// Reproducible surface maps: scratches affect roughness and relief, not baked lighting.
function randomSource(seed: number){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
export function surfaceMaps(kind: 'steel' | 'gold' | 'leather',renderer: THREE.WebGLRenderer){
 const w=kind==='steel'?512:256,h=kind==='steel'?1024:512,random=randomSource(kind==='steel'?49:kind==='gold'?78:96);
 const heights=new Float32Array(w*h),values=new Float32Array(w*h),albedo=new Float32Array(w*h);
 const grain=Array.from({length:w},()=>random());
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=y*w+x,n=random(),cloud=(Math.sin(x*.041+Math.sin(y*.017)*2)+Math.sin(y*.026+x*.013))/4+.5;
  if(kind==='steel'){heights[i]=.48+grain[x]*.025+n*.012;values[i]=.30+grain[x]*.1+cloud*.065+n*.025;albedo[i]=.89+cloud*.06;}
  else if(kind==='gold'){heights[i]=.46+cloud*.04+n*.035;values[i]=.38+cloud*.19+n*.05;albedo[i]=.77+cloud*.19;}
  else {const cell=Math.sin(x*.59+Math.sin(y*.31))*Math.sin(y*.67+Math.sin(x*.28));heights[i]=.45+cell*.11+n*.1;values[i]=.76+cloud*.12+n*.07;albedo[i]=.58+cloud*.28+n*.12;}
 }
 if(kind!=='leather')for(let k=0;k<(kind==='steel'?440:160);k++){
  const x0=random()*w,y0=random()*h,len=4+random()*70,dx=(random()-.5)*(kind==='steel'?.10:.8),depth=.015+random()*.04;
  for(let j=0;j<len;j++){const x=Math.floor(x0+j*dx),y=Math.floor(y0+j);if(x<0||x>=w||y>=h)continue;const i=y*w+x;heights[i]-=depth;values[i]=Math.min(.82,values[i]+.13);}
 }
 function texture(values: Float32Array,color=false){const bytes=new Uint8Array(w*h*4);for(let i=0;i<values.length;i++){const v=Math.round(THREE.MathUtils.clamp(values[i],0,1)*255);bytes.set([v,v,v,255],i*4);}const t=new THREE.DataTexture(bytes,w,h);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());if(color)t.colorSpace=THREE.SRGBColorSpace;t.needsUpdate=true;return t;}
 return {map:texture(albedo,true),roughnessMap:texture(values),bumpMap:texture(heights)};
}
// The blade shoulder continues through the guard into a concealed tang.
export const bladeStations=[[-.14,.12,1],[-.04,.20,1],[0,.27,1],[.55,.27,1],[.84,.263,.97],[3.84,.205,.72],[4.52,.13,.48],[5.02,.0005,.008]];
export function bladeThickness(y: number){for(let i=1;i<bladeStations.length;i++){const a=bladeStations[i-1],b=bladeStations[i];if(y<=b[0])return THREE.MathUtils.lerp(a[2],b[2],THREE.MathUtils.clamp((y-a[0])/(b[0]-a[0]),0,1));}return .008;}
export function createBladeGeometry(){
 const cross=[[-1,0],[-.80,.052],[-.30,.082],[-.22,.079],[-.18,.054],[.18,.054],[.22,.079],[.30,.082],[.80,.052],[1,0],[.80,-.052],[.30,-.082],[.22,-.079],[.18,-.054],[-.18,-.054],[-.22,-.079],[-.30,-.082],[-.80,-.052]];
 const positions=[],uv=[],indices=[],groups=[];
 for(let k=0;k<cross.length;k++){
  const start=indices.length,base=positions.length/3;
  for(const [y,w,t] of bladeStations)for(const [x,z] of [cross[k],cross[(k+1)%cross.length]]){positions.push(x*w*.65,y,z*t*.23);uv.push(x*.5+.5,y/5);}
  for(let j=0;j<bladeStations.length-1;j++){const a=base+j*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
  groups.push([start,indices.length-start,[0,8,9,17].includes(k)?1:[4,13].includes(k)?2:0]);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();for(const group of groups)g.addGroup(group[0],group[1],group[2]);g.computeBoundingSphere();return g;
}
export function createLeatherWrap(){
 const positions=[],uv=[],indices=[],turns=12,segments=768;
 // One continuous, slightly overlapping spiral strip around an oval grip.
 for(let i=0;i<=segments;i++){
  const a=i/segments*Math.PI*2*turns,y=-.18-i/segments*1.32;
  for(let j=0;j<5;j++){const v=j/4,r=.112+Math.sin(v*Math.PI)*.0015;positions.push(Math.cos(a)*r,y+(v-.5)*.118,Math.sin(a)*r*.83);uv.push(i/segments*10,v);}
 }
 for(let i=0;i<segments;i++)for(let j=0;j<4;j++){const a=i*5+j;indices.push(a,a+1,a+5,a+1,a+6,a+5);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
