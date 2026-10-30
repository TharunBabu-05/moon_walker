import * as THREE from 'three';
import {mergeGeometries} from '../vendor/utils/BufferGeometryUtils.js';
import {CARS} from './race-physics.js';
import {createTrackFences} from './track-fence-models.js';
import {buildRockHeightfield,sampleRockHeightfield} from './rock-heightfield.js';
import {STADIUM,PARKING,ACCESS_LIGHTS,TAU,CHECKPOINTS,ROCKFALLS,rockfallPose,coursePoint,ARCHES,SLOPE_ROCKS,slopeRockHeight} from './stadium-layout.js';
const metal=(color,roughness=.65)=>new THREE.MeshStandardMaterial({color,roughness,metalness:.32});
const up=new THREE.Vector3(0,1,0);
function mesh(root,geo,mat,x=0,y=0,z=0){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;root.add(m);return m;}
const box=(root,w,h,d,mat,x=0,y=0,z=0)=>mesh(root,new THREE.BoxGeometry(w,h,d),mat,x,y,z);
function rod(root,a,b,r,mat){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),d=q.clone().sub(p),m=mesh(root,new THREE.CylinderGeometry(r,r,d.length(),8),mat);m.position.copy(p).add(q).multiplyScalar(.5);m.quaternion.setFromUnitVectors(up,d.normalize());return m;}
function batch(root){const groups=new Map();for(const m of [...root.children]){if(!m.isMesh||m.isInstancedMesh||m.children.length)continue;m.updateMatrix();const g=m.geometry.clone().applyMatrix4(m.matrix);if(!groups.has(m.material))groups.set(m.material,[]);groups.get(m.material).push(g);m.removeFromParent();m.geometry.dispose();}for(const [mat,geos] of groups){mesh(root,mergeGeometries(geos),mat);geos.forEach(g=>g.dispose());}}
function sign(text,width=16,height=3){const c=document.createElement('canvas');c.width=1024;c.height=160;const ctx=c.getContext('2d');ctx.fillStyle='#252b2c';ctx.fillRect(0,0,1024,160);ctx.fillStyle='#d2b789';ctx.fillRect(0,140,1024,6);ctx.fillStyle='#e6e3d8';ctx.font='bold 42px monospace';ctx.textAlign='center';ctx.fillText(text,512,95);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const group=new THREE.Group(),mat=new THREE.MeshBasicMaterial({map:t});for(const s of [1,-1]){const m=mesh(group,new THREE.PlaneGeometry(width,height),mat,0,0,s*.02);m.rotation.y=s<0?Math.PI:0;}return group;}

