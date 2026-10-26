import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoverState,stepRover,resolveObstacles} from '../src/world.js';
import {sanitizeState,cleanName} from '../src/multiplayer.js';
import {FIXED_STEP,createPlayer} from '../src/physics.js';
const flat=()=>0;
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
