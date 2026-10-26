import * as THREE from 'three';
import {mergeGeometries} from '../vendor/utils/BufferGeometryUtils.js';
import {damp} from './physics.js';

export function createRover(scene,groundAt,state){
  const root=new THREE.Group();scene.add(root);
  const chassis=new THREE.Group();root.add(chassis);
  const alloy=new THREE.MeshStandardMaterial({color:0xa4a6a5,metalness:.76,roughness:.52});
  const foil=new THREE.MeshStandardMaterial({color:0x9b7e45,metalness:.76,roughness:.56});
  const white=new THREE.MeshStandardMaterial({color:0xd4d1c5,roughness:.93});
  const black=new THREE.MeshStandardMaterial({color:0x303235,roughness:.9});
  const mesh=(parent,geo,mat,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
  const box=(p,w,h,d,mat,x,y,z)=>mesh(p,new THREE.BoxGeometry(w,h,d),mat,x,y,z);
  function strut(p,a,b,r=.022,mat=alloy){
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),m=mesh(p,new THREE.CylinderGeometry(r,r,start.distanceTo(end),8),mat);
    m.position.copy(start).add(end).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize());return m;
  }
  box(chassis,1.55,.17,2.65,foil,0,.51,0);
  box(chassis,1.68,.045,2.72,alloy,0,.61,0);
  for(let z=-1.15;z<=1.2;z+=.22)box(chassis,1.6,.014,.018,black,0,.64,z);
  for(const side of [-1,1]){
    strut(chassis,[side*.78,.6,-1.4],[side*.78,.88,-1.4]);strut(chassis,[side*.78,.88,-1.4],[side*.78,.88,-.74]);
    strut(chassis,[side*.78,.6,.72],[side*.78,1.15,.85]);strut(chassis,[side*.78,1.15,.85],[side*.78,1.15,1.4]);
  }
  for(const side of [-1,1]){
    box(chassis,.56,.10,.64,white,side*.39,.86,.03);
    const back=box(chassis,.56,.65,.075,white,side*.39,1.18,.34);back.rotation.x=-.12;
    strut(chassis,[side*.67,.68,.26],[side*.67,1.45,.37]);
    for(const x of [-.2,.2])strut(chassis,[side*.39+x,.67,-.25],[side*.39+x,.83,.27],.016);
  }
  box(chassis,.78,.12,.38,alloy,0,.94,-.74);
  const dash=box(chassis,.56,.025,.28,black,0,1.015,-.73);dash.rotation.x=.14;
  for(let i=0;i<3;i++){
    const gauge=mesh(chassis,new THREE.CylinderGeometry(.045,.045,.008,20),white,-.17+i*.17,1.035,-.72);
    gauge.rotation.x=.1;
  }
  strut(chassis,[-.39,.7,-.65],[-.39,1.18,-.52],.024);
  const control=mesh(chassis,new THREE.TorusGeometry(.13,.017,8,24),black,-.39,1.18,-.52);control.rotation.x=-.65;
  box(chassis,1.3,.23,.58,foil,0,.8,1.04);box(chassis,1.36,.04,.6,white,0,.93,1.04);
  for(const x of [-.62,.62])strut(chassis,[x,.95,.77],[x,.95,1.32],.018);
  strut(chassis,[.64,.8,1.16],[.64,2.55,1.16],.012);
  const dish=mesh(chassis,new THREE.SphereGeometry(.30,24,12,0,Math.PI*2,0,Math.PI*.43),alloy,.64,2.33,1.16);dish.rotation.z=-.5;
  const dishWire=new THREE.LineSegments(new THREE.WireframeGeometry(dish.geometry),new THREE.LineBasicMaterial({color:0x414447}));dish.add(dishWire);
  for(const x of [-.62,.62]){
    const lamp=mesh(chassis,new THREE.CylinderGeometry(.075,.08,.09,16),alloy,x,.78,-1.3);lamp.rotation.x=Math.PI/2;
    mesh(chassis,new THREE.SphereGeometry(.061,12,8),new THREE.MeshStandardMaterial({color:0xe8e2cd,roughness:.25}),x,.78,-1.355).scale.z=.3;
  }
  const wheels=[];
  for(const side of [-1,1])for(const z of [-1.02,1.03]){
    const pivot=new THREE.Group();pivot.position.set(side*1.01,.39,z);root.add(pivot);
    const spin=new THREE.Group();pivot.add(spin);
    const tire=mesh(spin,new THREE.CylinderGeometry(.39,.39,.22,32,1,true),black);tire.rotation.z=Math.PI/2;
    for(let i=0;i<28;i++){
      const a=i*Math.PI*2/28;
      const tread=box(spin,.26,.025,.055,alloy,0,Math.cos(a)*.394,Math.sin(a)*.394);tread.rotation.x=a;
    }
    for(const x of [-.115,.115]){
      const rim=mesh(spin,new THREE.TorusGeometry(.35,.012,6,32),alloy,x,0,0);rim.rotation.y=Math.PI/2;
      for(let i=0;i<12;i++){
        const a=i*Math.PI*2/12;strut(spin,[x,0,0],[x,Math.sin(a)*.35,Math.cos(a)*.35],.006);
      }
    }
    const hub=mesh(spin,new THREE.CylinderGeometry(.1,.1,.27,12),foil);hub.rotation.z=Math.PI/2;
    for(const offset of [-.16,.16])strut(chassis,[side*.56,.57,z+offset],[side*.97,.39,z],.026);
    const spring=mesh(chassis,new THREE.TorusGeometry(.07,.008,4,8),black,side*.78,.48,z);spring.rotation.x=.6;
    const fender=mesh(pivot,new THREE.CylinderGeometry(.48,.48,.32,24,1,true,0,Math.PI*.78),foil,0,.02,0);fender.rotation.z=Math.PI/2;fender.rotation.x=.34;
    wheels.push({pivot,spin,side,z});
  }
  // Small markings remain readable when the player walks around the vehicle.
  const label=document.createElement('canvas');label.width=512;label.height=128;const ctx=label.getContext('2d');ctx.fillStyle='#cbc9bd';ctx.fillRect(0,0,512,128);ctx.fillStyle='#242b2d';ctx.font='bold 42px monospace';ctx.fillText('SELENE / LRV',32,60);ctx.font='22px monospace';ctx.fillText('LUNAR ROVING VEHICLE  01',32,98);
  const plate=mesh(chassis,new THREE.PlaneGeometry(.95,.24),new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(label),roughness:.9}),0,.78,1.345);
  // Batch rigid parts while retaining independently steering and spinning wheels.
  // This keeps eight explorers with vehicles practical on ordinary laptops.
  function batch(parent){
    const sets=new Map();
    for(const child of [...parent.children]){
      if(!child.isMesh)continue;child.updateMatrix();
      const geometry=child.geometry.clone().applyMatrix4(child.matrix);
      if(!sets.has(child.material))sets.set(child.material,[]);sets.get(child.material).push(geometry);
      child.removeFromParent();child.geometry.dispose();
    }
    for(const [material,geometries] of sets){
      const combined=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());
      const m=new THREE.Mesh(combined,material);m.castShadow=true;m.receiveShadow=true;parent.add(m);
    }
  }
  batch(chassis);for(const wheel of wheels)batch(wheel.spin);
  function update(p,dt){
    root.position.set(p.x,p.y,p.z);root.rotation.set(0,p.yaw,0);
    chassis.rotation.x=damp(chassis.rotation.x,p.pitch||0,8,dt);chassis.rotation.z=damp(chassis.rotation.z,p.roll||0,8,dt);
    for(const wheel of wheels){
      const dx=Math.cos(p.yaw)*wheel.side*1.01+Math.sin(p.yaw)*wheel.z,dz=-Math.sin(p.yaw)*wheel.side*1.01+Math.cos(p.yaw)*wheel.z;
      const target=THREE.MathUtils.clamp(groundAt(p.x+dx,p.z+dz)-p.y+.39,.08,.68);
      wheel.pivot.position.y=damp(wheel.pivot.position.y,target,14,dt);
      wheel.pivot.rotation.y=wheel.z<0?(p.steering||0):-(p.steering||0)*.2;
      wheel.spin.rotation.x=-(p.wheelTravel||0)/.39;
    }
  }
  update(state,.016);
  return {root,update};
}
