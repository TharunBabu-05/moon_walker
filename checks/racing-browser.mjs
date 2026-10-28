import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {paddockSpawn,toolbar,boot} from './stadium-fixture.mjs';
await fs.mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
try{
 const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await paddockSpawn(page);await boot(page);await page.screenshot({path:'artifacts/stadium-paddock.png'});
 const stadium=await page.evaluate(()=>seleneRace.snapshot().stadium);assert.ok(stadium.sameScene&&stadium.radius>=1000&&stadium.crowd>5000);
 await toolbar(page);await page.locator('#race-button').click();await page.screenshot({path:'artifacts/stadium-lobby.png'});assert.equal(await page.locator('#race-enter').count(),0);
 await page.locator('#race-close').click();await page.keyboard.press('KeyE');await page.waitForFunction(()=>seleneRace.snapshot().active,null,{timeout:10000});
 await page.screenshot({path:'artifacts/stadium-driver.png'});
 const grip=await page.evaluate(()=>selene.snapshot().handErrors);assert.ok(grip.every(n=>n<.06),JSON.stringify(grip));
 await page.keyboard.press('KeyR');await page.locator('#race-button').click();await page.waitForFunction(()=>!document.getElementById('race-practice').disabled);await page.locator('#race-practice').click();await page.locator('#race-close').click();
 await page.waitForFunction(()=>seleneRace.snapshot().world.phase==='racing',null,{timeout:10000});
 await page.keyboard.down('KeyW');
 const frames=await page.evaluate(()=>new Promise(resolve=>{const frames=[],start=performance.now();let last=start;function tick(t){frames.push(t-last);last=t;if(t-start<26000)requestAnimationFrame(tick);else resolve(frames);}requestAnimationFrame(tick);}));
 await page.keyboard.up('KeyW');await page.keyboard.down('Space');await page.waitForFunction(()=>seleneRace.snapshot().car.speed<.4,null,{timeout:10000});await page.keyboard.up('Space');
 const race=await page.evaluate(()=>seleneRace.snapshot());assert.ok(race.car.travel>80);await page.screenshot({path:'artifacts/stadium-driving.png'});
 await page.keyboard.press('Digit1');assert.equal(await page.evaluate(()=>selene.snapshot().mode),'first');await page.screenshot({path:'artifacts/stadium-cockpit.png'});await page.keyboard.press('Digit2');
 for(const size of [{width:1024,height:600},{width:390,height:844}]){await page.setViewportSize(size);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 await page.keyboard.press('KeyE');await page.waitForFunction(()=>!seleneRace.snapshot().active);const after=await page.evaluate(()=>selene.snapshot().player);assert.ok(Math.hypot(after.x-race.car.x,after.z-race.car.z)<6);
 assert.deepEqual(errors,[]);const sorted=frames.slice(5).sort((a,b)=>a-b);console.log(JSON.stringify({passed:true,render:await page.evaluate(()=>({fps:selene.snapshot().fps,calls:selene.snapshot().drawCalls,triangles:selene.snapshot().triangles})),stadium,grip,travel:race.car.travel,p95:sorted[Math.floor(sorted.length*.95)],max:sorted.at(-1),over250:sorted.filter(n=>n>250).length,errors},null,2));
}finally{await browser.close();}
