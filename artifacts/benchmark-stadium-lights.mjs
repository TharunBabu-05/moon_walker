import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import {paddockSpawn,boot} from '../checks/stadium-fixture.mjs';
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
try{for(const count of [0,2,4]){
 const page=await browser.newPage({viewport:{width:1366,height:768}});page.on('pageerror',e=>console.log('error',e.message));await paddockSpawn(page);
 await page.route('**/src/race-models.js',async r=>{let s=await fs.readFile('src/race-models.js','utf8');s=s.replace('Array.from({length:4},()=>{const l=new THREE.SpotLight',`Array.from({length:${count}},()=>{const l=new THREE.SpotLight`);await r.fulfill({contentType:'text/javascript',body:s});});
 await boot(page);await page.keyboard.press('KeyE');await page.waitForFunction(()=>seleneRace.snapshot().active);await page.waitForTimeout(2000);
 const frames=await page.evaluate(()=>new Promise(resolve=>{let last=performance.now(),start=last;const frames=[];function tick(t){frames.push(t-last);last=t;if(t-start<8000)requestAnimationFrame(tick);else resolve(frames);}requestAnimationFrame(tick);}));
 frames.sort((a,b)=>a-b);console.log(JSON.stringify({lights:count,median:frames[Math.floor(frames.length*.5)],p95:frames[Math.floor(frames.length*.95)],max:frames.at(-1)}));await page.screenshot({path:`artifacts/stadium-lights-${count}.png`});await page.close();
}}finally{await browser.close();}
