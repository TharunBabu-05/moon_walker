import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayer,stepPlayer,enforceTerrainFloor,FIXED_STEP,GRAVITY,JUMP_SPEED,SURFACE_LIMIT} from '../src/physics.js';
import {createLandscape} from '../src/terrain.js';
const flat=()=>0;
const idle={x:0,z:0,fast:false,jump:false};
test('an explorer already below the surface recovers instead of falling forever',()=>{
  const ground=(x,z)=>20+x*.2-z*.1;
  for(const depth of [.001,.08,2,1000]){
    const p=createPlayer(ground);Object.assign(p,{y:p.y-depth,vy:-30,grounded:false});
    stepPlayer(p,idle,FIXED_STEP,ground);
    assert.equal(p.grounded,true);assert.equal(p.y,ground(p.x,p.z));assert.equal(p.vy,0);
  }
});
test('terrain guard repairs contact corrections without pulling valid jumps down',()=>{
  const ground=x=>x*.5,p=createPlayer(ground);p.x=3;p.grounded=false;p.vy=-4;
  assert.equal(enforceTerrainFloor(p,ground),true);assert.equal(p.y,1.5);
  p.y=2;p.vy=1;p.grounded=false;
  assert.equal(enforceTerrainFloor(p,ground),false);assert.equal(p.vy,1);assert.equal(p.grounded,false);
});
test('craters, station approaches and world edges retain a solid terrain floor',()=>{
  const l=createLandscape(),starts=[[0,0],[-25,44],[-25,28],[-34,43],[-52,-8],[30,13],[-7,-10],[11000,11000],[-11000,-11000],[31.9,63.9]];
  for(const c of l.craters.slice(0,35))starts.push([c.x+c.r,c.z],[c.x,c.z]);
  let steps=0;
  for(const [x,z] of starts){
    const p=createPlayer(l.groundAt);Object.assign(p,{x:Math.max(-10999,Math.min(10999,x)),z:Math.max(-10999,Math.min(10999,z))});p.y=l.groundAt(p.x,p.z);
    for(let i=0;i<720;i++){
      const angle=i*.009;stepPlayer(p,{x:Math.cos(angle),z:Math.sin(angle),fast:true,jump:i%240===0},FIXED_STEP,l.groundAt);
      assert.ok(Number.isFinite(p.y)&&p.y>=l.groundAt(p.x,p.z)-1e-8,`surface penetration at ${p.x},${p.z}`);steps++;
    }
  }
  assert.equal(steps,57600);
});
test('falling beside a tall rock does not teleport boots onto its summit',()=>{
  const p=createPlayer(flat);Object.assign(p,{y:.4,vy:-.5,grounded:false});
  stepPlayer(p,idle,FIXED_STEP,()=>2,flat);
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
