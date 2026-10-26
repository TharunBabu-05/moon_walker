import * as THREE from 'three';
import {GLTFLoader} from '../vendor/loaders/GLTFLoader.js';
import {hash,randomGenerator,noise} from './terrain.js';

const CELL=64;
export async function createRockField(group,renderer,landscape,fallbackMaterial) {
  const loader=new GLTFLoader(),templates=[];
  for(const id of ['moon_rock_01','moon_rock_03','moon_rock_05']) {
    const {scene}=await loader.loadAsync(`assets/rocks/${id}/model.gltf`);
    scene.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(scene),center=box.getCenter(new THREE.Vector3());
    const radius=Math.hypot(box.max.x-box.min.x,box.max.z-box.min.z)/2;
    const parts=[];
    scene.traverse(node=>{
      if(!node.isMesh||(/_LOD\d/.test(node.name)&&!node.name.endsWith('_LOD0')))return;
      const geo=node.geometry.clone().applyMatrix4(node.matrixWorld);
      geo.translate(-center.x,-box.min.y,-center.z);geo.scale(1/radius,1/radius,1/radius);
      const material=node.material.clone();material.color.setScalar(.85);material.roughness=1;
      material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat grey = dot(diffuseColor.rgb, vec3(.2126,.7152,.0722)); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(grey), .88);');};
      for(const map of ['map','normalMap','roughnessMap','aoMap'])if(material[map])material[map].anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
      const mesh=new THREE.InstancedMesh(geo,material,240);mesh.count=0;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
      parts.push(mesh);
    });
    templates.push({parts,height:(box.max.y-box.min.y)/radius});
  }
  const geo=new THREE.IcosahedronGeometry(1,1),positions=geo.attributes.position;
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i),r=.79+noise(x*3+11,z*3+y*2)*.27;
    positions.setXYZ(i,x*r,Math.max(-.55,y*r)*.72,z*r);
  }
  geo.computeVertexNormals();
  const distant=new THREE.InstancedMesh(geo,fallbackMaterial,6000);distant.castShadow=true;distant.receiveShadow=true;group.add(distant);
  const gravel=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),fallbackMaterial,5000);gravel.receiveShadow=true;group.add(gravel);
  const dummy=new THREE.Object3D(),color=new THREE.Color(),colliders=[],records=[];
  let anchorX=Infinity,anchorZ=Infinity;
  function addRock(x,z,radius,yaw,variant){
    if(Math.abs(x+25)<19+radius&&Math.abs(z-28)<20+radius)return;
    // Keep the landing point, instrument and parked buggy unobstructed.
    if(Math.hypot(x,z)<2.7||Math.hypot(x-3,z-2)<3.5||Math.hypot(x+4,z-5)<1)return;
    const ground=Math.min(landscape.groundAt(x,z),landscape.groundAt(x+radius*.55,z),landscape.groundAt(x-radius*.55,z),landscape.groundAt(x,z+radius*.55),landscape.groundAt(x,z-radius*.55));
    const bottom=ground-radius*.15;
    const height=templates[variant].height*radius;
    const rock={x,z,radius,yaw,variant,bottom,top:bottom+height};records.push(rock);
    if(radius>.13)colliders.push(rock);
  }
  function update(x,z){
    const cx=Math.floor(x/CELL),cz=Math.floor(z/CELL);
    if(cx===anchorX&&cz===anchorZ)return;anchorX=cx;anchorZ=cz;records.length=0;colliders.length=0;
    for(let ix=cx-7;ix<=cx+7;ix++)for(let iz=cz-7;iz<=cz+7;iz++){
      const rng=randomGenerator((hash(ix+373,iz-99)*0xffffffff)>>>0);
      for(let i=0;i<23;i++){
        const wx=(ix+rng())*CELL,wz=(iz+rng())*CELL,radius=.07+rng()**4*1.45;
        if(Math.hypot(wx-x,wz-z)>440)continue;
        addRock(wx,wz,radius,rng()*Math.PI*2,Math.floor(rng()*3));
      }
    }
    for(const r of [[-3,-5,1.12,.7,0],[6,-12,1.8,2,1],[-13,-22,2.4,1.1,2],[18,-38,3.1,2.5,0]])addRock(...r);
    const counts=[0,0,0];let farCount=0;
    for(const r of records){
      dummy.position.set(r.x,r.bottom,r.z);dummy.rotation.set(0,r.yaw,0);dummy.scale.setScalar(r.radius);dummy.updateMatrix();
      if(r.radius>.28&&Math.hypot(r.x-x,r.z-z)<90&&counts[r.variant]<240){
        for(const mesh of templates[r.variant].parts)mesh.setMatrixAt(counts[r.variant],dummy.matrix);
        counts[r.variant]++;
      }else if(farCount<distant.instanceMatrix.count){
        dummy.position.y+=r.radius*.25;dummy.scale.set(r.radius,r.radius*templates[r.variant].height,r.radius);dummy.updateMatrix();distant.setMatrixAt(farCount,dummy.matrix);
        color.setScalar(.68+hash(Math.round(r.x),Math.round(r.z))*.25);distant.setColorAt(farCount++,color);
      }
    }
    templates.forEach((t,i)=>t.parts.forEach(mesh=>{mesh.count=counts[i];mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();}));
    distant.count=farCount;distant.instanceMatrix.needsUpdate=true;if(distant.instanceColor)distant.instanceColor.needsUpdate=true;distant.computeBoundingSphere();
    const rng=randomGenerator(1821+cx*47+cz*331);
    for(let i=0;i<5000;i++){
      const wx=(cx+.5)*CELL+(rng()-.5)*150,wz=(cz+.5)*CELL+(rng()-.5)*150,s=.008+rng()**3*.055;
      dummy.position.set(wx,landscape.groundAt(wx,wz)+s*.15,wz);dummy.rotation.set(rng()*2,rng()*6,rng()*2);dummy.scale.set(s,s*.65,s);dummy.updateMatrix();gravel.setMatrixAt(i,dummy.matrix);
    }
    gravel.instanceMatrix.needsUpdate=true;gravel.computeBoundingSphere();
  }
  const ray=new THREE.Raycaster(),probe=new THREE.Mesh(),down=new THREE.Vector3(0,-1,0);
  function surfaceAt(r,x,z){
    dummy.position.set(r.x,r.bottom,r.z);dummy.rotation.set(0,r.yaw,0);dummy.scale.setScalar(r.radius);dummy.updateMatrix();
    ray.set(new THREE.Vector3(x,r.top+2,z),down);ray.far=r.top-r.bottom+4;
    let top=-Infinity;
    for(const part of templates[r.variant].parts){
      probe.geometry=part.geometry;probe.material=part.material;probe.matrixWorld.copy(dummy.matrix);
      const hits=[];probe.raycast(ray,hits);for(const hit of hits)top=Math.max(top,hit.point.y);
    }
    return top;
  }
  // Query the same photographed model triangles that are drawn.
  function groundAt(x,z){
    let y=landscape.groundAt(x,z);
    for(const r of colliders){
      if(Math.abs(x-r.x)>r.radius*1.08||Math.abs(z-r.z)>r.radius*1.08)continue;
      y=Math.max(y,surfaceAt(r,x,z));
    }
    return y;
  }
  update(0,0);
  return {update,groundAt,surfaceAt,colliders,records,templates};
}
