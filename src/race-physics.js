import {createLandscape} from './landscape.js';
import {resolveTrackFence} from './track-boundary.js';
import {RACE_CONTACT,SIX_WHEEL_CONTACT,moveVehicleWithRocks,wheelSurface} from './vehicle-contact.js';
import {STADIUM,clamp,gridPlace,CHECKPOINTS,ROCKFALLS,rockfallPose} from './stadium-layout.js';
export const ARENA=STADIUM;
export const CARS=[
  {name:'RUSTWALKER',color:0x99734f,speed:27,accel:3.8,grip:3.8},
  {name:'IRON MULE',color:0x647266,speed:23,accel:3.2,grip:4.7},
  {name:'DUNE JACKAL',color:0xa8a6a0,speed:30,accel:4.0,grip:3.5},
  {name:'RED PROSPECTOR',color:0x8a463b,speed:26,accel:3.6,grip:4.2}
];
export const cleanRaceInput=v=>({throttle:clamp(Number(v?.throttle)||0,-1,1),steer:clamp(Number(v?.steer)||0,-1,1),brake:!!v?.brake,seq:Number.isSafeInteger(v?.seq)?v.seq:0});
export function newRacer(id,car,slot,name,ground){const p=gridPlace(slot);return {...p,id,name:String(name||'Explorer').slice(0,20),car,slot,y:ground(p.x,p.z),vx:0,vz:0,vy:0,speed:0,travel:0,pitch:0,roll:0,steering:0,grounded:true,hp:100,dead:0,shield:2,next:1,lap:0,time:0,finish:0,ready:false,ack:0,version:0};}
export function driveRacer(p,raw,dt,ground,parked=[],environment=null){
  const i=cleanRaceInput(raw),c=CARS[p.car];if(p.dead)return;
  p.steering+=(i.steer-p.steering)*(1-Math.exp(-7*dt));
  const sx=Math.sin(p.yaw),cx=Math.cos(p.yaw),forward=-p.vx*sx-p.vz*cx,lateral=p.vx*cx-p.vz*sx;
  let speed=forward;
  if(p.grounded){const gx=(ground(p.x+.8,p.z)-ground(p.x-.8,p.z))/1.6,gz=(ground(p.x,p.z+.8)-ground(p.x,p.z-.8))/1.6;speed+=(i.throttle*c.accel-speed*(i.brake?5:.12)+(gx*sx+gz*cx)*1.62)*dt;speed=clamp(speed,-8,c.speed);}
  p.yaw+=p.steering*clamp(speed/8,-1,1)*(.58/(1+Math.abs(speed)*.035))*dt*(p.grounded?1:.12);
  if(p.grounded){const side=lateral*Math.exp(-c.grip*dt);p.vx=-Math.sin(p.yaw)*speed+Math.cos(p.yaw)*side;p.vz=-Math.cos(p.yaw)*speed-Math.sin(p.yaw)*side;}
  const oldX=p.x,oldZ=p.z,oldY=p.y;p.x+=p.vx*dt;p.z+=p.vz*dt;
  const rocks=environment?.nearby(p.x,p.z,7)||[];
  p.rockImpact=moveVehicleWithRocks(p,oldX,oldZ,ground,rocks,environment?.surfaceAt,p.car===1?SIX_WHEEL_CONTACT:RACE_CONTACT);
  for(const q of parked)if(q.slot!==p.slot&&Math.abs(p.y-q.y)<3)separateStatic(p,q,4.1);
  p.rockImpact=Math.max(p.rockImpact,resolveTrackFence(p,oldX,oldZ,ground));
  const r=Math.hypot(p.x-STADIUM.x,p.z-STADIUM.z);
  const oldR=Math.hypot(oldX-STADIUM.x,oldZ-STADIUM.z);
  if(oldR<=1066&&r>1066&&!(p.x<STADIUM.x&&Math.abs(p.z-STADIUM.z)<65)){const nx=(p.x-STADIUM.x)/r,nz=(p.z-STADIUM.z)/r;p.x=STADIUM.x+nx*1066;p.z=STADIUM.z+nz*1066;const v=p.vx*nx+p.vz*nz;if(v>0){p.vx-=v*1.15*nx;p.vz-=v*1.15*nz;}}
  const cy=Math.cos(p.yaw),sy=Math.sin(p.yaw),heights=[];
  for(const side of [-1,1])for(const z of [-1.65,1.65])heights.push(wheelSurface(p.x+cy*side*1.57+sy*z,p.z-sy*side*1.57+cy*z,ground,rocks,environment?.surfaceAt,RACE_CONTACT.step));
  let floor=Math.max(ground(p.x,p.z),heights.reduce((a,b)=>a+b,0)/4,Math.max(...heights)-.38);
  if(p.car===1)for(const side of [-1,1])floor=Math.max(floor,wheelSurface(p.x+cy*side*1.57,p.z-sy*side*1.57,ground,rocks,environment?.surfaceAt,RACE_CONTACT.step)-.20);
  const rise=(floor-oldY)/dt;
  if(p.grounded&&oldY-floor>.09){p.grounded=false;p.vy=clamp(p.vy,-2,3.5);}
  if(!p.grounded){p.vy-=1.62*dt;p.y+=p.vy*dt;}
  if(p.grounded||p.y<=floor){p.y=floor;p.vy=clamp(rise,-2,3.5);p.grounded=true;}
  if(!Number.isFinite(p.y)||p.y<ground(p.x,p.z)-.2){p.y=floor;p.vy=0;p.grounded=true;}
  p.pitch+=(clamp(Math.atan2((heights[0]+heights[2]-heights[1]-heights[3])/2,3.3),-.65,.65)-p.pitch)*(1-Math.exp(-8*dt));
  p.roll+=(clamp(Math.atan2((heights[2]+heights[3]-heights[0]-heights[1])/2,2.9),-.5,.5)-p.roll)*(1-Math.exp(-8*dt));
  p.speed=Math.hypot(p.vx,p.vz);p.travel+=Math.hypot(p.x-oldX,p.z-oldZ);
}
function separateStatic(p,q,r){const dx=p.x-q.x,dz=p.z-q.z,d=Math.hypot(dx,dz);if(d>=r)return;const nx=d?dx/d:1,nz=d?dz/d:0;p.x=q.x+nx*r;p.z=q.z+nz*r;const v=p.vx*nx+p.vz*nz;if(v<0){p.vx-=v*nx;p.vz-=v*nz;}p.speed=Math.hypot(p.vx,p.vz);}
export class RaceWorld{
  constructor(ground=createLandscape().groundAt,environment=null){this.ground=ground;this.environment=environment;this.racers=new Map();this.inputs=new Map();this.time=0;this.phase='lobby';this.countdown=0;this.raceTime=0;this.serial=0;this.events=[];this.hits=new Map();this.parked=Array.from({length:8},(_,slot)=>newRacer('',slot%4,slot,'',ground));}
  join(id,car,slot,name){if(this.phase!=='lobby')return 'A race is running. Watch from the stadium and join the next heat.';if(this.racers.has(id))return;if(this.racers.size>=8)return 'All eight vehicles are occupied.';if([...this.racers.values()].some(p=>p.slot===slot))return 'That vehicle is occupied. Choose another parked buggy.';this.racers.set(id,{...newRacer(id,slot%4,slot,name,this.ground),x:this.parked[slot].x,y:this.parked[slot].y,z:this.parked[slot].z,yaw:this.parked[slot].yaw});}
  leave(id){const p=this.racers.get(id);if(p)this.parked[p.slot]={...p,id:'',vx:0,vz:0,vy:0,speed:0,dead:0,hp:100};this.racers.delete(id);this.inputs.delete(id);if(!this.racers.size){this.phase='lobby';this.raceTime=0;}else if(this.phase==='countdown'){this.phase='lobby';this.countdown=0;}}
  input(id,v){const p=this.racers.get(id),i=cleanRaceInput(v);if(p&&i.seq>=p.ack){this.inputs.set(id,{...i,at:this.time});p.ack=i.seq;}}
  ready(id){const p=this.racers.get(id);if(!p||this.phase!=='lobby')return 'Wait until this heat ends.';const pad=gridPlace(p.slot);if(p.speed>.5||Math.hypot(p.x-pad.x,p.z-pad.z)>80)return 'Stop near the starting grid before marking ready.';p.ready=!p.ready;}
  start(solo=false){if(this.phase!=='lobby')return 'A heat is already running.';const ps=[...this.racers.values()];if(ps.length<(solo?1:2))return 'At least two friends must board. Use Solo practice to try the course alone.';if(ps.some(p=>!p.ready))return 'Every seated driver must press Ready.';this.phase='countdown';this.countdown=5;this.raceTime=0;for(const p of ps){p.next=1;p.lap=0;p.time=0;p.finish=0;p.hp=100;p.dead=0;p.version++;}}
  resetHeat(){this.phase='lobby';this.countdown=0;for(const p of this.racers.values()){p.ready=false;p.finish=0;}return 'Heat ended. Drive back to the starting grid to ready up again.';}
  event(type,p){this.events.push({id:++this.serial,type,x:p.x,y:p.y,z:p.z});if(this.events.length>20)this.events.shift();}
  damage(p,amount){if(p.dead||p.shield>0)return;p.hp=Math.max(0,p.hp-amount);this.event('hit',p);if(!p.hp){p.dead=4;p.vx=p.vz=p.speed=0;p.version++;this.event('destroy',p);}}
  step(dt){
    this.time+=dt;if(this.phase==='countdown'){this.countdown=Math.max(0,this.countdown-dt);if(this.countdown<1e-8){this.phase='racing';this.countdown=0;this.event('start',{x:STADIUM.x,y:0,z:STADIUM.z});}}
    if(this.phase==='racing')this.raceTime+=dt;
    const occupied=new Set([...this.racers.values()].map(p=>p.slot)),freeParked=this.parked.filter(p=>!occupied.has(p.slot));
    for(const p of this.racers.values()){
      if(p.dead){p.dead=Math.max(0,p.dead-dt);if(p.dead<1e-8){p.dead=0;p.hp=100;p.shield=2;p.version++;p.y=this.ground(p.x,p.z);p.vy=0;p.grounded=true;this.event('respawn',p);}continue;}
      p.shield=Math.max(0,p.shield-dt);const raw=this.inputs.get(p.id),locked=this.phase==='countdown'||this.phase==='lobby'&&p.ready;
      driveRacer(p,!locked&&raw&&this.time-raw.at<.35?raw:{brake:true},dt,this.ground,freeParked,this.environment);
      if(p.rockImpact>7&&this.phase==='racing')this.damage(p,Math.min(35,p.rockImpact));
      if(this.phase==='racing'&&!p.finish){p.time=this.raceTime;const g=CHECKPOINTS[p.next];if(Math.hypot(p.x-g.x,p.z-g.z)<46){p.next=(p.next+1)%CHECKPOINTS.length;if(p.next===1){p.lap++;if(p.lap>=STADIUM.laps){p.finish=this.raceTime;this.event('finish',p);}}}}
      if(this.phase==='racing')for(const site of ROCKFALLS){const rock=rockfallPose(site,this.raceTime,this.ground(site.x,site.z)),key=p.id+':'+site.id;if(rock.active&&Math.abs(rock.y-(p.y+1))<rock.radius+1.3&&Math.hypot(p.x-rock.x,p.z-rock.z)<rock.radius+2&&this.hits.get(key)!==rock.cycle){this.hits.set(key,rock.cycle);this.damage(p,75);p.vx*=.3;p.vz*=.3;}}
    }
    const ps=[...this.racers.values()];for(let a=0;a<ps.length;a++)for(let b=a+1;b<ps.length;b++){const p=ps[a],q=ps[b];if(p.dead||q.dead||Math.abs(p.y-q.y)>3)continue;const dx=p.x-q.x,dz=p.z-q.z,d=Math.hypot(dx,dz);if(d<4.1){const nx=d?dx/d:1,nz=d?dz/d:0,depth=(4.1-d)/2;p.x+=nx*depth;p.z+=nz*depth;q.x-=nx*depth;q.z-=nz*depth;const v=(p.vx-q.vx)*nx+(p.vz-q.vz)*nz;if(v<0){p.vx-=v*.55*nx;p.vz-=v*.55*nz;q.vx+=v*.55*nx;q.vz+=v*.55*nz;if(v< -7&&this.phase==='racing'){this.damage(p,Math.min(35,-v));this.damage(q,Math.min(35,-v));}}}}
    if(this.phase==='racing'&&ps.length&&ps.every(p=>p.finish))this.phase='finished';
  }
  snapshot(){return {time:this.time,phase:this.phase,countdown:this.countdown,raceTime:this.raceTime,racers:[...this.racers.values()].map(p=>({...p})),parked:this.parked.map(p=>({...p})),events:this.events.map(e=>({...e}))};}
}