export function createRaceCar(index,ground){
  const root=new THREE.Group(),chassis=new THREE.Group();root.add(chassis);
  const paint=metal(CARS[index].color),steel=metal(0x8e9391,.48),rust=metal(0x675247,.9),dark=metal(0x292d2e,.93),canvas=new THREE.MeshStandardMaterial({color:0xbab5a5,roughness:1}),lamp=new THREE.MeshStandardMaterial({color:0xe3ca97,emissive:0xb89548,emissiveIntensity:.7});
  const width=index===1?1.15:.98;
  for(const side of [-1,1]){
    rod(chassis,[side*width,.8,-2.1],[side*width,1.0,2.2],.085,steel);
    rod(chassis,[side*width,1.0,.4],[side*.82,2.9,.7],.055,steel);rod(chassis,[side*.82,2.9,.7],[side*.82,2.9,-.65],.055,steel);rod(chassis,[side*.82,2.9,-.65],[side*.9,1.1,-1.4],.055,steel);
    rod(chassis,[side*width,.85,-1.6],[-side*width,.85,1.6],.045,rust);
    box(chassis,.05,.28,3.2,paint,side*width,1.08,0);
    const front=mesh(chassis,new THREE.CylinderGeometry(.17,.19,.13,16),steel,side*.87,1.4,-2.1);front.rotation.x=Math.PI/2;
    mesh(chassis,new THREE.SphereGeometry(.14,12,8),lamp,side*.87,1.4,-2.19).scale.z=.25;
    for(let j=0;j<7;j++)mesh(chassis,new THREE.CylinderGeometry(.026,.026,.016,6),steel,side*width,1.23,-1.3+j*.42);
  }
  for(const z of [-1.9,-.9,.4,1.8])rod(chassis,[-width,.85,z],[width,.85,z],.07,steel);
  rod(chassis,[-.82,2.9,.7],[.82,2.9,.7],.055,steel);rod(chassis,[-width,1,-2.15],[width,1,-2.15],.10,rust);
  box(chassis,1.8,.09,2.7,dark,0,1.05,-.3);
  box(chassis,.65,.13,.75,canvas,0,1.43,-.02);box(chassis,.65,.8,.10,canvas,0,1.82,.35).rotation.x=-.1;
  for(const side of [-1,1])rod(chassis,[side*.31,1.45,-.3],[side*.31,1.45,.35],.02,steel);
  const dash=box(chassis,.9,.22,.4,dark,0,1.45,-1.05);dash.rotation.x=.2;
  for(let i=0;i<3;i++){const gauge=mesh(chassis,new THREE.CylinderGeometry(.065,.065,.015,16),canvas,-.23+i*.23,1.58,-1.05);gauge.rotation.x=.15;}
  rod(chassis,[0,1.05,-1],[0,1.83,-.58],.035,steel);
  const wheel=new THREE.Group();wheel.position.set(0,1.83,-.58);wheel.rotation.x=-.55;chassis.add(wheel);mesh(wheel,new THREE.TorusGeometry(.18,.024,7,24),dark);
  for(let i=0;i<3;i++){const a=i*TAU/3;rod(wheel,[0,0,0],[Math.cos(a)*.17,Math.sin(a)*.17,0],.014,steel);}
  const grips=[-1,1].map(s=>{const o=new THREE.Object3D();o.position.x=s*.18;wheel.add(o);return o;});
  const anchor=new THREE.Object3D();anchor.position.set(0,.55,-.1);chassis.add(anchor);
  // Exposed battery crates, radiator fins, cables and a strapped spare.
  box(chassis,1.5,.65,.8,paint,0,1.35,1.5);
  for(let i=0;i<12;i++)box(chassis,1.35,.028,.04,dark,0,1.1+i*.043,1.92);
  for(const side of [-1,1]){box(chassis,.09,.69,.85,steel,side*.54,1.35,1.5);const tank=mesh(chassis,new THREE.CylinderGeometry(.19,.19,.75,12),steel,side*.85,1.42,1.2);tank.rotation.x=Math.PI/2;}
  const hose=new THREE.CatmullRomCurve3([new THREE.Vector3(.8,1.2,1.2),new THREE.Vector3(.9,1.15,.2),new THREE.Vector3(.65,1.6,-.8)]);mesh(chassis,new THREE.TubeGeometry(hose,18,.03,6),dark);
  if(index===0||index===3){const spare=mesh(chassis,new THREE.TorusGeometry(.56,.14,8,20),dark,0,2.15,1.7);spare.rotation.x=.3;rod(chassis,[-.6,1.75,1.9],[.6,2.6,1.9],.025,steel);}
  if(index===2){box(chassis,1.7,.035,1.2,canvas,0,2.95,.05);for(let i=0;i<8;i++)box(chassis,.025,.04,1.2,dark,-.7+i*.2,2.98,.05);}
  if(index===1)for(const side of [-1,1])box(chassis,.65,.55,.8,rust,side*.8,1.45,.7);
  const tires=[],armLength=.88,armY=1.05,delta=new THREE.Vector3(),a=new THREE.Vector3(),b=new THREE.Vector3(),probe=new THREE.Vector3(),inverse=new THREE.Matrix4();
  const points=[];for(let i=0;i<=64;i++){const t=i/64;points.push(new THREE.Vector3(Math.cos(t*TAU*7)*.085,t,Math.sin(t*TAU*7)*.085));}const coilGeo=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),64,.017,5);
  const link=(node,p,q)=>{delta.subVectors(q,p);node.position.copy(p).addScaledVector(delta,.5);node.scale.y=delta.length();node.quaternion.setFromUnitVectors(up,delta.normalize());};
  for(const side of [-1,1])for(const z of index===1?[-1.65,0,1.65]:[-1.65,1.65]){
    const carrier=new THREE.Group(),pivot=new THREE.Group(),spin=new THREE.Group();chassis.add(carrier);carrier.add(pivot);pivot.add(spin);
    const tire=mesh(spin,new THREE.CylinderGeometry(.84,.84,.42,28,1,true),dark);tire.rotation.z=Math.PI/2;
    for(const s of [-1,1]){const ring=mesh(spin,new THREE.TorusGeometry(.78,.045,5,28),steel,s*.23,0,0);ring.rotation.y=Math.PI/2;const hub=mesh(spin,new THREE.CylinderGeometry(.19,.19,.47,12),paint);hub.rotation.z=Math.PI/2;for(let i=0;i<16;i++){const t=i*TAU/16;rod(spin,[s*.23,0,0],[s*.23,Math.cos(t)*.76,Math.sin(t)*.76],.018,steel);}}
    for(let i=0;i<26;i++){const t=i*TAU/26,m=box(spin,.49,.035,.15,steel,0,Math.cos(t)*.85,Math.sin(t)*.85);m.rotation.x=t;}
    const fender=mesh(pivot,new THREE.CylinderGeometry(.99,.99,.58,24,1,true,0,Math.PI*.82),paint,0,.02,0);fender.rotation.z=Math.PI/2;fender.rotation.x=.28;
    const arms=[];for(const y of [armY,armY+.25]){const arm=new THREE.Group();arm.position.set(side*.72,y,z);chassis.add(arm);for(const d of [-.22,.22])rod(arm,[0,0,d],[side*armLength,0,0],.04,steel);batch(arm);arms.push(arm);}
    rod(carrier,[0,0,0],[0,.25,0],.055,steel);const shock=new THREE.Group();chassis.add(shock);const damper=mesh(shock,new THREE.CylinderGeometry(.044,.044,1,8),steel),coil=mesh(shock,coilGeo.clone(),rust);
    tires.push({carrier,pivot,spin,side,z,arms,damper,coil});batch(spin);batch(carrier);
  }coilGeo.dispose();batch(chassis);
  const distant=new THREE.Group();root.add(distant);box(distant,1.9,.4,3.8,paint,0,1.15,0);box(distant,1.5,1.1,1.2,dark,0,1.9,.2);for(const s of [-1,1])for(const z of [-1.65,1.65]){const t=mesh(distant,new THREE.CylinderGeometry(.84,.84,.48,10),dark,s*1.57,.84,z);t.rotation.z=Math.PI/2;}batch(distant);distant.visible=false;
  return {root,detail(distance){chassis.visible=distance<160;distant.visible=!chassis.visible;},update(p){root.position.set(p.x,p.y,p.z);root.rotation.y=p.yaw;chassis.rotation.set(p.pitch||0,0,p.roll||0);distant.rotation.copy(chassis.rotation);wheel.rotation.z=-(p.steering||0)*1.1;root.updateMatrixWorld(true);inverse.copy(chassis.matrixWorld).invert();
    for(const w of tires){probe.set(w.side*1.57,.84,w.z).applyMatrix4(chassis.matrixWorld);probe.y=ground(probe.x,probe.z)+.84;probe.applyMatrix4(inverse);const y=p.grounded===false?.48:THREE.MathUtils.clamp(probe.y,.48,1.28),angle=Math.asin((y-armY)/armLength),out=armLength*Math.cos(angle);for(const arm of w.arms)arm.rotation.z=w.side*angle;w.carrier.position.set(w.side*(.72+out),y,w.z);w.pivot.rotation.y=w.z<0?(p.steering||0)*.36:0;w.spin.rotation.x=-(p.travel||0)/.84;a.set(w.side*.80,1.65,w.z);b.set(w.side*(.72+out*.82),armY+(y-armY)*.82,w.z);link(w.damper,a,b);w.coil.position.copy(a);delta.subVectors(b,a);w.coil.scale.y=delta.length();w.coil.quaternion.setFromUnitVectors(up,delta.normalize());}
  },driverPose(){root.updateMatrixWorld(true);return {matrix:anchor.matrixWorld.clone(),grips:grips.map(g=>g.getWorldPosition(new THREE.Vector3()))};}};
}

