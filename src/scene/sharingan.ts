import * as THREE from 'three';

const IRIS_RADIUS=.625, PUPIL_RADIUS=.145;
function surface(x:number,y:number){return .08+.09*(1-(x*x+y*y)/(IRIS_RADIUS*IRIS_RADIUS));}

/** A curved field fading into space; the markings retain physical depth. */
export function createSharingan(){
 const eye=new THREE.Group(),iris=new THREE.Group();eye.add(iris);
 eye.scale.setScalar(1.5);
 const positions:number[]=[],uvs:number[]=[],indices:number[]=[];
 const segments=192,rows=32;
 for(let row=0;row<=rows;row++){
  const r=THREE.MathUtils.lerp(PUPIL_RADIUS,IRIS_RADIUS,row/rows);
  for(let i=0;i<=segments;i++){
   const a=i/segments*Math.PI*2,x=Math.cos(a)*r,y=Math.sin(a)*r;
   positions.push(x,y,surface(x,y));uvs.push(x/IRIS_RADIUS*.5+.5,y/IRIS_RADIUS*.5+.5);
  }
 }
 for(let row=0;row<rows;row++)for(let i=0;i<segments;i++){
  const a=row*(segments+1)+i,b=a+segments+1;indices.push(a,b,a+1,a+1,b,b+1);
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();
 const material=new THREE.MeshStandardMaterial({color:0xb9000c,roughness:.85,emissive:0x520005,emissiveIntensity:.32,transparent:true,depthWrite:false,side:THREE.DoubleSide});
 material.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec2 irisUv; varying vec3 fieldNormal;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nirisUv=uv; fieldNormal=normalize(normalMatrix*normal);');
  shader.fragmentShader='varying vec2 irisUv; varying vec3 fieldNormal;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec2 p=(irisUv-.5)*2.;float r=length(p),a=atan(p.y,p.x);
   float edge=1.-smoothstep(.86,1.,r);
   float center=smoothstep(.23,.42,r);
   diffuseColor.rgb*=mix(.48,1.08,edge)*mix(.7,1.,center);
   // Feather both the silhouette and grazing views so there is no visible cut edge.
   diffuseColor.a*=1.-smoothstep(.64,1.,r);
   diffuseColor.a*=smoothstep(.08,.5,abs(normalize(fieldNormal).z));

  `);
 };
 material.customProgramCacheKey=()=> 'sharingan-fading-field-v3';
 iris.add(new THREE.Mesh(geometry,material));
 const black=new THREE.MeshStandardMaterial({color:0x020102,roughness:.65});
 const pupil=new THREE.Mesh(new THREE.CircleGeometry(PUPIL_RADIUS*1.04,96),black);pupil.position.z=.14;eye.add(pupil);
 const ringRadius=.37;
 const ring=new THREE.Mesh(new THREE.TorusGeometry(ringRadius,.008,8,160),black);ring.position.z=surface(ringRadius,0)+.001;iris.add(ring);
 // Comma-shaped marks conform to the curved iris, rather than floating above it.
 const mark=new THREE.Shape();
 mark.moveTo(0,-.066);mark.bezierCurveTo(-.066,-.066,-.085,-.005,-.057,.04);
 mark.bezierCurveTo(-.032,.084,.04,.079,.077,.037);
 mark.bezierCurveTo(.116,-.007,.111,-.074,.081,-.117);
 mark.bezierCurveTo(.084,-.062,.055,-.046,.033,-.057);
 mark.bezierCurveTo(.025,-.063,.014,-.066,0,-.066);
 for(let i=0;i<3;i++){
  const g=new THREE.ExtrudeGeometry(mark,{depth:.009,bevelEnabled:true,bevelThickness:.002,bevelSize:.002,bevelSegments:2,steps:1,curveSegments:32}),p=g.getAttribute('position');
  const a=Math.PI/2+i*Math.PI*2/3,c=Math.cos(a),s=Math.sin(a);
  for(let j=0;j<p.count;j++){
   const u=p.getX(j),v=p.getY(j)+ringRadius,x=u*c-v*s,y=u*s+v*c;
   p.setXYZ(j,x,y,surface(x,y)+.003+p.getZ(j));
  }
  g.computeVertexNormals();iris.add(new THREE.Mesh(g,black));
 }
 return {eye,iris,dispose(){const gs=new Set<THREE.BufferGeometry>(),ms=new Set<THREE.Material>();eye.traverse(o=>{if(o instanceof THREE.Mesh){gs.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])ms.add(m);}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());}};
}
