import * as THREE from 'three';
import {createRockField} from './rocks.js';
import {randomGenerator,noise} from './landscape.js';
import {createWorkerClient} from './worker-client.js';
export {randomGenerator,hash,noise,craterRelief,createLandscape} from './landscape.js';

function makeRegolith(renderer){
  const size=1024,rng=randomGenerator(1042),relief=new Float32Array(size*size),color=new Uint8Array(size*size*4),normal=new Uint8Array(size*size*4);
  for(let z=0;z<size;z++)for(let x=0;x<size;x++){
    const grit=rng();relief[z*size+x]=.48+(.5-noise(x*.013,z*.013))*.25+(noise(x*.09,z*.09)-.5)*.2+(grit-.5)*.20;
  }
  for(let k=0;k<1700;k++){
    const cx=rng()*size,cz=rng()*size,r=1+rng()**3*32;
    for(let z=Math.floor(cz-r*1.35);z<=cz+r*1.35;z++)for(let x=Math.floor(cx-r*1.35);x<=cx+r*1.35;x++){
      const u=Math.hypot(x-cx,z-cz)/r;if(u>1.35)continue;
      const i=((z+size)%size)*size+(x+size)%size;
      relief[i]-=.14*Math.exp(-u*u*3);relief[i]+=.08*Math.exp(-(((u-.9)/.16)**2));
    }
  }
  for(let z=0;z<size;z++)for(let x=0;x<size;x++){
    const i=z*size+x, p=i*4, s=relief[i];
    const shade=Math.round(145+(s-.5)*100+(rng()-.5)*17);
    color[p]=shade;color[p+1]=shade;color[p+2]=shade+1;color[p+3]=255;
    const dx=(relief[z*size+(x+1)%size]-relief[z*size+(x+size-1)%size])*1.9;
    const dz=(relief[((z+1)%size)*size+x]-relief[((z+size-1)%size)*size+x])*1.9;
    const n=new THREE.Vector3(-dx,-dz,1).normalize();normal[p]=(n.x*.5+.5)*255;normal[p+1]=(n.y*.5+.5)*255;normal[p+2]=(n.z*.5+.5)*255;normal[p+3]=255;
  }
  function texture(data,srgb=false){const t=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());if(srgb)t.colorSpace=THREE.SRGBColorSpace;t.needsUpdate=true;return t;}
  return {map:texture(color,true),normalMap:texture(normal)};
}

