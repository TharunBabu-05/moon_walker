import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
import { marked } from '../.cache/marked.mjs';
import { chromium } from 'playwright';

const markdown=await fs.readFile('README.md','utf8');
const slug=s=>s.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu,'').replace(/\s/g,'-');
const headingIds=new Set([...markdown.matchAll(/^#{1,6} (.+)$/gm)].map(m=>slug(m[1])));
let localLinks=0;
for(const doc of ['README.md','docs/DEVELOPMENT.md','docs/media/README.md']){
 const text=await fs.readFile(doc,'utf8');
 for(const m of text.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)){
  const link=m[1];if(/^https?:/.test(link))continue;
  if(link.startsWith('#')){if(doc==='README.md')assert.ok(headingIds.has(link.slice(1)),`Missing anchor ${link}`);continue;}
  await fs.access(path.resolve(path.dirname(doc),decodeURIComponent(link.split('#')[0])));localLinks++;
 }
}
const html=marked.parse(markdown).replace(/<h([1-6])>(.*?)<\/h\1>/g,(_,level,text)=>`<h${level} id="${slug(text)}">${text}</h${level}>`);
await fs.writeFile('artifacts/readme-preview.html',`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="/"><title>SELENE README preview</title><style>
*{box-sizing:border-box}body{margin:0;background:#0d1117;color:#e6edf3;font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{max-width:980px;margin:auto;padding:40px;border:1px solid #30363d}h1{font-size:32px}h2{margin-top:32px;border-bottom:1px solid #30363d;padding-bottom:8px}h3{margin-top:24px}a{color:#58a6ff;text-decoration:none}img{max-width:100%;height:auto}table{border-collapse:collapse;width:100%;margin:16px 0;display:block;overflow-x:auto}th,td{border:1px solid #30363d;padding:8px 12px}td{vertical-align:top}tr:nth-child(2n){background:#161b22}pre,code{background:#161b22;border-radius:6px}pre{padding:16px;overflow-x:auto}code{font-size:85%;padding:2px 4px}pre code{padding:0}summary{cursor:pointer;padding:10px 0;color:#b8d9d6}hr{border:0;height:1px;background:#30363d;margin:32px 0}@media(max-width:600px){main{padding:18px 14px;border:0}body{font-size:14px}td,th{padding:6px}h1{font-size:28px}}
</style></head><body><main>${html}</main></body></html>`);

const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1200,height:900}});
 await page.goto('http://127.0.0.1:8000/artifacts/readme-preview.html');
 await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
 const report=await page.evaluate(()=>({images:document.images.length,broken:[...document.images].filter(i=>!i.naturalWidth).map(i=>i.src),overflow:document.documentElement.scrollWidth>innerWidth}));
 assert.equal(report.broken.length,0);assert.equal(report.overflow,false);
 await page.screenshot({path:'artifacts/readme-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'artifacts/readme-mobile.png',fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Mobile page overflow');
 await page.getByText('Look inside the grandstands',{exact:true}).click();
 assert.ok(await page.locator('details[open]').count());
 console.log(JSON.stringify({localLinks,...report,mobileOverflow:false,collapsibleGallery:true}));
 if(process.argv.includes('--suits')){
  await page.setViewportSize({width:720,height:720});await page.goto('http://127.0.0.1:8000/artifacts/readme-suits.html');await page.waitForFunction(()=>!!window.setSuit);
  for(const id of [1,2]){await page.evaluate(id=>window.setSuit(id),id);await page.screenshot({path:`artifacts/readme-costume-${id}.png`});}
 }
}finally{await browser.close();}
