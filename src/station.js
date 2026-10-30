import * as THREE from 'three';
import {mergeGeometries} from '../vendor/utils/BufferGeometryUtils.js';
import {SAMPLE_DEPOT} from './missions.js';

// A fictional, metre-scale surface habitat informed by NASA habitat concepts.
export function createStation(scene,baseGround,onDoor=()=>{}){
  const root=new THREE.Group();root.position.set(-25,baseGround(-25,28),28);scene.add(root);
  const floor=root.position.y+.65,colliders=[],doors=[];
  const mat=(color,roughness=.7,metalness=.3)=>new THREE.MeshStandardMaterial({color,roughness,metalness,side:THREE.DoubleSide});
  const white=mat(0xbdbdb7,.87,.12),metal=mat(0x737c80,.43,.8),dark=mat(0x222c33),gold=mat(0x967b47,.64,.7),blue=mat(0x112b4b,.3,.55);
  const glass=new THREE.MeshStandardMaterial({color:0x75b9c9,roughness:.12,metalness:.2,transparent:true,opacity:.23,side:THREE.DoubleSide});
  const glow=new THREE.MeshStandardMaterial({color:0xd7f6ec,emissive:0xb6e8dd,emissiveIntensity:2});
  function mesh(geo,material,x=0,y=0,z=0){const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;root.add(m);return m;}
  const box=(w,h,d,m,x,y,z)=>mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z);
  function strut(a,b,r=.035,m=metal){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),v=q.clone().sub(p),o=mesh(new THREE.CylinderGeometry(r,r,v.length(),10),m);o.position.copy(p).add(q).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o;}
  function solid(x,z,hx,hz,height=4,y=0){const b={shape:'box',hx,hz,height,invMass:0,owner:'station',state:{x:root.position.x+x,z:root.position.z+z,y:root.position.y+y,yaw:0,vx:0,vz:0}};colliders.push(b);return b;}
  function label(text,w,h,x,y,z,rotation=0){const c=document.createElement('canvas');c.width=1024;c.height=256;const g=c.getContext('2d');g.fillStyle='#17242b';g.fillRect(0,0,1024,256);g.fillStyle='#cbe6df';g.font='bold 52px monospace';g.textAlign='center';text.split('|').forEach((t,i)=>g.fillText(t,512,90+i*75));const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const p=mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:t,roughness:.7,emissive:0x547c80,emissiveMap:t,emissiveIntensity:.25}),x,y,z);p.rotation.y=rotation;return p;}
  // Panelled pressure vessel; separate windows reveal the furnished interior.
  for(let j=0;j<7;j++)for(let i=0;i<24;i++){
    const a=i*Math.PI*2/24,window=(i===5||i===6||i===17||i===18)&&[1,3,5].includes(j);
    const panel=mesh(new THREE.CylinderGeometry(3.2,3.2,1.96,8,1,true,a+.009,Math.PI/12-.018),window?glass:white,0,2.85,-6+j*2);panel.rotation.x=Math.PI/2;
  }
  for(let z=-7;z<=7;z+=2){const ring=mesh(new THREE.TorusGeometry(3.22,.055,8,96),metal,0,2.85,z);for(let i=0;i<24;i++){const a=i*Math.PI/12;mesh(new THREE.SphereGeometry(.045,6,4),metal,Math.sin(a)*3.23,2.85+Math.cos(a)*3.23,z+.06);}}
  // Raised deck and pressure bulkheads with a genuine doorway opening.
  box(4.9,.18,14,metal,0,.56,0);
  for(let x=-2.4;x<=2.4;x+=.4)box(.018,.012,13.8,dark,x,.657,0);
  const outline=new THREE.Shape();outline.absarc(0,2.85,3.2,0,Math.PI*2,false);
  const hole=new THREE.Path();hole.moveTo(-.95,.65);hole.lineTo(-.95,3.25);hole.lineTo(.95,3.25);hole.lineTo(.95,.65);hole.closePath();outline.holes.push(hole);
  mesh(new THREE.ShapeGeometry(outline,64),white,0,0,7);mesh(new THREE.CircleGeometry(3.2,64),white,0,2.85,-7);
  solid(-2.65,0,.3,7,6);solid(2.65,0,.3,7,6);solid(0,-7,2.65,.15,6);
  for(const side of [-1,1]){solid(side*1.85,7,.9,.18,6);box(.15,2.7,.25,metal,side*1.03,1.98,7.1);}
  // Short airlock with two sliding pressure doors and a shallow access ramp.
  box(2.5,.15,4,metal,0,.575,9);box(2.5,.14,4,white,0,3.5,9);
  for(const side of [-1,1]){box(.15,2.9,4,white,side*1.2,2,9);solid(side*1.2,9,.12,2,3.5);}
  for(const z of [7.12,10.98]){
    const door=box(1.88,2.55,.13,metal,0,1.94,z);door.userData.dynamic=true;
    const body=solid(0,z,.94,.1,2.6,.65);doors.push({mesh:door,body,open:0,z});
    for(const side of [-1,1])box(.09,2.75,.12,gold,side*1.04,2,z+.12);
    box(1.95,.07,.08,glow,0,3.34,z+.14);
  }
  const ramp=box(2.15,.09,4.05,metal,0,.325,13);ramp.rotation.x=Math.atan(.65/4);
  for(let i=0;i<19;i++)box(2.1,.025,.045,dark,0,.65*(1-i/19)+.03,11+i*4/19);
  for(const side of [-1,1]){
    for(const z of [11,13,15])strut([side*1.12,.65*(15-z)/4,z],[side*1.12,.65*(15-z)/4+1,z]);
    strut([side*1.12,1.65,11],[side*1.12,1,15],.045);
    for(const z of [-5,0,5]){strut([side*2,1,z],[side*3.7,.15,z],.12);box(.8,.1,.8,metal,side*3.7,.08,z);}
  }
  label('SELENE RESEARCH OUTPOST|01 / CONCEPT HABITAT',3.5,.88,0,4.25,7.05);
  label('AIRLOCK / WALK TO ENTER',1.9,.48,0,3.91,11.08);
  const approachLight=new THREE.PointLight(0xd9e8dd,20,9,2);approachLight.position.set(0,3.6,13.5);root.add(approachLight);
  // Interior equipment: removable racks, lockers, work surfaces and sample vaults.
  for(const side of [-1,1])for(let j=0;j<5;j++){
    const z=-5.5+j*2.2;box(.7,1.9,1.65,dark,side*2,.65+.95,z);solid(side*2,z,.4,.85,2.3,.65);
    box(.04,1.75,1.5,white,side*1.62,1.62,z);
    for(let k=0;k<5;k++){box(.035,.025,1.35,metal,side*1.59,.9+k*.29,z);box(.06,.04,.22,dark,side*1.56,1.03+k*.29,z+.42);}
  }
  box(2.9,.12,1.0,white,0,1.5,-5.7);solid(0,-5.7,1.5,.5,1.6,.65);
  for(const x of [-1,0,1]){box(.75,.5,.12,dark,x,1.96,-5.98);label('LIFE SUPPORT|NOMINAL',.68,.36,x,1.96,-5.91);}
  for(let i=0;i<9;i++){mesh(new THREE.CylinderGeometry(.055,.055,.24,12),glass,-1.05+i*.25,1.68,-5.4);mesh(new THREE.IcosahedronGeometry(.04,1),dark,-1.05+i*.25,1.6,-5.4);}
  for(const side of [-1,1])for(const z of [-3,1,5]){box(.07,.06,1.5,glow,side*1.8,4.8,z);}
  for(const z of [-3,3]){const light=new THREE.PointLight(0xcde6df,24,9,2);light.position.set(0,3.5,z);root.add(light);}
  label('SELENE / LAB 01|SAMPLE ANALYSIS',2.3,.6,0,3.5,-6.88);
  // Deployable photovoltaic wings, visible cell traces, radiator and dish.
  for(const side of [-1,1]){
    strut([side*3,2,0],[side*11,2,0],.09);strut([side*11,0,0],[side*11,3,0],.12);solid(side*11,0,.3,.3,3);
    for(let row=0;row<4;row++)for(let col=0;col<3;col++){
      const x=side*(6.6+col*2.5),z=-5.5+row*3.5;
      box(2.42,.1,3.4,metal,x,3,z);box(2.3,.04,3.28,blue,x,3.07,z);
      for(let k=0;k<10;k++)box(2.28,.006,.012,metal,x,3.095,z-1.5+k*.33);
      for(let k=0;k<6;k++)box(.008,.006,3.25,metal,x-1.05+k*.42,3.095,z);
    }
  }
  box(3,.15,4,white,0,6.3,-2);for(let x=-1.4;x<1.5;x+=.18)box(.035,.07,3.9,metal,x,6.42,-2);
  strut([0,5.7,4],[0,7.3,4],.12);
  const dish=mesh(new THREE.SphereGeometry(1.25,40,20,0,Math.PI*2,0,.95),white,0,7.3,4);dish.rotation.z=.7;
  strut([0,7.3,4],[-1,9,4],.025);mesh(new THREE.CylinderGeometry(.12,.12,.18,16),gold,-1,9,4);
  // A receiving counter beside the ramp makes sample delivery a visible place.
  const bx=SAMPLE_DEPOT.bench.x-root.position.x,bz=SAMPLE_DEPOT.bench.z-root.position.z,by=baseGround(SAMPLE_DEPOT.bench.x,SAMPLE_DEPOT.bench.z)-root.position.y;
  box(1.5,.10,.72,white,bx,by+.95,bz);
  for(const dx of [-.62,.62])for(const dz of [-.25,.25]){
    const foot=baseGround(SAMPLE_DEPOT.bench.x+dx,SAMPLE_DEPOT.bench.z+dz)-root.position.y;
    box(.07,by+.9-foot,.07,metal,bx+dx,(by+.9+foot)/2,bz+dz);box(.2,.04,.2,dark,bx+dx,foot+.02,bz+dz);
  }
  box(1.12,.035,.48,dark,bx,by+1.02,bz);
  for(const dx of [-.58,.58])box(.025,.07,.5,gold,bx+dx,by+1.05,bz);
  for(const dz of [-.25,.25])box(1.18,.07,.025,gold,bx,by+1.05,bz+dz);
  for(let i=0;i<4;i++){
    mesh(new THREE.CylinderGeometry(.052,.052,.15,12),metal,bx-.35+i*.23,by+1.11,bz-.10);
    box(.09,.02,.09,white,bx-.35+i*.23,by+1.2,bz-.10);
  }
  label('SAMPLE RECEIVING|HAND OVER BAGGED SAMPLES',2.3,.58,bx,by+2.05,bz-.36);
  for(const dx of [-.8,.8])strut([bx+dx,by+.12,bz-.36],[bx+dx,by+2.36,bz-.36],.025);
  solid(bx,bz,.76,.37,1.06,by);
  const receivedPouches=[];let received=0;
  for(let i=0;i<8;i++){const pouch=box(.16,.19,.10,gold,bx-.40+(i%4)*.26,by+1.13,bz+.08+Math.floor(i/4)*.14);pouch.userData.dynamic=true;pouch.visible=false;receivedPouches.push(pouch);}
  // Batch static opaque parts by material; sliding doors and glazing stay separate.
  root.updateMatrixWorld(true);const batches=new Map();
  for(const m of [...root.children])if(m.isMesh&&!m.userData.dynamic&&!m.material.transparent){m.updateMatrix();const g=m.geometry.clone().applyMatrix4(m.matrix);if(!batches.has(m.material))batches.set(m.material,[]);batches.get(m.material).push(g);root.remove(m);m.geometry.dispose();}
  for(const [material,parts] of batches){const merged=mergeGeometries(parts.map(g=>g.index?g.toNonIndexed():g));const m=new THREE.Mesh(merged,material);m.castShadow=m.receiveShadow=true;root.add(m);parts.forEach(g=>g.dispose());}
  const groundAt=(x,z)=>{const lx=x+25,lz=z-28;if(Math.abs(lx)<2.5&&lz>=-7&&lz<=7||Math.abs(lx)<1.15&&lz>7&&lz<=11)return floor;if(Math.abs(lx)<1.08&&lz>11&&lz<15)return root.position.y+.65*(15-lz)/4;return baseGround(x,z);};
  function update(dt,walkers){for(const d of doors){const near=walkers.some(p=>!p.riding&&Math.abs(p.x+25)<2&&Math.abs(p.z-(28+d.z))<3.2);if(near!==d.target){if(d.target!==undefined)onDoor({x:-25,y:root.position.y+1,z:28+d.z});d.target=near;}d.open=THREE.MathUtils.damp(d.open,near?1:0,7,dt);d.mesh.position.y=1.94+d.open*2.8;d.body.state.y=root.position.y+.65+d.open*2.8;}}
  return {root,groundAt,colliders,update,floor,receiveSample(){receivedPouches[received++%receivedPouches.length].visible=true;},resetSamples(){received=0;for(const pouch of receivedPouches)pouch.visible=false;},entrance:{x:-25,z:44},snapshot:()=>({floor,doors:doors.map(d=>d.open),position:root.position.toArray(),sampleBench:{...SAMPLE_DEPOT.bench,y:root.position.y+by+1.02,received}})};
}
