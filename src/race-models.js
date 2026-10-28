import * as THREE from 'three';
import {mergeGeometries} from '../vendor/utils/BufferGeometryUtils.js';
import {ARENA,CARS,GATES,HAZARDS,trackPoint,roadHeight} from './race-physics.js';
const mat=(color,metalness=.4,roughness=.45)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
function batch(root){const sets=new Map();for(const child of [...root.children]){if(!child.isMesh||child.isInstancedMesh||child.children.length)continue;child.updateMatrix();const geo=child.geometry.clone().applyMatrix4(child.matrix);if(!sets.has(child.material))sets.set(child.material,[]);sets.get(child.material).push(geo);child.removeFromParent();child.geometry.dispose();}for(const [material,geos] of sets){const mesh=new THREE.Mesh(mergeGeometries(geos,false),material);geos.forEach(g=>g.dispose());mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);}}
function box(root,w,h,d,m,x=0,y=0,z=0){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;}
function rod(root,a,b,r,m){const delta=new THREE.Vector3().subVectors(b,a),mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,delta.length(),8),m);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());root.add(mesh);return mesh;}
export function createRaceCar(index){
  const spec=CARS[index],root=new THREE.Group(),body=new THREE.Group();root.add(body);
  const paint=mat(spec.color,.65,.3),dark=mat(0x101923),metal=mat(0x95a5b2,.8,.28),glass=mat(0x183b52,.8,.12),glow=new THREE.MeshBasicMaterial({color:spec.color}),white=new THREE.MeshBasicMaterial({color:0xc9faff});
  const width=index===1?2.9:index===2?1.7:2.3,length=index===2?5.6:4.7;
  box(body,width,.48,length,paint,0,1.0);box(body,width*.9,.20,length*.93,dark,0,.7);
  const nose=box(body,width*.8,.25,1.5,paint,0,1.3,-1.9);nose.rotation.x=.16;
  box(body,1.35,.48,1.5,glass,0,1.65,.15).rotation.x=.12;
  box(body,.16,.54,1.65,metal,0,1.68,.15);box(body,1.6,.12,.16,metal,0,1.95,.75);
  box(body,width+.5,.15,.6,paint,0,1.7,2.15);
  for(const side of [-1,1]){
    box(body,.14,.6,.13,metal,side*.85,1.38,2.15);
    box(body,.08,.08,2.1,glow,side*(width/2+.02),1.2,-.4);
    box(body,.5,.12,.12,white,side*.7,1.2,-2.65);box(body,.4,.1,.1,glow,side*.7,1,2.4);
    const gun=box(body,.22,.22,1.4,dark,side*.72,1.8,-1.15);box(gun,.12,.12,.08,glow,0,0,-.72);
    // Different silhouettes: six-wheel hauler, split pods, and rocket nacelles.
    if(index===2){const pod=box(body,.65,.65,4.4,paint,side*1.55,.95,0);pod.rotation.z=side*.14;box(body,.15,.16,3.5,glow,side*1.85,1.3,0);}
    if(index===3){const engine=new THREE.Mesh(new THREE.CylinderGeometry(.28,.38,1.8,12),metal);engine.rotation.x=Math.PI/2;engine.position.set(side*1.1,1.5,1);body.add(engine);box(body,.4,.4,.1,glow,side*1.1,1.5,1.95);}
    if(index===0)box(body,.65,.15,2.8,paint,side*1.35,1.2,-.6).rotation.z=side*.25;
  }
  const wheels=[],zs=index===1?[-1.7,0,1.7]:[-1.65,1.65],springPoints=[];
  for(let j=0;j<=56;j++){const t=j/56;springPoints.push(new THREE.Vector3(Math.cos(t*Math.PI*12)*.1,t,Math.sin(t*Math.PI*12)*.1));}
  const springGeo=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(springPoints),56,.018,5,false),vA=new THREE.Vector3(),vB=new THREE.Vector3(),vD=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
  function connect(mesh,a,b){vD.subVectors(b,a);mesh.position.copy(a).addScaledVector(vD,.5);mesh.scale.y=vD.length();mesh.quaternion.setFromUnitVectors(up,vD.normalize());}
  for(const side of [-1,1])for(const z of zs){
    const pivot=new THREE.Group();pivot.position.set(side*(width/2+.35),.62,z);body.add(pivot);
    const spin=new THREE.Group();pivot.add(spin);
    const tyre=new THREE.Mesh(new THREE.CylinderGeometry(.62,.62,.38,16),dark);tyre.rotation.z=Math.PI/2;spin.add(tyre);
    const rim=new THREE.Mesh(new THREE.CylinderGeometry(.39,.39,.40,12),metal);rim.rotation.z=Math.PI/2;spin.add(rim);
    for(let j=0;j<10;j++){const a=j*Math.PI/5;const tread=box(spin,.43,.07,.18,metal,0,Math.cos(a)*.62,Math.sin(a)*.62);tread.rotation.x=a;}
    const linkage=new THREE.Group();body.add(linkage);
    const arm=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,1,8),metal),damper=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,1,8),metal),spring=new THREE.Mesh(springGeo.clone(),metal);linkage.add(arm,damper,spring);
    wheels.push({pivot,spin,z,side,arm,damper,spring});
  }
  const shield=new THREE.Mesh(new THREE.SphereGeometry(3.4,16,10),new THREE.MeshBasicMaterial({color:0x8deaff,transparent:true,opacity:.10,wireframe:true}));shield.position.y=1;root.add(shield);
  batch(body);for(const w of wheels)batch(w.spin);springGeo.dispose();
  return {root,update(p){
    root.position.set(p.x,p.y,p.z);root.rotation.y=p.yaw;body.visible=!p.dead;shield.visible=p.shield>0&&!p.dead;
    for(const w of wheels){
      const localX=w.side*(width/2+.35),wx=p.x+Math.cos(p.yaw)*localX+Math.sin(p.yaw)*w.z,wz=p.z-Math.sin(p.yaw)*localX+Math.cos(p.yaw)*w.z;
      w.pivot.position.y=p.grounded===false?.30:THREE.MathUtils.clamp(.62+roadHeight(wx,wz)-p.y,.30,.94);
      w.spin.rotation.x=-p.travel/.62;w.pivot.rotation.y=w.z<0?(p.steer||0)*.22:0;
      vA.set(w.side*.65,.8,w.z);vB.copy(w.pivot.position);connect(w.arm,vA,vB);
      vA.set(w.side*(width/2),1.12,w.z);connect(w.damper,vA,vB);w.spring.position.copy(vA);vD.subVectors(vB,vA);w.spring.scale.y=vD.length();w.spring.quaternion.setFromUnitVectors(up,vD.normalize());
    }
  }};
}
function textSign(text,width=30,height=6){const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=160;const c=canvas.getContext('2d');c.fillStyle='#091721';c.fillRect(0,0,1024,160);c.strokeStyle='#64e7df';c.lineWidth=7;c.strokeRect(5,5,1014,150);c.fillStyle='#dbf9f1';c.font='bold 48px monospace';c.textAlign='center';c.fillText(text,512,98);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));}
export function createArenaGateway(scene,ground){const root=new THREE.Group();root.position.set(ARENA.gate.x,ground(ARENA.gate.x,ARENA.gate.z),ARENA.gate.z);scene.add(root);const metal=mat(0x485e6b),glow=new THREE.MeshBasicMaterial({color:0x55dfd5});for(const side of [-1,1]){box(root,1,12,1,metal,side*9,6);box(root,.2,10,1.1,glow,side*9,6);}box(root,20,1,1,metal,0,12);const sign=textSign('APOGEE / RACE TERMINAL',20,3);sign.position.y=10;root.add(sign);return root;}
export function createRaceScene(){
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x02050c);
  scene.add(new THREE.HemisphereLight(0xaecfe1,0x383445,1.5));const sun=new THREE.DirectionalLight(0xfff1dd,3);sun.position.set(-4000,6000,-2000);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-35,right:35,top:35,bottom:-35,near:1,far:250});sun.shadow.bias=-.0002;sun.shadow.normalBias=.025;scene.add(sun,sun.target);
  const stars=new Float32Array(1800);for(let i=0;i<600;i++){const a=i*2.39996,y=.08+(i%97)/97*.9,r=18000*Math.sqrt(1-y*y);stars[i*3]=ARENA.x+Math.cos(a)*r;stars[i*3+1]=18000*y;stars[i*3+2]=ARENA.z+Math.sin(a)*r;}const starGeo=new THREE.BufferGeometry();starGeo.setAttribute('position',new THREE.BufferAttribute(stars,3));scene.add(new THREE.Points(starGeo,new THREE.PointsMaterial({color:0xa9cbdc,size:9,sizeAttenuation:true})));
  const dust=new THREE.TextureLoader().load('assets/regolith/color.webp');dust.wrapS=dust.wrapT=THREE.RepeatWrapping;dust.colorSpace=THREE.SRGBColorSpace;dust.anisotropy=4;
  const dustLarge=dust.clone();dustLarge.repeat.set(650,650);dustLarge.needsUpdate=true;
  const lunar=mat(0x89888b,.05,1);lunar.map=dust;const field=mat(0x89888b,.05,1);field.map=dustLarge;
  const ground=new THREE.Mesh(new THREE.CircleGeometry(3200,160),field);ground.rotation.x=-Math.PI/2;ground.position.set(ARENA.x,-2.02,ARENA.z);scene.add(ground);
  const road=mat(0x27323b,.3,.86),edge=new THREE.MeshBasicMaterial({color:0x48b8b9});
  road.side=THREE.DoubleSide;edge.side=THREE.DoubleSide;
  road.map=dust;lunar.side=THREE.DoubleSide;
  // A continuous ribbon, sampled across the surface of potholes and launch ramps.
  function ribbon(offset,width,material){const pos=[],uv=[],indices=[],steps=4096,cross=width>100?40:12;for(let i=0;i<=steps;i++){const t=i/steps,p=trackPoint(t),a=Math.PI+t*Math.PI*2;for(let j=0;j<=cross;j++){const o=offset-width/2+j/cross*width,x=p.x+Math.cos(a)*o,z=p.z+Math.sin(a)*o;pos.push(x,roadHeight(x,z)+(material===lunar?0:.025),z);uv.push(x/12,z/12);if(i<steps&&j<cross){const k=i*(cross+1)+j;indices.push(k,k+cross+1,k+1,k+1,k+cross+1,k+cross+2);}}}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();scene.add(new THREE.Mesh(geo,material));}
  ribbon(0,400,lunar);ribbon(0,90,road);ribbon(-46,1.4,edge);ribbon(46,1.4,edge);
  const matrix=new THREE.Object3D(),standMat=mat(0x495362,.65,.6),stands=new THREE.InstancedMesh(new THREE.BoxGeometry(115,35,90),standMat,160),rail=new THREE.InstancedMesh(new THREE.BoxGeometry(118,4,2),edge,160);
  for(let i=0;i<160;i++){const a=i/160*Math.PI*2;matrix.position.set(ARENA.x+Math.cos(a)*2980,12,ARENA.z+Math.sin(a)*2980);matrix.rotation.set(0,-a,0);matrix.updateMatrix();stands.setMatrixAt(i,matrix.matrix);matrix.position.y=31;matrix.updateMatrix();rail.setMatrixAt(i,matrix.matrix);}scene.add(stands,rail);
  const tiers=new THREE.InstancedMesh(new THREE.BoxGeometry(95,5,18),standMat,640),seats=new THREE.InstancedMesh(new THREE.BoxGeometry(90,.7,8),edge,640);
  for(let i=0;i<160;i++){const t=i/160,p=trackPoint(t),q=trackPoint(t+.001),a=Math.PI+t*Math.PI*2;for(let row=0;row<4;row++){matrix.position.set(p.x+Math.cos(a)*(125+row*18),row*5+2,p.z+Math.sin(a)*(125+row*18));matrix.rotation.set(0,Math.atan2(q.x-p.x,q.z-p.z)+Math.PI/2,0);matrix.updateMatrix();tiers.setMatrixAt(i*4+row,matrix.matrix);matrix.position.y+=2.8;matrix.updateMatrix();seats.setMatrixAt(i*4+row,matrix.matrix);}}scene.add(tiers,seats);
  const core=new THREE.Group();core.position.set(ARENA.x,0,ARENA.z);scene.add(core);box(core,70,130,70,standMat,0,65);for(const side of [-1,1])box(core,4,135,73,edge,side*33,68);const board=textSign('APOGEE / CRATER CIRCUIT',160,25);board.position.set(0,150,38);core.add(board);
  const post=mat(0x748598),yellow=new THREE.MeshBasicMaterial({color:0xffc768});
  for(let i=0;i<GATES.length;i++){const p=GATES[i],q=trackPoint(i/24+.001),root=new THREE.Group();root.position.set(p.x,roadHeight(p.x,p.z),p.z);root.rotation.y=Math.atan2(q.x-p.x,q.z-p.z);scene.add(root);for(const side of [-1,1]){box(root,1.3,17,1.3,post,side*43,8.5);box(root,.35,15,1.5,i===0?yellow:edge,side*43,9);}box(root,88,1.5,1.5,post,0,17);const label=textSign(i===0?'APOGEE / START + FINISH':`${String(i).padStart(2,'0')} / CHECKPOINT`,36,4);label.position.y=15;root.add(label);}
  for(const h of HAZARDS){
    if(h.type==='barrier'){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(h.radius*.75,h.radius,5,8),mat(0x6c506a));mesh.position.set(h.x,2.5,h.z);scene.add(mesh);const top=new THREE.Mesh(new THREE.TorusGeometry(h.radius*.8,.22,6,16),yellow);top.rotation.x=Math.PI/2;top.position.set(h.x,5,h.z);scene.add(top);}
    if(h.type==='pool'||h.type==='boost'){const m=new THREE.Mesh(new THREE.CircleGeometry(h.radius*(h.type==='pool'?.72:1),24),new THREE.MeshBasicMaterial({color:h.type==='pool'?0x1d87b4:0x67e9ad,transparent:true,opacity:.74}));m.rotation.x=-Math.PI/2;m.position.set(h.x,h.type==='pool'?-.16:.06,h.z);scene.add(m);const label=textSign(h.type==='pool'?'COOLANT / SLOW':'BOOST >>>',15,2.5);label.position.set(h.x,5,h.z);scene.add(label);}
  }
  // Pit lane: four distinct display vehicles and illuminated garage bays.
  const start=trackPoint(0);for(let i=0;i<4;i++){const x=start.x-100,z=start.z+i*18;box(scene,14,.3,15,post,x,.1,z);box(scene,14,.4,15,standMat,x,6,z);for(const side of [-1,1])box(scene,.5,6,.5,post,x+side*6.5,3,z+6);const car=createRaceCar(i);car.update({x,y:0,z,yaw:Math.PI/2,hp:100,travel:0,speed:0});scene.add(car.root);const sign=textSign(CARS[i].name.toUpperCase(),13,2);sign.position.set(x,4.5,z+6);scene.add(sign);}
  scene.traverse(o=>{if(o.isMesh)o.receiveShadow=true;});
  const camera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.15,25000);return {scene,camera,sun};
}
