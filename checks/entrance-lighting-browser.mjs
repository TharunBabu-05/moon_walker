import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:process.env.SELENE_BROWSER_CHANNEL||'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
// Start on the shadowed approach shown in the report, using test-only fixtures.
await page.route('**/src/physics.js',async r=>{let s=await fs.readFile('src/physics.js','utf8');s=s.replace('return {x:0,z:0,y:heightAt(0,0)','return {x:214,z:28,y:heightAt(214,28)');await r.fulfill({contentType:'text/javascript',body:s});});
await page.route('**/src/main.js',async r=>{let s=await fs.readFile('src/main.js','utf8');s=s.replace('roverState=createRoverState(landscape.groundAt),','roverState=Object.assign(createRoverState(landscape.groundAt,217,28),{yaw:-Math.PI/2}),');s=s.replace('window.selene=Object.freeze',`window.pathTestMove=x=>{Object.assign(roverState,{x,z:28,y:landscape.groundAt(x,28),vx:0,vz:0,vy:0,speed:0,grounded:true});syncDriver();terrain.update(x,28);};window.selene=Object.freeze`);await r.fulfill({contentType:'text/javascript',body:s});});
try{
 await page.goto('http://127.0.0.1:8000/');await page.waitForFunction(()=>window.selene?.snapshot().ready,null,{timeout:120000});await page.locator('#begin').click();await page.evaluate(()=>document.exitPointerLock());await page.keyboard.press('Digit2');await page.keyboard.press('KeyE');await page.waitForFunction(()=>selene.snapshot().seat==='driver');
 const report=[];
 for(const x of [100,217,275,410,565]){await page.evaluate(x=>pathTestMove(x),x);await page.waitForTimeout(1600);const s=await page.evaluate(()=>seleneRace.snapshot().stadium);assert.equal(s.activeLights,4);assert.ok(s.activeLightSites.every(p=>p.access&&p.intensity>=1600));assert.ok(s.activeLightSites.some(p=>Math.abs(p.x-x)<25));report.push({x,lights:s.activeLightSites.map(p=>({x:p.x,z:p.z,target:p.target}))});await page.screenshot({path:'.cache/path-light-'+x+'.png'});}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,report,errors}));
}finally{await browser.close();}
