import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('https://tharunbabu-05.github.io/moon_walker/?release=4308004',{waitUntil:'domcontentloaded',timeout:90000});
  await page.waitForFunction(()=>window.selene?.snapshot().ready,{},{timeout:120000});
  await page.locator('#begin').click();await page.keyboard.press('Escape');
  await page.waitForFunction(()=>window.seleneSound?.snapshot().loaded===17,{},{timeout:30000});
  assert.equal(await page.locator('#dock-toggle').count(),1);
  assert.equal(await page.locator('#map-smaller').count(),1);
  assert.equal(await page.locator('#toolbar-toggle').count(),1);
  const state=await page.evaluate(()=>seleneSound.snapshot());assert.equal(state.failed,0);assert.deepEqual(errors,[]);
  await page.screenshot({path:'artifacts/live-audio-hud.png'});
  console.log(JSON.stringify({live:true,audio:state,errors}));
}finally{await browser.close();}
