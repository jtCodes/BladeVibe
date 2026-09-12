import * as THREE from 'three';

/** Restrained crimson haze establishes depth without fire or a solid enclosure. */
export function createSharinganAtmosphere(scene:THREE.Scene){
 const group=new THREE.Group();scene.add(group);
 const clock={value:0};
 const hazeMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{clock},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`
  varying vec2 vUv;uniform float clock;
  void main(){
   vec2 p=(vUv-.5)*vec2(2.4,1.8);
   float cloud=.5+.22*sin(p.x*8.+sin(p.y*7.)+clock*.07)+.16*sin(p.y*14.-p.x*5.-clock*.045);
   float halo=exp(-dot(p,p)*1.35);
   float low=exp(-pow((p.y+.38)*2.6,2.))*exp(-p.x*p.x*.85);
   vec3 color=vec3(.06,.00015,.00015)*halo*cloud+vec3(.02,.00005,.00005)*low;
   float edge=1.-smoothstep(.55,1.,length((vUv-.5)*2.));
   gl_FragColor=vec4(color,edge);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
  }`});
 const haze=new THREE.Mesh(new THREE.PlaneGeometry(52,34),hazeMaterial);haze.position.set(0,3,-10);group.add(haze);
 return {update(dt:number){clock.value+=dt;},dispose(){group.removeFromParent();haze.geometry.dispose();hazeMaterial.dispose();}};
}
