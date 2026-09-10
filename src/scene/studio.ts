import * as THREE from 'three';

/** A static photographic light tent, captured once for specular reflections. */
export function createStudioEnvironment(renderer: THREE.WebGLRenderer) {
  const studio = new THREE.Scene();
  studio.background = new THREE.Color(0x030405);
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  function panel(x: number, y: number, z: number, width: number, height: number, intensity: number, color: number) {
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide });
    geometries.push(geometry); materials.push(material);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x,y,z); mesh.lookAt(0,0,0); studio.add(mesh);
  }
  // Distinct long reflections describe the blade's bevels without washing out metal.
  panel(-3,1,4,1.4,9,5.5,0xe5edff);
  panel(3,0,2,.35,8,5,0xffffff);
  panel(1,2,-4,1.5,7,3.5,0xffe9cf);
  panel(0,6,0,4,4,2,0xffffff);
  panel(-4,-1,-1,3,6,.3,0xd0dcff);
  const generator = new THREE.PMREMGenerator(renderer);
  const target = generator.fromScene(studio,.012,.1,40);
  generator.dispose(); geometries.forEach(g=>g.dispose()); materials.forEach(m=>m.dispose());
  return target;
}
