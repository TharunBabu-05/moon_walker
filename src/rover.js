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
  strut(chassis,[-.39,.7,-.65],[-.39,1.28,-.48],.024);
  const column=new THREE.Group();column.position.set(-.39,1.28,-.48);column.rotation.x=-.55;chassis.add(column);
  const steeringWheel=new THREE.Group();column.add(steeringWheel);
  mesh(steeringWheel,new THREE.TorusGeometry(.18,.019,10,40),black);
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3;strut(steeringWheel,[0,0,0],[Math.cos(a)*.16,Math.sin(a)*.16,0],.011);}
  mesh(steeringWheel,new THREE.CylinderGeometry(.045,.045,.025,16),alloy).rotation.x=Math.PI/2;
  const grips=[-1,1].map(side=>{const grip=new THREE.Object3D();grip.position.set(side*.18,0,0);steeringWheel.add(grip);return grip;});
  const driverAnchor=new THREE.Object3D();driverAnchor.position.set(-.39,-.02,0);chassis.add(driverAnchor);
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
  // Parallel wishbones keep a fixed arm length. Their outboard joint follows
  // an arc, rather than leaving the wheel floating on an independent Y slider.
  const armLength=.45,armY=.57,minHubY=.21,maxHubY=.65;
  const springPoints=[];
  for(let i=0;i<=112;i++){const t=i/112,a=t*Math.PI*14;springPoints.push(new THREE.Vector3(Math.cos(a)*.065,t,Math.sin(a)*.065));}
  const coilGeometry=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(springPoints),112,.012,6,false);
  const up=new THREE.Vector3(0,1,0),delta=new THREE.Vector3(),top=new THREE.Vector3(),bottom=new THREE.Vector3(),probe=new THREE.Vector3(),inverseChassis=new THREE.Matrix4();
  function link(node,a,b){delta.subVectors(b,a);node.position.copy(a).addScaledVector(delta,.5);node.quaternion.setFromUnitVectors(up,delta.clone().normalize());node.scale.y=delta.length();}
  for(const side of [-1,1])for(const z of [-1.02,1.03]){
    const carrier=new THREE.Group();chassis.add(carrier);
    const pivot=new THREE.Group();carrier.add(pivot);
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
    const arms=[];
    for(const height of [armY,armY+.20]){
      const arm=new THREE.Group();arm.position.set(side*.56,height,z);chassis.add(arm);
      for(const offset of [-.18,.18]){
        strut(arm,[0,0,offset],[side*armLength,0,0],.028);
        const mount=mesh(chassis,new THREE.CylinderGeometry(.045,.045,.08,12),black,side*.56,height,z+offset);mount.rotation.x=Math.PI/2;
      }
      strut(arm,[0,0,-.18],[0,0,.18],.023);arms.push(arm);
    }
    strut(carrier,[0,0,0],[0,.20,0],.04,alloy);
    for(const y of [0,.20])mesh(carrier,new THREE.SphereGeometry(.05,10,8),foil,0,y,0);
    // Shock body and chrome piston telescope inside a seven-turn coil spring.
    for(const offset of [-.09,.09])strut(chassis,[side*.62,.60,z+offset],[side*.62,.92,z],.026);
    const shock=new THREE.Group();chassis.add(shock);
    const housing=mesh(shock,new THREE.CylinderGeometry(.035,.035,1,10),black);
    const piston=mesh(shock,new THREE.CylinderGeometry(.018,.018,1,10),alloy);
    const coil=mesh(shock,coilGeometry.clone(),alloy);
    const eyes=[0,1].map(()=>mesh(shock,new THREE.SphereGeometry(.045,10,8),foil));
    const fender=mesh(pivot,new THREE.CylinderGeometry(.48,.48,.32,24,1,true,0,Math.PI*.78),foil,0,.02,0);fender.rotation.z=Math.PI/2;fender.rotation.x=.34;
    wheels.push({pivot,carrier,spin,side,z,arms,housing,piston,coil,eyes,hubY:.39,velocity:0});
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
  batch(chassis);for(const wheel of wheels){batch(wheel.spin);batch(wheel.carrier);wheel.arms.forEach(batch);}coilGeometry.dispose();
  function update(p,dt){
    root.position.set(p.x,p.y,p.z);root.rotation.set(0,p.yaw,0);
    chassis.rotation.x=damp(chassis.rotation.x,p.pitch||0,8,dt);chassis.rotation.z=damp(chassis.rotation.z,p.roll||0,8,dt);
    steeringWheel.rotation.z=-(p.steering||0)*1.5;
    root.updateMatrixWorld(true);inverseChassis.copy(chassis.matrixWorld).invert();
    for(const wheel of wheels){
      probe.set(wheel.side*(.56+Math.sqrt(armLength**2-(wheel.hubY-armY)**2)),wheel.hubY,wheel.z).applyMatrix4(chassis.matrixWorld);
      probe.y=groundAt(probe.x,probe.z)+.39;probe.applyMatrix4(inverseChassis);
      const target=p.grounded===false?minHubY:THREE.MathUtils.clamp(probe.y,minHubY,maxHubY);
      // Bounded spring/damper integration; tyre contact prevents penetration,
      // while rebound and airborne droop remain damped instead of snapping.
      let remaining=Math.min(Math.max(dt,0),.08);
      while(remaining>0){const h=Math.min(remaining,1/120);wheel.velocity+=((target-wheel.hubY)*160-wheel.velocity*24)*h;wheel.hubY+=wheel.velocity*h;remaining-=h;}
      if(p.grounded!==false&&wheel.hubY<target){wheel.hubY=target;wheel.velocity=Math.max(0,wheel.velocity);}
      if(wheel.hubY<minHubY||wheel.hubY>maxHubY){wheel.hubY=THREE.MathUtils.clamp(wheel.hubY,minHubY,maxHubY);wheel.velocity=0;}
      const angle=Math.asin((wheel.hubY-armY)/armLength),out=armLength*Math.cos(angle);
      for(const arm of wheel.arms)arm.rotation.z=wheel.side*angle;
      wheel.carrier.position.set(wheel.side*(.56+out),wheel.hubY,wheel.z);
      top.set(wheel.side*.62,.92,wheel.z);bottom.set(wheel.side*(.56+out*.78),armY+(wheel.hubY-armY)*.78,wheel.z);
      const length=top.distanceTo(bottom);delta.subVectors(bottom,top).normalize();
      probe.copy(top).addScaledVector(delta,.22);link(wheel.housing,top,probe);
      probe.copy(top).lerp(bottom,.16/length);link(wheel.piston,probe,bottom);
      wheel.coil.position.copy(top);wheel.coil.quaternion.setFromUnitVectors(up,delta.subVectors(bottom,top).normalize());wheel.coil.scale.y=length;
      wheel.eyes[0].position.copy(top);wheel.eyes[1].position.copy(bottom);
      wheel.pivot.rotation.y=wheel.z<0?(p.steering||0):-(p.steering||0)*.2;
      wheel.spin.rotation.x=-(p.wheelTravel||0)/.39;
    }
  }
  update(state,.016);
  function driverPose(){root.updateMatrixWorld(true);return {matrix:driverAnchor.matrixWorld.clone(),grips:grips.map(g=>g.getWorldPosition(new THREE.Vector3()))};}
  function suspensionSnapshot(){root.updateMatrixWorld(true);return wheels.map(w=>({hubY:w.hubY,velocity:w.velocity,hub:w.carrier.getWorldPosition(new THREE.Vector3()).toArray(),armLengths:w.arms.map(a=>a.localToWorld(new THREE.Vector3(w.side*armLength,0,0)).distanceTo(a.getWorldPosition(new THREE.Vector3()))),jointErrors:w.arms.map((a,i)=>a.localToWorld(new THREE.Vector3(w.side*armLength,0,0)).distanceTo(w.carrier.localToWorld(new THREE.Vector3(0,i*.20,0)))),springLength:w.coil.scale.y}));}
  return {root,update,driverPose,suspensionSnapshot};
}
