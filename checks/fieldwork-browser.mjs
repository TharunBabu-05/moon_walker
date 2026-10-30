import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

await fs.mkdir('artifacts',{recursive:true});

const browser=await chromium.launch({channel:process.env.SELENE_BROWSER_CHANNEL||'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
try{
  await page.goto('http://127.0.0.1:8000',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.selene?.snapshot().ready,{},{timeout:60000});
  await page.getByRole('button',{name:'STEP ONTO THE MOON'}).click();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Digit2');
  await page.waitForFunction(()=>selene.snapshot().mode==='follow');
  // Orbit to the explorer's face using the same drag gesture as the report.
  await page.mouse.move(1000,620);await page.mouse.down();
  await page.mouse.move(145,620,{steps:15});await page.mouse.up();
  const before=await page.evaluate(()=>selene.snapshot());
  assert.ok(before.camera.z<before.player.z,'camera is in front of the explorer');

  await page.getByRole('button',{name:'Accept assignment'}).click();
  await page.waitForFunction(()=>{
    const me=selene.snapshot().samples.people.find(person=>person.id==='solo');
    return me?.mission?.stage==='collect'&&selene.snapshot().navigation.destination?.label.includes('survey area');
  },{},{timeout:15000});

  // Camera orbit must not change the accessible specimen or the bag action.
  await page.keyboard.press('KeyF');
  await page.waitForFunction(()=>{const p=selene.snapshot().samples.people.find(person=>person.id==='solo');return p?.held&&!p.action;},{},{timeout:9000});
  await page.keyboard.press('KeyB');
  await page.waitForFunction(()=>{const p=selene.snapshot().samples.people.find(person=>person.id==='solo');return p?.bag.length===1&&!p.action;},{},{timeout:6000});
  const bagged=await page.evaluate(()=>selene.snapshot());
  for(const axis of ['x','y','z'])assert.ok(Math.abs(bagged.camera[axis]-before.camera[axis])<.03,`bagging preserves camera ${axis}`);
  await page.screenshot({path:'artifacts/front-view-sampling.png'});
  await page.keyboard.press('KeyR');
  await page.waitForFunction(()=>{const p=selene.snapshot().samples.people.find(person=>person.id==='solo');return p?.held&&!p.action;},{},{timeout:6000});
  // Cancellation returns to precisely the same orbit without releasing a rock.
  await page.keyboard.down('KeyT');
  await page.waitForFunction(()=>selene.snapshot().aim.active&&selene.snapshot().mode==='first');
  await page.keyboard.press('Escape');await page.keyboard.up('KeyT');
  await page.waitForFunction(()=>selene.snapshot().mode==='follow'&&!selene.snapshot().aim.active);
  assert.ok(await page.evaluate(()=>selene.snapshot().samples.people.find(p=>p.id==='solo').held));
  await page.keyboard.down('KeyT');
  await page.waitForFunction(()=>selene.snapshot().aim.charge>.3);
  const aiming=await page.evaluate(()=>window.selene.snapshot().aim);
  assert.equal(aiming.active,true);
  assert.ok(aiming.charge>.2&&aiming.distance>1,'aiming has a charged ballistic solution');
  assert.equal(await page.locator('#throw-guide').isVisible(),true);
  assert.equal(await page.evaluate(()=>selene.snapshot().mode),'first');
  await page.screenshot({path:'artifacts/temporary-first-person-aim.png'});
  await page.keyboard.up('KeyT');
  await page.waitForFunction(()=>{
    const me=selene.snapshot().samples.people.find(person=>person.id==='solo');
    return !me?.held&&!me?.action;
  },{},{timeout:8000});
  await page.waitForFunction(()=>selene.snapshot().mode==='follow');
  const restored=await page.evaluate(()=>selene.snapshot());
  for(const axis of ['x','y','z'])assert.ok(Math.abs(restored.camera[axis]-before.camera[axis])<.03,`throw restores camera ${axis}`);
  assert.deepEqual(errors,[],'field assignment and charged throw produce no browser errors');
  console.log(JSON.stringify({passed:true,aiming},null,2));
}finally{
  await browser.close();
}
