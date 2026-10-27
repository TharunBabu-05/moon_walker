import {GRAVITY,clamp} from './physics.js';
import {throwSpeed,containsSample} from './ballistics.js';
import {newMissionState,missionAt,recordMissionSample,SAMPLE_DEPOT} from './missions.js';

export const SAMPLE_DURATIONS={pick:2.6,soil:5.8,store:1.35,throw:1.35,retrieve:1.2};
export const RELEASE=.53,GRASP=.48;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function samplePoint(p,x,y,z){const c=Math.cos(p.yaw),s=Math.sin(p.yaw);return {x:p.x+c*x+s*z,y:p.y+y,z:p.z-s*x+c*z};}
const rand=(x,z)=>{let n=Math.imul(x,374761393)^Math.imul(z,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};

// One authority owns reservations, inventory, ballistic integration and impacts.
// Clients send intentions, never their own collision results or inventory counts.
export class SampleWorld{
  constructor(groundAt,obstacles=()=>[]){this.groundAt=groundAt;this.obstacles=obstacles;this.reset();}
  reset(){this.time=0;this.serial=0;this.stones=new Map();this.people=new Map();this.cells=new Set();this.pendingCells=new Set();this.events=[];this.seed(0,0);}
  add(id,x,z,radius=.065){if(this.stones.has(id)||this.stones.size>=240)return;this.stones.set(id,{id,x,y:this.groundAt(x,z)+radius,z,radius,variant:Math.floor(rand(Math.round(x*31),Math.round(z*31))*3),vx:0,vy:0,vz:0,spin:0,rest:true,owner:null});}
  seed(x,z){
    // Queue nearby cells and fill one per call so crossing a cell boundary never
    // creates a whole new field of terrain queries in a single frame.
    const cx=Math.floor(x/16),cz=Math.floor(z/16);
    for(let ix=cx-1;ix<=cx+1;ix++)for(let iz=cz-1;iz<=cz+1;iz++){
      const key=ix+':'+iz;if(this.cells.has(key)||this.pendingCells.has(key)||this.stones.size>=240||this.cells.size+this.pendingCells.size>=2048)continue;this.pendingCells.add(key);
    }
    const key=this.pendingCells.values().next().value;
    if(key&&this.stones.size<240&&this.cells.size<2048){
      this.pendingCells.delete(key);this.cells.add(key);
      const [ix,iz]=key.split(':').map(Number);let obstacles;
      for(let j=0;j<3;j++){
        const px=(ix+rand(ix*3+j,iz+92))*16,pz=(iz+rand(ix+74,iz*3+j))*16;
        obstacles??=this.obstacles();
        const floor=this.groundAt(px,pz);
        if(obstacles.some(b=>this.contains(b,px,floor+.1,pz,.2)))continue;
        this.add(key+':'+j,px,pz,.045+rand(ix*9+j,iz-32)*.035);
      }
    }
    if(!this.stones.has('landing-sample')&&!this.cells.has('starter')){this.cells.add('starter');this.add('landing-sample',.38,-.72,.07);}
  }
  person(id){if(!this.people.has(id))this.people.set(id,{held:null,bag:[],soil:0,action:null,hit:null,mission:newMissionState()});return this.people.get(id);}
  request(id,p,req){
    if(!p||!req||!Object.hasOwn(SAMPLE_DURATIONS,req.type)&&req.type!=='mission')return 'Unknown sampling action.';
    const person=this.person(id);
    if(person.action)return 'Finish your current action first.';
    if(p.riding||p.dismount||!p.grounded||p.speed>.18)return 'Stop on foot with both boots on the ground first.';
    if(req.type==='mission'){
      const state=person.mission,m=missionAt(state);if(!m)return 'All three field assignments are complete.';
      if(state.stage==='available'){state.stage='collect';return null;}
      if(state.stage!=='return')return 'Collect the requested samples inside the survey circle first.';
      if(Math.hypot(p.x-SAMPLE_DEPOT.x,p.z-SAMPLE_DEPOT.z)>SAMPLE_DEPOT.radius)return 'Bring the samples to the research station depot.';
      const stored=state.rocks.filter(key=>person.bag.includes(key));
      if(stored.length<m.rocks||person.soil<m.soil)return 'Put the assignment stones back in your sample bag before delivery.';
      for(const key of stored.slice(0,m.rocks)){this.stones.delete(key);person.bag.splice(person.bag.indexOf(key),1);}
      person.soil-=m.soil;state.index++;state.completed++;state.stage=missionAt(state)?'available':'complete';state.rocks=[];state.soil=0;
      this.event('mission',{id,name:m.name,x:p.x,y:p.y,z:p.z});return null;
    }
    const type=req.type,a={type,progress:0,start:this.time,origin:{x:p.x,y:p.y,z:p.z,yaw:p.yaw},target:null};
    if(type==='pick'){
      if(person.held)return 'Your right hand is occupied. Bag or throw the stone first.';
      const r=this.stones.get(req.id);
      if(!r||!r.rest||r.owner||r.reserved||dist(r,p)>.95||Math.abs(r.y-p.y)>.25)return 'Move within one metre of a loose small stone.';
      // The authority chooses the reach direction, independent of the camera.
      const dx=r.x-p.x,dz=r.z-p.z;
      if(Math.hypot(dx,dz)>.12)a.origin.yaw=Math.atan2(-dx,-dz);
      if(this.obstacles().some(b=>this.contains(b,(r.x+p.x)/2,p.y+.25,(r.z+p.z)/2,.13)))return 'The stone is behind an obstacle.';
      r.reserved=id;a.stone=r.id;a.target={x:r.x,y:r.y,z:r.z};
    }else if(type==='soil'){
      if(person.held)return 'Free your right hand before taking out the shovel.';
      if(person.soil>=12)return 'Your soil bag is full (12 samples).';
      a.target=samplePoint(p,.22,0,-.64);a.target.y=this.groundAt(a.target.x,a.target.z);
      if(Math.abs(a.target.y-p.y)>.25||this.obstacles().some(b=>this.contains(b,a.target.x,a.target.y+.05,a.target.z,.16)))return 'Find clear, level regolith for the scoop.';
    }else if(type==='retrieve'){
      if(person.held||!person.bag.length)return 'Store a stone first, and keep your right hand free.';
      a.stone=person.bag.at(-1);
    }else{
      if(!person.held)return 'Pick up a small stone first.';
      a.stone=person.held;
      if(type==='store'&&person.bag.length>=12)return 'Your rock bag is full (12 stones).';
      if(type==='throw'){
        const d=req.direction;if(!d||!['x','y','z'].every(k=>Number.isFinite(d[k])))return 'Choose a throw direction.';
        const len=Math.hypot(d.x,d.y,d.z);if(len<.1)return 'Choose a throw direction.';
        const elevation=clamp(Math.asin(clamp(d.y/len,-1,1)),-.35,.9),azimuth=Math.atan2(-d.x,-d.z);
        a.origin.yaw=azimuth;a.direction={x:-Math.sin(azimuth)*Math.cos(elevation),y:Math.sin(elevation),z:-Math.cos(azimuth)*Math.cos(elevation)};
        a.speed=throwSpeed(req.charge);
      }
    }
    person.action=a;return null;
  }
  event(type,data){this.events.push({serial:++this.serial,time:this.time,type,...data});if(this.events.length>40)this.events.shift();}
  contains(b,x,y,z,r){
    return containsSample(b,x,y,z,r);
  }
  step(dt,entries){
    this.time+=dt;const active=new Map(entries.map(e=>[e.id,e.state]));
    if(Math.floor(this.time*2)!==Math.floor((this.time-dt)*2)){
      for(const [id,r] of this.stones)if(r.rest&&!r.owner&&!r.reserved&&entries.every(e=>dist(e.state,r)>65)){
        this.stones.delete(id);const key=id.split(':');if(key.length===3)this.cells.delete(key.slice(0,2).join(':'));
      }
    }
    for(const [id,person] of this.people)if(!active.has(id)){
      for(const r of this.stones.values()){
        if(r.reserved===id)delete r.reserved;
        if(r.owner===id){r.owner=null;r.y=this.groundAt(r.x,r.z)+r.radius;r.rest=true;}
      }
      this.people.delete(id);
    }
    for(const {id,state:p} of entries){
      this.seed(p.x,p.z);const person=this.person(id),a=person.action;
      for(const r of this.stones.values())if(r.owner===id){r.x=p.x;r.y=p.y+1;r.z=p.z;}
      if(person.hit&&this.time-person.hit.time>1.1)person.hit=null;
      if(!a)continue;
      // Teleporting, boarding or moving away cancels an unfinished reach.
      if(dist(p,a.origin)>.55||p.riding||!p.grounded){
        const r=this.stones.get(a.stone);if(r?.reserved===id)delete r.reserved;person.action=null;continue;
      }
      a.progress=clamp((this.time-a.start)/SAMPLE_DURATIONS[a.type],0,1);
      if(!a.done&&a.progress>=(a.type==='pick'?GRASP:a.type==='throw'?RELEASE:.72)){
        a.done=true;const r=this.stones.get(a.stone);
        if(a.type==='pick'&&r){r.owner=id;r.sampleOrigin={x:r.x,z:r.z};delete r.reserved;person.held=r.id;}
        if(a.type==='store'&&r){person.bag.push(r.id);person.held=null;recordMissionSample(person.mission,'rock',r.sampleOrigin||a.origin,r.id);}
        if(a.type==='retrieve'&&r){person.bag.pop();person.held=r.id;}
        if(a.type==='soil'){person.soil++;recordMissionSample(person.mission,'soil',a.target);this.event('scoop',{...a.target});}
        if(a.type==='throw'&&r){
          const at=samplePoint(a.origin,.34,1.52,-.56),d=a.direction;
          Object.assign(r,at,{vx:d.x*a.speed,vy:d.y*a.speed,vz:d.z*a.speed,owner:null,rest:false,thrower:id,born:this.time,spin:0});person.held=null;
          const m=person.mission;m.rocks=m.rocks.filter(key=>key!==r.id);if(m.stage==='return'&&m.rocks.length<missionAt(m).rocks)m.stage='collect';
        }
      }
      if(a.progress>=1)person.action=null;
    }
    let obstacles;
    for(const r of this.stones.values()){
      if(r.owner)continue;
      if(r.rest)continue;
      obstacles??=this.obstacles();
      // Substeps limit travel to < half a stone radius, preventing tunnelling.
      const steps=Math.max(1,Math.ceil(Math.hypot(r.vx,r.vy,r.vz)*dt/(r.radius*.45))),h=dt/steps;
      for(let i=0;i<steps&&!r.rest;i++){
        const old={x:r.x,y:r.y,z:r.z};r.vy-=GRAVITY*h;r.x+=r.vx*h;r.y+=r.vy*h;r.z+=r.vz*h;r.spin+=h*Math.hypot(r.vx,r.vz)/r.radius;
        for(const {id,state:p} of entries){
          if(id===r.thrower&&this.time-r.born<.55)continue;
          if(r.lastHit===id&&this.time-r.hitTime<.8)continue;
          const feet=p.y+(p.riding?.55:0),height=p.riding?1.3:1.95;
          if(r.y+r.radius<feet||r.y-r.radius>feet+height||dist(r,p)>.34+r.radius)continue;
          const speed=Math.hypot(r.vx,r.vy,r.vz);if(speed<.65)continue;
          const nx=r.x-p.x,nz=r.z-p.z,len=Math.hypot(nx,nz)||1,vn=(r.vx*nx+r.vz*nz)/len;
          r.x=old.x;r.z=old.z;if(vn<0){r.vx-=1.3*vn*nx/len;r.vz-=1.3*vn*nz/len;}r.vy*=.45;
          r.lastHit=id;r.hitTime=this.time;this.person(id).hit={time:this.time,strength:clamp(speed/7,.2,1),x:-nx/len,z:-nz/len};this.event('hit',{id,x:r.x,y:r.y,z:r.z});break;
        }
        const obstacle=obstacles.find(b=>this.contains(b,r.x,r.y,r.z,r.radius));
        if(obstacle){
          const top=obstacle.state?obstacle.state.y+obstacle.height:obstacle.top;
          if(old.y>=top+r.radius-.03&&r.vy<0){r.y=top+r.radius;r.vy*=-.24;r.vx*=.68;r.vz*=.68;if(Math.hypot(r.vx,r.vy,r.vz)<.3){r.vx=r.vy=r.vz=0;r.rest=true;}}
          else{
            Object.assign(r,old);let nx=r.x-(obstacle.state?.x??obstacle.x),nz=r.z-(obstacle.state?.z??obstacle.z),len=Math.hypot(nx,nz)||1;nx/=len;nz/=len;
            if(obstacle.shape==='box'){
              const c=Math.cos(obstacle.state.yaw||0),s=Math.sin(obstacle.state.yaw||0),dx=r.x-obstacle.state.x,dz=r.z-obstacle.state.z,lx=c*dx-s*dz,lz=s*dx+c*dz;
              if(Math.abs(lx)/obstacle.hx>Math.abs(lz)/obstacle.hz){nx=Math.sign(lx)*c;nz=-Math.sign(lx)*s;}else{nx=Math.sign(lz)*s;nz=Math.sign(lz)*c;}
            }
            const vn=r.vx*nx+r.vz*nz;if(vn<0){r.vx-=1.3*vn*nx;r.vz-=1.3*vn*nz;}r.vx*=.7;r.vz*=.7;
          }
        }
        const floor=this.groundAt(r.x,r.z)+r.radius;
        if(r.y<=floor){
          const gx=(this.groundAt(r.x+.08,r.z)-this.groundAt(r.x-.08,r.z))/.16,gz=(this.groundAt(r.x,r.z+.08)-this.groundAt(r.x,r.z-.08))/.16,n=Math.hypot(gx,1,gz),nx=-gx/n,ny=1/n,nz=-gz/n;
          const vn=r.vx*nx+r.vy*ny+r.vz*nz;r.y=floor;
          if(vn<-.4){this.event('bounce',{x:r.x,y:floor-r.radius,z:r.z,strength:Math.min(1,-vn/3)});}
          if(vn<0){r.vx-=1.24*vn*nx;r.vy-=1.24*vn*ny;r.vz-=1.24*vn*nz;}
          r.vx*=.68;r.vz*=.68;
          if(Math.hypot(r.vx,r.vy,r.vz)<.3){r.vx=r.vy=r.vz=0;r.rest=true;delete r.thrower;}
        }
        if(Math.abs(r.x)>10990||Math.abs(r.z)>10990){r.x=clamp(r.x,-10990,10990);r.z=clamp(r.z,-10990,10990);r.vx=r.vz=0;}
      }
    }
  }
  snapshot(){return {time:this.time,stones:[...this.stones.values()].map(r=>({...r})),people:[...this.people].map(([id,p])=>({id,...p,bag:[...p.bag],action:p.action?{...p.action}:null})),events:this.events.map(e=>({...e}))};}
}
