import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {SAMPLE_DEPOT} from '../src/missions.js';

await fs.mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({channel:process.env.SELENE_BROWSER_CHANNEL||'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const errors=[];
async function boot(page){
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8000/');await page.waitForFunction(()=>window.selene?.snapshot().ready,null,{timeout:120000});
 await page.locator('#begin').click();await page.evaluate(()=>document.exitPointerLock());await page.waitForFunction(()=>!document.pointerLockElement);
 await page.keyboard.press('Digit2');await page.waitForFunction(()=>selene.snapshot().mode==='follow');
}
async function spawn(page,x,z){
 await page.route('**/src/physics.js',async route=>{const code=await fs.readFile('src/physics.js','utf8');await route.fulfill({contentType:'text/javascript',body:code.replace('return {x:0,z:0,y:heightAt(0,0)',`return {x:${x},z:${z},y:heightAt(${x},${z})`)});});
}
try{
 const page=await browser.newPage({viewport:{width:1366,height:768}});await boot(page);
 await page.waitForFunction(()=>document.querySelector('#mission-guidance').textContent.includes('Start here'));
 await page.screenshot({path:'artifacts/feedback-first-assignment.png'});
 await page.locator('#mission-map').click();assert.ok(await page.locator('#atlas-dialog').isVisible());
 await page.keyboard.press('Escape');await page.locator('#mission-action').click();
 await page.waitForFunction(()=>selene.snapshot().samples.people.some(p=>p.mission.stage==='collect'));
 const stones=await page.evaluate(()=>selene.snapshot().samples.stones.filter(r=>r.rest&&!r.owner&&Math.hypot(r.x+9,r.z-8)<8));
 assert.ok(stones.length>=1,'reachable survey specimens exist in the real landscape');
 const specimen=stones[0];await page.close();

 const collection=await browser.newPage({viewport:{width:1366,height:768}});await spawn(collection,specimen.x,specimen.z+.55);await boot(collection);
 await collection.locator('#mission-action').click();await collection.waitForFunction(()=>!document.querySelector('#sample-pick').disabled);
 await collection.keyboard.press('KeyF');await collection.waitForFunction(()=>selene.snapshot().samples.people.some(p=>p.held&&!p.action),null,{timeout:10000});
 await collection.keyboard.press('KeyB');await collection.waitForFunction(()=>selene.snapshot().samples.people.some(p=>p.mission.rocks.length===1&&!p.action),null,{timeout:7000});
 await collection.waitForFunction(()=>document.querySelector('#mission-guidance').textContent.includes('press G'));
 await collection.keyboard.press('KeyG');await collection.waitForFunction(()=>selene.snapshot().samples.people.some(p=>p.mission.stage==='return'&&!p.action),null,{timeout:12000});
 await collection.waitForFunction(()=>selene.snapshot().navigation.destination?.label==='Sample receiving bench');
 assert.ok(await collection.locator('#mission-action').isDisabled(),'handover is disabled away from the receiving bench');
 await collection.screenshot({path:'artifacts/feedback-survey-complete.png'});await collection.close();

 // Test-only setup: start with a completed survey near the actual bench. The
 // production game exposes no inventory mutation or teleport controls.
 const delivery=await browser.newPage({viewport:{width:1366,height:768}});await spawn(delivery,SAMPLE_DEPOT.x,SAMPLE_DEPOT.z);
 await delivery.route('**/src/sample-world.js',async route=>{
  const code=await fs.readFile('src/sample-world.js','utf8');
  const setup="this.add('feedback-stone',-9,8);this.stones.get('feedback-stone').owner='solo';const tester=this.person('solo');tester.bag=['feedback-stone'];tester.soil=1;Object.assign(tester.mission,{stage:'return',rocks:['feedback-stone'],soil:1});";
  await route.fulfill({contentType:'text/javascript',body:code.replace('this.seed(0,0);','this.seed(0,0);'+setup)});
 });
 await boot(delivery);await delivery.waitForFunction(()=>!document.querySelector('#mission-action').disabled);
 await delivery.locator('#mission-action').click();
 await delivery.waitForFunction(()=>selene.snapshot().samples.people.some(p=>p.action?.type==='deliver'&&p.action.progress>.4));
 await delivery.screenshot({path:'artifacts/feedback-handover.png'});
 await delivery.waitForFunction(()=>selene.snapshot().samples.people.some(p=>p.mission.completed===1&&!p.action),null,{timeout:8000});
 await delivery.waitForFunction(()=>selene.snapshot().station.sampleBench.received===1);
 const snapshot=await delivery.evaluate(()=>selene.snapshot());assert.equal(snapshot.samples.people[0].bag.length,0);assert.equal(snapshot.samples.people[0].soil,0);
 await delivery.screenshot({path:'artifacts/feedback-received.png'});
 await delivery.setViewportSize({width:800,height:600});assert.equal(await delivery.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,surveySpecimens:stones.length,bench:snapshot.station.sampleBench,errors}));
}finally{await browser.close();}
