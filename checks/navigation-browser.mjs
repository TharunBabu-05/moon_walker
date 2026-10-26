import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
await fs.mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const snap=()=>page.evaluate(()=>selene.snapshot());
try{
  await page.goto(process.env.SELENE_BASE_URL||'http://127.0.0.1:8000/',{waitUntil:'domcontentloaded',timeout:90000});await page.waitForFunction(()=>window.selene?.snapshot().ready,{},{timeout:120000});
  await page.locator('#begin').click();await page.keyboard.press('Escape');await page.keyboard.press('Digit2');await page.screenshot({path:'artifacts/30-continuous-terrain.png'});
  await page.keyboard.press('KeyE');await page.waitForFunction(()=>selene.snapshot().riding);await page.waitForTimeout(350);
  await page.mouse.move(750,440);await page.mouse.down();await page.mouse.move(1100,550,{steps:10});await page.mouse.up();
  await page.keyboard.press('KeyE');await page.waitForFunction(()=>selene.snapshot().dismount?.progress>.12);
  const exiting=await snap();assert.equal(exiting.riding,true);assert.ok(exiting.dismount.progress<1);
  await page.screenshot({path:'artifacts/31-stepping-out.png'});
  const frames=await page.evaluate(()=>new Promise(resolve=>{const values=[];function frame(){const s=selene.snapshot();values.push({p:s.player,avatar:s.avatarPosition,t:s.dismount?.progress??1});if(s.dismount)requestAnimationFrame(frame);else resolve(values);}frame();}));
  for(let i=1;i<frames.length;i++){const a=frames[i-1].avatar,b=frames[i].avatar;assert.ok(Math.hypot(...b.map((v,j)=>v-a[j]))<.4,'exit has no teleport between animation frames');}
  const exited=await snap();assert.equal(exited.riding,false);assert.ok(Math.abs(exited.player.y-exited.ground)<.05);await page.screenshot({path:'artifacts/32-exit-ground-contact.png'});
  await page.locator('#mini-map').click();assert.equal((await snap()).atlas.tab,'local');assert.match(await page.locator('#surface-position').innerText(),/YOU/);
  const map=await page.locator('#surface-map').boundingBox();await page.mouse.click(map.x+map.width*.46,map.y+map.height*.51);
  let nav=(await snap()).navigation;assert.ok(nav.destination,'click creates a pin');
  // A short clear objective follows the player's forward direction, away from the buggy.
  await page.locator('#pin-east').fill((exited.player.x-10).toFixed(2));await page.locator('#pin-north').fill((-exited.player.z).toFixed(2));await page.getByRole('button',{name:'Pin coordinates',exact:true}).click();
  nav=(await snap()).navigation;assert.equal(nav.status,'ready');assert.ok(nav.points.length>1);await page.screenshot({path:'artifacts/33-surface-route.png'});
  await page.locator('#close-atlas').click();await page.waitForTimeout(200);assert.equal(await page.locator('#route-card').isVisible(),true);await page.screenshot({path:'artifacts/34-minimap-route.png'});
  // Follow the computed route with ordinary camera and keyboard controls.
  let iterations=0;
  while((await snap()).navigation.status==='ready'&&iterations++<18){
    const s=await snap(),points=s.navigation.points,target=points[Math.min(points.length-1,(s.navigation.index||0)+1)],currentYaw=Math.atan2(s.camera.x-s.player.x,s.camera.z-s.player.z),desired=Math.atan2(-(target.x-s.player.x),-(target.z-s.player.z)),dx=Math.atan2(Math.sin(currentYaw-desired),Math.cos(currentYaw-desired))/.004;
    await page.mouse.move(700,470);await page.mouse.down();await page.mouse.move(700+dx,470,{steps:8});await page.mouse.up();await page.locator('#scene').focus();await page.keyboard.down('KeyW');await page.waitForTimeout(700);await page.keyboard.up('KeyW');
  }
  assert.equal((await snap()).navigation.status,'arrived');
  await page.locator('#mini-map').click();await page.locator('#atlas-global-tab').click();await page.locator('#atlas-search').fill('Apollo 11');await page.locator('#atlas-list button').click();assert.equal(await page.locator('#site-flag').isVisible(),true);assert.match(await page.locator('#site-flag-text').innerText(),/liftoff/);
  await page.screenshot({path:'artifacts/35-historical-flags.png'});await page.locator('#site-flag-route').click();assert.equal((await snap()).atlas.tab,'local');assert.match((await snap()).navigation.destination.label,/Apollo 11/);
  await page.locator('#surface-clear').click();assert.equal((await snap()).navigation.destination,null);
  await page.locator('#atlas-station').click();await page.keyboard.press('Digit2');await page.locator('#scene').focus();await page.keyboard.down('KeyS');await page.keyboard.down('ShiftLeft');
  await page.waitForFunction(()=>selene.snapshot().player.z>80,{},{timeout:45000});await page.keyboard.up('KeyS');await page.keyboard.up('ShiftLeft');await page.waitForTimeout(700);
  await page.screenshot({path:'artifacts/37-flag-exhibits.png'});
  await page.locator('#mini-map').click();await page.locator('#atlas-local-tab').click();
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/36-mobile-navigation.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal((await snap()).flagExhibits.length,8);assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,exitFrames:frames.length,route:'pinned, followed, arrived, cleared',flags:8,errors},null,2));
}finally{await browser.close();}
