import * as THREE from 'three';
import {SampleWorld,SAMPLE_DURATIONS} from './sample-world.js';

export function createSampling({scene,groundAt,obstacles,makeRock,network,onDust,onNotice}){
  const world=new SampleWorld(groundAt,obstacles),meshes=new Map();
  const ids=new Set(),projected=new THREE.Vector3();
  let current=world.snapshot(),received=performance.now(),lastEvent=0,accumulator=0,publishTime=0,ready=true;
  const marker=new THREE.Mesh(new THREE.RingGeometry(.13,.16,32),new THREE.MeshBasicMaterial({color:0xd8c49b,side:THREE.DoubleSide,transparent:true,opacity:.8,depthWrite:false}));marker.rotation.x=-Math.PI/2;scene.add(marker);marker.visible=false;
  function accept(data){
    if(!data||!Number.isFinite(data.time)||!Array.isArray(data.stones)||data.stones.length>240||!Array.isArray(data.people)||data.people.length>8||!Array.isArray(data.events)||data.events.length>40)return;
    if(!data.stones.every(r=>r&&typeof r.id==='string'&&['x','y','z','radius','vx','vy','vz','spin'].every(k=>Number.isFinite(r[k]))&&r.radius>=.04&&r.radius<=.09))return;
    const point=p=>p&&['x','y','z'].every(k=>Number.isFinite(p[k]));
    const validPerson=p=>{
      if(!p||typeof p.id!=='string'||!Array.isArray(p.bag)||p.bag.length>12||!Number.isFinite(p.soil))return false;
      const a=p.action;
      if(a&&(!Object.hasOwn(SAMPLE_DURATIONS,a.type)||!Number.isFinite(a.progress)||!point(a.origin)||!Number.isFinite(a.origin.yaw)||(a.target&&!point(a.target))))return false;
      const m=p.mission;
      if(!m||!Number.isInteger(m.index)||m.index<0||m.index>3||!['available','collect','return','complete'].includes(m.stage)||!Array.isArray(m.rocks)||m.rocks.length>2||!m.rocks.every(id=>typeof id==='string')||!Number.isInteger(m.soil)||m.soil<0||m.soil>2||!Number.isInteger(m.completed)||m.completed<0||m.completed>3)return false;
      return !p.hit||Number.isFinite(p.hit.time)&&Number.isFinite(p.hit.strength);
    };
    if(!data.people.every(validPerson))return;
    current=data;received=performance.now();ready=true;
  }
  function person(id){const authoritative=network.authority(),p=authoritative?world.people.get(id):current.people.find(p=>p.id===id);if(!p)return null;const delay=authoritative?0:Math.min(.12,(performance.now()-received)/1000),findStone=stoneId=>authoritative?world.stones.get(stoneId):current.stones.find(r=>r.id===stoneId);return {...p,specimen:p.held?findStone(p.held):null,bagItems:p.bag.map(findStone).filter(Boolean),action:p.action?{...p.action,progress:Math.min(1,p.action.progress+delay/SAMPLE_DURATIONS[p.action.type])}:null};}
  function nearest(p){let best=null,distance=.95;for(const r of current.stones){if(!r.rest||r.owner||r.reserved||Math.abs(r.y-p.y)>.25)continue;const dx=r.x-p.x,dz=r.z-p.z,d=Math.hypot(dx,dz);if(d<distance&&-Math.sin(p.yaw)*dx-Math.cos(p.yaw)*dz>.1&&Math.abs(Math.cos(p.yaw)*dx-Math.sin(p.yaw)*dz)<.5){distance=d;best=r;}}return best;}
  function update(dt,p,visible){
    if(network.authority()){
      accumulator=Math.min(.15,accumulator+dt);const entries=network.sampleEntries();while(accumulator>=1/120){world.step(1/120,entries);accumulator-=1/120;}
      publishTime+=dt;
      if(publishTime>=.1){publishTime%=.1;current=world.snapshot();received=performance.now();network.publishSamples(current);}
    }
    const elapsed=Math.min(.10,(performance.now()-received)/1000);ids.clear();
    for(const r of current.stones){
      ids.add(r.id);const near=visible&&!r.owner&&Math.hypot(r.x-p.x,r.z-p.z)<120;let m=meshes.get(r.id);
      if(!m&&!near)continue;
      if(!m){m=makeRock(r.radius,r.variant);m.position.set(r.x,r.y,r.z);meshes.set(r.id,m);scene.add(m);}
      m.visible=near;if(!m.visible)continue;
      projected.set(r.x+r.vx*elapsed,r.y+r.vy*elapsed-(r.rest?0:.81*elapsed*elapsed),r.z+r.vz*elapsed);
      if(m.position.distanceTo(projected)>2)m.position.copy(projected);else m.position.lerp(projected,1-Math.exp(-dt*24));
      m.rotation.set(r.spin*.7,r.spin*.36,r.spin*.22);
    }
    for(const [id,m] of meshes)if(!ids.has(id)){m.removeFromParent();meshes.delete(id);}
    for(const e of current.events){if(e.serial<=lastEvent)continue;lastEvent=e.serial;if(current.time-e.time>1)continue;if(e.type==='bounce'||e.type==='scoop')onDust(e,e.strength||.45);if(e.type==='hit'&&e.id===network.identity())onNotice('A loose stone struck your suit.');}
    const target=nearest(p),me=person(network.identity());marker.visible=visible&&!!target&&!me?.held&&!me?.action&&!p.riding;
    if(marker.visible)marker.position.set(target.x,target.y-target.radius+.012,target.z);
  }
  return {update,accept,person,nearest,time:()=>network.authority()?world.time:current.time+Math.min(.12,(performance.now()-received)/1000),
    request:(id,p,req)=>world.request(id,p,req),
    reset(){world.reset();current=world.snapshot();lastEvent=0;accumulator=publishTime=0;ready=false;},
    snapshot:()=>({ready,...current}),
    busy:()=>!!person(network.identity())?.action,
    held:()=>person(network.identity())?.held,
  };
}
