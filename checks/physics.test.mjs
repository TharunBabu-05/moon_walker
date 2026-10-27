import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayer,stepPlayer,FIXED_STEP,GRAVITY,JUMP_SPEED,SURFACE_LIMIT} from '../src/physics.js';
import {createLandscape} from '../src/terrain.js';
const flat=()=>0;
const idle={x:0,z:0,fast:false,jump:false};
test('falling beside a tall rock does not teleport boots onto its summit',()=>{
  const p=createPlayer(flat);Object.assign(p,{y:.4,vy:-.5,grounded:false});
  stepPlayer(p,idle,FIXED_STEP,()=>2);
  assert.equal(p.grounded,false);assert.ok(p.y<.4);
});

test('an airborne approach to a cliff stays outside and lands at its base',()=>{
  const cliff=x=>x>=.02?2:0,p=createPlayer(cliff);
  Object.assign(p,{y:.4,vy:-.5,grounded:false,vx:2});
  for(let i=0;i<180;i++)stepPlayer(p,{...idle,x:1},FIXED_STEP,cliff);
  assert.ok(p.x<.02);assert.equal(p.y,0);assert.equal(p.grounded,true);
});
test('lunar jump follows the expected apex and flight time',()=>{
  const p=createPlayer(flat);stepPlayer(p,{...idle,jump:true},FIXED_STEP,flat);
  let apex=p.y,time=FIXED_STEP;
  while(!p.grounded&&time<10){stepPlayer(p,idle,FIXED_STEP,flat);apex=Math.max(apex,p.y);time+=FIXED_STEP;}
  assert.ok(Math.abs(apex-JUMP_SPEED**2/(2*GRAVITY))<.02,`apex=${apex}`);
  assert.ok(Math.abs(time-2*JUMP_SPEED/GRAVITY)<.025,`flight=${time}`);
  assert.equal(p.y,0);assert.equal(p.vy,0);assert.equal(p.grounded,true);
});
test('diagonal input cannot move faster than straight walking',()=>{
  const a=createPlayer(flat),b=createPlayer(flat);
  for(let i=0;i<360;i++){stepPlayer(a,{...idle,z:-1},FIXED_STEP,flat);stepPlayer(b,{...idle,x:1,z:-1},FIXED_STEP,flat);}
  assert.ok(Math.abs(a.distance-b.distance)<1e-10);assert.ok(Math.abs(a.speed-1.1)<1e-9);
});
test('fixed-step movement is independent of rendering at 30, 60 or 144 FPS',()=>{
  const results=[30,60,144].map(fps=>{const p=createPlayer(flat);let acc=0;for(let frame=0;frame<fps*4;frame++){acc+=1/fps;while(acc+1e-10>=FIXED_STEP){stepPlayer(p,{...idle,z:-1},FIXED_STEP,flat);acc-=FIXED_STEP;}}return p.z;});
  assert.ok(Math.max(...results)-Math.min(...results)<1e-9);
});
test('ground contact follows slopes and velocity settles after input release',()=>{
  const slope=(x,z)=>x*.2+z*.1,p=createPlayer(slope);
  for(let i=0;i<300;i++){stepPlayer(p,{...idle,x:1},FIXED_STEP,slope);assert.ok(Math.abs(p.y-slope(p.x,p.z))<1e-10);}
  for(let i=0;i<120;i++)stepPlayer(p,idle,FIXED_STEP,slope);
  assert.equal(p.speed,0);assert.equal(p.grounded,true);
});
test('unwalkable slopes and the terrain boundary do not let the player fall through',()=>{
  const slope=(x)=>x*1.2,p=createPlayer(slope);for(let i=0;i<100;i++)stepPlayer(p,{...idle,x:1},FIXED_STEP,slope);assert.equal(p.x,0);
  const edge=createPlayer(flat);edge.x=SURFACE_LIMIT-.01;for(let i=0;i<100;i++)stepPlayer(edge,{...idle,x:1},FIXED_STEP,flat);assert.equal(edge.x,SURFACE_LIMIT);
});
test('terrain contact agrees with the mesh at vertices and is continuous at cell edges',()=>{
  const l=createLandscape();for(let i=0;i<100;i++){const x=i*.5-20,z=i*.5-10;assert.ok(Math.abs(l.groundAt(x,z)-l.heightAt(x,z))<1e-10);assert.ok(Math.abs(l.groundAt(x-1e-7,z+.19)-l.groundAt(x+1e-7,z+.19))<1e-5);}
});
