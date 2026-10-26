import * as THREE from 'three';
import { damp, clamp, angleDelta } from './physics.js';
const UP=new THREE.Vector3(0,1,0),DOWN=new THREE.Vector3(0,-1,0),TAU=Math.PI*2;

export function createAstronaut(scene,groundAt,onFootstep){
  const root=new THREE.Group();scene.add(root);
  const fabricCanvas=document.createElement('canvas');fabricCanvas.width=fabricCanvas.height=256;const fc=fabricCanvas.getContext('2d');fc.fillStyle='#e4e4df';fc.fillRect(0,0,256,256);
  for(let i=0;i<256;i+=2){fc.strokeStyle=i%4?'#cacac4':'#f0f0ea';fc.globalAlpha=.25;fc.beginPath();fc.moveTo(i,0);fc.lineTo(i,256);fc.stroke();fc.beginPath();fc.moveTo(0,i);fc.lineTo(256,i);fc.stroke();}
  const fabric=new THREE.CanvasTexture(fabricCanvas);fabric.wrapS=fabric.wrapT=THREE.RepeatWrapping;fabric.repeat.set(3,3);fabric.colorSpace=THREE.SRGBColorSpace;
  const white=new THREE.MeshStandardMaterial({color:0xe3e2dc,map:fabric,roughness:.94});
  const dirty=new THREE.MeshStandardMaterial({color:0x96968e,map:fabric,roughness:1});
  const dark=new THREE.MeshStandardMaterial({color:0x34373a,roughness:.86});
  const metal=new THREE.MeshStandardMaterial({color:0x9a9fa2,metalness:.68,roughness:.32});
  const red=new THREE.MeshStandardMaterial({color:0x913f36,roughness:.9});
  const gold=new THREE.MeshPhysicalMaterial({color:0xbe8c35,metalness:.94,roughness:.21,clearcoat:1});
  const glass=new THREE.MeshPhysicalMaterial({color:0x9e7634,metalness:.88,roughness:.18,clearcoat:1,clearcoatRoughness:.08});
  const torso=new THREE.Group();root.add(torso);
  function mesh(parent,geometry,material,pos=[0,0,0],scale=[1,1,1]){const m=new THREE.Mesh(geometry,material);m.position.set(...pos);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  const sphere=(parent,r,mat,pos,scale)=>mesh(parent,new THREE.SphereGeometry(r,20,16),mat,pos,scale);
  const box=(parent,size,mat,pos)=>mesh(parent,new THREE.BoxGeometry(...size),mat,pos);
  function ring(parent,r,t,mat,pos){const m=mesh(parent,new THREE.TorusGeometry(r,t,8,32),mat,pos);m.rotation.x=Math.PI/2;return m;}
  function tube(parent,points,r,mat){return mesh(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),32,r,8,false),mat);}

  mesh(torso,new THREE.CapsuleGeometry(.27,.35,10,24),white,[0,1.26,0],[1.12,1,.79]);
  sphere(torso,.30,white,[0,1.02,0],[1.05,.68,.83]);
  box(torso,[.39,.12,.22],dark,[0,1.015,-.12]);
  box(torso,[.15,.10,.025],metal,[0,1.02,-.248]);
  for(const s of [-1,1]){
    tube(torso,[[s*.19,1.56,-.13],[s*.24,1.38,-.216],[s*.22,1.12,-.21]],.018,dirty);
    ring(torso,.25,.016,dirty,[0,1.06,0]);
  }
  const pack=box(torso,[.48,.62,.24],white,[0,1.34,.255]);
  box(torso,[.38,.41,.018],dirty,[0,1.39,.386]);
  box(torso,[.27,.16,.035],white,[0,1.11,.39]);
  for(let i=0;i<6;i++)box(torso,[.25,.008,.022],metal,[0,1.51-i*.037,.402]);
  for(const s of [-1,1]){
    box(torso,[.035,.55,.02],dirty,[s*.21,1.34,.39]);
    sphere(torso,.041,metal,[s*.22,1.1,.32]);
  }
  tube(torso,[[.24,1.1,.25],[.39,1.06,.12],[.36,1.18,-.21],[.20,1.24,-.265]],.029,dirty);
  tube(torso,[[-.23,1.14,.23],[-.34,1.02,0],[-.29,1.14,-.25],[-.18,1.27,-.26]],.023,white);
  const chest=box(torso,[.30,.21,.055],white,[0,1.39,-.235]);
  box(torso,[.22,.105,.012],dark,[0,1.42,-.271]);
  for(let i=0;i<3;i++){box(torso,[.04,.022,.015],i===0?red:metal,[-.075+i*.075,1.34,-.273]);}
  for(const x of [-.12,.12])for(const y of [1.31,1.47])sphere(torso,.008,metal,[x,y,-.272]);
  const label=document.createElement('canvas');label.width=256;label.height=128;const lc=label.getContext('2d');lc.fillStyle='#d6d6cf';lc.fillRect(0,0,256,128);lc.fillStyle='#353c40';lc.font='bold 30px monospace';lc.fillText('SELENE',26,54);lc.font='18px monospace';lc.fillText('EVA / 07',36,90);
  mesh(torso,new THREE.PlaneGeometry(.19,.095),new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(label),roughness:.8}),[0,1.55,-.222]);
  ring(torso,.205,.035,metal,[0,1.59,0]);
  const head=new THREE.Group();head.position.set(0,1.81,0);torso.add(head);
  sphere(head,.24,white,[0,0,0],[1.05,1.06,1]);
  const visor=sphere(head,.215,glass,[0,.008,-.115],[.94,.82,.75]);
  const visorFrame=mesh(head,new THREE.TorusGeometry(.196,.014,10,40),gold,[0,.005,-.207],[1,.84,1]);
  for(const s of [-1,1]){
    box(head,[.065,.09,.11],white,[s*.225,.06,-.03]);
    const lamp=mesh(head,new THREE.CylinderGeometry(.025,.025,.025,12),metal,[s*.225,.065,-.092]);lamp.rotation.x=Math.PI/2;
    sphere(head,.018,new THREE.MeshBasicMaterial({color:0xe6e6d8}),[s*.225,.065,-.109],[1,1,.3]);
  }
  const antenna=mesh(torso,new THREE.CylinderGeometry(.004,.006,.35,8),metal,[-.21,1.81,.32]);antenna.rotation.z=.1;

  const arms=[];
  for(const s of [-1,1]){
    const shoulder=new THREE.Group();shoulder.position.set(s*.345,1.48,0);torso.add(shoulder);
    sphere(shoulder,.145,white,[0,0,0],[1,1.03,.95]);
    mesh(shoulder,new THREE.CapsuleGeometry(.103,.17,8,16),white,[s*.012,-.18,0]);
    for(let i=0;i<4;i++)ring(shoulder,.104,.012,dirty,[s*.014,-.27-i*.013,0]);
    ring(shoulder,.11,.016,red,[s*.008,-.12,0]);
    const elbow=new THREE.Group();elbow.position.set(s*.016,-.335,0);shoulder.add(elbow);
    sphere(elbow,.098,dirty,[0,0,0]);
    mesh(elbow,new THREE.CapsuleGeometry(.082,.13,8,16),white,[0,-.16,0]);
    ring(elbow,.084,.018,metal,[0,-.28,0]);
    sphere(elbow,.093,dirty,[0,-.36,-.015],[.86,1.22,.7]);
    sphere(elbow,.04,white,[-s*.065,-.34,-.036],[1,1.5,1]);
    arms.push({shoulder,elbow,side:s});
  }
  const legs=[];
  for(const s of [-1,1]){
    // Thigh and shin are separate transforms solved from hip/knee/ankle positions.
    const upper=new THREE.Group(),lower=new THREE.Group(),foot=new THREE.Group();root.add(upper,lower,foot);
    mesh(upper,new THREE.CylinderGeometry(.142,.115,1,18),white,[0,-.5,0]);
    for(let i=0;i<5;i++)ring(upper,.12,.014,dirty,[0,-.86-i*.027,0]);
    ring(upper,.143,.018,red,[0,-.23,0]);
    mesh(lower,new THREE.CylinderGeometry(.112,.093,1,18),white,[0,-.5,0]);
    sphere(lower,.119,dirty,[0,0,0],[1,.22,1]);
    box(lower,[.13,.21,.028],dirty,[0,-.40,-.1]);
    ring(lower,.1,.018,dirty,[0,-.88,0]);
    box(foot,[.225,.13,.35],dirty,[0,.08,-.06]);
    sphere(foot,.11,white,[0,.13,-.01],[1,.85,1.15]);
    box(foot,[.23,.04,.37],dark,[0,.025,-.065]);
    for(let j=0;j<6;j++)box(foot,[.235,.012,.018],dirty,[0,.006,-.215+j*.06]);
    const pos=new THREE.Vector3(s*.18,groundAt(s*.18,0),0);
    legs.push({side:s,upper,lower,foot,world:pos.clone(),from:pos.clone(),target:pos.clone(),swing:false,progress:0});
  }
  let time=0,phase=0,bodyY=0,lean=0,landing=0,initialized=false,lastStep=-1;
  const inverse=new THREE.Matrix4();
  function localToWorld(x,z,p){return new THREE.Vector3(p.x+Math.cos(p.yaw)*x+Math.sin(p.yaw)*z,0,p.z-Math.sin(p.yaw)*x+Math.cos(p.yaw)*z);}
  function solveLeg(leg,p,pelvis){
    const hip=new THREE.Vector3(leg.side*.18,pelvis,0);
    const ankle=leg.world.clone().applyMatrix4(inverse);ankle.y+=.135;
    const direction=ankle.clone().sub(hip),len=clamp(direction.length(),.1,.919);direction.normalize();
    const upperLength=.47,lowerLength=.46;
    const along=(upperLength**2-lowerLength**2+len**2)/(2*len);
    const bend=Math.sqrt(Math.max(0,upperLength**2-along**2));
    const forward=new THREE.Vector3(0,0,-1);forward.addScaledVector(direction,-forward.dot(direction)).normalize();
    const knee=hip.clone().addScaledVector(direction,along).addScaledVector(forward,bend);
    const segment=(node,a,b)=>{node.position.copy(a);const vector=b.clone().sub(a);node.quaternion.setFromUnitVectors(DOWN,vector.clone().normalize());node.scale.set(1,vector.length(),1);};
    segment(leg.upper,hip,knee);segment(leg.lower,knee,ankle);
    leg.foot.position.copy(leg.world).applyMatrix4(inverse);
    const slopeX=(groundAt(leg.world.x+.1,leg.world.z)-groundAt(leg.world.x-.1,leg.world.z))/.2;
    const slopeZ=(groundAt(leg.world.x,leg.world.z+.1)-groundAt(leg.world.x,leg.world.z-.1))/.2;
    const normal=new THREE.Vector3(-slopeX,1,-slopeZ).normalize().applyAxisAngle(UP,-p.yaw);
    leg.foot.quaternion.setFromUnitVectors(UP,normal);
    if(leg.swing)leg.foot.rotateX(-Math.sin(leg.progress*Math.PI)*.25);
  }
  function update(p,dt,lookPitch=0){
    time+=dt;const moving=p.speed>.06,fast=p.speed>1.65;
    phase+=dt*(moving?(fast?1.13:.78):0)*TAU;
    if(p.landed)landing=Math.min(.13,p.landingSpeed*.035);
    landing=damp(landing,0,9,dt);
    lean=damp(lean,moving?-.07-Math.min(.09,p.speed*.025):0,6,dt);
    const bob=moving&&p.grounded?Math.cos(phase*2)*.018:0;
    bodyY=damp(bodyY,bob-landing,12,dt);
    root.position.set(p.x,p.y,p.z);root.rotation.y=p.yaw;
    torso.position.y=bodyY;torso.rotation.x=lean;torso.rotation.z=moving?Math.sin(phase)*.018:0;
    head.rotation.x=clamp(-lookPitch*.22,-.15,.15);
    root.updateMatrixWorld(true);inverse.copy(root.matrixWorld).invert();
    for(const leg of legs){
      if(!initialized){leg.world=localToWorld(leg.side*.18,.02,p);leg.world.y=groundAt(leg.world.x,leg.world.z);}
      if(!p.grounded){
        const tucked=localToWorld(leg.side*.20,.12+(leg.side>0?.12:-.08),p);tucked.y=p.y+.15+Math.max(0,p.vy)*.06;
        leg.world.lerp(tucked,1-Math.exp(-dt*9));leg.swing=false;
      } else {
        const neutral=localToWorld(leg.side*.18,0,p);
        const error=Math.hypot(neutral.x-leg.world.x,neutral.z-leg.world.z);
        const other=legs.find(l=>l!==leg);
        if(!leg.swing&&!other.swing&&(error>(moving?.23:.055)||p.landed)&&lastStep!==leg.side){
          leg.from.copy(leg.world);leg.target.copy(neutral);
          const stride=fast?.36:.25;
          if(moving){leg.target.x+=p.vx/Math.max(.1,p.speed)*stride;leg.target.z+=p.vz/Math.max(.1,p.speed)*stride;}
          leg.target.y=groundAt(leg.target.x,leg.target.z);leg.swing=true;leg.progress=0;lastStep=leg.side;
        }
        if(leg.swing){
          leg.progress=Math.min(1,leg.progress+dt/(fast?.23:.36));const t=leg.progress,s=t*t*(3-2*t);
          leg.world.lerpVectors(leg.from,leg.target,s);leg.world.y+=Math.sin(t*Math.PI)*(fast?.25:.14);
          if(t===1){leg.swing=false;leg.world.y=groundAt(leg.world.x,leg.world.z);onFootstep(leg.world,p.yaw,fast?1.4:1);}
        }
        if(!moving&&!other.swing&&error<=.055)lastStep=0;
      }
      solveLeg(leg,p,.98+bodyY);
    }
    initialized=true;
    for(const a of arms){a.shoulder.rotation.x=damp(a.shoulder.rotation.x,p.grounded?(moving?Math.sin(phase+(a.side<0?Math.PI:0))*.30:0):-.32,8,dt);a.shoulder.rotation.z=a.side*(p.grounded?.06:.22);a.elbow.rotation.x=-.18-Math.max(0,-a.shoulder.rotation.x)*.65;}
    pack.rotation.z=-torso.rotation.z*.3;
  }
  return {root,update,legs,torso,head,visor,materials:{glass,gold}};
}
