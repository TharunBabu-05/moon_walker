import * as THREE from 'three';
import {GLTFLoader} from '../vendor/loaders/GLTFLoader.js';
import {hash,randomGenerator,noise} from './landscape.js';
import {createWorkerClient} from './worker-client.js';

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
  const stream=createWorkerClient(),bins=new Map();let anchorX=Infinity,anchorZ=Infinity,pending=false,completed=0;
  const heights=templates.map(t=>t.height);
  function install(data){
    records.length=0;colliders.length=0;bins.clear();
    for(const r of data.records){records.push(r);if(r.radius<=.13)continue;colliders.push(r);
      const extent=r.radius*1.08;for(let ix=Math.floor((r.x-extent)/8);ix<=Math.floor((r.x+extent)/8);ix++)for(let iz=Math.floor((r.z-extent)/8);iz<=Math.floor((r.z+extent)/8);iz++){
        const key=ix+','+iz;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(r);
      }
    }
    templates.forEach((t,i)=>t.parts.forEach(mesh=>{mesh.count=data.counts[i];mesh.instanceMatrix.array=data.near[i];mesh.instanceMatrix.needsUpdate=true;mesh.frustumCulled=false;}));
    distant.count=data.farCount;distant.instanceMatrix.array=data.far;distant.instanceMatrix.needsUpdate=true;
    if(distant.instanceColor){distant.instanceColor.array=data.farColors;distant.instanceColor.needsUpdate=true;}
    else{distant.instanceColor=new THREE.InstancedBufferAttribute(data.farColors,3);distant.instanceColor.needsUpdate=true;}
    distant.frustumCulled=false;gravel.instanceMatrix.array=data.gravel;gravel.instanceMatrix.needsUpdate=true;gravel.frustumCulled=false;
    anchorX=data.cx;anchorZ=data.cz;completed++;
  }
  function update(x,z){if(pending||Math.floor(x/CELL)===anchorX&&Math.floor(z/CELL)===anchorZ)return;pending=true;stream.run('rocks',{x,z,heights}).then(install).catch(error=>console.error(error)).finally(()=>pending=false);}
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
    for(const r of bins.get(Math.floor(x/8)+','+Math.floor(z/8))||[]){
      if(Math.abs(x-r.x)>r.radius*1.08||Math.abs(z-r.z)>r.radius*1.08)continue;
      y=Math.max(y,surfaceAt(r,x,z));
    }
    return y;
  }
  install(await stream.run('rocks',{x:0,z:0,heights}));
  function sampleMesh(radius=.065,variant=0){
    const group=new THREE.Group();
    for(const part of templates[variant%templates.length].parts){const m=new THREE.Mesh(part.geometry,part.material);m.castShadow=m.receiveShadow=true;group.add(m);}
    const bounds=new THREE.Box3().setFromObject(group),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
    const scale=radius*2/Math.max(size.x,size.y,size.z);
    for(const m of group.children){m.scale.setScalar(scale);m.position.copy(center).multiplyScalar(-scale);}
    return group;
  }
  return {streaming:()=>({jobs:completed,pending}),update,groundAt,surfaceAt,colliders,records,templates,sampleMesh};
}
