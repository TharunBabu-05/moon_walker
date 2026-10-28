import test from 'node:test';
import assert from 'node:assert/strict';
import {ARENA,CARS,GATES,HAZARDS,RaceWorld,newRacer,driveRacer,roadHeight,trackPoint,cleanRaceInput} from '../src/race-physics.js';
test('stadium entrance is 300 m from the habitat and course stays inside 3 km radius',()=>{
  assert.equal(Math.hypot(ARENA.gate.x+25,ARENA.gate.z-28),300);
  for(let i=0;i<1000;i++){const p=trackPoint(i/1000);assert.ok(Math.hypot(p.x-ARENA.x,p.z-ARENA.z)+60<ARENA.radius);}
  assert.equal(new Set(CARS.map(c=>c.color)).size,4);
});
test('race cars accelerate, brake, steer, and remain within stadium walls',()=>{
  const p=newRacer('p'),yaw=p.yaw;for(let i=0;i<240;i++)driveRacer(p,{throttle:1},1/60);assert.ok(p.speed>40);
  for(let i=0;i<30;i++)driveRacer(p,{throttle:1,steer:1},1/60);assert.ok(Math.abs(p.yaw-yaw)>.1);
  for(let i=0;i<240;i++)driveRacer(p,{brake:true},1/60);assert.ok(p.speed<1);
  Object.assign(p,{x:ARENA.x+2991,z:ARENA.z,vx:100,vz:0,yaw:-Math.PI/2});for(let i=0;i<100;i++)driveRacer(p,{throttle:1},1/60);assert.ok(Math.hypot(p.x-ARENA.x,p.z-ARENA.z)<=2992.001);
});
test('coolant slows cars and potholes provide a finite drivable floor',()=>{
  const pool=HAZARDS.find(h=>h.type==='pool'),p=newRacer('p');Object.assign(p,{x:pool.x,z:pool.z,y:0,yaw:0,vx:0,vz:-30});driveRacer(p,{},.05);assert.ok(p.speed<25);
  const pit=HAZARDS.find(h=>h.type==='pit');assert.ok(roadHeight(pit.x,pit.z)<-1);assert.ok(Number.isFinite(roadHeight(pit.x+pit.radius,pit.z)));
});
test('swept shots hit, kill and respawn at the death position after exactly four seconds',()=>{
  const w=new RaceWorld();w.join('a',0);w.join('b',1);const a=w.racers.get('a'),b=w.racers.get('b');
  Object.assign(a,{x:ARENA.x,z:ARENA.z,y:0,yaw:0,shield:0});Object.assign(b,{x:ARENA.x,z:ARENA.z-30,y:0,shield:0});
  for(let n=0;n<300&&!b.dead;n++){w.input('a',{fire:true});w.step(1/60);}assert.equal(b.hp,0);assert.equal(b.dead,4);assert.equal(a.kills,1);const death={x:b.x,z:b.z};
  for(let n=0;n<239;n++)w.step(1/60);assert.ok(b.dead>0);w.step(1/60);w.step(1/60);assert.equal(b.dead,0);assert.equal(b.hp,100);assert.deepEqual({x:b.x,z:b.z},death);assert.ok(b.shield>1.9);
});
test('ordered checkpoints require two full laps; skips cannot finish a race',()=>{
  const w=new RaceWorld();w.join('p',0);const p=w.racers.get('p');Object.assign(p,GATES[0]);w.step(1/60);assert.equal(p.lap,0);
  for(let lap=0;lap<2;lap++)for(let j=1;j<=24;j++){Object.assign(p,GATES[j%24],{vx:0,vz:0,speed:0});w.step(1/60);}assert.equal(p.lap,2);assert.ok(p.finish>0);
});
test('inputs expire, cars collide, and malformed input cannot inject a position',()=>{
  assert.deepEqual(cleanRaceInput({throttle:Infinity,steer:NaN,x:999,gun:7}),{throttle:1,steer:0,brake:false,boost:false,fire:false,gun:0});
  const w=new RaceWorld();w.join('a');w.join('b');const a=w.racers.get('a'),b=w.racers.get('b');b.x=a.x;b.z=a.z;w.step(1/60);assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>=4.79);
  w.input('a',{fire:true});for(let n=0;n<180;n++)w.step(1/60);assert.ok(w.events.filter(e=>e.type==='fire').length<=2);assert.equal(w.shots.length,0);
});
