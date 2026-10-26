import * as THREE from 'three';
import {createRockField} from './rocks.js';
const TAU=Math.PI*2;
export function randomGenerator(seed=8419){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
export function hash(x,z){let n=(Math.imul(x|0,374761393)+Math.imul(z|0,668265263))|0;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
export function noise(x,z){const ix=Math.floor(x),iz=Math.floor(z);let u=x-ix,v=z-iz;u=u*u*(3-2*u);v=v*v*(3-2*v);return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix,iz),hash(ix+1,iz),u),THREE.MathUtils.lerp(hash(ix,iz+1),hash(ix+1,iz+1),u),v);}

export function createLandscape(){
  const rng=randomGenerator(71903),craters=[
    {x:42,z:-138,r:153,d:.19}, {x:116,z:18,r:27,d:.22}, {x:-52,z:-8,r:16,d:.23},
    {x:-34,z:43,r:7,d:.23}, {x:30,z:13,r:4.2,d:.24}, {x:-7,z:-10,r:2.4,d:.19},
    {x:-403,z:-320,r:203,d:.14}, {x:570,z:-680,r:310,d:.15}, {x:-910,z:190,r:330,d:.17}
  ];
  for(let i=0;i<90;i++){const x=(rng()-.5)*24000,z=(rng()-.5)*24000;if(Math.hypot(x,z)<1400)continue;craters.push({x,z,r:90+rng()**2*1100,d:.12+rng()*.07});}
  for(let i=0;i<850;i++){const x=(rng()-.5)*2900,z=(rng()-.5)*2900;if(Math.hypot(x,z)<25)continue;craters.push({x,z,r:1.2+rng()**3*35,d:.17+rng()*.09});}
  for(let i=0;i<100;i++){const x=(rng()-.5)*180,z=(rng()-.5)*180;if(Math.hypot(x,z)<2.5)continue;craters.push({x,z,r:.45+rng()**2*3.2,d:.16+rng()*.10});}
  const bins=new Map(),cell=128;
  craters.forEach(c=>{
    const extent=c.r*1.6;
    for(let x=Math.floor((c.x-extent)/cell);x<=Math.floor((c.x+extent)/cell);x++)for(let z=Math.floor((c.z-extent)/cell);z<=Math.floor((c.z+extent)/cell);z++){
      const key=x+','+z;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(c);
    }
  });
  function rawHeightAt(x,z){
    let h=(noise(x*.00045+11,z*.00045+78)-.5)*220+(noise(x*.0023+7,z*.0023-8)-.5)*48+(noise(x*.009,z*.009)-.5)*8;
    h+=(noise(x*.043+20,z*.043)-.5)*1.5+(noise(x*.22,z*.22+9)-.5)*.18;
    h+=(noise(x*1.5+13,z*1.5)-.5)*.045;
    h-=(x*x+z*z)/(2*1737400);
    const nearby=bins.get(Math.floor(x/cell)+','+Math.floor(z/cell))||[];
    for(const c of nearby){
      const dx=x-c.x,dz=z-c.z,a=Math.atan2(dz,dx),d=Math.hypot(dx,dz);
      const radius=c.r*(1+.025*Math.sin(a*7+c.x)+.017*Math.sin(a*13));const u=d/radius;
      if(u>1.6)continue;
      if(u<1)h-=c.r*c.d*(1-u*u)**2;
      h+=c.r*.064*Math.exp(-(((u-.99)/.105)**2))*(1+.13*Math.sin(a*19));
      if(u>1)h+=c.r*.013*Math.exp(-(((u-1.12)/.28)**2));
      if(c.r>200)h+=c.r*.028*Math.exp(-u*u*45);
    }
    return h;
  }
  const padHeight=rawHeightAt(-25,28);
  function heightAt(x,z){
    const d=Math.max(Math.abs(x+25)/18,Math.abs(z-28)/19);
    const blend=THREE.MathUtils.smoothstep(d,.85,1.45);
    return THREE.MathUtils.lerp(padHeight,rawHeightAt(x,z),blend);
  }
  // Sample exactly the triangle interpolation of the finest (0.5 m) mesh.
  function groundAt(x,z){
    const step=.5,x0=Math.floor(x/step)*step,z0=Math.floor(z/step)*step,u=(x-x0)/step,v=(z-z0)/step;
    const a=heightAt(x0,z0),b=heightAt(x0+step,z0),c=heightAt(x0,z0+step),d=heightAt(x0+step,z0+step);
    return u+v<=1?a+(b-a)*u+(c-a)*v:d+(c-d)*(1-u)+(b-d)*(1-v);
  }
  return {heightAt,groundAt,craters};
}

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
  let anchorX=Infinity,anchorZ=Infinity;
  function update(x,z){
    const cx=Math.round(x/32)*32,cz=Math.round(z/32)*32;if(cx===anchorX&&cz===anchorZ)return;
    anchorX=cx;anchorZ=cz;
    for(const {geo,step,n} of rings){
      const p=geo.attributes.position.array,c=geo.attributes.color.array,uv=geo.attributes.uv.array;
      for(let iz=0;iz<=n;iz++)for(let ix=0;ix<=n;ix++){
        const i=iz*(n+1)+ix,wx=cx+(ix-n/2)*step,wz=cz+(iz-n/2)*step;
        let y=heightAt(wx,wz);
        // Fine ring edge vertices follow the adjacent coarse edge exactly.
        if((ix===0||ix===n)&&iz%2)y=(heightAt(wx,wz-step)+heightAt(wx,wz+step))/2;
        if((iz===0||iz===n)&&ix%2)y=(heightAt(wx-step,wz)+heightAt(wx+step,wz))/2;
        p[i*3]=wx;p[i*3+1]=y;p[i*3+2]=wz;uv[i*2]=wx/3.5;uv[i*2+1]=-wz/3.5;
        const shade=.74+noise(wx*.013+3,wz*.013)*.22+noise(wx*.22,wz*.22)*.10;c[i*3]=c[i*3+1]=c[i*3+2]=shade;
      }
      geo.attributes.position.needsUpdate=true;geo.attributes.color.needsUpdate=true;geo.attributes.uv.needsUpdate=true;geo.computeVertexNormals();geo.computeBoundingSphere();
    }
  }
  update(0,0);
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
  function footstep(position,yaw,strength=1,wheel=false){
    dummy.position.set(position.x,rockField.groundAt(position.x,position.z)+.012,position.z);
    const dx=(groundAt(position.x+.12,position.z)-groundAt(position.x-.12,position.z))/.24,dz=(groundAt(position.x,position.z+.12)-groundAt(position.x,position.z-.12))/.24;
    dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(-dx,1,-dz).normalize());dummy.rotateY(yaw);dummy.scale.set(wheel?.86:1,1,wheel?1.5:1);dummy.updateMatrix();footprints.setMatrixAt(printIndex%500,dummy.matrix);printIndex++;footprints.count=Math.min(500,printIndex);footprints.instanceMatrix.needsUpdate=true;
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
  return {group,groundAt:rockField.groundAt,rockTopAt:rockField.surfaceAt,colliders:rockField.colliders,rocks:rockField.records,update(x,z){update(x,z);rockField.update(x,z);},footstep,wheelTrack:(p,yaw)=>footstep(p,yaw,.5,true),updateDust};
}
