import {chromium} from 'playwright';
import fs from 'node:fs/promises';
const label=process.argv[2]||'baseline';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
try{
 const page=await browser.newPage({viewport:{width:1200,height:800}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8000/');await page.waitForFunction(()=>window.selene?.snapshot().ready,null,{timeout:120000});
 await page.locator('#begin').click();await page.keyboard.press('Escape');await page.keyboard.press('Digit2');await page.keyboard.press('KeyE');
 await page.waitForFunction(()=>selene.snapshot().riding);await page.waitForTimeout(2500);
 const cdp=await page.context().newCDPSession(page);await cdp.send('Profiler.enable');await cdp.send('Profiler.start');
 await page.keyboard.down('KeyW');
 const frames=await page.evaluate(()=>new Promise(resolve=>{const start=performance.now(),data=[];let last=start;function tick(t){data.push(t-last);last=t;if(t-start<26000)requestAnimationFrame(tick);else resolve(data);}requestAnimationFrame(tick);}));
 await page.keyboard.up('KeyW');const {profile}=await cdp.send('Profiler.stop');
 const counts=new Map();for(const n of profile.nodes)counts.set(n.id,{name:n.callFrame.functionName,url:n.callFrame.url,line:n.callFrame.lineNumber,count:0});for(const s of profile.samples)counts.get(s).count++;
 const sorted=frames.slice(2).sort((a,b)=>a-b),summary={label,frames:sorted.length,p50:sorted[Math.floor(sorted.length*.5)],p95:sorted[Math.floor(sorted.length*.95)],p99:sorted[Math.floor(sorted.length*.99)],max:sorted.at(-1),over100:sorted.filter(n=>n>100).length,over250:sorted.filter(n=>n>250).length,errors,state:await page.evaluate(()=>({player:selene.snapshot().player,streaming:selene.snapshot().streaming})),cpu:[...counts.values()].sort((a,b)=>b.count-a.count).slice(0,18)};
 await fs.writeFile(`artifacts/${label}-profile.json`,JSON.stringify(profile));await fs.writeFile(`artifacts/${label}-frames.json`,JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
 await page.screenshot({path:`artifacts/${label}-driving.png`});
}finally{await browser.close();}
