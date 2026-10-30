import test from 'node:test';
import assert from 'node:assert/strict';
import {THROW_MAX_SPEED,THROW_MIN_SPEED,predictThrow,throwSpeed} from '../src/ballistics.js';
import {MISSIONS,missionAt,newMissionState,recordMissionSample,missionGuidance,SAMPLE_DEPOT} from '../src/missions.js';
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

test('survey guidance distinguishes the boundary, a held stone, soil and the receiving bench',()=>{
 const state=newMissionState(),m=missionAt(state),p={x:m.x,z:m.z};
 assert.match(missionGuidance(state,p),/accept.*assignment/);
 state.stage='collect';assert.match(missionGuidance(state,{x:m.x+20,z:m.z}),/boundary/);
 assert.match(missionGuidance(state,p,{held:true}),/press B/);
 assert.match(missionGuidance(state,p,{nearest:true}),/F picks up/);
 state.rocks=['sample'];assert.match(missionGuidance(state,p),/press G/);
 state.stage='return';assert.match(missionGuidance(state,SAMPLE_DEPOT),/Hand over samples/);
});

test('accepting a survey creates shared loose specimens without moving reserved or owned stones',()=>{
 const world=new SampleWorld(flat,()=>[]),p=createPlayer(flat),m=MISSIONS[0];
 world.stones.clear();assert.equal(world.request('a',p,{type:'mission'}),null);
 const specimens=[...world.stones.values()].filter(r=>Math.hypot(r.x-m.x,r.z-m.z)<m.radius-1);
 assert.ok(specimens.length>=2);
 const held=specimens[0];held.owner='a';const position={x:held.x,z:held.z};
 world.seedSurvey(m);assert.equal(world.stones.get(held.id).owner,'a');assert.equal(held.x,position.x);assert.equal(held.z,position.z);
 assert.ok([...world.stones.keys()].every(id=>id.startsWith('survey:')));
});

test('sample handover requires the bench, animates and consumes inventory exactly once',()=>{
 const world=new SampleWorld(flat,()=>[]),p=createPlayer(flat),person=world.person('pilot');
 world.add('assignment-rock',-9,8);world.stones.get('assignment-rock').owner='pilot';
 Object.assign(person.mission,{stage:'return',rocks:['assignment-rock'],soil:1});person.bag=['assignment-rock'];person.soil=1;
 assert.match(world.request('pilot',p,{type:'mission'}),/receiving bench/);
 Object.assign(p,{x:SAMPLE_DEPOT.x,z:SAMPLE_DEPOT.z});
 assert.match(world.request('pilot',p,{type:'deliver'}),/Unknown/,'clients cannot bypass validated handover');
 assert.equal(world.request('pilot',p,{type:'mission'}),null);assert.equal(person.action.type,'deliver');assert.equal(person.bag.length,1);
 for(let i=0;i<100;i++)world.step(1/120,[{id:'pilot',state:p}]);
 assert.equal(person.mission.completed,0,'samples remain owned until the pouch reaches the tray');
 for(let i=0;i<260;i++)world.step(1/120,[{id:'pilot',state:p}]);
 assert.equal(person.mission.completed,1);assert.equal(person.action,null);assert.equal(person.soil,0);assert.deepEqual(person.bag,[]);
 assert.equal(world.events.filter(e=>e.type==='mission').length,1);
});

test('walking away before placing the pouch cancels delivery without losing samples',()=>{
 const world=new SampleWorld(flat,()=>[]),p={...createPlayer(flat),x:SAMPLE_DEPOT.x,z:SAMPLE_DEPOT.z},person=world.person('p');
 world.add('rock',0,0);world.stones.get('rock').owner='p';person.bag=['rock'];person.soil=1;
 Object.assign(person.mission,{stage:'return',rocks:['rock'],soil:1});
 assert.equal(world.request('p',p,{type:'mission'}),null);p.x+=1;world.step(1/120,[{id:'p',state:p}]);
 assert.equal(person.action,null);assert.deepEqual(person.bag,['rock']);assert.equal(person.mission.stage,'return');
});
