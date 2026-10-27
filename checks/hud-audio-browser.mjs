import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
await fs.mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
// Measure the actual final audio signal, downstream of volume and limiter.
await page.addInitScript(()=>{
  const connect=AudioNode.prototype.connect;
  AudioNode.prototype.connect=function(destination,...args){
    if(destination===this.context.destination&&!window.audioMeter){window.audioMeter=this.context.createAnalyser();window.audioMeter.fftSize=256;connect.call(this,window.audioMeter);}
    return connect.call(this,destination,...args);
  };
});
const energy=()=>page.evaluate(()=>{const a=new Float32Array(256);audioMeter.getFloatTimeDomainData(a);return Math.sqrt(a.reduce((s,v)=>s+v*v,0)/a.length);});
try{
  await page.goto('http://127.0.0.1:8000/',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.selene?.snapshot().ready,{},{timeout:60000});
  assert.equal(await page.evaluate(()=>seleneSound.snapshot().state),'locked');
  await page.locator('#begin').click();await page.keyboard.press('Escape');await page.keyboard.press('Digit2');
  await page.waitForFunction(()=>seleneSound.snapshot().loaded===17&&seleneSound.snapshot().state==='running');
  await page.locator('#audio-button').click();await page.locator('#audio-test').click();
  await page.waitForFunction(()=>seleneSound.snapshot().played>0);
  await page.locator('#close-audio').click();
  await page.waitForTimeout(400);assert.ok(await energy()>0,'the master output contains an audible signal');
  await page.locator('#audio-button').click();await page.locator('#audio-mute').click();await page.waitForTimeout(300);
  assert.ok(await energy()<.00001,'mute silences the final audio output');
  await page.locator('#audio-volume').fill('48');await page.locator('#audio-mute').click();await page.locator('#close-audio').click();

  const actionDone=()=>page.waitForFunction(()=>{const p=selene.snapshot().samples.people.find(p=>p.id==='solo');return p&&!p.action;},{},{timeout:9000});
  await page.keyboard.press('KeyF');await page.waitForFunction(()=>selene.snapshot().samples.people.find(p=>p.id==='solo')?.held);await actionDone();
  await page.keyboard.press('KeyB');await page.waitForFunction(()=>selene.snapshot().samples.people.find(p=>p.id==='solo')?.bag.length===1);await actionDone();
  await page.keyboard.press('KeyR');await page.waitForFunction(()=>selene.snapshot().samples.people.find(p=>p.id==='solo')?.held);await actionDone();
  await page.keyboard.down('KeyT');await page.waitForFunction(()=>selene.snapshot().aim.charge>.2);await page.keyboard.up('KeyT');
  await page.waitForFunction(()=>!selene.snapshot().samples.people.find(p=>p.id==='solo')?.held);await actionDone();
  await page.keyboard.press('KeyG');await page.waitForFunction(()=>selene.snapshot().samples.people.find(p=>p.id==='solo')?.soil===1);await actionDone();
  await page.locator('#scene').focus();await page.keyboard.down('KeyW');await page.waitForFunction(()=>seleneSound.snapshot().steps>=3,{},{timeout:12000});await page.keyboard.up('KeyW');
  await page.waitForFunction(()=>selene.snapshot().player.speed<.01);await page.keyboard.press('Space');await page.waitForFunction(()=>!selene.snapshot().player.grounded);await page.waitForFunction(()=>selene.snapshot().player.grounded,{},{timeout:10000});
  const audio=await page.evaluate(()=>seleneSound.snapshot());
  for(const name of ['impactMining_001','impactSoft_medium_000','impactMetal_light_000','footstep_snow_003','impactSoft_heavy_000'])assert.ok(audio.counts[name]>0,`${name} was played by its game action`);
  assert.equal(audio.failed,0);assert.equal(audio.settings.volume,.48);

  await page.locator('#rover-card summary').click();await page.locator('#find-rover').click();await page.locator('#scene').focus();
  await page.keyboard.down('KeyW');await page.waitForFunction(()=>{const s=selene.snapshot();return Math.hypot(s.player.x-s.rover.x,s.player.z-s.rover.z)<3.7;},{},{timeout:10000});await page.keyboard.up('KeyW');
  await page.waitForFunction(()=>selene.snapshot().player.speed<.01);
  await page.keyboard.press('KeyE');await page.waitForFunction(()=>selene.snapshot().riding);
  await page.keyboard.down('KeyW');await page.waitForFunction(()=>selene.snapshot().rover.speed>.5);
  await page.waitForFunction(()=>seleneSound.snapshot().motor.frequency>75&&seleneSound.snapshot().motor.gain>.02);
  await page.keyboard.up('KeyW');await page.keyboard.down('Space');await page.waitForFunction(()=>selene.snapshot().rover.speed<.2);await page.keyboard.up('Space');
  await page.keyboard.press('KeyE');await page.waitForFunction(()=>!selene.snapshot().riding,{},{timeout:6000});
  await page.waitForFunction(()=>seleneSound.snapshot().motor.gain<.001);

  await page.locator('#sample-card summary').click();assert.equal(await page.locator('#sample-card details').getAttribute('open'),null);
  await page.locator('#sample-card summary').click();
  await page.locator('#dock-toggle').click();assert.equal(await page.locator('#panel-list').isVisible(),false);await page.locator('#dock-toggle').click();
  await page.locator('#toolbar-toggle').click();assert.equal(await page.locator('#toolbar-items').isVisible(),false);await page.locator('#toolbar-toggle').click();
  const original=await page.locator('#mini-map').boundingBox();await page.locator('#map-smaller').click();
  assert.ok((await page.locator('#mini-map').boundingBox()).width<original.width);
  const handle=await page.locator('#map-drag').boundingBox();await page.mouse.move(handle.x+30,handle.y+10);await page.mouse.down();await page.mouse.move(handle.x+90,handle.y-80,{steps:8});await page.mouse.up();
  assert.equal(await page.locator('#atlas-dialog').isVisible(),false,'dragging does not open the atlas');
  assert.ok((await page.locator('#mini-map').boundingBox()).y<original.y-50);
  await page.locator('#map').click();assert.equal(await page.locator('#atlas-dialog').isVisible(),true);await page.locator('#close-atlas').click();await page.locator('#map-reset').click();

  const layouts=[];
  for(const [width,height] of [[1920,1080],[1536,864],[1440,900],[1366,768],[1280,720],[1024,600],[800,600],[390,844],[844,390]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(120);
    const layout=await page.evaluate(()=>{
      const rect=id=>{const r=document.querySelector(id).getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
      const cards=[...document.querySelectorAll('#panel-list>.hud-card')].filter(e=>!e.hidden).map(e=>{const r=e.getBoundingClientRect();return {id:e.id,top:r.top,bottom:r.bottom};});
      return {view:rect('#views'),brand:rect('.brand'),map:rect('#mini-map'),tools:rect('#toolbar-items'),dock:rect('#panel-dock'),cards,overflow:document.documentElement.scrollWidth>innerWidth};
    });
    assert.equal(layout.overflow,false,`${width}: no horizontal overflow`);
    assert.ok(Math.abs(layout.view.x+layout.view.w/2-width/2)<1,`${width}: camera views stay centered`);
    assert.ok(layout.map.x>=0&&layout.map.y>=0&&layout.map.right<=width&&layout.map.bottom<=height,`${width}: map stays onscreen`);
    for(let i=1;i<layout.cards.length;i++)assert.ok(layout.cards[i].top>=layout.cards[i-1].bottom,`${width}: panels never overlap`);
    assert.ok(layout.dock.bottom<=height,`${width}: panel stack stays onscreen`);
    const overlap=(a,b)=>a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y;
    assert.equal(overlap(layout.view,layout.tools),false,`${width}: tools do not cover the centered views`);
    assert.equal(overlap(layout.map,layout.dock),false,`${width}: default map stays clear of the panel stack`);
    await page.screenshot({path:`artifacts/hud-${width}x${height}.png`});layouts.push({width,height,center:layout.view.x+layout.view.w/2});
  }
  await page.setViewportSize({width:1366,height:768});
  // Headless tabs do not consistently emit window focus events. Exercise the
  // same browser event handlers explicitly and verify the real AudioContext.
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.waitForFunction(()=>seleneSound.snapshot().state==='suspended');
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForFunction(()=>seleneSound.snapshot().state==='running');
  // Preferences survive reload; changing the viewport does not move controls offscreen.
  await page.reload();await page.waitForFunction(()=>window.selene?.snapshot().ready,{},{timeout:60000});
  assert.equal(await page.evaluate(()=>seleneSound.snapshot().settings.volume),.48);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,audio,layouts},null,2));
}catch(error){console.log(await page.evaluate(()=>({audio:window.seleneSound?.snapshot(),game:window.selene?.snapshot().player,notice:document.querySelector('#toast')?.textContent})));await page.screenshot({path:'artifacts/hud-audio-failure.png'});throw error;}finally{await browser.close();}
