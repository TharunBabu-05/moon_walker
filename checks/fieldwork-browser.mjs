import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
try{
  await page.goto('http://127.0.0.1:8000',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.selene?.snapshot().ready,{},{timeout:60000});
  await page.getByRole('button',{name:'STEP ONTO THE MOON'}).click();
  await page.keyboard.press('Escape');

  await page.getByRole('button',{name:'Accept assignment'}).click();
  await page.waitForFunction(()=>{
    const me=selene.snapshot().samples.people.find(person=>person.id==='solo');
    return me?.mission?.stage==='collect'&&selene.snapshot().navigation.destination?.label.includes('survey area');
  },{},{timeout:15000});

  // The starter stone is deliberately placed within reach and directly ahead.
  await page.keyboard.press('KeyF');
  await page.waitForFunction(()=>selene.snapshot().samples.people.find(person=>person.id==='solo')?.held,{},{timeout:9000});
  await page.keyboard.down('KeyT');
  await page.waitForTimeout(650);
  const aiming=await page.evaluate(()=>window.selene.snapshot().aim);
  assert.equal(aiming.active,true);
  assert.ok(aiming.charge>.2&&aiming.distance>1,'aiming has a charged ballistic solution');
  assert.equal(await page.locator('#throw-guide').isVisible(),true);
  await page.keyboard.up('KeyT');
  await page.waitForFunction(()=>{
    const me=selene.snapshot().samples.people.find(person=>person.id==='solo');
    return !me?.held&&!me?.action;
  },{},{timeout:8000});
  assert.deepEqual(errors,[],'field assignment and charged throw produce no browser errors');
  console.log(JSON.stringify({passed:true,aiming},null,2));
}finally{
  await browser.close();
}
