import test from 'node:test';
import assert from 'node:assert/strict';
import {TRACK_FENCES,FENCE_HEIGHT,TRACK_EDGE,trackEdgePoint,trackGate,resolveTrackFence} from '../src/track-boundary.js';
import {coursePoint,courseInfo,gridPlace} from '../src/stadium-layout.js';
import {RaceWorld,newRacer} from '../src/race-physics.js';
import {RacePrediction} from '../src/race-motion.js';
const flat=()=>0;
test('both visible course limits are continuous except marked paddock gates',()=>{
 assert.ok(TRACK_FENCES.length>1950);assert.ok(FENCE_HEIGHT>=3.5);
 for(const f of TRACK_FENCES){assert.ok(Math.hypot(f.a.x-f.b.x,f.a.z-f.b.z)<8);assert.ok(Math.abs(courseInfo(f.a.x,f.a.z).offset-f.side*TRACK_EDGE)<1e-7);assert.equal(trackGate((f.a.x+f.b.x)/2,(f.a.z+f.b.z)/2,f.side),false);}
 for(const side of [-1,1])for(let i=0;i<1024;i++){
  const a=trackEdgePoint(i/1024,side),b=trackEdgePoint((i+1)/1024,side),present=TRACK_FENCES.some(f=>f.side===side&&f.index===i);
  assert.equal(present,!trackGate((a.x+b.x)/2,(a.z+b.z)/2,side));
 }
});
test('swept vehicle contact stops high-speed crossings of both fences from either side',()=>{
 for(const t of [.12,.25,.48,.72,.9])for(const side of [-1,1])for(const direction of [-1,1]){
  const a=Math.PI+t*Math.PI*2,nx=Math.cos(a),nz=Math.sin(a),edge=trackEdgePoint(t,side),oldX=edge.x-nx*direction*10,oldZ=edge.z-nz*direction*10;
  const p={x:edge.x+nx*direction*10,z:edge.z+nz*direction*10,y:0,yaw:0,vx:nx*direction*60,vz:nz*direction*60};
  const impact=resolveTrackFence(p,oldX,oldZ,flat);
  assert.ok(impact>0);assert.ok((courseInfo(p.x,p.z).offset-side*TRACK_EDGE)*direction<0,JSON.stringify({t,side,direction,p}));
 }
});
test('paddock access and the course centre remain open',()=>{
 for(let slot=0;slot<8;slot++){const g=gridPlace(slot),p={...g,y:0,vx:0,vz:0};resolveTrackFence(p,p.x,p.z,flat);assert.ok(Math.hypot(p.x-g.x,p.z-g.z)<.001);}
 const a=trackEdgePoint(0,1),p={x:a.x+12,z:a.z,y:0,vx:10,vz:0};assert.equal(resolveTrackFence(p,a.x-12,a.z,flat),0);
 for(let i=0;i<1024;i++){const q=coursePoint(i/1024),p={...q,y:0,yaw:0,vx:1,vz:0};assert.equal(resolveTrackFence(p,q.x,q.z,flat),0);assert.ok(Math.hypot(p.x-q.x,p.z-q.z)<.001);}
});
test('walkers contact mesh-height barriers while high jumps can pass over',()=>{
 const edge=trackEdgePoint(.25,1),oldX=edge.x,oldZ=edge.z+5;
 const person={x:edge.x,z:edge.z-5,y:0,yaw:0,vx:0,vz:-4};resolveTrackFence(person,oldX,oldZ,flat,.32,0,1.9);assert.ok(person.z>edge.z);
 const air={x:edge.x,z:edge.z-5,y:FENCE_HEIGHT+1,yaw:0,vx:0,vz:-4};assert.equal(resolveTrackFence(air,oldX,oldZ,flat),0);assert.ok(Math.abs(air.z-(edge.z-5))<1e-8);
});
test('host simulation and prediction agree when a racer hits a fence',()=>{
 const edge=trackEdgePoint(.25,1),world=new RaceWorld(flat);world.join('p',0,0,'P');const p=world.racers.get('p');
 Object.assign(p,newRacer('p',0,0,'P',flat),{x:edge.x,z:edge.z+10,yaw:0});
 const prediction=new RacePrediction(flat);prediction.accept(p);
 for(let i=0;i<300;i++){world.input('p',{throttle:1,seq:i+1});world.step(1/60);prediction.update(1/60,{throttle:1});}
 assert.ok(p.z>edge.z);assert.ok(Math.hypot(p.x-prediction.state.x,p.z-prediction.state.z)<.001);
});
