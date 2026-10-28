import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
const context=await browser.newContext({viewport:{width:1100,height:740}}),errors=[];
if(process.env.SELENE_LOCAL_SIGNAL==='1')await context.addInitScript({path:'checks/local-peer-fixture.js'});
async function start(url){const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>window.selene?.snapshot().ready,null,{timeout:120000});await p.locator('#begin').click();if(!url.includes('?room=')){await p.keyboard.press('Escape');await p.keyboard.press('Digit2');}return p;}
async function toolbar(p){if(!await p.locator('#race-button').isVisible())await p.locator('#toolbar-toggle').click();}
async function enter(p,car){await toolbar(p);await p.locator('#race-button').click();await p.locator('.race-choice').nth(car).click();await p.locator('#race-enter').click();await p.waitForFunction(()=>seleneRace.snapshot().car,null,{timeout:60000});}
try{
 const host=await start('http://127.0.0.1:8000/');await toolbar(host);await host.locator('#crew-button').click();await host.locator('#explorer-name').fill('Race host');await host.locator('#host-expedition').click();
 await host.waitForFunction(()=>['connected','error'].includes(selene.snapshot().network.phase),null,{timeout:30000});assert.equal(await host.evaluate(()=>selene.snapshot().network.phase),'connected',await host.locator('#network-status').innerText());
 const invite=await host.locator('#invite-link').inputValue();await host.locator('#close-crew').click();
 const guest=await start(invite);await guest.locator('#explorer-name').fill('Race guest');await guest.locator('#join-expedition').click();await guest.waitForFunction(()=>selene.snapshot().network.phase==='connected',null,{timeout:30000});await guest.locator('#close-crew').click();
 await host.waitForFunction(()=>selene.snapshot().network.count===2,null,{timeout:10000});await guest.waitForFunction(()=>selene.snapshot().network.count===2,null,{timeout:10000});
 await enter(host,0);await enter(guest,3);
 await host.waitForFunction(()=>seleneRace.snapshot().world?.racers.length===2);await guest.waitForFunction(()=>seleneRace.snapshot().world?.racers.length===2);
 const before=await guest.evaluate(()=>seleneRace.snapshot().car.travel);await guest.keyboard.down('KeyW');await guest.keyboard.down('KeyF');
 await guest.waitForFunction(d=>seleneRace.snapshot().car.travel>d+30,before,{timeout:15000});await guest.keyboard.up('KeyW');await guest.keyboard.up('KeyF');
 await host.waitForFunction(()=>seleneRace.snapshot().world.racers.find(p=>p.name==='Race guest')?.travel>30);
 assert.ok(await host.evaluate(()=>seleneRace.snapshot().world.events.some(e=>e.type==='fire')));
 await guest.screenshot({path:'artifacts/race-multiplayer.png'});
 await guest.locator('#race-leave').click();await host.waitForFunction(()=>seleneRace.snapshot().world.racers.length===1);
 await host.locator('#race-leave').click();assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,transport:'two real WebRTC data channels',signalling:process.env.SELENE_LOCAL_SIGNAL==='1'?'local test fixture':'public PeerJS service',checks:['join','car selection','guest driving on host','weapons replicated','leave cleanup'],errors}));
}catch(error){for(const p of context.pages())console.log(JSON.stringify(await p.evaluate(()=>({hidden:document.hidden,network:window.selene?.snapshot().network,status:document.querySelector('#network-status')?.textContent,race:window.seleneRace?.snapshot(),peers:window.__localPeers?.map(p=>({id:p.id,counts:p.counts,links:[...p.links.values()].map(l=>({id:l.peer,metadata:l.metadata,open:l.open,counts:l.counts,pc:l.pc.connectionState,listeners:[...l.events.keys()]}))})),error:document.querySelector('#error-message')?.textContent})),null,2));throw error;}finally{await browser.close();}
