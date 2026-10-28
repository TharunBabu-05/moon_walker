import fs from 'node:fs/promises';
import {gridPlace} from '../src/stadium-layout.js';
// Test-only start position. Production has no teleport or separate race scene.
export async function paddockSpawn(page,slot=0){
  const p=gridPlace(slot),x=p.x+Math.cos(p.yaw)*3.2,z=p.z-Math.sin(p.yaw)*3.2;
  await page.route('**/src/physics.js',async route=>{const source=await fs.readFile('src/physics.js','utf8');await route.fulfill({contentType:'text/javascript',body:source.replace('return {x:0,z:0,y:heightAt(0,0)',`return {x:${x},z:${z},y:heightAt(${x},${z})`)});});
}
export async function toolbar(page){if(!await page.locator('#race-button').isVisible())await page.locator('#toolbar-toggle').click();}
export async function boot(page){await page.goto('http://127.0.0.1:8000/');await page.waitForFunction(()=>window.selene?.snapshot().ready,null,{timeout:120000});await page.locator('#begin').click();await page.keyboard.press('Escape');await page.keyboard.press('Digit2');}