export function createStadium(scene,ground,makeRock){
  const root=new THREE.Group();root.name='Permanent lunar stadium';scene.add(root);
  const concrete=new THREE.MeshStandardMaterial({color:0x969b98,roughness:.95,emissive:0x272d2e,emissiveIntensity:.35}),steel=metal(0x747d7f),dark=metal(0x343c3e),cloth=new THREE.MeshStandardMaterial({color:0xbab9ae,roughness:.95,side:THREE.DoubleSide,emissive:0x22292a,emissiveIntensity:.25}),gold=metal(0xa88d56),light=new THREE.MeshBasicMaterial({color:0xd4d0b9});
  const dummy=new THREE.Object3D(),sectors=[],sections=96,rows=12,seatRows=8,perRow=25;
  const tier=new THREE.InstancedMesh(new THREE.BoxGeometry(68,3,6.5),concrete,sections*rows),posts=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),steel,sections*4),roofs=new THREE.InstancedMesh(new THREE.BoxGeometry(70,1.4,90),cloth,sections),rails=new THREE.InstancedMesh(new THREE.BoxGeometry(70,2.5,1),dark,sections);
  let n=0,np=0,nr=0;const crowdLocations=[];
  for(let i=0;i<sections;i++){const angle=i/sections*TAU;if(Math.abs(Math.atan2(Math.sin(angle-Math.PI),Math.cos(angle-Math.PI)))<.065)continue;const x=STADIUM.x+Math.cos(angle)*1070,z=STADIUM.z+Math.sin(angle)*1070,base=ground(x,z)+2;
    for(let row=0;row<rows;row++){const r=1070+row*6;dummy.position.set(STADIUM.x+Math.cos(angle)*r,base+row*3,STADIUM.z+Math.sin(angle)*r);dummy.rotation.set(0,-angle-Math.PI/2,0);dummy.scale.set(1,1,1);dummy.updateMatrix();tier.setMatrixAt(n++,dummy.matrix);
      if(row<seatRows)for(let s=0;s<perRow;s++){if(i%4===0&&s===perRow-1)continue;const a=angle+(s-(perRow-1)/2)*2.5/r;crowdLocations.push({x:STADIUM.x+Math.cos(a)*r,y:base+row*3+1.6,z:STADIUM.z+Math.sin(a)*r,yaw:-a+Math.PI/2,sector:i});}
    }
    const roofR=1110;dummy.position.set(STADIUM.x+Math.cos(angle)*roofR,base+54,STADIUM.z+Math.sin(angle)*roofR);dummy.rotation.set(0,-angle-Math.PI/2,0);dummy.scale.set(1,1,1);dummy.updateMatrix();roofs.setMatrixAt(nr,dummy.matrix);dummy.position.set(x,base+2.8,z);dummy.updateMatrix();rails.setMatrixAt(nr++,dummy.matrix);
    for(const rr of [1066,1150])for(const da of [-.028,.028]){const a=angle+da,xx=STADIUM.x+Math.cos(a)*rr,zz=STADIUM.z+Math.sin(a)*rr,y=ground(xx,zz),height=Math.max(3,base+54-y);dummy.position.set(xx,y+height/2,zz);dummy.rotation.set(0,0,0);dummy.scale.set(1.1,height,1.1);dummy.updateMatrix();posts.setMatrixAt(np++,dummy.matrix);}
    const wallBottom=ground(x,z)-2;
    // A low retaining wall preserves the spectators' sightline into the crater.
    const retaining=box(root,68,4,4,concrete,x,wallBottom+2,z);retaining.rotation.y=-angle-Math.PI/2;
    const stripe=box(root,68,.4,4.1,gold,x,wallBottom+3.8,z);stripe.rotation.copy(retaining.rotation);
    if(i%4===0){const sectorSign=sign('SECTOR '+String(i/4+1).padStart(2,'0'),24,3);sectorSign.position.set(x,base+7,z);sectorSign.rotation.y=-angle-Math.PI/2;root.add(sectorSign);}
    const aisle=angle+.029,inner=1045,outer=1142,y0=ground(STADIUM.x+Math.cos(aisle)*inner,STADIUM.z+Math.sin(aisle)*inner),y1=base+37.5;
    if(i%4===0){const ramp=new THREE.Group();ramp.position.set(STADIUM.x+Math.cos(aisle)*(inner+outer)/2,(y0+y1)/2,STADIUM.z+Math.sin(aisle)*(inner+outer)/2);ramp.rotation.y=Math.PI/2-aisle;const deck=box(ramp,3.8,.3,Math.hypot(outer-inner,y1-y0),steel);deck.rotation.x=-Math.atan2(y1-y0,outer-inner);root.add(ramp);}
    sectors.push({i,x,z,base,aisle,y0,y1});
  }
  tier.count=n;posts.count=np;roofs.count=rails.count=nr;root.add(tier,posts,roofs,rails);for(const m of [tier,posts,roofs,rails]){m.receiveShadow=true;m.computeBoundingSphere();}
  // Far crowd heads cost one draw. Detailed seated suits appear by section nearby.
  const headPositions=new Float32Array(crowdLocations.length*3);crowdLocations.forEach((p,i)=>headPositions.set([p.x,p.y+1.26,p.z],i*3));
  const headCanvas=document.createElement('canvas');headCanvas.width=headCanvas.height=32;const headContext=headCanvas.getContext('2d');headContext.fillStyle='#cecec5';headContext.beginPath();headContext.arc(16,16,15,0,TAU);headContext.fill();
  const headGeometry=new THREE.BufferGeometry();headGeometry.setAttribute('position',new THREE.BufferAttribute(headPositions,3));const farCrowd=new THREE.Points(headGeometry,new THREE.PointsMaterial({size:.48,map:new THREE.CanvasTexture(headCanvas),alphaTest:.4}));root.add(farCrowd);
  const suit=new THREE.Group(),white=new THREE.MeshStandardMaterial({color:0xd1cec2,roughness:1}),visor=metal(0x917447,.3);
  mesh(suit,new THREE.SphereGeometry(.27,8,6),white,0,.87,0).scale.set(1.1,1.3,.8);mesh(suit,new THREE.SphereGeometry(.25,10,7),white,0,1.28,0);mesh(suit,new THREE.SphereGeometry(.20,8,6),visor,0,1.29,-.13).scale.z=.65;box(suit,.35,.42,.18,dark,0,.9,.26);
  for(const s of [-1,1]){rod(suit,[s*.31,1.05,0],[s*.37,.65,-.15],.10,white);rod(suit,[s*.18,.58,0],[s*.18,.58,-.38],.12,white);rod(suit,[s*.18,.58,-.38],[s*.18,.14,-.4],.10,white);box(suit,.22,.13,.34,dark,s*.18,.12,-.48);}
  box(suit,.60,.10,.65,dark,0,.46,-.10);box(suit,.60,.65,.08,dark,0,.82,.30);
  for(const s of [-1,1]){box(suit,.06,.45,.06,steel,s*.24,.225,.15);mesh(suit,new THREE.SphereGeometry(.13,8,6),white,s*.31,1.02,0);const cuff=mesh(suit,new THREE.TorusGeometry(.105,.025,5,8),gold,s*.37,.7,-.13);cuff.rotation.x=Math.PI/2;mesh(suit,new THREE.SphereGeometry(.12,8,6),white,s*.18,.59,-.38).scale.z=.6;box(suit,.035,.4,.04,gold,s*.20,.9,-.22);box(suit,.25,.025,.3,steel,s*.18,.07,-.48);}
  box(suit,.28,.23,.05,steel,0,.94,-.23);for(let j=0;j<3;j++)mesh(suit,new THREE.SphereGeometry(.023,5,4),dark,-.08+j*.08,.97,-.27);
  mesh(suit,new THREE.TorusGeometry(.205,.026,5,12),gold,0,1.29,-.14);batch(suit);const detailed=[];
  for(const section of sectors){const people=crowdLocations.filter(p=>p.sector===section.i),group=new THREE.Group();root.add(group);for(const part of suit.children){const instances=new THREE.InstancedMesh(part.geometry,part.material,people.length);people.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.yaw,0);dummy.scale.setScalar(1);dummy.updateMatrix();instances.setMatrixAt(i,dummy.matrix);});group.add(instances);}group.visible=false;detailed.push({...section,group});}
  // Monumental entrance, scoreboards, stairs and industrial floodlight towers.
  for(const side of [-1,1]){const x=STADIUM.gate.x,z=STADIUM.z+side*35,y=ground(x,z);box(root,8,50,9,concrete,x,y+25,z);for(let j=0;j<5;j++)box(root,8.2,.8,9.2,gold,x,y+8+j*8,z);const gantry=sign('SELENE / CRATER STADIUM',72,9);gantry.rotation.y=Math.PI/2;gantry.position.set(x,y+48,STADIUM.z);if(side===1)root.add(gantry);}
  const floodlightSites=[];let activeLightSites=[];
  for(let i=0;i<24;i++){
    const a=i*TAU/24,r=1042,x=STADIUM.x+Math.cos(a)*r,z=STADIUM.z+Math.sin(a)*r,y=ground(x,z),target=coursePoint(i/24-.5);
    box(root,4,2,4,concrete,x,y+1,z);box(root,1.3,86,1.3,steel,x,y+43,z);
    for(let j=0;j<6;j++){box(root,3,.18,.9,gold,x,y+6+j*12,z);}
    const bank=new THREE.Group();bank.position.set(x,y+86,z);bank.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),new THREE.Vector3(target.x-x,ground(target.x,target.z)-y-86,target.z-z).normalize());root.add(bank);
    box(bank,22,9,1.8,dark);for(let row=0;row<2;row++)for(let j=0;j<5;j++){
      box(bank,3.6,3.2,.4,steel,-8+j*4,-2+row*4,-1);box(bank,3.1,2.7,.08,light,-8+j*4,-2+row*4,-1.23);
    }
    floodlightSites.push({x,y:y+86,z,target:{x:target.x,y:ground(target.x,target.z),z:target.z}});
  }
  for(const p of ACCESS_LIGHTS){const y=ground(p.x,p.z);box(root,1.8,.7,1.8,concrete,p.x,y+.35,p.z);box(root,.3,12,.3,steel,p.x,y+6,p.z);box(root,3,.35,1.5,dark,p.x,y+12,p.z);box(root,2.8,.08,1.3,light,p.x,y+11.8,p.z);
    floodlightSites.push({x:p.x,y:y+11.8,z:p.z,target:{x:p.x,y:ground(p.x,p.targetZ),z:p.targetZ},intensity:1600,distance:100,angle:1.18,access:true});}
  const parkingSign=sign('CREW GARAGE / 8 BUGGIES',30,4);parkingSign.position.set(PARKING.x,ground(PARKING.x,PARKING.z)+7,PARKING.z-24);parkingSign.rotation.y=Math.PI/2;root.add(parkingSign);
  // Four stable light slots avoid changing shader variants or rendering 24
  // extra shadow maps. Physical inverse-square falloff lights terrain and suits.
  const floodlights=Array.from({length:4},()=>{const l=new THREE.SpotLight(0xe4edff,210000,780,.95,.65,2);root.add(l,l.target);return l;});
  let lightX=Infinity,lightZ=Infinity;
  const updateLights=viewer=>{
    if(Math.hypot(viewer.x-lightX,viewer.z-lightZ)<6)return;lightX=viewer.x;lightZ=viewer.z;
    const onPath=viewer.x>=-35&&viewer.x<=PARKING.x+55&&Math.abs(viewer.z-STADIUM.gate.z)<50;
    const nearest=floodlightSites.map((s,i)=>({i,d:Math.hypot(s.x-viewer.x,s.z-viewer.z)})).filter(p=>!onPath||floodlightSites[p.i].access).sort((a,b)=>a.d-b.d).slice(0,4);activeLightSites=nearest.map(p=>({...floodlightSites[p.i]}));
    for(let i=0;i<floodlights.length;i++){const l=floodlights[i],p=floodlightSites[nearest[i].i];l.position.set(p.x,p.y,p.z);l.target.position.set(p.target.x,p.target.y,p.target.z);l.intensity=p.intensity||210000;l.distance=p.distance||780;l.angle=p.angle||.95;l.penumbra=p.access?.35:.65;}
  };
  const scoreboard=sign('CRATER RUN / CREW RACING',65,11);scoreboard.position.set(STADIUM.gate.x+35,ground(STADIUM.gate.x+35,28)+35,28);scoreboard.rotation.y=Math.PI/2;root.add(scoreboard);
  const trackFences=createTrackFences(root,ground,sign);
  // Sector signs remain above the continuous course boundary.
  for(let i=0;i<16;i++){const p=CHECKPOINTS[i],a=Math.atan2(p.z-STADIUM.z,p.x-STADIUM.x);for(const side of [-1,1]){const x=p.x+Math.cos(a)*side*30,z=p.z+Math.sin(a)*side*30,y=ground(x,z);box(root,.18,5,.18,steel,x,y+2.5,z);const flag=mesh(root,new THREE.PlaneGeometry(1.5,1),cloth,x,y+4.5,z);flag.rotation.y=-a;}
    const px=p.x+Math.cos(a)*36,pz=p.z+Math.sin(a)*36,py=ground(px,pz)+5;
    const plate=sign(i===0?'START / GRID':String(i).padStart(2,'0')+' / '+p.name.toUpperCase(),i===0?12:7,i===0?2:1.2);plate.position.set(px,py,pz);plate.rotation.y=Math.atan2(coursePoint(i/16+.001).x-p.x,coursePoint(i/16+.001).z-p.z);root.add(plate);box(root,.25,5,.25,steel,px,py-2.5,pz);
  }
  // Photographed rock meshes form cliffs and bridges around the course.
  const rockGroups=[],rockColliders=[];
  function solidRock(object){
    object.updateWorldMatrix(true,true);const bounds=new THREE.Box3().setFromObject(object),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3()),radius=Math.hypot(size.x,size.z)/2,geos=[];
    object.traverse(m=>{if(m.isMesh)geos.push(m.geometry.clone().applyMatrix4(m.matrixWorld).translate(-center.x,-bounds.min.y,-center.z).scale(1/radius,1/radius,1/radius));});
    const field=buildRockHeightfield(geos);geos.forEach(g=>g.dispose());rockColliders.push({x:center.x,z:center.z,yaw:0,bottom:bounds.min.y,top:bounds.max.y,radius,field});
  }
  for(const p of ARCHES){const a=Math.atan2(p.z-STADIUM.z,p.x-STADIUM.x),base=ground(p.x,p.z);const group=new THREE.Group();root.add(group);for(const s of [-1,1]){const x=p.x+Math.cos(a)*s*49,z=p.z+Math.sin(a)*s*49,r=makeRock(28,Math.abs(s));r.position.set(x,base+20,z);r.scale.set(1,1.8,1);r.rotation.y=-a;group.add(r);solidRock(r);const foot=makeRock(24,2);foot.position.set(x,ground(x,z)+4,z);foot.scale.set(1.3,.8,1.2);group.add(foot);solidRock(foot);}const cap=makeRock(39,2);cap.scale.set(1.9,.45,.65);cap.rotation.y=-a;cap.position.set(p.x,base+43,p.z);group.add(cap);solidRock(cap);rockGroups.push({group,x:p.x,z:p.z});}
  // Exposed bedrock material over the same collision height, not floating props.
  const bedrock=makeRock(.1,0).children[0].material.clone();bedrock.vertexColors=true;bedrock.color.setHex(0x999b9e);
  for(const key of ['map','normalMap','roughnessMap','aoMap'])if(bedrock[key]){bedrock[key]=bedrock[key].clone();bedrock[key].wrapS=bedrock[key].wrapT=THREE.RepeatWrapping;bedrock[key].repeat.set(10,14);}
  for(const p of SLOPE_ROCKS){
    const geometry=new THREE.PlaneGeometry(p.width*2,p.length*2,48,72);geometry.rotateX(-Math.PI/2);const pos=geometry.attributes.position,colors=[],relief=[];
    for(let i=0;i<pos.count;i++){const lx=pos.getX(i),lz=pos.getZ(i),c=Math.cos(p.yaw),s=Math.sin(p.yaw),x=p.x+c*lx+s*lz,z=p.z-s*lx+c*lz,h=ground(x,z),rise=slopeRockHeight(p,x,z);
      pos.setXYZ(i,x,h+.045,z);relief.push(rise);const strata=.85+.06*Math.sin(h*.7+Math.sin(x*.15))+.035*Math.sin(x*2+z*3),edge=Math.min(1,rise/3),shade=1+(strata-1)*edge;colors.push(shade,shade,shade);
    }
    const indices=[];for(let i=0;i<geometry.index.count;i+=3){const a=geometry.index.getX(i),b=geometry.index.getX(i+1),c=geometry.index.getX(i+2);if(Math.max(relief[a],relief[b],relief[c])>.15)indices.push(a,b,c);}geometry.setIndex(indices);
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();const shelf=mesh(root,geometry,bedrock);shelf.name='Sloping lunar bedrock';
  }
  batch(root);
  const falling=ROCKFALLS.map(s=>{const rock=makeRock(s.radius,s.id%3);root.add(rock);const warning=mesh(root,new THREE.RingGeometry(s.radius+1,s.radius+1.5,28),new THREE.MeshBasicMaterial({color:0xcda15c,side:THREE.DoubleSide,transparent:true,opacity:.8}));warning.rotation.x=-Math.PI/2;return {rock,warning,site:s};});
  // Transparent barriers along the spectator front are represented by solid terrain-side walls.
  return {root,rocksNear:(x,z,r=7)=>rockColliders.filter(q=>Math.hypot(x-q.x,z-q.z)<r+q.radius),rockSurface:(r,x,z)=>sampleRockHeightfield(r.field,r,x,z),crowdCount:crowdLocations.length,update(viewer,state){updateLights(viewer);for(const s of detailed)s.group.visible=Math.hypot(viewer.x-s.x,viewer.z-s.z)<75;for(const r of rockGroups)r.group.visible=Math.hypot(viewer.x-r.x,viewer.z-r.z)<1600;for(const f of falling){const p=rockfallPose(f.site,state?.raceTime||0,ground(f.site.x,f.site.z)),running=state?.phase==='racing';f.rock.visible=running&&p.active;f.rock.position.set(p.x,p.y,p.z);f.rock.rotation.set(p.y*.04,p.y*.03,0);f.warning.visible=running&&(p.warning||p.active);f.warning.position.set(p.x,ground(p.x,p.z)+.08,p.z);f.warning.material.opacity=.4+.4*Math.sin((state?.time||0)*8)**2;}},floor(x,z,base){const r=Math.hypot(x-STADIUM.x,z-STADIUM.z),a=Math.atan2(z-STADIUM.z,x-STADIUM.x);for(const s of sectors)if(s.i%4===0&&r>=1045&&r<=1142&&Math.abs(Math.atan2(Math.sin(a-s.aisle),Math.cos(a-s.aisle)))*r<1.9)return Math.max(base,s.y0+(s.y1-s.y0)*(r-1045)/97+.16);if(r<1067||r>1142||Math.abs(Math.atan2(Math.sin(a-Math.PI),Math.cos(a-Math.PI)))<.065)return base;const section=sectors.find(s=>Math.abs(Math.atan2(Math.sin(a-s.i/sections*TAU),Math.cos(a-s.i/sections*TAU)))<Math.PI/sections);if(!section)return base;return Math.max(base,section.base+Math.max(0,Math.floor((r-1067)/6))*3+1.5);},snapshot:()=>({sameScene:root.parent===scene,radius:STADIUM.radius,crowd:crowdLocations.length,stands:sectors.length,floodlightTowers:24,accessLights:ACCESS_LIGHTS.length,activeLightSites,parking:{...PARKING},activeLights:floodlights.length,slopeRocks:SLOPE_ROCKS.length,fenceSegments:trackFences.segments,fenceHeight:trackFences.height})};
}
