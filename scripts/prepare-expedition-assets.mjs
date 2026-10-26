import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const headers = {'User-Agent':'SELENE lunar explorer asset preparation'};
async function download(url) {
  const response = await fetch(url, {headers, signal:AbortSignal.timeout(90000)});
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  return Buffer.from(await response.arrayBuffer());
}
for (const id of ['moon_rock_01','moon_rock_03','moon_rock_05']) {
  const files = JSON.parse((await download(`https://api.polyhaven.com/files/${id}`)).toString());
  const entry = files.gltf['2k'].gltf;
  const directory = `assets/rocks/${id}`;
  await fs.mkdir(`${directory}/textures`, {recursive:true});
  const gltf = JSON.parse((await download(entry.url)).toString());
  for (const [relative, info] of Object.entries(entry.include)) {
    const bytes = await download(info.url);
    if (relative.endsWith('.jpg')) {
      const target = relative.replace('.jpg','.webp');
      await sharp(bytes).webp({quality:relative.includes('nor_')?92:87}).toFile(path.join(directory,target));
      for (const image of gltf.images || []) if (image.uri === relative) {image.uri = target;image.mimeType='image/webp';}
    } else await fs.writeFile(path.join(directory,relative),bytes);
  }
  await fs.writeFile(`${directory}/model.gltf`,JSON.stringify(gltf));
  console.log(`Prepared ${id}`);
}
const ground = JSON.parse((await download('https://api.polyhaven.com/files/gravelly_sand')).toString());
await fs.mkdir('assets/regolith',{recursive:true});
for (const [key,name] of [['Diffuse','color'],['nor_gl','normal'],['Rough','roughness'],['AO','ao']]) {
  const bytes = await download(ground[key]['2k'].jpg.url);
  let image = sharp(bytes);
  if (key==='Diffuse') image=image.grayscale();
  await image.webp({quality:key==='nor_gl'?92:87}).toFile(`assets/regolith/${name}.webp`);
  console.log(`Prepared regolith ${name}`);
}
await fs.mkdir('vendor/loaders',{recursive:true});
await fs.mkdir('vendor/utils',{recursive:true});
await fs.copyFile('node_modules/three/examples/jsm/loaders/GLTFLoader.js','vendor/loaders/GLTFLoader.js');
await fs.copyFile('node_modules/three/examples/jsm/utils/BufferGeometryUtils.js','vendor/utils/BufferGeometryUtils.js');
await fs.writeFile('vendor/peerjs.min.js',await download('https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js'));
await fs.writeFile('vendor/PEERJS-LICENSE.txt',await download('https://unpkg.com/peerjs@1.5.5/LICENSE'));
console.log('Prepared local model loader and PeerJS');
