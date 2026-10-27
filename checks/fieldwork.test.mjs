import test from 'node:test';
import assert from 'node:assert/strict';
import {THROW_MAX_SPEED,THROW_MIN_SPEED,predictThrow,throwSpeed} from '../src/ballistics.js';
import {MISSIONS,missionAt,newMissionState,recordMissionSample} from '../src/missions.js';
import {SampleWorld} from '../src/sample-world.js';
import {createPlayer} from '../src/physics.js';
import {sanitizeState} from '../src/multiplayer.js';

const flat=()=>0;

test('pickup turns toward a nearby stone regardless of facing; bagging retains the body heading',()=>{
  const world=new SampleWorld(flat,()=>[]),p={...createPlayer(flat),yaw:Math.PI};
  const id='pilot',person=world.person(id);
  assert.equal(world.request(id,p,{type:'pick',id:'landing-sample'}),null);
  assert.ok(Math.abs(person.action.origin.yaw-Math.atan2(-.38,.72))<1e-9);
  for(let i=0;i<330;i++)world.step(1/120,[{id,state:p}]);
  assert.equal(person.held,'landing-sample');assert.equal(person.action,null);
  p.yaw=1.7;
  assert.equal(world.request(id,p,{type:'store'}),null);
  assert.equal(person.action.origin.yaw,1.7);
  for(let i=0;i<180;i++)world.step(1/120,[{id,state:p}]);
  assert.equal(person.held,null);assert.deepEqual(person.bag,['landing-sample']);
});

test('charged throw preview uses the bounded launch speeds used by the authoritative simulation',()=>{
  assert.equal(throwSpeed(0),THROW_MIN_SPEED);
  assert.equal(throwSpeed(1),THROW_MAX_SPEED);
  const preview=predictThrow({x:0,y:1,z:0},{x:0,y:0,z:-1},1,.06,flat,[]);
  assert.equal(preview.speed,THROW_MAX_SPEED);
  assert.equal(preview.hit,'GROUND');
  assert.ok(preview.distance>10,'maximum charge has a useful lunar range');
});

test('field assignment only progresses from samples collected in its survey circle',()=>{
  const state=newMissionState(),mission=missionAt(state);
  state.stage='collect';
  recordMissionSample(state,'rock',{x:mission.x,z:mission.z},'stone-a');
  recordMissionSample(state,'soil',{x:mission.x+mission.radius+1,z:mission.z});
  assert.equal(state.stage,'collect');
  assert.equal(state.soil,0);
  recordMissionSample(state,'soil',{x:mission.x,z:mission.z});
  assert.equal(state.stage,'return');
  assert.equal(state.rocks.length,mission.rocks);
  assert.equal(state.soil,mission.soil);
  assert.equal(MISSIONS.length,3);
});

test('mission acceptance and the aiming pose are carried by valid shared state',()=>{
  const world=new SampleWorld(flat,()=>[]);
  const explorer={...createPlayer(flat),yaw:0,riding:false};
  assert.equal(world.request('pilot',{...explorer,x:-9,z:8},{type:'mission'}),null);
  assert.equal(world.person('pilot').mission.stage,'collect');
  assert.equal(sanitizeState({...explorer,aiming:true}).aiming,true);
});
