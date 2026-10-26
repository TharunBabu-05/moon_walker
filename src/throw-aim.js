import * as THREE from 'three';
import {predictThrow,THROW_CHARGE_SECONDS} from './ballistics.js';
import {samplePoint} from './sample-world.js';
import {clamp} from './physics.js';
export function createThrowAim(scene,groundAt,getObstacles){
  const points=new Float32Array(242*3),geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(points,3).setUsage(THREE.DynamicDrawUsage));geometry.setDrawRange(0,0);
  const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:0x9ff1dc,transparent:true,opacity:.9,depthTest:true}));line.frustumCulled=false;scene.add(line);
  const marker=new THREE.Group();scene.add(marker);const ring=new THREE.Mesh(new THREE.RingGeometry(.18,.22,40),new THREE.MeshBasicMaterial({color:0x9ff1dc,side:THREE.DoubleSide,depthTest:false,transparent:true,opacity:.9}));ring.rotation.x=-Math.PI/2;marker.add(ring);
  for(const a of [0,Math.PI/2]){const bar=new THREE.Mesh(new THREE.BoxGeometry(.62,.012,.022),ring.material);bar.rotation.y=a;marker.add(bar);}marker.renderOrder=20;
  let active=false,held=0,age=0,result=null,request=null;line.visible=marker.visible=false;
  return {get active(){return active;},start(){active=true;held=age=0;result=null;},cancel(){active=false;line.visible=marker.visible=false;},
    update(dt,p,yaw,pitch,radius=.065){if(!active)return;held+=dt;age+=dt;const charge=clamp(held/THROW_CHARGE_SECONDS,0,1),elevation=clamp(pitch,-.35,.9),direction={x:-Math.sin(yaw)*Math.cos(elevation),y:Math.sin(elevation),z:-Math.cos(yaw)*Math.cos(elevation)};
      request={direction,charge};if(age<1/12&&result)return;age=0;
      const origin=samplePoint({...p,yaw},.34,1.52,-.56),obstacles=getObstacles().filter(b=>{const q=b.state||b;return Math.hypot(q.x-p.x,q.z-p.z)<100;});
      result=predictThrow(origin,direction,charge,radius,groundAt,obstacles,points);geometry.attributes.position.needsUpdate=true;geometry.setDrawRange(0,result.count);line.visible=marker.visible=true;
      marker.position.set(result.x,result.y+.025,result.z);const color=result.hit==='GROUND'?0x9ff1dc:0xffbc79;line.material.color.setHex(color);ring.material.color.setHex(color);
    },release(){const value=request;this.cancel();return value;},snapshot:()=>({active,charge:clamp(held/THROW_CHARGE_SECONDS,0,1),...result})};
}
