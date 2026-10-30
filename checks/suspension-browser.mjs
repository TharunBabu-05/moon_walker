import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
await fs.mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({channel:process.env.SELENE_BROWSER_CHANNEL||'chrome',headless:true});
try{
  const page=await browser.newPage({viewport:{width:1200,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/src/main.js',r=>r.fulfill({contentType:'text/javascript',body:''}));
  await page.goto('http://127.0.0.1:8000/');
  const report=await page.evaluate(async()=>{
    const THREE=await import('three'),{createRover}=await import('/src/rover.js');
    const scene=new THREE.Scene();scene.background=new THREE.Color(0x101922);
    const canvas=document.querySelector('#scene');for(const e of [...document.body.children])if(e!==canvas)e.remove();
    const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(1);
    scene.add(new THREE.HemisphereLight(0xe5f2ff,0x78736a,2));const sun=new THREE.DirectionalLight(0xffeed2,3);sun.position.set(3,7,4);scene.add(sun);
    let slopeX=0,slopeZ=0;
    const ground=(x,z)=>slopeX*x+slopeZ*z,p={x:0,y:0,z:0,yaw:0,pitch:0,roll:0,steering:0,wheelTravel:0,grounded:true},rover=createRover(scene,ground,p);
    let maxJointError=0,maxLengthError=0,minSpring=Infinity,maxSpring=0;
    for(let i=0;i<900;i++){
      slopeX=Math.sin(i*.016)*.35;slopeZ=Math.cos(i*.012)*.4;
      p.pitch=-Math.atan(slopeZ);p.roll=Math.atan(slopeX);p.steering=Math.sin(i*.02)*.45;p.wheelTravel+=.02;
      p.grounded=i<300||i>600;p.y=p.grounded?0:1.5;
      rover.update(p,1/60);
      for(const w of rover.suspensionSnapshot()){
        maxJointError=Math.max(maxJointError,...w.jointErrors);maxLengthError=Math.max(maxLengthError,...w.armLengths.map(n=>Math.abs(n-.45)));
        minSpring=Math.min(minSpring,w.springLength);maxSpring=Math.max(maxSpring,w.springLength);
        if(w.hubY<.21-1e-9||w.hubY>.65+1e-9)throw Error('Suspension exceeded its stops');
      }
    }
    const droop=[];
    for(const fps of [30,60,144]){
      Object.assign(p,{y:0,grounded:true});for(let i=0;i<fps;i++)rover.update(p,1/fps);
      Object.assign(p,{y:1.5,grounded:false});for(let i=0;i<fps*3;i++)rover.update(p,1/fps);
      droop.push(rover.suspensionSnapshot().map(w=>w.hubY));
    }
    const slopeContacts=[];
    for(const [x,z] of [[0,0],[.25,0],[0,.3],[.25,-.3],[-.35,.2]])for(const steering of [0,.4]){
      slopeX=x;slopeZ=z;Object.assign(p,{y:0,yaw:0,pitch:-Math.atan(z),roll:Math.atan(x),steering,grounded:true});
      for(let i=0;i<240;i++)rover.update(p,1/60);
      slopeContacts.push({x,z,steering,gaps:rover.suspensionSnapshot().map(w=>w.contactGap)});
    }
    const camera=new THREE.PerspectiveCamera(40,innerWidth/innerHeight,.01,100);camera.position.set(4,1,5);camera.lookAt(0,.6,0);
    Object.assign(p,{y:.4,grounded:false,pitch:.34,roll:-.18,steering:.3});for(let i=0;i<180;i++)rover.update(p,1/60);
    const grid=new THREE.GridHelper(12,24,0x50616b,0x26353e);grid.position.y=-.3;scene.add(grid);renderer.render(scene,camera);
    return {maxJointError,maxLengthError,minSpring,maxSpring,droop,slopeContacts};
  });
  await page.screenshot({path:'artifacts/articulated-suspension.png'});
  assert.ok(report.maxJointError<1e-6,'all wishbones remain attached to the knuckles');assert.ok(report.maxLengthError<1e-6,'rigid arms retain length');
  assert.ok(report.maxSpring-report.minSpring>.1,'coil spring extends and compresses');
  for(const pose of report.droop)for(const y of pose)assert.ok(Math.abs(y-.21)<.001,'airborne wheels settle at bounded droop');
  for(const slope of report.slopeContacts)assert.ok(slope.gaps.every(g=>Math.abs(g)<.008),`steered tyre treads touch the slope: ${JSON.stringify(slope)}`);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,...report},null,2));
}finally{await browser.close();}
