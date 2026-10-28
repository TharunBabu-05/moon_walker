// Metres, seconds and lunar gravity. Pure simulation shared by host and tests.
export const ARENA={x:3275,z:28,radius:3000,gate:{x:275,z:28},laps:2};
export const CARS=[
  {name:'ION / Interceptor',color:0x40e5e0,speed:112,accel:27,grip:5,shape:0},
  {name:'SCARAB / Dune tank',color:0xffb638,speed:94,accel:22,grip:7,shape:1},
  {name:'VIPER / Split-wing',color:0xcb72ff,speed:124,accel:30,grip:4,shape:2},
  {name:'COMET / Rally rocket',color:0xff526b,speed:106,accel:32,grip:6,shape:3}
];
export const GUNS=[{name:'Pulse',damage:34,cooldown:.28,speed:240},{name:'Rail',damage:65,cooldown:1.1,speed:420}];
const TAU=Math.PI*2,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function trackPoint(t){const a=Math.PI+t*TAU,r=2180+220*Math.sin(a*3)+140*Math.sin(a*5);return {x:ARENA.x+Math.cos(a)*r,z:ARENA.z+Math.sin(a)*r};}
export function trackInfo(x,z){const a=Math.atan2(z-ARENA.z,x-ARENA.x),r=2180+220*Math.sin(a*3)+140*Math.sin(a*5);return {offset:Math.hypot(x-ARENA.x,z-ARENA.z)-r,t:((a-Math.PI)/TAU+2)%1};}
export const GATES=Array.from({length:24},(_,i)=>trackPoint(i/24));
export const HAZARDS=Array.from({length:32},(_,i)=>{const t=(i+.5)/32,p=trackPoint(t),a=Math.PI+t*TAU;return {...p,x:p.x+Math.cos(a)*(i%2?19:-19),z:p.z+Math.sin(a)*(i%2?19:-19),radius:i%4===0?17:i%4===1?12:9,type:['pool','pit','barrier','boost'][i%4]};});
export function roadHeight(x,z){const {t,offset}=trackInfo(x,z),edge=clamp((Math.abs(offset)-90)/100,0,1);let h=-2*edge*edge*(3-2*edge);for(const o of HAZARDS)if(o.type==='pit'||o.type==='pool'){const d=Math.hypot(x-o.x,z-o.z)/o.radius;if(d<1)h-=(o.type==='pool'?.8:1.5)*(1+Math.cos(d*Math.PI))*.5;}if(Math.abs(offset)<90){const u=(t*8)%1;if(u>.38&&u<.44)h+=Math.sin((u-.38)/.06*Math.PI)*8*clamp((90-Math.abs(offset))/45,0,1);}return h;}
export function cleanRaceInput(v){return {throttle:clamp(Number(v?.throttle)||0,-1,1),steer:clamp(Number(v?.steer)||0,-1,1),brake:!!v?.brake,boost:!!v?.boost,fire:!!v?.fire,gun:v?.gun===1?1:0};}
export function newRacer(id,car=0,slot=0,name='Explorer') {const p=trackPoint(0),q=trackPoint(.001);return {id,name:String(name).slice(0,20),car:clamp(Math.floor(car)||0,0,3),x:p.x+(slot%4)*6-9,z:p.z+Math.floor(slot/4)*8,y:0,vy:0,yaw:Math.atan2(-(q.x-p.x),-(q.z-p.z)),vx:0,vz:0,speed:0,hp:100,dead:0,shield:3,boost:100,cooldown:0,next:1,lap:0,time:0,finish:0,kills:0,deaths:0,travel:0,grounded:true};}
export function driveRacer(p,input,dt){
  const c=CARS[p.car],i=cleanRaceInput(input);if(p.dead>0)return;
  const info=trackInfo(p.x,p.z);let drag=Math.abs(info.offset)>45?1.4:.12,boostPad=false;
  for(const o of HAZARDS)if(Math.hypot(p.x-o.x,p.z-o.z)<o.radius){if(o.type==='pool')drag=3.8;if(o.type==='boost')boostPad=true;}
  const boost=i.boost&&p.boost>0&&i.throttle>0;p.boost=clamp(p.boost+(boost?-25:12)*dt,0,100);
  let speed=-(p.vx*Math.sin(p.yaw)+p.vz*Math.cos(p.yaw));
  if(p.grounded){speed+=(i.throttle*c.accel*(boost?1.6:1)-speed*(drag+(i.brake?4:0)))*dt;speed=clamp(speed,-22,c.speed*(boost||boostPad?1.4:1));if(boostPad)speed=Math.min(c.speed*1.4,speed+50*dt);}
  p.yaw+=i.steer*(.55+1.4/(1+Math.abs(speed)*.06))*clamp(speed/7,-1,1)*dt*(p.grounded?1:.2);
  if(p.grounded){const lateral=(p.vx*Math.cos(p.yaw)-p.vz*Math.sin(p.yaw))*Math.exp(-c.grip*dt);p.vx=-Math.sin(p.yaw)*speed+Math.cos(p.yaw)*lateral;p.vz=-Math.cos(p.yaw)*speed-Math.sin(p.yaw)*lateral;}
  const oldY=roadHeight(p.x,p.z);p.x+=p.vx*dt;p.z+=p.vz*dt;
  const radial=Math.hypot(p.x-ARENA.x,p.z-ARENA.z);if(radial>ARENA.radius-8){const nx=(p.x-ARENA.x)/radial,nz=(p.z-ARENA.z)/radial,dot=p.vx*nx+p.vz*nz;p.x=ARENA.x+nx*(ARENA.radius-8);p.z=ARENA.z+nz*(ARENA.radius-8);if(dot>0){p.vx-=dot*1.4*nx;p.vz-=dot*1.4*nz;}}
  for(const o of HAZARDS)if(o.type==='barrier'){const dx=p.x-o.x,dz=p.z-o.z,d=Math.hypot(dx,dz),r=o.radius+2.2;if(d<r){const nx=d>0?dx/d:1,nz=d>0?dz/d:0;p.x=o.x+nx*r;p.z=o.z+nz*r;const v=p.vx*nx+p.vz*nz;if(v<0){p.vx-=v*1.5*nx;p.vz-=v*1.5*nz;}}}
  const floor=roadHeight(p.x,p.z);if(p.grounded&&floor>=oldY-.08){p.y=floor;p.vy=clamp((floor-oldY)/dt,0,9);}else {p.grounded=false;p.vy-=1.62*dt;p.y+=p.vy*dt;}
  if(p.y<=floor){p.y=floor;p.vy=0;p.grounded=true;}
  p.speed=Math.hypot(p.vx,p.vz);p.travel+=p.speed*dt;
}
export class RaceWorld{
  constructor(){this.racers=new Map();this.inputs=new Map();this.shots=[];this.time=0;this.serial=0;this.events=[];}
  join(id,car,name){if(!this.racers.has(id)&&this.racers.size<8)this.racers.set(id,newRacer(id,car,this.racers.size,name));}
  leave(id){this.racers.delete(id);this.inputs.delete(id);}
  input(id,value){if(this.racers.has(id))this.inputs.set(id,{...cleanRaceInput(value),at:this.time});}
  event(type,p){this.events.push({id:++this.serial,type,x:p.x,y:p.y,z:p.z});if(this.events.length>24)this.events.shift();}
  step(dt){
    this.time+=dt;
    for(const p of this.racers.values()){
      if(p.dead>0){p.dead=Math.max(0,p.dead-dt);if(p.dead<1e-8)p.dead=0;if(p.dead===0){p.hp=100;p.shield=2;p.y=roadHeight(p.x,p.z);p.vy=0;p.grounded=true;this.event('respawn',p);}continue;}
      p.shield=Math.max(0,p.shield-dt);p.cooldown=Math.max(0,p.cooldown-dt);p.time+=dt;
      const raw=this.inputs.get(p.id),i=raw&&this.time-raw.at<.4?raw:{};driveRacer(p,i,dt);
      const gate=GATES[p.next];if(!p.finish&&Math.hypot(p.x-gate.x,p.z-gate.z)<100){p.next=(p.next+1)%24;if(p.next===1){p.lap++;if(p.lap>=ARENA.laps)p.finish=p.time;}}
      if(i.fire&&p.cooldown===0){const gun=GUNS[i.gun||0];p.cooldown=gun.cooldown;this.shots.push({id:++this.serial,owner:p.id,x:p.x-Math.sin(p.yaw)*4,z:p.z-Math.cos(p.yaw)*4,y:p.y+1.3,vx:-Math.sin(p.yaw)*gun.speed,vz:-Math.cos(p.yaw)*gun.speed,life:1.1,damage:gun.damage});this.event('fire',p);}
    }
    const racers=[...this.racers.values()];for(let a=0;a<racers.length;a++)for(let b=a+1;b<racers.length;b++){const p=racers[a],q=racers[b];if(p.dead||q.dead||Math.abs(p.y-q.y)>3)continue;const dx=p.x-q.x,dz=p.z-q.z,d=Math.hypot(dx,dz);if(d<4.8){const nx=d>0?dx/d:1,nz=d>0?dz/d:0,over=(4.8-d)/2;p.x+=nx*over;p.z+=nz*over;q.x-=nx*over;q.z-=nz*over;const v=(p.vx-q.vx)*nx+(p.vz-q.vz)*nz;if(v<0){p.vx-=v*.65*nx;p.vz-=v*.65*nz;q.vx+=v*.65*nx;q.vz+=v*.65*nz;}}}
    for(const s of this.shots){const x=s.x,z=s.z;s.x+=s.vx*dt;s.z+=s.vz*dt;s.life-=dt;
      for(const p of racers){if(p.id===s.owner||p.dead||p.shield>0)continue;const dx=s.x-x,dz=s.z-z,t=clamp(((p.x-x)*dx+(p.z-z)*dz)/(dx*dx+dz*dz||1),0,1);if(Math.hypot(p.x-x-dx*t,p.z-z-dz*t)<2.6&&Math.abs(p.y+1-s.y)<2){s.life=0;p.hp=Math.max(0,p.hp-s.damage);this.event('hit',p);if(!p.hp){p.dead=4;p.deaths++;p.vx=p.vz=p.speed=0;const shooter=this.racers.get(s.owner);if(shooter)shooter.kills++;this.event('destroy',p);}break;}}
      if(Math.hypot(s.x-ARENA.x,s.z-ARENA.z)>ARENA.radius||HAZARDS.some(o=>o.type==='barrier'&&Math.hypot(s.x-o.x,s.z-o.z)<o.radius))s.life=0;
    }this.shots=this.shots.filter(s=>s.life>0);
  }
  snapshot(){return {time:this.time,racers:[...this.racers.values()].map(p=>({...p})),shots:this.shots.map(s=>({...s})),events:this.events.map(e=>({...e}))};}
}
