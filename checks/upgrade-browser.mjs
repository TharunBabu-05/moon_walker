import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
await fs.mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const snap=()=>page.evaluate(()=>selene.snapshot());
try{
  await page.goto(process.env.SELENE_BASE_URL||'http://127.0.0.1:8000/',{waitUntil:'domcontentloaded',timeout:90000});
  await page.waitForFunction(()=>window.selene?.snapshot().ready,{},{timeout:120000});
  await page.locator('#begin').click();await page.keyboard.press('Escape');await page.keyboard.press('Digit2');await page.keyboard.press('KeyE');
  await page.waitForFunction(()=>selene.snapshot().riding);await page.waitForTimeout(400);
  for(const key of ['KeyA','KeyD']){
    await page.keyboard.down(key);await page.waitForTimeout(500);await page.keyboard.up(key);
    assert.ok((await snap()).handErrors.every(e=>e<.015),'both gloves hold wheel while steering');
  }
  await page.mouse.move(750,450);await page.mouse.down();await page.mouse.move(1150,610,{steps:15});await page.mouse.up();await page.mouse.wheel(0,-400);await page.waitForTimeout(500);
  await page.screenshot({path:'artifacts/20-driver-ik.png'});
  await page.locator('#mini-map').click();await page.locator('#atlas-global-tab').click();await page.locator('#atlas-search').fill('Shiv Shakti');
  assert.equal(await page.locator('#atlas-list button').count(),1);
  await page.locator('#atlas-list button').click();assert.match(await page.locator('#site-coordinates').innerText(),/69.3700/);
  await page.locator('#atlas-search').fill('');await page.screenshot({path:'artifacts/21-lunar-atlas.png'});
  await page.locator('#atlas-orbit').click();await page.waitForFunction(()=>selene.snapshot().mode==='orbit');
  assert.equal((await snap()).targetOrbitDistance,3900);
  await page.locator('#atlas-button').click();await page.locator('#atlas-station').click();await page.waitForTimeout(500);
  await page.screenshot({path:'artifacts/22-station-exterior.png'});
  await page.locator('#scene').focus();await page.keyboard.down('KeyW');
  await page.waitForFunction(()=>selene.snapshot().player.z<33,{},{timeout:30000});await page.keyboard.up('KeyW');
  const inside=await snap();assert.ok(Math.abs(inside.player.y-inside.station.floor)<.06,'walked up ramp through both doors onto habitat floor');
  assert.ok(inside.station.doors[0]>.9,'inner airlock opened');
  await page.screenshot({path:'artifacts/23-station-interior.png'});
  await page.keyboard.down('KeyA');await page.waitForTimeout(2500);await page.keyboard.up('KeyA');
  assert.ok((await snap()).player.x>-27.05,'habitat wall blocks the astronaut');
  await page.locator('#atlas-button').click();await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/24-mobile-atlas.png'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,hands:inside.handErrors,station:inside.station,atlas:inside.atlas,errors},null,2));
}finally{await browser.close();}
