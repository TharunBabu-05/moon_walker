import test from 'node:test';
import assert from 'node:assert/strict';
import {STADIUM,CHECKPOINTS,coursePoint,ROCKFALLS,rockfallPose} from '../src/stadium-layout.js';
import {CARS,RaceWorld,newRacer,driveRacer} from '../src/race-physics.js';
import {createLandscape} from '../src/landscape.js';
import {RacePrediction,blendRacer} from '../src/race-motion.js';
import {planRoute} from '../src/navigation.js';
import {PADDOCK} from '../src/stadium-layout.js';
const ground=createLandscape().groundAt,flat=()=>0;
test('permanent stadium scale, entrance and continuous regolith',()=>{
 assert.equal(Math.hypot(STADIUM.gate.x+25,STADIUM.gate.z-28),300);assert.ok(STADIUM.radius>=1000);assert.equal(new Set(CARS.map(c=>c.color)).size,4);
 for(let i=0;i<2000;i++){const p=coursePoint(i/2000);assert.ok(Math.hypot(p.x-STADIUM.x,p.z-STADIUM.z)<1060);assert.ok(Number.isFinite(ground(p.x,p.z)));}
 for(let x=50;x<1500;x+=2)for(const z of [27.9,28,28.1,90,130])assert.ok(Math.abs(ground(x+.01,z)-ground(x-.01,z))<.12,`${x},${z} has a discontinuity`);
 assert.equal(planRoute({x:0,z:0},PADDOCK,ground).status,'ready');
});
test('unoccupied parked vehicles remain solid to both host physics and prediction',()=>{
 const w=new RaceWorld(flat);w.join('p',0,0,'P');const p=w.racers.get('p'),q=w.parked[1];Object.assign(p,{x:q.x,z:q.z+7,yaw:0,vx:0,vz:-10});
 const prediction=new RacePrediction(flat);prediction.parked=w.parked.filter(q=>q.slot!==0);prediction.accept(p);
 for(let i=0;i<180;i++){w.input('p',{throttle:1,seq:i+1});w.step(1/60);prediction.update(1/60,{throttle:1});}
 assert.ok(Math.hypot(p.x-q.x,p.z-q.z)>=4.09);assert.ok(Math.hypot(prediction.state.x-q.x,prediction.state.z-q.z)>=4.09);
});
test('drive, brake and steer without teleporting explorers outside the stadium',()=>{
 const p=newRacer('p',0,0,'driver',flat),yaw=p.yaw;
 for(let i=0;i<300;i++)driveRacer(p,{throttle:1},1/60,flat);assert.ok(p.speed>12);
 for(let i=0;i<40;i++)driveRacer(p,{throttle:1,steer:1},1/60,flat);assert.ok(Math.abs(p.yaw-yaw)>.1);
 for(let i=0;i<180;i++)driveRacer(p,{brake:true},1/60,flat);assert.ok(p.speed<.01);
 Object.assign(p,{x:0,z:150,vx:0,vz:0});driveRacer(p,{},1/60,flat);assert.equal(p.x,0);assert.equal(p.z,150);
});
test('all racers ready before a synchronized five-second countdown',()=>{
 const w=new RaceWorld(flat);w.join('a',0,0,'A');w.join('b',1,1,'B');assert.ok(w.start());w.ready('a');assert.ok(w.start());w.ready('b');assert.equal(w.start(),undefined);
 for(let i=0;i<299;i++)w.step(1/60);assert.equal(w.phase,'countdown');w.step(1/60);assert.equal(w.phase,'racing');
});
test('four-second recovery occurs at destruction location',()=>{
 const w=new RaceWorld(flat);w.join('p',0,0,'P');const p=w.racers.get('p');p.shield=0;w.damage(p,100);const {x,z}=p;
 for(let i=0;i<239;i++)w.step(1/60);assert.ok(p.dead>0);w.step(1/60);assert.equal(p.dead,0);assert.equal(p.hp,100);assert.equal(p.x,x);assert.equal(p.z,z);
});
test('ordered lunar checkpoints require two complete laps',()=>{
 const w=new RaceWorld(flat);w.join('p',0,0,'P');w.ready('p');w.start(true);for(let i=0;i<300;i++)w.step(1/60);const p=w.racers.get('p');
 Object.assign(p,CHECKPOINTS[0]);w.step(1/60);assert.equal(p.lap,0);
 for(let lap=0;lap<2;lap++)for(let j=1;j<=16;j++){Object.assign(p,CHECKPOINTS[j%16],{vx:0,vz:0,speed:0});w.step(1/60);}assert.equal(p.lap,2);assert.equal(w.phase,'finished');
});
test('falling rocks warn, accelerate under lunar gravity and damage drivers once per fall',()=>{
 const s=ROCKFALLS[0],early=rockfallPose(s,2,0),a=rockfallPose(s,5,0),b=rockfallPose(s,6,0);assert.ok(early.warning&&!early.active);assert.ok(a.active&&b.y<a.y);
 const w=new RaceWorld(flat);w.join('p',0,0,'P');w.phase='racing';w.raceTime=s.warning+Math.sqrt(2*s.drop/1.62);const p=w.racers.get('p');Object.assign(p,{x:s.x,z:s.z,y:0,shield:0});w.step(1/60);assert.equal(p.hp,25);w.step(1/60);assert.equal(p.hp,25);
});
test('render interpolation and client prediction advance between packets',()=>{
 const p=newRacer('p',0,0,'P',flat),prediction=new RacePrediction(flat);prediction.accept(p);const samples=[];
 for(let i=0;i<300;i++)samples.push(prediction.update(1/120,{throttle:1}).travel);
 assert.ok(samples.at(-1)>8);for(let i=1;i<samples.length;i++)assert.ok(samples[i]>=samples[i-1]);
 const b={...p,x:p.x+1,yaw:p.yaw+.2};assert.equal(blendRacer(p,b,.5).x,p.x+.5);
});
test('the actual lunar course can be driven for two laps without holes or a blocked paddock',()=>{
 const w=new RaceWorld(ground);w.join('p',0,0,'Pilot');w.ready('p');w.start(true);const p=w.racers.get('p');
 for(let i=0;i<60*700&&!p.finish;i++){const g=CHECKPOINTS[p.next],target=Math.atan2(-(g.x-p.x),-(g.z-p.z)),angle=Math.atan2(Math.sin(target-p.yaw),Math.cos(target-p.yaw));w.input('p',{throttle:1,steer:Math.max(-1,Math.min(1,angle*2)),brake:p.speed>14&&Math.abs(angle)>.4,seq:i+1});w.step(1/60);assert.ok(p.y>=ground(p.x,p.z)-.02);}
 assert.equal(p.lap,2);assert.ok(p.finish>0);
});
