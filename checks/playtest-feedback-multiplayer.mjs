import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {SAMPLE_DEPOT} from '../src/missions.js';
const browser=await chromium.launch({channel:process.env.SELENE_BROWSER_CHANNEL||'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
const context=await browser.newContext({viewport:{width:1280,height:800}}),errors=[];
await context.addInitScript({path:'checks/local-peer-fixture.js'});
// Local signalling only. The two browser pages still exchange actual WebRTC
// data channels. This fixture gives each explorer a valid completed survey.
await context.route('**/src/physics.js',async route=>{
 const code=await fs.readFile('src/physics.js','utf8');await route.fulfill({contentType:'text/javascript',body:code.replace('return {x:0,z:0,y:heightAt(0,0)',`return {x:${SAMPLE_DEPOT.x},z:${SAMPLE_DEPOT.z},y:heightAt(${SAMPLE_DEPOT.x},${SAMPLE_DEPOT.z})`)});
});
await context.route('**/src/sample-world.js',async route=>{
 const code=await fs.readFile('src/sample-world.js','utf8');
 const setup="person(id){if(!this.people.has(id)){const key='test-'+id;this.add(key,-9,8);this.stones.get(key).owner=id;this.people.set(id,{held:null,bag:[key],soil:1,action:null,hit:null,mission:{...newMissionState(),stage:'return',rocks:[key],soil:1}});}return this.people.get(id);}";
 await route.fulfill({contentType:'text/javascript',body:code.replace(/person\(id\)\{[^\n]+\}/,setup)});
});
async function ready(page,url){page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.waitForFunction(()=>window.selene?.snapshot().ready,null,{timeout:120000});await page.locator('#begin').click();await page.evaluate(()=>document.exitPointerLock());await page.waitForFunction(()=>!document.pointerLockElement);}
try{
 const host=await context.newPage();await ready(host,'http://127.0.0.1:8000/');
 if(!await host.locator('#crew-button').isVisible())await host.locator('#toolbar-toggle').click();
 await host.locator('#crew-button').click();await host.locator('#host-expedition').click();await host.waitForFunction(()=>selene.snapshot().network.phase==='connected');
 const invite=await host.locator('#invite-link').inputValue();await host.locator('#close-crew').click();
 const guest=await context.newPage();await ready(guest,invite);await guest.locator('#join-expedition').click();await guest.waitForFunction(()=>selene.snapshot().network.count===2);await guest.locator('#close-crew').click();
 await host.waitForFunction(()=>selene.snapshot().network.count===2);await host.bringToFront();await host.waitForFunction(()=>!document.querySelector('#mission-action').disabled);
 await host.locator('#mission-action').click();
 await guest.waitForFunction(()=>selene.snapshot().samples.people.some(p=>p.action?.type==='deliver'&&p.action.progress>.15),null,{timeout:10000});
 await guest.waitForFunction(()=>selene.snapshot().samples.people.some(p=>p.mission.completed===1&&!p.action),null,{timeout:10000});
 await guest.waitForFunction(()=>selene.snapshot().station.sampleBench.received===1);
 const report=await guest.evaluate(()=>{const s=selene.snapshot();return {network:s.network.count,completed:s.samples.people.find(p=>p.mission.completed===1).mission.completed,received:s.station.sampleBench.received,remoteCount:s.remoteCount};});
 assert.equal(report.network,2);assert.equal(report.remoteCount,1);assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,...report,realRTC:true,signalling:'local fixture',errors}));
}finally{await browser.close();}
