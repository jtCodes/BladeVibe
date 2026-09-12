import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createSharingan} from './sharingan';
import {createSharinganAtmosphere} from './sharinganAtmosphere';

export function createSharinganScene(container:HTMLElement,preview=false){
 const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio,preview?1.25:2));
 renderer.setClearColor(0x050507);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 container.appendChild(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(42,1,.1,120);
 const model=createSharingan();model.eye.scale.setScalar(10.5);model.eye.position.set(0,2.2,-6);scene.add(model.eye);
 const atmosphere=createSharinganAtmosphere(scene);
 const ambient=new THREE.HemisphereLight(0xc6cad4,0x08080a,.45);scene.add(ambient);
 const key=new THREE.DirectionalLight(0xffffff,1.8);key.position.set(-3,4,5);scene.add(key);
 const fill=new THREE.DirectionalLight(0xc5cbda,.25);fill.position.set(3,0,3);scene.add(fill);
 const rim=new THREE.DirectionalLight(0xffffff,.65);rim.position.set(2,2,-2);scene.add(rim);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.enablePan=false;
 controls.minDistance=8;controls.maxDistance=20;controls.minAzimuthAngle=-.55;controls.maxAzimuthAngle=.55;controls.minPolarAngle=Math.PI*.36;controls.maxPolarAngle=Math.PI*.52;controls.enabled=!preview;
 let active=false,frame=0,last=0,spinning=true;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 function reset(){camera.position.set(.2,-.3,8);controls.target.set(0,1.8,-6);controls.update();}
 function resize(){const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.fov=w<h?52:42;camera.updateProjectionMatrix();}
 const observer=new ResizeObserver(resize);
 function animate(now:number){if(!active)return;frame=requestAnimationFrame(animate);const dt=last?Math.min((now-last)/1000,.05):0;last=now;if(document.hidden)return;
  if(spinning&&!reduced)model.iris.rotation.z-=dt*.055;
  atmosphere.update(spinning&&!reduced?dt:0);
  controls.update();renderer.render(scene,camera);
 }
 function setActive(value:boolean){if(active===value)return;active=value;controls.enabled=active&&!preview;
  if(active){observer.observe(container);resize();last=0;frame=requestAnimationFrame(animate);}
  else{cancelAnimationFrame(frame);observer.disconnect();last=0;}
 }
 reset();
 return {setActive,setSpinning(value:boolean){spinning=value;},reset,dispose(){setActive(false);observer.disconnect();controls.dispose();atmosphere.dispose();model.dispose();renderer.dispose();renderer.domElement.remove();}};
}
