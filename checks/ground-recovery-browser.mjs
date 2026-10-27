import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  // Inject a test-only displacement hook; the shipped game has no mutation API.
  const source=await fs.readFile('src/main.js','utf8');
  await page.route('**/src/main.js',route=>route.fulfill({contentType:'text/javascript',body:source.replace('window.selene=Object.freeze',`window.displaceBelowGround=()=>{const body=riding?roverState:player;body.y=landscape.groundAt(body.x,body.z)-500;body.vy=-40;body.grounded=false;};\n  window.selene=Object.freeze`)}));
  await page.goto('http://127.0.0.1:8000/');await page.waitForFunction(()=>window.selene?.snapshot().ready,{},{timeout:60000});
  await page.locator('#begin').click();await page.keyboard.press('Escape');
  for(const view of ['Digit1','Digit2','Digit3']){
    await page.keyboard.press(view);await page.evaluate(()=>displaceBelowGround());
    await page.waitForFunction(()=>{const s=selene.snapshot();return s.player.grounded&&s.player.y>=s.ground-.01&&s.player.vy===0;},{},{timeout:3000});
  }
  await page.keyboard.press('Digit2');await page.locator('#help-button').click();
  await page.evaluate(()=>displaceBelowGround());await page.waitForFunction(()=>selene.snapshot().player.grounded,{},{timeout:3000});await page.locator('#close-help').click();
  await page.locator('#scene').focus();await page.keyboard.press('KeyE');await page.waitForFunction(()=>selene.snapshot().riding);
  await page.evaluate(()=>displaceBelowGround());await page.waitForFunction(()=>selene.snapshot().rover.grounded&&selene.snapshot().rover.y>0,{},{timeout:3000});
  assert.deepEqual(errors,[]);console.log('Surface recovery passed in all three views, a paused menu, and the buggy.');
}finally{await browser.close();}
