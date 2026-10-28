import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
await fs.mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
try{
  const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8000/');await page.waitForFunction(()=>window.selene?.snapshot().ready,null,{timeout:120000});
  await page.locator('#begin').click();await page.keyboard.press('Escape');await page.keyboard.press('Digit2');
  if(!await page.locator('#race-button').isVisible())await page.locator('#toolbar-toggle').click();
  await page.locator('#race-button').click();assert.equal(await page.locator('#race-dialog').isVisible(),true);
  await page.getByRole('button',{name:'VIPER / Split-wing'}).click();await page.screenshot({path:'artifacts/race-garage.png'});
  const old=await page.evaluate(()=>selene.snapshot().player);
  await page.locator('#race-enter').click();await page.waitForFunction(()=>seleneRace.snapshot().car,null,{timeout:60000});
  assert.equal(await page.evaluate(()=>seleneRace.snapshot().car.car),2);
  await page.waitForFunction(()=>seleneRace.snapshot().world.racers.length===4);
  await page.screenshot({path:'artifacts/race-grid.png'});
  await page.keyboard.down('KeyW');await page.keyboard.down('ShiftLeft');await page.keyboard.down('KeyF');
  const frames=await page.evaluate(()=>new Promise(resolve=>{const frames=[],start=performance.now();let last=start;function tick(t){frames.push(t-last);last=t;if(t-start<26000)requestAnimationFrame(tick);else resolve(frames);}requestAnimationFrame(tick);}));
  await page.keyboard.up('KeyF');await page.keyboard.up('ShiftLeft');await page.keyboard.up('KeyW');
  const race=await page.evaluate(()=>seleneRace.snapshot());assert.ok(race.car.travel>100);assert.ok(race.world.events.some(e=>e.type==='fire'));assert.ok(race.car.boost<100);
  await page.keyboard.press('KeyQ');assert.match(await page.locator('#race-weapon').innerText(),/PULSE|RAIL/);
  await page.screenshot({path:'artifacts/race-driving.png'});
  for(const size of [{width:1024,height:600},{width:390,height:844}]){await page.setViewportSize(size);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);const rect=await page.locator('#race-hud').boundingBox();assert.ok(rect.x>=0&&rect.x+rect.width<=size.width);}
  await page.screenshot({path:'artifacts/race-small-screen.png'});await page.locator('#race-leave').click();
  assert.equal(await page.evaluate(()=>seleneRace.snapshot().active),false);const after=await page.evaluate(()=>selene.snapshot().player);assert.ok(Math.hypot(old.x-after.x,old.z-after.z)<1);
  const sorted=frames.slice(5).sort((a,b)=>a-b);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,frames:sorted.length,p95:sorted[Math.floor(sorted.length*.95)],max:sorted.at(-1),over250:sorted.filter(n=>n>250).length,travel:race.car.travel,errors},null,2));
}finally{await browser.close();}
