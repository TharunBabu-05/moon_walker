import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import fs from 'node:fs/promises';
import {GLTFLoader} from '../vendor/loaders/GLTFLoader.js';
import {RaceWorld,newRacer,driveRacer} from '../src/race-physics.js';
import {RacePrediction} from '../src/race-motion.js';
import {RACE_CONTACT,moveVehicleWithRocks} from '../src/vehicle-contact.js';
import {createRockQuery,rockCell} from '../src/rock-layout.js';
import {buildRockHeightfield,sampleRockHeightfield} from '../src/rock-heightfield.js';
import {SLOPE_ROCKS,slopeRockHeight} from '../src/stadium-layout.js';
import {createLandscape} from '../src/landscape.js';
import {createRoverState,stepRover} from '../src/world.js';
const flat=()=>0,environment=rocks=>({nearby:()=>rocks});
const driver=(yaw=0)=>Object.assign(newRacer('p',0,0,'P',flat),{x:0,z:8,yaw});

test('exploration buggy carries uphill velocity into lunar flight and lands after a crest',()=>{
 const ground=(_x,z)=>2*Math.exp(-z*z/32),p=createRoverState(ground,0,10);Object.assign(p,{yaw:0,vz:-5,speed:5});
 let takeoff=null,airborne=0,clearance=0;
 for(let i=0;i<1200;i++){
  const was=p.grounded;stepRover(p,{throttle:1},1/120,ground);
  if(was&&!p.grounded&&!takeoff)takeoff={vy:p.vy,z:p.z};
  if(!p.grounded){airborne++;clearance=Math.max(clearance,p.y-ground(p.x,p.z));}
  assert.ok(p.y>=ground(p.x,p.z)-1e-8);
 }
 assert.ok(takeoff?.vy>.4,'uphill velocity survives take-off');assert.ok(airborne>60&&clearance>.2);assert.ok(p.grounded);
});

test('a solid rock gives a bounded rebound and recovery without turning small stones into walls',()=>{
 const p=createRoverState(flat,0,5);Object.assign(p,{yaw:0,vz:-5,speed:5});let impact=0,rebound=0;
 const rock={x:0,z:0,radius:.7,bottom:0,top:1.3};
 for(let i=0;i<180;i++){stepRover(p,{throttle:0},1/120,flat,[rock]);impact=Math.max(impact,p.impact);rebound=Math.max(rebound,p.vz);}
 assert.ok(p.z>1.3);assert.ok(impact>.3&&impact<=1);assert.ok(rebound>.1&&rebound<=.51);
 const stop=p.z;for(let i=0;i<200;i++)stepRover(p,{throttle:-1},1/120,flat,[rock]);assert.ok(p.z>stop+1);
});

