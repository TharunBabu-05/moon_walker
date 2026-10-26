import * as THREE from '../vendor/three.module.js';
import {createLandscape,noise,hash,randomGenerator} from './landscape.js';
import {FLAG_EXHIBITS} from './lunar-sites.js';
import {planRoute} from './navigation.js';
const landscape=createLandscape(),dummy=new THREE.Object3D();
const terrainIndices=[];
for(let level=0;level<10;level++){
  const indices=[];for(let z=0;z<128;z++)for(let x=0;x<128;x++){if(level&&x>=32&&x<96&&z>=32&&z<96)continue;const a=z*129+x;indices.push(a,a+129,a+1,a+1,a+129,a+130);}terrainIndices.push(indices);
}
function terrain({x,z}){
  const cx=Math.round(x/32)*32,cz=Math.round(z/32)*32,rings=[];
  for(let level=0;level<10;level++){
    const step=.5*2**level,n=128,positions=new Float32Array(129*129*3),colors=new Float32Array(positions.length),uv=new Float32Array(129*129*2);
    for(let iz=0;iz<=n;iz++)for(let ix=0;ix<=n;ix++){
      const i=iz*129+ix,wx=cx+(ix-64)*step,wz=cz+(iz-64)*step;let y=landscape.heightAt(wx,wz);
      if((ix===0||ix===n)&&iz%2)y=(landscape.heightAt(wx,wz-step)+landscape.heightAt(wx,wz+step))/2;
      if((iz===0||iz===n)&&ix%2)y=(landscape.heightAt(wx-step,wz)+landscape.heightAt(wx+step,wz))/2;
      positions.set([wx,y,wz],i*3);uv.set([wx/3.5,-wz/3.5],i*2);
      const shade=.74+noise(wx*.013+3,wz*.013)*.22+noise(wx*.22,wz*.22)*.10;colors[i*3]=colors[i*3+1]=colors[i*3+2]=shade;
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));geo.setIndex(terrainIndices[level]);geo.computeVertexNormals();geo.computeBoundingSphere();
    rings.push({positions,colors,uv,normals:geo.attributes.normal.array,bounds:{center:geo.boundingSphere.center.toArray(),radius:geo.boundingSphere.radius}});
  }
  return {cx,cz,rings};
}
function rocks({x,z,heights}){
  const cx=Math.floor(x/64),cz=Math.floor(z/64),records=[];
  function add(wx,wz,radius,yaw,variant){
    if(FLAG_EXHIBITS.some(e=>Math.hypot(wx-e.x,wz-e.z)<3+radius)||Math.abs(wx+25)<19+radius&&Math.abs(wz-28)<20+radius||Math.hypot(wx,wz)<2.7||Math.hypot(wx-3,wz-2)<3.5||Math.hypot(wx+4,wz-5)<1)return;
    const bottom=Math.min(landscape.groundAt(wx,wz),landscape.groundAt(wx+radius*.55,wz),landscape.groundAt(wx-radius*.55,wz),landscape.groundAt(wx,wz+radius*.55),landscape.groundAt(wx,wz-radius*.55))-radius*.15;
    records.push({x:wx,z:wz,radius,yaw,variant,bottom,top:bottom+heights[variant]*radius});
  }
  for(let ix=cx-7;ix<=cx+7;ix++)for(let iz=cz-7;iz<=cz+7;iz++){
    const rng=randomGenerator((hash(ix+373,iz-99)*0xffffffff)>>>0);
    for(let i=0;i<23;i++){const wx=(ix+rng())*64,wz=(iz+rng())*64,radius=.07+rng()**4*1.45;if(Math.hypot(wx-x,wz-z)>440)continue;add(wx,wz,radius,rng()*Math.PI*2,Math.floor(rng()*3));}
  }
  for(const r of [[-3,-5,1.12,.7,0],[6,-12,1.8,2,1],[-13,-22,2.4,1.1,2],[18,-38,3.1,2.5,0]])add(...r);
  const near=[new Float32Array(240*16),new Float32Array(240*16),new Float32Array(240*16)],far=new Float32Array(6000*16),farColors=new Float32Array(6000*3),counts=[0,0,0];let farCount=0;
  for(const r of records){dummy.position.set(r.x,r.bottom,r.z);dummy.rotation.set(0,r.yaw,0);dummy.scale.setScalar(r.radius);dummy.updateMatrix();
    if(r.radius>.28&&Math.hypot(r.x-x,r.z-z)<90&&counts[r.variant]<240){dummy.matrix.toArray(near[r.variant],counts[r.variant]++*16);}
    else if(farCount<6000){dummy.position.y+=r.radius*.25;dummy.scale.set(r.radius,r.radius*heights[r.variant],r.radius);dummy.updateMatrix();dummy.matrix.toArray(far,farCount*16);const c=.68+hash(Math.round(r.x),Math.round(r.z))*.25;farColors.fill(c,farCount*3,farCount*3+3);farCount++;}
  }
  const gravel=new Float32Array(5000*16),rng=randomGenerator(1821+cx*47+cz*331);
  for(let i=0;i<5000;i++){const wx=(cx+.5)*64+(rng()-.5)*150,wz=(cz+.5)*64+(rng()-.5)*150,s=.008+rng()**3*.055;dummy.position.set(wx,landscape.groundAt(wx,wz)+s*.15,wz);dummy.rotation.set(rng()*2,rng()*6,rng()*2);dummy.scale.set(s,s*.65,s);dummy.updateMatrix();dummy.matrix.toArray(gravel,i*16);}
  return {cx,cz,records,near,counts,far,farColors,farCount,gravel};
}
function relief({x,z,span,width=120,height=80}){
  const pixels=new Uint8ClampedArray(width*height*4);
  for(let iy=0;iy<height;iy++)for(let ix=0;ix<width;ix++){const wx=x+(ix-width/2)*span/width,wz=z+(iy-height/2)*span/width,h=landscape.heightAt(wx,wz),slope=landscape.heightAt(wx-3,wz-3)-h,shade=Math.max(18,Math.min(95,34+h*.27+slope*5)),i=(iy*width+ix)*4,c=Math.abs(h/3-Math.round(h/3))<.08?15:0;pixels.set([shade+c,shade+6+c,shade+9+c,255],i);}
  return {x,z,span,width,height,pixels};
}
function route({start,goal,obstacles,radius}){
  const blocked=(x,z)=>obstacles.some(b=>{
    if(b.state){const p=b.state,dx=x-p.x,dz=z-p.z,c=Math.cos(p.yaw||0),s=Math.sin(p.yaw||0);return b.shape==='box'?Math.abs(c*dx-s*dz)<b.hx+radius&&Math.abs(s*dx+c*dz)<b.hz+radius:Math.hypot(dx,dz)<(b.radius||.34)+radius;}
    return Math.hypot(x-b.x,z-b.z)<b.radius+radius;
  });return planRoute(start,goal,landscape.groundAt,blocked);
}
self.onmessage=({data:{id,type,payload}})=>{try{const result=({terrain,rocks,relief,route})[type](payload),transfer=[];function collect(v){if(ArrayBuffer.isView(v))transfer.push(v.buffer);else if(v&&typeof v==='object')for(const x of Object.values(v))collect(x);}collect(result);self.postMessage({id,result},transfer);}catch(error){self.postMessage({id,error:error.message});}};
