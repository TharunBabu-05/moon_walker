import {chromium} from 'playwright';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
try{
  const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});
  await page.goto('http://127.0.0.1:8000',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.selene?.snapshot().ready,{},{timeout:60000});
  await page.locator('#begin').click();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Digit2');
  await page.locator('#costume-button').click();
  await page.waitForFunction(()=>window.selene.snapshot().costume===2);
  await page.screenshot({path:'artifacts/costume-2.png'});
  await page.locator('#costume-button').click();
  await page.waitForFunction(()=>window.selene.snapshot().costume===1);
  await page.screenshot({path:'artifacts/costume-1.png'});
}finally{await browser.close();}
