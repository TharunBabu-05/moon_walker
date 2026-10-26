import test from 'node:test';
import assert from 'node:assert/strict';
import {craterRelief,createLandscape} from '../src/terrain.js';
import {planRoute,remainingRoute,mapToWorld,worldToMap} from '../src/navigation.js';
import {exitPosition} from '../src/dismount.js';
import {sanitizeState} from '../src/multiplayer.js';
import {FLAG_EXHIBITS,LUNAR_SITES} from '../src/lunar-sites.js';
test('crater relief and its derivative join continuously at rim and outer cutoff',()=>{
  for(const radius of [2,27,153,310])for(const u of [1,1.35,1.6]){
    const e=1e-6,f=x=>craterRelief(x,radius,.2,.35),left=f(u-e),right=f(u+e);assert.ok(Math.abs(left-right)<.002);assert.ok(Math.abs((f(u)-left)/e-(right-f(u))/e)<.1);
  }
});
test('the reported stair-edge location has no metre-scale jumps',()=>{
  const l=createLandscape();for(let z=-4;z<8;z+=.25)for(let x=-40;x<5;x+=.25){const h=l.heightAt(x,z);assert.ok(Math.abs(l.heightAt(x+.01,z)-h)<.025);assert.ok(Math.abs(l.heightAt(x,z+.01)-h)<.025);}
});
test('A* routes through a wall gap and never crosses the obstacle',()=>{
  const blocked=(x,z)=>Math.abs(x-15)<3&&z<9;const route=planRoute({x:0,z:0},{x:30,z:0},()=>0,blocked);assert.equal(route.status,'ready');assert.ok(route.points.some(p=>p.z>=9));
  for(let i=0;i<route.points.length-1;i++)for(let t=0;t<1;t+=.1){const a=route.points[i],b=route.points[i+1];assert.equal(blocked(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t),false);}
  assert.equal(planRoute({x:0,z:0},{x:15,z:0},()=>0,blocked).status,'blocked');
});
test('routing refuses an impassable ridge instead of drawing a valid-looking direct path',()=>{
  const r=planRoute({x:0,z:0},{x:30,z:0},x=>x>12?100:0);assert.equal(r.status,'no-route');assert.equal(r.points.length,0);
});
test('navigation distance decreases and map projection uses the same scale on both axes',()=>{
  const points=[{x:0,z:0},{x:20,z:0},{x:20,z:20}];assert.equal(remainingRoute({x:10,z:0},points).distance,30);assert.equal(remainingRoute({x:20,z:15},points).distance,5);
  const c={x:11,z:31},p={x:61,z:81},s=worldToMap(p,c,500,360,240);assert.equal(s.x-180,s.y-120);const q=mapToWorld(s.x/360,s.y/240,c,500,360/240);assert.ok(Math.hypot(q.x-p.x,q.z-p.z)<1e-8);
});
test('dismount position is continuous across all frames and ends on chosen footing',()=>{
  const d={progress:0,from:{x:0,y:2,z:0,yaw:3.1},to:{x:-2,y:1.8,z:.4,yaw:-3.1}};let prev=exitPosition(d);assert.equal(prev.x,0);
  for(let i=1;i<=120;i++){d.progress=i/120;const p=exitPosition(d);assert.ok(Math.hypot(p.x-prev.x,p.y-prev.y,p.z-prev.z)<.06);assert.ok(Math.abs(p.yaw-prev.yaw)<.01);prev=p;}
  assert.equal(prev.x,-2);assert.equal(prev.z,.4);assert.ok(Math.abs(prev.y-1.8)<1e-8);
});
test('flag exhibits correspond to sourced mission locations rather than invented country claims',()=>{
  assert.equal(FLAG_EXHIBITS.length,8);assert.equal(FLAG_EXHIBITS.filter(f=>f.design==='us').length,6);assert.equal(FLAG_EXHIBITS.filter(f=>f.design==='cn').length,2);
  for(const f of FLAG_EXHIBITS){assert.ok(LUNAR_SITES.some(s=>s.id===f.siteId));assert.ok(f.source.startsWith('https://'));}
});
test('untrusted dismount snapshots reject impossible endpoints',()=>{
  const p={x:0,y:0,z:0,vx:0,vy:0,vz:0,yaw:0,speed:0,distance:0,riding:true,dismount:{progress:.5,from:{x:0,y:0,z:0,yaw:0},to:{x:100,y:0,z:0,yaw:0}}};assert.equal(sanitizeState(p).dismount,undefined);p.dismount.to.x=2;assert.equal(sanitizeState(p).dismount.progress,.5);
});
