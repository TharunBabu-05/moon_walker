import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoverState,stepRover,resolveObstacles,roverRockBlocks,roverWheelHeight} from '../src/world.js';
import {sanitizeState,cleanName} from '../src/multiplayer.js';
import {FIXED_STEP,createPlayer} from '../src/physics.js';
const flat=()=>0;
test('a low stone between the wheel tracks passes below the buggy in either direction',()=>{
  for(const throttle of [-1,1])for(const yaw of [0,Math.PI/3]){
    const p=createRoverState(flat,0,0);p.yaw=yaw;
    const rock={x:-Math.sin(yaw)*4*throttle,z:-Math.cos(yaw)*4*throttle,radius:.23,bottom:0,top:.18};
    for(let i=0;i<1200;i++)stepRover(p,{throttle},FIXED_STEP,flat,[rock]);
    const progress=(-Math.sin(yaw)*p.x-Math.cos(yaw)*p.z)*throttle;
    assert.ok(progress>8,`small stone blocked rover at ${progress}m`);
  }
});
test('small tyre bumps lift suspension and the buggy continues over them',()=>{
  const rock={x:1.01,z:-4,radius:.25,bottom:0,top:.18},p=createRoverState(flat,0,0);p.yaw=0;
  let rise=0,roll=0;
  for(let i=0;i<1200;i++){stepRover(p,{throttle:1},FIXED_STEP,flat,[rock]);rise=Math.max(rise,p.y);roll=Math.max(roll,Math.abs(p.roll));}
  assert.ok(p.z<-8);assert.ok(rise>.02&&rise<.22);assert.ok(roll>.005);assert.ok(Math.abs(p.y)<.001);
  assert.equal(roverWheelHeight(rock.x,rock.z,flat,[rock],()=>.13),.13,'uses model height when available');
});
test('clearance distinguishes underbody stones, tall tyre obstacles and chassis impacts',()=>{
  const p=createRoverState(flat,0,0);p.yaw=0;
  const rock={x:0,z:0,radius:.2,bottom:0,top:.30};
  assert.equal(roverRockBlocks(p,rock,flat),false);
  assert.equal(roverRockBlocks(p,{...rock,x:1.01},flat),true,'30 cm ledge exceeds tyre step limit');
  assert.equal(roverRockBlocks(p,{...rock,top:.5},flat),true,'stone reaches the chassis');
  p.roll=-.3;
  assert.equal(roverRockBlocks(p,{...rock,x:.6,radius:.1,top:.25},flat),true,'lower side of tilted chassis reduces clearance');
});
test('clearance is measured in world height on raised terrain',()=>{
  const ground=()=>100,p=createRoverState(ground,0,0);p.yaw=0;
  const rock={x:0,z:-4,radius:.23,bottom:100,top:100.18};
  for(let i=0;i<1200;i++)stepRover(p,{throttle:1},FIXED_STEP,ground,[rock]);
  assert.ok(p.z<-8);assert.equal(p.y,100);
});
test('walker collision uses the rock surface instead of rejecting empty space inside its broad bound',()=>{
  const rock={x:0,z:0,radius:2,bottom:0,top:1};
  const surface=(_rock,x,z)=>Math.abs(x)<.7&&Math.abs(z)<.7?1:-Infinity;
  const near={x:1.5,z:0,y:0,vx:-1,vz:0};
  assert.equal(resolveObstacles(near,[rock],.32,surface),false);
  const touching={x:.8,z:0,y:0,vx:-1,vz:0};
  assert.equal(resolveObstacles(touching,[rock],.32,surface),true);
  assert.ok(touching.x>=1.02&&touching.x<1.1,'push only to the actual edge');
  const onTop={x:.4,z:0,y:1,vx:0,vz:0};
  assert.equal(resolveObstacles(onTop,[rock],.32,surface),false);
});
test('a body slides around a solid rock and can stand above it',()=>{
  const rock={x:0,z:0,radius:1,bottom:0,top:1.2};
  const p={x:.8,z:.2,y:0,vx:-1,vz:.4};assert.equal(resolveObstacles(p,[rock]),true);
  assert.ok(Math.hypot(p.x,p.z)>=1.32);assert.ok(p.vx*p.x+p.vz*p.z>=-1e-6);
  const above={x:0,z:0,y:1.3,vx:0,vz:0};assert.equal(resolveObstacles(above,[rock]),false);
  const onUnevenTop={x:.2,z:0,y:.65,vx:0,vz:0};assert.equal(resolveObstacles(onUnevenTop,[rock],.32,()=>.65),false,'rendered top contact is supported below the highest point');
});
test('rover accelerates, steers and brakes without leaving flat ground',()=>{
  const p=createRoverState(flat,0,0);p.yaw=0;
  for(let i=0;i<600;i++)stepRover(p,{throttle:1},FIXED_STEP,flat);
  assert.ok(p.z<-6);assert.ok(p.speed>3);assert.equal(p.y,0);
  const yaw=p.yaw;for(let i=0;i<120;i++)stepRover(p,{throttle:1,steer:1},FIXED_STEP,flat);
  assert.ok(p.yaw>yaw+.1);
  for(let i=0;i<360;i++)stepRover(p,{brake:true},FIXED_STEP,flat);
  assert.ok(p.speed<.03,`speed=${p.speed}`);
});
test('rover collides with a boulder instead of driving through it',()=>{
  const p=createRoverState(flat,0,0);p.yaw=0;
  const rock={x:0,z:-6,radius:2,bottom:-.1,top:2};
  for(let i=0;i<1500;i++)stepRover(p,{throttle:1},FIXED_STEP,flat,[rock]);
  assert.ok(Math.hypot(p.x-rock.x,p.z-rock.z)>=3.08);assert.ok(p.z>-6);
});
test('rover falls from a ledge under lunar gravity and lands',()=>{
  const p=createRoverState(flat,0,0);p.y=2;p.grounded=false;
  for(let i=0;i<120;i++)stepRover(p,{},FIXED_STEP,flat);
  assert.ok(Math.abs(p.y-(2-.81))<.02);assert.ok(p.vy< -1.6);
  for(let i=0;i<120;i++)stepRover(p,{},FIXED_STEP,flat);assert.equal(p.y,0);assert.equal(p.grounded,true);
});
test('network snapshots accept valid explorers and reject malformed coordinates',()=>{
  const p={...createPlayer(flat),rover:createRoverState(flat),riding:true};
  assert.equal(sanitizeState(p).riding,true);assert.equal(sanitizeState({...p,x:Infinity}),null);
  assert.equal(sanitizeState({...p,z:1e7}),null);assert.equal(sanitizeState({...p,rover:{...p.rover,x:'bad'}}),null);
  assert.equal(cleanName('<Pilot>\n'),'Pilot');assert.equal(cleanName(''), 'Explorer');
});
