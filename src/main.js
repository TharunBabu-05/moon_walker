import * as THREE from 'three';
import { createLandscape, buildTerrain } from './terrain.js';
import { createAstronaut } from './astronaut.js';
import { createSurfaceSky, createUniverse, MOON_RADIUS, EARTH_DISTANCE } from './universe.js';
import { createPlayer, stepPlayer, FIXED_STEP, clamp, damp, angleDelta } from './physics.js';
import {createRoverState,stepRover,resolveObstacles} from './world.js';
import {createRover} from './rover.js';
import {createExpedition} from './multiplayer.js';

const $=id=>document.getElementById(id);
const canvas=$('scene');
const failure=error=>{console.error(error);$('error').hidden=false;$('error-message').textContent=(error?.message||'WebGL could not start.')+' Reload the page to try again.';};
window.addEventListener('unhandledrejection',event=>failure(event.reason));
try { await start(); } catch(error) {failure(error);}

async function start(){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x010205);
  const camera=new THREE.PerspectiveCamera(63,innerWidth/innerHeight,.035,40000);
  const sky=createSurfaceSky(scene);
  const sun=new THREE.DirectionalLight(0xfffaf3,3.25);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-28;sun.shadow.camera.right=28;sun.shadow.camera.top=28;sun.shadow.camera.bottom=-28;sun.shadow.camera.near=1;sun.shadow.camera.far=500;sun.shadow.bias=-.00012;sun.shadow.normalBias=.012;sun.shadow.radius=1.2;scene.add(sun,sun.target);
  scene.add(new THREE.HemisphereLight(0xc4c5c7,0x777778,.28));
  const groundBounce=new THREE.DirectionalLight(0xc1c2c4,.13);groundBounce.position.set(-50,5,30);scene.add(groundBounce);
  const universePromise=createUniverse(renderer,text=>$('load-status').textContent=text);
  await new Promise(resolve=>requestAnimationFrame(resolve));
  const landscape=createLandscape();$('load-status').textContent='Preparing detailed rock models and surface materials…';
  const terrain=await buildTerrain(scene,renderer,landscape);
  const player=createPlayer(terrain.groundAt),roverState=createRoverState(landscape.groundAt),rover=createRover(scene,landscape.groundAt,roverState);
  let riding=false;
  let footstepCount=0;
  const astronaut=createAstronaut(scene,terrain.groundAt,(position,yaw,strength)=>{footstepCount++;terrain.footstep(position,yaw,strength);});
  astronaut.update(player,0);astronaut.root.visible=false;

  // An instrument tripod provides a familiar sense of scale near the crater rim.
  const beacon=new THREE.Group();beacon.position.set(-4,landscape.groundAt(-4,5),5);scene.add(beacon);
  const metal=new THREE.MeshStandardMaterial({color:0x8a8e90,roughness:.46,metalness:.55});
  for(let i=0;i<3;i++){
    const a=i*Math.PI*2/3,start=new THREE.Vector3(0,.9,0),end=new THREE.Vector3(Math.cos(a)*.42,0,Math.sin(a)*.42),leg=new THREE.Mesh(new THREE.CylinderGeometry(.016,.021,start.distanceTo(end),8),metal);
    leg.position.copy(start).add(end).multiplyScalar(.5);leg.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),start.sub(end).normalize());leg.castShadow=true;beacon.add(leg);
  }
  const instrument=new THREE.Mesh(new THREE.BoxGeometry(.29,.22,.21),new THREE.MeshStandardMaterial({color:0xb8a279,roughness:.5,metalness:.55}));instrument.position.y=.98;instrument.castShadow=true;beacon.add(instrument);
  const signal=new THREE.Mesh(new THREE.SphereGeometry(.018,8,6),new THREE.MeshBasicMaterial({color:0x99d7c6}));signal.position.set(0,1.095,-.11);beacon.add(signal);

  let mode='first',started=false,ready=false,yaw=-.28,pitch=-.12,followYaw=-.28,followPitch=.22,followDistance=4.6,targetFollowDistance=4.6;
  let jumpRequested=false,accumulator=0,elapsed=0,uiTime=0,hiddenUI=false,highQuality=true,toastTimeout,transitionTimeout;
  const keys=new Set(),pointers=new Map();let previousPinch=0;
  const clock=new THREE.Clock();let frames=0,fps=0,fpsTime=0;
  let universe=await universePromise;
  $('load-status').textContent='WASD to walk · 1 / 2 / 3 to change view';$('begin').disabled=false;$('begin').innerHTML='STEP ONTO THE MOON <span>↗</span>';ready=true;
  const map=$('map'),ctx=map.getContext('2d');
  const reliefCanvas=document.createElement('canvas');reliefCanvas.width=120;reliefCanvas.height=80;const reliefCtx=reliefCanvas.getContext('2d');let mapX=Infinity,mapZ=Infinity;
  function drawMap(){
    if(Math.hypot(player.x-mapX,player.z-mapZ)>4){
      mapX=player.x;mapZ=player.z;const image=reliefCtx.createImageData(120,80);
      for(let y=0;y<80;y++)for(let x=0;x<120;x++){
        const wx=mapX+(x-60)*500/120,wz=mapZ+(y-40)*500/120,h=landscape.heightAt(wx,wz),slope=landscape.heightAt(wx-3,wz-3)-h;
        const shade=clamp(34+h*.27+slope*5,18,95),index=(y*120+x)*4,contour=Math.abs(h/3-Math.round(h/3))<.08?15:0;
        image.data[index]=shade+contour;image.data[index+1]=shade+6+contour;image.data[index+2]=shade+9+contour;image.data[index+3]=255;
      }
      reliefCtx.putImageData(image,0,0);
    }
    ctx.drawImage(reliefCanvas,0,0,360,240);ctx.strokeStyle='rgba(170,210,214,.12)';ctx.lineWidth=1;
    for(let x=60;x<360;x+=60){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,240);ctx.stroke();}
    for(let y=60;y<240;y+=60){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(360,y);ctx.stroke();}
    ctx.save();ctx.translate(180,120);ctx.rotate(-(mode==='first'?yaw:followYaw));ctx.fillStyle='#bcded7';ctx.beginPath();ctx.moveTo(0,-9);ctx.lineTo(5,6);ctx.lineTo(-5,6);ctx.closePath();ctx.fill();ctx.restore();
    ctx.strokeStyle='rgba(188,222,215,.35)';ctx.beginPath();ctx.arc(180,120,15,0,Math.PI*2);ctx.stroke();
    const dot=(x,z,color,size)=>{const px=180+(x-player.x)*360/500,pz=120+(z-player.z)*240/500;if(px<5||px>355||pz<5||pz>235)return;ctx.fillStyle=color;ctx.fillRect(px-size/2,pz-size/2,size,size);};
    dot(roverState.x,roverState.z,'#d7b678',7);for(const remote of remotes.values())dot(remote.current.x,remote.current.z,'#b8e4d5',5);
  }
  function toast(text){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$('toast').classList.remove('visible'),3500);}
  const modalOpen=()=>$('help').open||$('crew-dialog').open;
  const remotes=new Map();let rosterSignature='';
  const localState=()=>({...player,riding,rover:{...roverState}});
  const expedition=createExpedition({
    getState:localState,
    onChange(state){
      $('network-status').textContent=state.message;$('network-status').dataset.phase=state.phase;
      $('crew-count').textContent=state.count;$('crew-setup').hidden=state.phase==='connected';
      $('crew-connected').hidden=state.phase!=='connected';$('explorer-name').disabled=state.phase==='connecting'||state.phase==='connected';
      $('host-expedition').disabled=$('join-expedition').disabled=state.phase==='connecting';
      $('crew-presence').hidden=state.phase!=='connected';$('presence-text').textContent=`${state.count} / ${state.max} EXPLORERS · ${state.host?'HOSTING':'CONNECTED'}`;
      if(state.phase==='connected'){
        $('active-code').textContent=state.code;$('invite-link').value=expedition.invite();
        const signature=JSON.stringify([state.name,...[...remotes.values()].map(r=>r.name)]);
        if(signature!==rosterSignature){
          rosterSignature=signature;const list=$('crew-list');list.replaceChildren();
          for(const [name,tag] of [[state.name,'YOU'],...[...remotes.values()].map(r=>[r.name,'EXPLORER'])]){
            const li=document.createElement('li'),label=document.createElement('span'),small=document.createElement('small');label.textContent=name;small.textContent=tag;li.append(label,small);list.append(li);
          }
        }
      }
    },
    onRoster(members){
      const ids=new Set(members.map(m=>m.id));
      for(const [id,remote] of remotes)if(!ids.has(id)){
        remote.astronaut.dispose();disposeObject(remote.rover.root);remote.label.material.map.dispose();remote.label.material.dispose();remote.label.removeFromParent();remotes.delete(id);
      }
      for(const member of members){
        if(!member.state)continue;
        let remote=remotes.get(member.id);
        if(!remote){
          const avatar=createAstronaut(scene,terrain.groundAt,()=>{});avatar.materials.glass.envMap=astronaut.materials.glass.envMap;avatar.materials.gold.envMap=astronaut.materials.gold.envMap;
          const labelCanvas=document.createElement('canvas');labelCanvas.width=512;labelCanvas.height=64;const c=labelCanvas.getContext('2d');c.fillStyle='rgba(5,14,19,.75)';c.fillRect(0,0,512,64);c.fillStyle='#c5e1dc';c.font='25px monospace';c.textAlign='center';c.fillText(member.name.toUpperCase(),256,41);
          const label=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(labelCanvas),transparent:true,depthTest:true}));label.scale.set(2.5,.3125,1);scene.add(label);
          const rv=createRover(scene,landscape.groundAt,member.state.rover||roverState);
          remote={name:member.name,astronaut:avatar,rover:rv,label,current:{...member.state},target:member.state};remotes.set(member.id,remote);
        }
        remote.target=member.state;
      }
    },
    onSpawn(position){
      const x=clamp(position.x,-10950,10950),z=clamp(position.z,-10950,10950);terrain.update(x,z);
      riding=false;Object.assign(player,{x,z,y:terrain.groundAt(x,z),vx:0,vz:0,vy:0,speed:0,grounded:true});resolveObstacles(player,terrain.colliders);
      Object.assign(roverState,createRoverState(landscape.groundAt,player.x+3,player.z+2));resolveObstacles(roverState,terrain.colliders,1.08);roverState.y=landscape.groundAt(roverState.x,roverState.z);
      terrain.update(player.x,player.z);toast('You joined the crew. Look for their callsigns on the surface.');
    },onNotice:toast
  });
  function disposeObject(root){
    const geometries=new Set(),materials=new Set();root.traverse(m=>{if(m.geometry)geometries.add(m.geometry);if(m.material)materials.add(m.material);});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>{m.map?.dispose();m.dispose();});root.removeFromParent();
  }
  try{$('explorer-name').value=localStorage.getItem('selene-callsign')||'Explorer';}catch{$('explorer-name').value='Explorer';}
  const invitedRoom=new URLSearchParams(location.search).get('room');if(invitedRoom)$('room-code').value=invitedRoom.slice(0,8);
  function openCrew(){if(document.pointerLockElement)document.exitPointerLock();keys.clear();$('crew-dialog').showModal();}
  $('crew-button').addEventListener('click',openCrew);$('close-crew').addEventListener('click',()=>$('crew-dialog').close());
  const rememberName=()=>{const name=$('explorer-name').value;try{localStorage.setItem('selene-callsign',name);}catch{}return name;};
  $('host-expedition').addEventListener('click',()=>expedition.host(rememberName()));
  $('join-expedition').addEventListener('click',()=>expedition.join($('room-code').value,rememberName()));
  $('leave-expedition').addEventListener('click',()=>expedition.leave());
  $('copy-invite').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(expedition.invite());toast('Invite copied. Send it to your friends and keep this tab open.');}catch{$('invite-link').focus();$('invite-link').select();toast('Select and copy the invite link.');}});
  window.addEventListener('beforeunload',()=>expedition.leave());
  function controls(){
    $('control-strip').innerHTML=mode==='orbit'?'<span><kbd>DRAG</kbd> Orbit</span><span><kbd>SCROLL</kbd> Zoom</span><span><kbd>1 / 2</kbd> Surface</span>':riding?'<span><kbd>W / S</kbd> Drive / reverse</span><span><kbd>A / D</kbd> Steer</span><span><kbd>SPACE</kbd> Brake</span><span><kbd>E</kbd> Exit</span>':'<span><kbd>W A S D</kbd> Walk</span><span><kbd>SHIFT</kbd> Lope</span><span><kbd>SPACE</kbd> Jump</span><span><kbd>E</kbd> Buggy</span><span><kbd>V</kbd> View</span>';
    $('touch-jump').textContent=riding?'BRAKE':'JUMP';
  }
  function toggleRover(){
    if(!started||mode==='orbit')return;
    if(riding){
      if(roverState.speed>.7){toast('Hold Space to stop before stepping out.');return;}
      const x=roverState.x+Math.cos(roverState.yaw)*1.95,z=roverState.z-Math.sin(roverState.yaw)*1.95;
      Object.assign(player,{x,z,y:terrain.groundAt(x,z),vx:0,vz:0,vy:0,speed:0,grounded:true});resolveObstacles(player,terrain.colliders);player.y=terrain.groundAt(player.x,player.z);riding=false;toast('Back on foot. E to get back in.');
    }else{
      if(Math.hypot(player.x-roverState.x,player.z-roverState.z)>4.2){toast('Walk to your buggy, or use Locate my buggy.');return;}
      riding=true;roverState.vx=roverState.vz=0;followYaw=yaw=roverState.yaw;targetFollowDistance=6.8;toast('W / S drive · A / D steer · Space brake · E exit');
    }
    keys.clear();jumpRequested=false;controls();
  }
  $('rover-action').addEventListener('click',toggleRover);
  $('find-rover').addEventListener('click',()=>{
    if(mode==='orbit')setMode('follow');
    const bearing=Math.atan2(-(roverState.x-player.x),-(roverState.z-player.z));followYaw=yaw=bearing;pitch=-.12;followPitch=.24;
    toast(`Your buggy is ${Math.round(Math.hypot(player.x-roverState.x,player.z-roverState.z))} m ahead. Walk toward it and press E.`);
  });
  function requestLook(){
    if(mode!=='first'||!started||matchMedia('(pointer:coarse)').matches)return;
    try {const promise=canvas.requestPointerLock();if(promise?.catch)promise.catch(()=>{$('resume').hidden=false;});}catch{$('resume').hidden=false;}
  }
  function setMode(next){
    if(!started||next===mode)return;
    if(document.pointerLockElement)document.exitPointerLock();
    const orbitChange=next==='orbit'||mode==='orbit';
    if(orbitChange){$('transition').classList.add('active');clearTimeout(transitionTimeout);transitionTimeout=setTimeout(()=>$('transition').classList.remove('active'),210);}
    if(next==='follow'&&mode==='first')followYaw=yaw;
    if(next==='first')yaw=followYaw;
    mode=next;keys.clear();jumpRequested=false;player.vx=player.vz=0;
    astronaut.root.visible=mode==='follow';$('rover-card').hidden=mode==='orbit';
    $('reticle').hidden=mode!=='first';$('resume').hidden=mode!=='first';$('mini-map').hidden=mode==='orbit';$('surface-note').hidden=mode==='orbit';$('orbit-tools').hidden=mode!=='orbit';
    document.querySelector('.touch-controls').hidden=mode==='orbit';
    document.querySelectorAll('[data-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.view===mode)));
    const index=['first','follow','orbit'].indexOf(mode);$('view-number').textContent=`0${index+1} / 03`;
    $('view-name').textContent=['ON THE SURFACE','ALONGSIDE THE EXPLORER','BEYOND THE HORIZON'][index];
    $('view-description').textContent=['Your eyes. Your footsteps.','Articulated motion. Lunar gravity.','Every crater. Every hemisphere.'][index];
    controls();
    $('telemetry-title').textContent=mode==='orbit'?'ORBITAL TELEMETRY':'SURFACE TELEMETRY';
    $('metric-a-label').textContent=mode==='orbit'?'Camera altitude':'Ground speed';$('metric-b-label').textContent=mode==='orbit'?'Moon diameter':'Height above ground';$('metric-c-label').textContent=mode==='orbit'?'Reference frame':'Locomotion';
    $('earth-label').hidden=$('moon-label').hidden=true;
    if(mode==='orbit'){universe.preset('moon');toast('Scroll to zoom out. Earth + Moon frames both worlds.');}
    else if(mode==='follow')toast('Drag to orbit your astronaut. Space to jump.');
  }
  $('begin').addEventListener('click',()=>{if(!ready)return;started=true;$('welcome').hidden=true;$('hud').hidden=false;$('views').hidden=false;canvas.focus();controls();if(invitedRoom)openCrew();else requestLook();});
  document.querySelector('.brand').addEventListener('click',event=>{event.preventDefault();if(started){if(mode!=='first')setMode('first');toast('1 First person · 2 Astronaut · 3 Orbit');}});
  document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.view)));
  $('resume').addEventListener('click',requestLook);
  $('whole-moon').addEventListener('click',()=>universe.preset('moon'));
  $('earth-moon').addEventListener('click',()=>{universe.preset('system');toast('True scale: the Moon becomes small at this distance.');});
  $('zoom-in').addEventListener('click',()=>universe.zoom(-300));$('zoom-out').addEventListener('click',()=>universe.zoom(300));
  $('return-surface').addEventListener('click',()=>setMode('follow'));
  $('help-button').addEventListener('click',()=>{if(document.pointerLockElement)document.exitPointerLock();keys.clear();$('help').showModal();});
  $('close-help').addEventListener('click',()=>$('help').close());
  $('quality').addEventListener('click',()=>{
    highQuality=!highQuality;renderer.setPixelRatio(Math.min(devicePixelRatio,highQuality?1.65:1));
    sun.shadow.mapSize.setScalar(highQuality?2048:1024);sun.shadow.map?.dispose();sun.shadow.map=null;
    $('quality').textContent=highQuality?'HIGH DETAIL':'BALANCED';
    toast(highQuality?'High detail rendering':'Balanced rendering for smoother movement');
  });
  document.addEventListener('pointerlockchange',()=>{$('resume').hidden=!started||mode!=='first'||document.pointerLockElement===canvas;if(mode==='first'&&!document.pointerLockElement)keys.clear();});
  function moveLook(dx,dy){
    if(mode==='first'){yaw-=dx*.0025;pitch=clamp(pitch-dy*.0022,-1.38,1.28);}
    else if(mode==='follow'){followYaw-=dx*.004;followPitch=clamp(followPitch+dy*.0035,-.12,1.32);}
    else{universe.state.yaw-=dx*.004;universe.state.pitch=clamp(universe.state.pitch+dy*.004,-1.49,1.49);}
  }
  canvas.addEventListener('pointerdown',event=>{
    if(!started||modalOpen())return;pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});canvas.setPointerCapture(event.pointerId);
    if(event.pointerType==='mouse'&&mode==='first'&&event.button===0)requestLook();
  });
  canvas.addEventListener('pointermove',event=>{
    if(!started||modalOpen())return;
    if(document.pointerLockElement===canvas){moveLook(event.movementX,event.movementY);return;}
    const old=pointers.get(event.pointerId);if(!old)return;
    const dx=event.clientX-old.x,dy=event.clientY-old.y;pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pointers.size===2){const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);if(previousPinch){if(mode==='orbit')universe.zoom((previousPinch-distance)*4);else if(mode==='follow')targetFollowDistance=clamp(targetFollowDistance*Math.exp((previousPinch-distance)*.01),2.2,80);}previousPinch=distance;}
    else moveLook(dx,dy);
  });
  const release=event=>{pointers.delete(event.pointerId);previousPinch=0;};canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
  canvas.addEventListener('wheel',event=>{if(!started)return;event.preventDefault();if(mode==='orbit')universe.zoom(event.deltaY);else if(mode==='follow'){targetFollowDistance=clamp(targetFollowDistance*Math.exp(event.deltaY*.0015),2.2,80);if(targetFollowDistance>=79)toast('Press 3 for the whole Moon and Earth.');}},{passive:false});
  canvas.addEventListener('contextmenu',event=>event.preventDefault());
  const movementKeys=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','Space'];
  document.addEventListener('keydown',event=>{
    if(!started||modalOpen()||['INPUT','TEXTAREA'].includes(event.target.tagName))return;
    if(movementKeys.includes(event.code))event.preventDefault();
    if(event.repeat){keys.add(event.code);return;}
    if(event.code==='Digit1')setMode('first');if(event.code==='Digit2')setMode('follow');if(event.code==='Digit3')setMode('orbit');
    if(event.code==='KeyV'){const list=['first','follow','orbit'];setMode(list[(list.indexOf(mode)+1)%3]);}
    if(event.code==='KeyH'){hiddenUI=!hiddenUI;document.body.classList.toggle('ui-hidden',hiddenUI);}
    if(event.code==='KeyE')toggleRover();
    if(event.code==='Space'&&mode!=='orbit')jumpRequested=true;
    keys.add(event.code);
  });
  document.addEventListener('keyup',event=>keys.delete(event.code));
  const clearInput=()=>{keys.clear();pointers.clear();jumpRequested=false;accumulator=0;};window.addEventListener('blur',clearInput);document.addEventListener('visibilitychange',()=>{clearInput();clock.getDelta();});
  document.querySelectorAll('[data-key]').forEach(button=>{
    button.addEventListener('pointerdown',event=>{event.preventDefault();keys.add(button.dataset.key);button.setPointerCapture(event.pointerId);});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,()=>keys.delete(button.dataset.key));
  });
  $('touch-jump').addEventListener('pointerdown',event=>{event.preventDefault();if(riding){keys.add('Space');$('touch-jump').setPointerCapture(event.pointerId);}else jumpRequested=true;});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])$('touch-jump').addEventListener(type,()=>keys.delete('Space'));
  window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=universe.camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();universe.camera.updateProjectionMatrix();});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();failure(new Error('The graphics context was interrupted. Reload to reconnect.'));});

  function updateCamera(dt){
    if(mode==='first'){
      const bob=!riding&&started&&player.grounded?Math.sin(player.distance*7)*Math.min(.018,player.speed*.012):0;
      camera.position.set(player.x,player.y+1.76+bob,player.z);
      camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0,'YXZ');
    } else {
      followDistance=damp(followDistance,targetFollowDistance,7,dt);
      const horizontal=Math.cos(followPitch)*followDistance;
      const desired=new THREE.Vector3(player.x+Math.sin(followYaw)*horizontal,player.y+1.25+Math.sin(followPitch)*followDistance,player.z+Math.cos(followYaw)*horizontal);
      const target=new THREE.Vector3(player.x,player.y+1.18,player.z);
      // Keep the orbit camera above ridges along the entire sightline.
      for(let i=1;i<=12;i++){const t=i/12,x=THREE.MathUtils.lerp(target.x,desired.x,t),z=THREE.MathUtils.lerp(target.z,desired.z,t),lineY=THREE.MathUtils.lerp(target.y,desired.y,t),floor=landscape.groundAt(x,z)+.25;if(lineY<floor)desired.y+=(floor-lineY)/t;}
      // Prevent the camera from entering nearby boulders when orbiting the player.
      const sight=desired.clone().sub(target),length=sight.length(),ray=new THREE.Raycaster(target,sight.normalize(),0,length);
      let clearDistance=length;
      for(const r of terrain.rocks){
        if(Math.hypot(r.x-player.x,r.z-player.z)>length+3||r.radius<.2)continue;
        const bounds=new THREE.Box3(new THREE.Vector3(r.x-r.radius,r.bottom,r.z-r.radius),new THREE.Vector3(r.x+r.radius,r.top,r.z+r.radius));
        const hit=ray.ray.intersectBox(bounds,new THREE.Vector3());if(hit)clearDistance=Math.min(clearDistance,Math.max(1.1,hit.distanceTo(target)-.25));
      }
      if(clearDistance<length)desired.copy(target).addScaledVector(sight,clearDistance);
      camera.position.copy(desired);camera.lookAt(target);
    }
    sky.update(camera);
    sun.target.position.set(player.x,player.y,player.z);sun.position.copy(sun.target.position).addScaledVector(sky.sunDirection,200);sun.target.updateMatrixWorld();
  }
  function updateLabels(){
    for(const [id,object,radius] of [['moon-label',universe.moon,MOON_RADIUS],['earth-label',universe.earth,6371]]){
      const projected=object.position.clone().project(universe.camera),show=universe.state.distance>50000&&projected.z>-1&&projected.z<1&&Math.abs(projected.x)<.92&&Math.abs(projected.y)<.9;
      $(id).hidden=!show;if(show){$(id).style.left=`${(projected.x*.5+.5)*innerWidth+12}px`;$(id).style.top=`${(-projected.y*.5+.5)*innerHeight+13}px`;}
    }
  }
  function updateHUD(){
    const orbit=mode==='orbit';
    if(orbit){
      $('metric-a').innerHTML=(universe.camera.position.distanceTo(universe.moon.position)-MOON_RADIUS).toLocaleString('en',{maximumFractionDigits:0})+' <small>km</small>';
      $('metric-b').innerHTML='3,474.8 <small>km</small>';$('metric-c').textContent=universe.state.distance>90000?'EARTH–MOON':'MOON';$('coordinates').textContent='LRO / WAC + LOLA';
    }else{
      const clearance=Math.max(0,player.y-terrain.groundAt(player.x,player.z));
      $('metric-a').innerHTML=player.speed.toFixed(1)+' <small>m/s</small>';$('metric-b').innerHTML=clearance.toFixed(2)+' <small>m</small>';
      $('metric-c').textContent=riding?(roverState.grounded?'DRIVING / LRV':'LRV / AIRBORNE'):!player.grounded?(player.vy>0?'ASCENDING':'DESCENDING'):player.speed>.1?(player.speed>1.65?'LOPING':'WALKING'):'STANDING';
      $('coordinates').textContent=`${Math.abs(player.x).toFixed(1)} ${player.x>=0?'E':'W'}  /  ${Math.abs(player.z).toFixed(1)} ${player.z<=0?'N':'S'}  m`;
      $('surface-state').textContent=riding?'LUNAR ROVING VEHICLE / ELECTRIC DRIVE':player.grounded?'CONTACT / REGOLITH':'FREE FLIGHT / 1.62 m/s²';
      const roverDistance=Math.hypot(player.x-roverState.x,player.z-roverState.z);
      $('rover-status').textContent=riding?'YOU ARE AT THE WHEEL':`BUGGY · ${roverDistance.toFixed(0)} M AWAY`;
      $('rover-hint').textContent=riding?'W / S drive. A / D steer. Space brakes.':roverDistance<4.2?'Your buggy is within reach. Press E to drive.':'The gold square on your map marks your buggy.';
      $('rover-action').innerHTML=riding?'Exit buggy <kbd>E</kbd>':'Enter buggy <kbd>E</kbd>';$('rover-action').disabled=!riding&&roverDistance>=4.2;$('find-rover').hidden=riding;
      const heading=((-((mode==='first'?yaw:followYaw)*180/Math.PI)%360)+360)%360;$('heading').textContent=String(Math.round(heading)%360).padStart(3,'0')+'°';drawMap();
    }
  }

  // Reflect the actual terrain and sun in the helmet's gold visor.
  updateCamera(.016);
  const cubeTarget=new THREE.WebGLCubeRenderTarget(128,{generateMipmaps:true,minFilter:THREE.LinearMipmapLinearFilter});const cube=new THREE.CubeCamera(.05,30000,cubeTarget);cube.position.set(player.x,player.y+1.8,player.z);cube.update(renderer,scene);astronaut.materials.glass.envMap=cubeTarget.texture;astronaut.materials.glass.envMapIntensity=.8;astronaut.materials.gold.envMap=cubeTarget.texture;
  let lastBound=-10;
  function animate(){
    requestAnimationFrame(animate);
    const dt=Math.min(clock.getDelta(),.08);if(document.hidden)return;
    elapsed+=dt;frames++;fpsTime+=dt;if(fpsTime>=1){fps=frames/fpsTime;frames=0;fpsTime=0;}
    if(started&&mode!=='orbit'&&!modalOpen()){
      const inputX=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),inputZ=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0);
      const angle=mode==='first'?yaw:followYaw,fast=keys.has('ShiftLeft')||keys.has('ShiftRight');
      const input={x:Math.cos(angle)*inputX-Math.sin(angle)*inputZ,z:-Math.sin(angle)*inputX-Math.cos(angle)*inputZ,fast,jump:jumpRequested};
      accumulator=Math.min(accumulator+dt,.16);
      while(accumulator>=FIXED_STEP){
        if(riding){
          const oldYaw=roverState.yaw,oldX=player.x,oldZ=player.z;
          stepRover(roverState,{throttle:inputZ,steer:-inputX,brake:keys.has('Space'),fast},FIXED_STEP,landscape.groundAt,terrain.colliders);
          const turn=angleDelta(oldYaw,roverState.yaw);yaw+=turn;followYaw+=turn;
          Object.assign(player,{x:roverState.x-Math.cos(roverState.yaw)*.39,z:roverState.z+Math.sin(roverState.yaw)*.39,y:roverState.y,yaw:roverState.yaw,vx:roverState.vx,vz:roverState.vz,vy:roverState.vy,speed:roverState.speed,grounded:roverState.grounded,landed:false});
          player.distance+=Math.hypot(player.x-oldX,player.z-oldZ);
        }else{
          const oldX=player.x,oldZ=player.z,oldDistance=player.distance;
          if(fast&&player.speed>1.9&&player.grounded&&elapsed-lastBound>.85&&!input.jump){player.vy=.60;player.grounded=false;lastBound=elapsed;}
          stepPlayer(player,input,FIXED_STEP,terrain.groundAt);resolveObstacles(player,terrain.colliders,.32,terrain.rockTopAt);
          resolveObstacles(player,[{x:roverState.x,z:roverState.z,radius:1.1,bottom:roverState.y,top:roverState.y+1.2}]);
          player.speed=Math.hypot(player.vx,player.vz);if(player.grounded)player.y=terrain.groundAt(player.x,player.z);
          player.distance=oldDistance+Math.hypot(player.x-oldX,player.z-oldZ);
        }
        input.jump=false;jumpRequested=false;accumulator-=FIXED_STEP;
      }
      terrain.update(player.x,player.z);if(riding)astronaut.updateSeated({...player,rover:roverState},dt);else astronaut.update(player,dt,pitch);
      rover.update(roverState,dt);
      if(riding&&roverState.speed>.5&&roverState.grounded&&frames%8===0){
        for(const side of [-1,1]){
          const x=roverState.x+Math.cos(roverState.yaw)*side+Math.sin(roverState.yaw),z=roverState.z-Math.sin(roverState.yaw)*side+Math.cos(roverState.yaw);
          terrain.wheelTrack({x,y:landscape.groundAt(x,z),z},roverState.yaw);
        }
      }
    }
    terrain.updateDust(dt);expedition.update(elapsed);
    for(const remote of remotes.values()){
      const p=remote.current,t=remote.target;
      const snap=Math.hypot(p.x-t.x,p.z-t.z)>12;
      for(const key of ['x','y','z','vx','vz','vy','speed','distance'])p[key]=snap?t[key]:damp(p[key],t[key],13,dt);
      p.yaw+=angleDelta(p.yaw,t.yaw)*(1-Math.exp(-dt*13));p.grounded=t.grounded;p.riding=t.riding;
      remote.astronaut.root.visible=started&&Math.hypot(p.x-player.x,p.z-player.z)<300;
      if(p.riding)remote.astronaut.updateSeated({...p,rover:t.rover},dt);else remote.astronaut.update(p,dt);
      remote.label.visible=remote.astronaut.root.visible;remote.label.position.set(p.x,p.y+2.48,p.z);
      if(t.rover){
        remote.rover.root.visible=started&&Math.hypot(t.rover.x-player.x,t.rover.z-player.z)<450;
        remote.rover.update(t.rover,dt);
      }else remote.rover.root.visible=false;
    }
    if(mode==='orbit'){universe.update(dt);updateLabels();renderer.render(universe.scene,universe.camera);}
    else{updateCamera(dt);renderer.render(scene,camera);}
    uiTime+=dt;if(started&&uiTime>.15){updateHUD();uiTime=0;}
  }
  // Read-only diagnostic snapshot used by the local integration checks.
  window.selene=Object.freeze({snapshot:()=>({ready,started,mode,riding,rover:{...roverState},network:expedition.snapshot(),remoteCount:remotes.size,nearbyRocks:terrain.rocks.filter(r=>Math.hypot(r.x-player.x,r.z-player.z)<20).map(r=>({...r})),player:{...player},camera:{x:camera.position.x,y:camera.position.y,z:camera.position.z},orbitDistance:universe.state.distance,targetOrbitDistance:universe.state.targetDistance,moonRadius:MOON_RADIUS,earthDistance:EARTH_DISTANCE,footsteps:footstepCount,feet:astronaut.legs.map(l=>({position:l.world.toArray(),swing:l.swing,kneeQuaternion:l.lower.quaternion.toArray(),hipQuaternion:l.upper.quaternion.toArray()})),fps,ground:terrain.groundAt(player.x,player.z),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles})});
  animate();
}