export async function buildTerrain(scene,renderer,landscape){
  const {heightAt,groundAt}=landscape,group=new THREE.Group();scene.add(group);
  const textures=makeRegolith(renderer),loader=new THREE.TextureLoader();
  const [map,normalMap,roughnessMap,aoMap]=await Promise.all(['color','normal','roughness','ao'].map(name=>loader.loadAsync(`assets/regolith/${name}.webp`)));
  for(const texture of [map,normalMap,roughnessMap,aoMap]){texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=Math.min(12,renderer.capabilities.getMaxAnisotropy());}
  map.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.MeshStandardMaterial({map,normalMap,roughnessMap,aoMap,aoMapIntensity:.7,normalScale:new THREE.Vector2(.55,.55),roughness:1,color:0xa6a7a7,vertexColors:true});
  material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vGround;');
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvGround = position.xz;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vGround;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
      vec4 grains = texture2D(map, vGround / 3.5);
      vec4 patches = texture2D(map, vGround / 47.0 + vec2(.37,.61));
      vec4 fine = texture2D(map, vGround / .63 + vec2(.13,.7));
      diffuseColor *= vec4(grains.rgb * (.80 + patches.rgb * .42) * (.9 + fine.rgb * .2), 1.0);
    `);
  };
  const rings=[];
  // Nested square rings: half-metre detail underfoot to a curved 32 km horizon.
  for(let level=0;level<10;level++){
    const step=.5*2**level,n=128,positions=new Float32Array((n+1)**2*3),colors=new Float32Array((n+1)**2*3),uv=new Float32Array((n+1)**2*2),indices=[];
    for(let z=0;z<n;z++)for(let x=0;x<n;x++){
      if(level>0&&x>=32&&x<96&&z>=32&&z<96)continue;
      const a=z*(n+1)+x,b=a+1,c=a+n+1,d=c+1;indices.push(a,c,b,b,c,d);
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));geo.setAttribute('color',new THREE.BufferAttribute(colors,3));geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));geo.setIndex(indices);
    const mesh=new THREE.Mesh(geo,material);mesh.receiveShadow=true;mesh.castShadow=level<5;group.add(mesh);rings.push({geo,mesh,step,n});
  }
  const stream=createWorkerClient();let anchorX=Infinity,anchorZ=Infinity,pending=false,completed=0;
  function install(data){
    data.rings.forEach((r,i)=>{const geo=rings[i].geo;for(const [name,array,size] of [['position',r.positions,3],['color',r.colors,3],['uv',r.uv,2],['normal',r.normals,3]]){
      const attribute=geo.getAttribute(name);if(attribute){attribute.array=array;attribute.needsUpdate=true;}else geo.setAttribute(name,new THREE.BufferAttribute(array,size));
    }geo.boundingSphere=new THREE.Sphere(new THREE.Vector3(...r.bounds.center),r.bounds.radius);});
    anchorX=data.cx;anchorZ=data.cz;completed++;
  }
  install(await stream.run('terrain',{x:0,z:0}));
  function update(x,z){
    if(pending||Math.round(x/32)*32===anchorX&&Math.round(z/32)*32===anchorZ)return;
    pending=true;stream.run('terrain',{x,z}).then(install).catch(error=>console.error(error)).finally(()=>pending=false);
  }
  const rockMaterial=new THREE.MeshStandardMaterial({color:0x909196,roughness:1,map:textures.map,normalMap:textures.normalMap,normalScale:new THREE.Vector2(1.2,1.2)});
  const rockField=await createRockField(group,renderer,landscape,rockMaterial);
  const dummy=new THREE.Object3D();

  // Reusable tread decals and ballistic dust; both remain fixed to their contact point.
  const treadCanvas=document.createElement('canvas');treadCanvas.width=64;treadCanvas.height=128;const tc=treadCanvas.getContext('2d');
  tc.fillStyle='rgba(30,31,33,.42)';tc.beginPath();tc.roundRect(7,3,50,120,13);tc.fill();
  tc.strokeStyle='rgba(8,9,10,.9)';tc.lineWidth=5;
  for(let y=15;y<115;y+=12){tc.beginPath();tc.moveTo(12,y);tc.lineTo(32,y+5);tc.lineTo(52,y);tc.stroke();}
  const printMaterial=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(treadCanvas),transparent:true,opacity:.62,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3});
  const printGeo=new THREE.PlaneGeometry(.23,.39);printGeo.rotateX(-Math.PI/2);
  const footprints=new THREE.InstancedMesh(printGeo,printMaterial,500);footprints.count=0;footprints.frustumCulled=false;group.add(footprints);let printIndex=0;
  const dustCount=320,dustPos=new Float32Array(dustCount*3),dustColors=new Float32Array(dustCount*3),dustLives=new Float32Array(dustCount),dustVel=new Float32Array(dustCount*3);
  dustPos.fill(-10000);const dg=new THREE.BufferGeometry();dg.setAttribute('position',new THREE.BufferAttribute(dustPos,3));dg.setAttribute('color',new THREE.BufferAttribute(dustColors,3));
  const dust=new THREE.Points(dg,new THREE.PointsMaterial({size:.022,color:0x9c9da0,vertexColors:true,transparent:true,opacity:.65,depthWrite:false}));dust.frustumCulled=false;group.add(dust);let dustIndex=0;
  function footstep(position,yaw,strength=1,wheel=false,dustOnly=false){
    if(!dustOnly){
    dummy.position.set(position.x,rockField.groundAt(position.x,position.z)+.012,position.z);
    const dx=(groundAt(position.x+.12,position.z)-groundAt(position.x-.12,position.z))/.24,dz=(groundAt(position.x,position.z+.12)-groundAt(position.x,position.z-.12))/.24;
    dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(-dx,1,-dz).normalize());dummy.rotateY(yaw);dummy.scale.set(wheel?.86:1,1,wheel?1.5:1);dummy.updateMatrix();footprints.setMatrixAt(printIndex%500,dummy.matrix);printIndex++;footprints.count=Math.min(500,printIndex);footprints.instanceMatrix.needsUpdate=true;
    }
    for(let k=0;k<12;k++){
      const i=dustIndex++%dustCount,j=i*3;dustPos[j]=position.x+(Math.random()-.5)*.12;dustPos[j+1]=position.y+.03;dustPos[j+2]=position.z+(Math.random()-.5)*.15;
      dustVel[j]=(Math.random()-.5)*.55*strength;dustVel[j+1]=.18+Math.random()*.4*strength;dustVel[j+2]=(Math.random()-.5)*.55*strength;dustLives[i]=1;
    }
  }
  function updateDust(dt){
    for(let i=0;i<dustCount;i++)if(dustLives[i]>0){
      const j=i*3;dustVel[j+1]-=1.62*dt;dustPos[j]+=dustVel[j]*dt;dustPos[j+1]+=dustVel[j+1]*dt;dustPos[j+2]+=dustVel[j+2]*dt;dustLives[i]-=dt*1.8;
      if(dustLives[i]<=0){dustPos[j+1]=-10000;}
      const b=Math.max(0,dustLives[i]);dustColors[j]=dustColors[j+1]=dustColors[j+2]=b;
    }
    dg.attributes.position.needsUpdate=true;dg.attributes.color.needsUpdate=true;
  }
  return {streaming:()=>({terrainJobs:completed,terrainPending:pending,rocks:rockField.streaming()}),group,sampleMesh:rockField.sampleMesh,impactDust:p=>footstep(p,0,.8,false,true),groundAt:rockField.groundAt,rockTopAt:rockField.surfaceAt,colliders:rockField.colliders,rocks:rockField.records,update(x,z){update(x,z);rockField.update(x,z);},footstep,wheelTrack:(p,yaw)=>footstep(p,yaw,.5,true),updateDust};
}
