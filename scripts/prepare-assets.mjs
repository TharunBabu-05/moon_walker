import fs from 'node:fs/promises';
import sharp from 'sharp';
await fs.mkdir('assets', {recursive:true});
await fs.mkdir('vendor', {recursive:true});
await fs.mkdir('.cache', {recursive:true});
const base='https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/';
async function download(name, target) {
  try { await fs.access(target); return; } catch {}
  const response=await fetch(base+name);
  if(!response.ok) throw new Error(`${name}: ${response.status}`);
  await fs.writeFile(target,Buffer.from(await response.arrayBuffer()));
  console.log(`Downloaded ${name}`);
}
await Promise.all([
  download('lroc_color_poles_8k.tif','.cache/moon-color.tif'),
  download('ldem_3_8bit.jpg','assets/moon-height.jpg'),
  fs.copyFile('node_modules/three/build/three.module.js','vendor/three.module.js'),
  fs.copyFile('node_modules/three/LICENSE','vendor/THREE-LICENSE.txt')
]);
await sharp('.cache/moon-color.tif').webp({quality:94,effort:5}).toFile('assets/moon-color-8k.webp');
console.log('NASA lunar maps and local Three.js are ready.');
