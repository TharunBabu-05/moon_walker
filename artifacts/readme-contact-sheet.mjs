import fs from 'node:fs/promises';
import sharp from 'sharp';
const files = [
  ...(await fs.readdir('video_proof')).filter(f=>f.endsWith('.png')).map(f=>'video_proof/'+f),
  ...['06-earth-moon','05-orbit','22-station-exterior','23-station-interior','35-historical-flags','37-flag-exhibits','39-flag-route-minimap','sample-crouch','sample-shovel','sample-release','temporary-first-person-aim','costume-1','costume-2','articulated-suspension','stadium-overview','stadium-driving','stadium-crowd','stadium-paddock','12-multiplayer-surface','21-lunar-atlas','08-new-surface'].map(f=>'artifacts/'+f+'.png'),
];
const width=400, height=250, cols=3, layers=[];
for(let i=0;i<files.length;i++){
 const file=files[i], x=(i%cols)*width,y=Math.floor(i/cols)*height;
 layers.push({input:await sharp(file).resize(width,220,{fit:'contain',background:'#080e12'}).png().toBuffer(),left:x,top:y});
 const name=file.replace(/^.*\//,'');
 layers.push({input:Buffer.from(`<svg width="400" height="30"><rect width="400" height="30" fill="#101820"/><text x="10" y="20" fill="white" font-family="Arial" font-size="13">${i}: ${name}</text></svg>`),left:x,top:y+220});
}
await sharp({create:{width:cols*width,height:Math.ceil(files.length/cols)*height,channels:3,background:'#080e12'}}).composite(layers).jpeg({quality:85}).toFile('artifacts/readme-contact-sheet.jpg');