test('race chassis clears low central stones forward and in reverse at different headings',()=>{
 for(const yaw of [0,.72,2.1])for(const throttle of [-1,1]){
  const p=driver(yaw),rock={x:p.x-Math.sin(yaw)*6*throttle,z:p.z-Math.cos(yaw)*6*throttle,radius:.29,bottom:0,top:.53};
  for(let i=0;i<600;i++)driveRacer(p,{throttle},1/60,flat,[],environment([rock]));
  assert.ok((-Math.sin(yaw)*p.x-Math.cos(yaw)*(p.z-8))*throttle>15);
 }
});
test('tyre-sized stones lift one side and suspension settles after crossing',()=>{
 const p=driver(),rock={x:1.57,z:0,radius:.38,bottom:0,top:.28};let rise=0,roll=0;
 for(let i=0;i<360;i++){driveRacer(p,{throttle:1},1/60,flat,[],environment([rock]));rise=Math.max(rise,p.y);roll=Math.max(roll,Math.abs(p.roll));}
 assert.ok(p.z<-10);assert.ok(rise>.03&&rise<.35);assert.ok(roll>.005);assert.ok(Math.abs(p.y)<.001);
});
test('tall stones stop the chassis and tyre paths; reverse can escape',()=>{
 for(const [x,radius,top] of [[0,.8,1.2],[1.57,.4,.62]]){
  const p=driver(),rock={x,z:0,radius,bottom:0,top};
  for(let i=0;i<360;i++)driveRacer(p,{throttle:1},1/60,flat,[],environment([rock]));
  assert.ok(p.z>1,JSON.stringify(p));const stop=p.z;
  for(let i=0;i<180;i++)driveRacer(p,{throttle:-1},1/60,flat,[],environment([rock]));assert.ok(p.z>stop+2);
 }
});
test('fast contact sweeps prevent tunnelling through narrow stones',()=>{
 const p=driver();Object.assign(p,{x:0,z:-4,vz:-80});
 const rock={x:0,z:0,radius:.18,bottom:0,top:1.1};
 assert.ok(moveVehicleWithRocks(p,0,4,flat,[rock],null,RACE_CONTACT)>70);assert.ok(p.z>1.9);
});
test('a collider bounding circle does not block empty space around the visible mesh',()=>{
 const p=driver();p.x=2.3;const rock={x:0,z:0,radius:4,bottom:0,top:3};
 const env={nearby:()=>[rock],surfaceAt:(_r,x,z)=>Math.abs(x)<.4&&Math.abs(z)<.4?3:-Infinity};
 for(let i=0;i<360;i++)driveRacer(p,{throttle:1},1/60,flat,[],env);assert.ok(p.z<-10);
});
test('host and prediction agree on remote rock impacts even far from the host viewer',()=>{
 const env=environment([{x:0,z:0,radius:.8,bottom:0,top:1.4}]),world=new RaceWorld(flat,env);world.join('p',0,0,'P');Object.assign(world.racers.get('p'),driver());
 const prediction=new RacePrediction(flat,env);prediction.accept(world.racers.get('p'));
 for(let i=0;i<360;i++){world.input('p',{throttle:1,seq:i+1});world.step(1/60);prediction.update(1/60,{throttle:1});}
 assert.ok(world.racers.get('p').z>2);assert.ok(Math.abs(world.racers.get('p').z-prediction.state.z)<.001);
});
test('rock records are independent of viewer and query traversal order',()=>{
 const a=createRockQuery(flat,[1,.8,1.2]),b=createRockQuery(flat,[1,.8,1.2]);
 a(2500,600);a(-1800,-450);const expected=rockCell(8,7,flat,[1,.8,1.2]);
 for(const r of expected){assert.deepEqual(a(r.x,r.z).find(q=>q.x===r.x&&q.z===r.z),r);assert.deepEqual(b(r.x,r.z).find(q=>q.x===r.x&&q.z===r.z),r);}
});
test('cached model height follows translated, scaled and rotated mesh footprints',()=>{
 const geo=new THREE.BoxGeometry(.8,1,1.4).translate(0,.5,0),field=buildRockHeightfield([geo]),r={x:8,z:-9,bottom:4,radius:2,yaw:Math.PI/2};
 assert.ok(Math.abs(sampleRockHeightfield(field,r,8,-9)-6)<.001);
 assert.ok(Number.isFinite(sampleRockHeightfield(field,r,9,-9)));
 assert.equal(sampleRockHeightfield(field,r,8,-7.8),-Infinity);
});
test('large bedrock shelves have continuous drivable toes and solid lunar ground',()=>{
 const ground=createLandscape().groundAt;assert.equal(SLOPE_ROCKS.length,18);
 for(const p of SLOPE_ROCKS){let previous=0,peak=0;
  for(let z=-p.length;z<=p.length;z+=.2){const x=p.x+p.s*z,wz=p.z+p.c*z,h=slopeRockHeight(p,x,wz);assert.ok(Math.abs(h-previous)<1);assert.ok(Number.isFinite(ground(x,wz)));peak=Math.max(peak,h);previous=h;}
  assert.ok(peak>p.height*.9);
 }
});

test('photographed rock collision fields match the actual asset triangles',async()=>{
 globalThis.ProgressEvent??=class {constructor(type,data){this.type=type;Object.assign(this,data);}};
 for(const id of ['moon_rock_01','moon_rock_03','moon_rock_05']){
  const path=`assets/rocks/${id}/`,gltf=JSON.parse(await fs.readFile(path+'model.gltf','utf8'));
  for(const b of gltf.buffers)b.uri='data:application/octet-stream;base64,'+(await fs.readFile(path+b.uri)).toString('base64');
  for(const m of gltf.meshes)for(const p of m.primitives)delete p.material;delete gltf.materials;delete gltf.textures;delete gltf.images;
  const {scene}=await new GLTFLoader().parseAsync(JSON.stringify(gltf),'');scene.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(scene),center=bounds.getCenter(new THREE.Vector3()),radius=Math.hypot(bounds.max.x-bounds.min.x,bounds.max.z-bounds.min.z)/2,geos=[];
  scene.traverse(m=>{if(m.isMesh&&m.name.endsWith('_LOD0'))geos.push(m.geometry.clone().applyMatrix4(m.matrixWorld).translate(-center.x,-bounds.min.y,-center.z).scale(1/radius,1/radius,1/radius));});
  assert.ok(geos.length>0);const field=buildRockHeightfield(geos),r={x:0,z:0,bottom:0,radius:1,yaw:0},ray=new THREE.Raycaster(),mesh=new THREE.Mesh(geos[0],new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));let compared=0;
  for(let ix=-5;ix<=5;ix++)for(let iz=-3;iz<=3;iz++){
   const x=ix*.12,z=iz*.12;ray.set(new THREE.Vector3(x,5,z),new THREE.Vector3(0,-1,0));const hit=ray.intersectObject(mesh)[0];if(!hit)continue;
   const cached=sampleRockHeightfield(field,r,x,z);assert.ok(Number.isFinite(cached));assert.ok(Math.abs(cached-hit.point.y)<.055,`${id} surface mismatch: ${cached} vs ${hit.point.y}`);compared++;
  }
  assert.ok(compared>10);const p=driver(),rock={...r,radius:3,top:(bounds.max.y-bounds.min.y)/radius*3};
  for(let i=0;i<360;i++)driveRacer(p,{throttle:1},1/60,flat,[],{nearby:()=>[rock],surfaceAt:(r,x,z)=>sampleRockHeightfield(field,r,x,z)});
  assert.ok(p.z>1,`${id} must stop an approaching race car`);
 }
});
