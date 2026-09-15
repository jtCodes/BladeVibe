import * as THREE from 'three';

/** Bake a signed distance field once; rendering never walks the polygon edges. */
export function createAuraOutlineField(points:readonly THREE.Vector2[]){
 const box=new THREE.Box2().setFromPoints([...points]).expandByScalar(.3);
 const size=box.getSize(new THREE.Vector2()),width=256,height=512,range=.4;
 const data=new Uint8Array(width*height);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const px=box.min.x+(x+.5)/width*size.x,py=box.min.y+(y+.5)/height*size.y;
  let distance=Infinity,inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
   const a=points[j],b=points[i],ex=b.x-a.x,ey=b.y-a.y,wx=px-a.x,wy=py-a.y;
   const t=Math.max(0,Math.min(1,(wx*ex+wy*ey)/Math.max(ex*ex+ey*ey,1e-12)));
   const dx=wx-ex*t,dy=wy-ey*t;
   distance=Math.min(distance,dx*dx+dy*dy);
   if((a.y>py)!==(b.y>py)&&px<a.x+(py-a.y)*ex/ey)inside=!inside;
  }
  data[y*width+x]=Math.round(THREE.MathUtils.clamp(.5+(inside?-1:1)*Math.sqrt(distance)/(2*range),0,1)*255);
 }
 const texture=new THREE.DataTexture(data,width,height,THREE.RedFormat);
 texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;texture.needsUpdate=true;
 return {texture,rect:new THREE.Vector4(box.min.x,box.min.y,size.x,size.y),range};
}
