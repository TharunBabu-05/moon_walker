import test from 'node:test';
import assert from 'node:assert/strict';
import {MotionBuffer} from '../src/motion.js';
import {contact,roverBody,walkerBody,resolvePair,reconcileContacts} from '../src/contacts.js';
import {LUNAR_SITES,mapPoint} from '../src/lunar-sites.js';
const state=(x=0,z=0)=>({x,y:0,z,vx:0,vy:0,vz:0,yaw:0,speed:0,distance:0,grounded:true,riding:false});
test('buffer absorbs varying delivery delays and interpolates vehicle and rider together',()=>{
  const b=new MotionBuffer(),events=[];
  for(let i=0;i<70;i++){const stamp=i*50,p={...state(stamp*.004),vx:4,riding:true};p.rover={...p,x:p.x+.39};events.push({stamp,seq:i,arrival:stamp+25+[0,25,40,10][i%4],p});}
  events.sort((a,b)=>a.arrival-b.arrival);let previous=null,steps=[];
  for(let now=0;now<3300;now+=1000/60){while(events[0]?.arrival<=now){const e=events.shift();b.push(e.p,e.stamp,e.seq,now);}const p=b.sample(now);if(!p)continue;if(now>350&&previous)steps.push(p.x-previous.x);assert.ok(Math.abs(p.rover.x-p.x-.39)<1e-8);previous=p;}
  assert.ok(steps.every(x=>x>.035&&x<.1),'smooth forward motion instead of packet-size jumps');
});
test('stale packets are ignored and packet-loss extrapolation stops after 100 ms',()=>{
  const b=new MotionBuffer();b.push({...state(),vx:6},100,2,150);
  assert.equal(b.push(state(99),50,1,160),false);
  assert.ok(Math.abs(b.sample(5000).x-.6)<1e-9);assert.equal(b.sample(10000).x,b.sample(5000).x);
  b.push(state(40),10100,3,10150);assert.equal(b.sample(10160).x,40,'teleports clear stale history');
});
test('angle interpolation crosses the wrap without spinning the long way',()=>{
  const b=new MotionBuffer(0);b.push({...state(),yaw:Math.PI-.1},0,1,0);b.push({...state(),yaw:-Math.PI+.1},100,2,100);
  assert.ok(Math.abs(b.sample(50).yaw-Math.PI)<1e-8);
});
test('rotated chassis and pedestrian contacts separate along the minimum axis',()=>{
  const r=roverBody({...state(),yaw:Math.PI/4},'r',false),p=walkerBody(state(.7,.7),'p');
  assert.ok(contact(p,r));resolvePair(p,r);assert.equal(contact(p,r),null);assert.equal(r.state.x,0);
  p.state.y=3;assert.equal(contact(p,r),null,'height clears chassis');
});
test('head-on buggies conserve momentum and settle without overlap',()=>{
  const a=roverBody({...state(-1),vx:3}),b=roverBody({...state(1),vx:-2});
  resolvePair(a,b);assert.equal(contact(a,b),null);assert.ok(Math.abs(a.state.vx+b.state.vx-1)<1e-9);assert.ok(Math.abs(a.state.vx-b.state.vx)<.5);
});
test('fixed-step fast vehicle cannot pass through a parked chassis',()=>{
  const a=roverBody({...state(0,8),vz:-8}),b=roverBody(state(),'',false);
  for(let i=0;i<240;i++){a.state.z+=a.state.vz/120;resolvePair(a,b);}
  assert.ok(a.state.z>=3.04);assert.ok(Math.abs(a.state.vz)<1);
});
test('host correction deltas reproduce resolved state without mutating incoming packets',()=>{
  const a={id:'a',state:{...state(-1),riding:true,rover:{...state(-1),vx:2}}},b={id:'b',state:{...state(1),riding:true,rover:{...state(1),vx:-2}}};
  const before=JSON.stringify([a,b]),out=reconcileContacts([a,b]);assert.equal(out.length,2);assert.equal(JSON.stringify([a,b]),before);
  for(const result of out){const original=result.id==='a'?a:b;for(const key of ['x','z','vx','vz'])assert.equal(original.state.rover[key]+result.change.rover[key],result.state.rover[key]);}
  assert.equal(contact(roverBody(out[0].state.rover),roverBody(out[1].state.rover)),null);
});
test('atlas uses valid signed coordinates, primary sources and unique identities',()=>{
  assert.equal(new Set(LUNAR_SITES.map(s=>s.id)).size,LUNAR_SITES.length);
  for(const s of LUNAR_SITES){assert.ok(Math.abs(s.lat)<=90&&Math.abs(s.lon)<=180);assert.match(s.source,/^https:\/\/(planetarynames\.wr\.usgs\.gov|nssdc\.gsfc\.nasa\.gov|www\.nasa\.gov)\//);}
  assert.deepEqual(mapPoint(0,0),{x:.5,y:.5});assert.deepEqual(mapPoint(90,-180),{x:0,y:0});
});
