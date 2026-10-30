import {chromium} from 'playwright';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const page=await browser.newPage();
  await page.route('**/src/main.js',route=>route.fulfill({contentType:'text/javascript',body:''}));
  await page.goto('http://127.0.0.1:8000/');
  console.log(JSON.stringify(await page.evaluate(async()=>{
    const THREE=await import('three'),{createLandscape}=await import('/src/landscape.js'),{createRockField}=await import('/src/rocks.js'),{createPlayer,stepPlayer,FIXED_STEP}=await import('/src/physics.js'),{resolveObstacles}=await import('/src/world.js');
    const landscape=createLandscape(),field=await createRockField(new THREE.Group(),{capabilities:{getMaxAnisotropy:()=>1}},landscape,new THREE.MeshStandardMaterial());
    const r=field.records.find(r=>r.x===-3&&r.z===-5),p=createPlayer(field.groundAt),samples=[];
    p.x=r.x+r.radius+1;p.z=r.z;p.y=field.groundAt(p.x,p.z);
    let jumped=false,maxHeight=0;
    for(let i=0;i<900;i++){
      const jump=!jumped&&p.x-r.x<r.radius+.65;if(jump)jumped=true;
      stepPlayer(p,{x:p.x>r.x+.05?-1:0,z:0,jump},FIXED_STEP,field.groundAt);
      const hit=resolveObstacles(p,field.colliders,.32,field.surfaceAt);
      if(p.grounded)p.y=field.groundAt(p.x,p.z);
      maxHeight=Math.max(maxHeight,p.y-landscape.groundAt(p.x,p.z));
      if(i%60===0)samples.push({x:p.x,y:p.y,grounded:p.grounded,hit});
    }
    return {r,top:field.surfaceAt(r,r.x,r.z),floor:landscape.groundAt(r.x,r.z),p,maxHeight,samples};
  }),null,2));
}finally{await browser.close();}
