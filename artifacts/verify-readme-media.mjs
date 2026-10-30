import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import sharp from 'sharp';
const manifest=JSON.parse(await fs.readFile('docs/media/sources.json','utf8'));
const report={images:manifest.images.length,gifs:[],bytes:0};
for(const entry of [...manifest.images,...manifest.clips]){
 const file='docs/media/'+entry.output;
 const stat=await fs.stat(file),meta=await sharp(file,{animated:true}).metadata();report.bytes+=stat.size;
 assert.ok(meta.width>0&&meta.height>0);
 if(entry.duration){
  const seconds=meta.delay.reduce((a,b)=>a+b,0)/1000;
  assert.ok(meta.pages>1&&meta.loop===0,'GIF must be animated and loop');
  assert.ok(Math.abs(seconds-entry.duration)<.15,'Full sequence timing is preserved');
  assert.ok(stat.size<5*1024*1024,'Each GIF stays under 5 MiB');
  report.gifs.push({file:entry.output,width:meta.width,frames:meta.pages,seconds,bytes:stat.size});
 }
}
await fs.writeFile('artifacts/readme-media-report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
