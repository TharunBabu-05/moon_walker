import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const page=await browser.newPage();
  // Exercise the production models, rig and contact solver in a DOM fixture.
  await page.route('**/src/main.js',r=>r.fulfill({contentType:'text/javascript',body:''}));
  await page.goto('http://127.0.0.1:8000/');
  const report=await page.evaluate(async()=>{
    const THREE=await import('three'),{createAstronaut}=await import('/src/astronaut.js'),{createPlayer,stepPlayer,FIXED_STEP}=await import('/src/physics.js'),{resolveObstacles}=await import('/src/world.js'),{createRockField}=await import('/src/rocks.js'),{createLandscape}=await import('/src/landscape.js');
    const flat=()=>0,p=createPlayer(flat),avatar=createAstronaut(new THREE.Scene(),flat,()=>{});
    const landingFeet=[];
    for(const costume of [1,2])for(const fps of [30,60,144])for(const slope of [0,.2]){
      const ground=x=>x*slope,walker=createPlayer(ground),rig=createAstronaut(new THREE.Scene(),ground,()=>{});rig.setCostume(costume);
      let accumulator=0,jump=false;
      for(let frame=0;frame<fps*5;frame++){
        accumulator+=1/fps;if(frame===fps)jump=true;
        while(accumulator>=FIXED_STEP){stepPlayer(walker,{x:0,z:0,jump},FIXED_STEP,ground);jump=false;accumulator-=FIXED_STEP;}
        // Remote playback need not carry the transient landed flag.
        rig.update({...walker,landed:false},1/fps);rig.root.updateMatrixWorld(true);
      }
      landingFeet.push({costume,fps,slope,heights:rig.legs.map(l=>{const foot=l.foot.getWorldPosition(new THREE.Vector3());return foot.y-ground(foot.x);})});rig.dispose();
    }
    let maxUpperError=0,maxLowerError=0,maxFootMotion=0,stanceSamples=0;
    const previous=avatar.legs.map(l=>l.world.clone());
    for(let i=0;i<720;i++){
      const wasSwinging=avatar.legs.map(l=>l.swing);
      stepPlayer(p,{x:i>300&&i<450?1:0,z:i<300?-1:0,fast:i>=180&&i<300,jump:i===450},FIXED_STEP,flat);
      avatar.update(p,FIXED_STEP);
      avatar.root.updateMatrixWorld(true);
      avatar.legs.forEach((leg,j)=>{
        const rendered=leg.foot.getWorldPosition(new THREE.Vector3());
        maxUpperError=Math.max(maxUpperError,Math.abs(leg.upper.scale.y-.435));
        maxLowerError=Math.max(maxLowerError,Math.abs(leg.lower.scale.y-.425));
        if(i>1&&p.grounded&&!p.landed&&!wasSwinging[j]&&!leg.swing){maxFootMotion=Math.max(maxFootMotion,rendered.distanceTo(previous[j]));stanceSamples++;}
        previous[j].copy(rendered);
      });
    }
    // A teleport and a deep sampling crouch must not elongate either bone.
    p.x+=30;avatar.update(p,FIXED_STEP);avatar.samplePose(p,{crouch:.6,tilt:-.8});
    for(const leg of avatar.legs){maxUpperError=Math.max(maxUpperError,Math.abs(leg.upper.scale.y-.435));maxLowerError=Math.max(maxLowerError,Math.abs(leg.lower.scale.y-.425));}
    const landscape=createLandscape(),field=await createRockField(new THREE.Group(),{capabilities:{getMaxAnisotropy:()=>1}},landscape,new THREE.MeshStandardMaterial()),contacts=[];
    for(const [x,z] of [[-3,-5],[6,-12],[-13,-22]]){
      const rock=field.records.find(r=>r.x===x&&r.z===z),top=field.surfaceAt(rock,x,z),walker=createPlayer(field.groundAt);
      Object.assign(walker,{x,z,y:top+.4,grounded:false,vy:-.1});
      let rejected=0;
      for(let i=0;i<360;i++){stepPlayer(walker,{x:0,z:0},FIXED_STEP,field.groundAt);if(resolveObstacles(walker,field.colliders,.32,field.surfaceAt))rejected++;}
      contacts.push({top,y:walker.y,grounded:walker.grounded,drift:Math.hypot(walker.x-x,walker.z-z),rejected});
    }
    // Approach through normal movement, jump, then stop on the rock.
    const rock=field.records.find(r=>r.x===-3&&r.z===-5),walker=createPlayer(field.groundAt);
    Object.assign(walker,{x:rock.x+3,z:rock.z});walker.y=field.groundAt(walker.x,walker.z);
    let jumped=false,landedOnRock=false,standingFrames=0,maxGroundedHeight=0;
    for(let i=0;i<720;i++){
      const jump=!jumped&&walker.x-rock.x<2.42;if(jump)jumped=true;
      stepPlayer(walker,{x:landedOnRock?0:-1,z:0,jump},FIXED_STEP,field.groundAt);
      resolveObstacles(walker,field.colliders,.32,field.surfaceAt);
      if(walker.grounded){walker.y=field.groundAt(walker.x,walker.z);const above=walker.y-landscape.groundAt(walker.x,walker.z);maxGroundedHeight=Math.max(maxGroundedHeight,above);if(above>.08){standingFrames++;landedOnRock=true;}}
    }
    return {landingFeet,maxUpperError,maxLowerError,maxFootMotion,stanceSamples,contacts,jump:{standingFrames,maxGroundedHeight,walker}};
  });
  console.log(JSON.stringify(report,null,2));
  for(const landing of report.landingFeet)assert.ok(landing.heights.every(h=>Math.abs(h)<.01),`both boots settle after an idle jump: ${JSON.stringify(landing)}`);
  assert.ok(report.maxUpperError<1e-6&&report.maxLowerError<1e-6,'thighs and shins retain fixed lengths through movement, jumps and crouches');
  assert.ok(report.stanceSamples>100&&report.maxFootMotion<1e-6,'stance feet stay planted');
  for(const c of report.contacts){assert.ok(c.grounded&&Math.abs(c.y-c.top)<.01&&c.drift<.01,'actual model supports a stable landing');}
  assert.ok(report.jump.standingFrames>120,'jump onto the boulder and remain standing for more than a second');
}finally{await browser.close();}
