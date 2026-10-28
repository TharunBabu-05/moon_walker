import {driveRacer} from './race-physics.js';
const mix=(a,b,t)=>a+(b-a)*t;
export function blendRacer(a,b,t){const p={...b};for(const k of ['x','y','z','pitch','roll','steering','travel','speed'])p[k]=mix(a[k]||0,b[k]||0,t);p.yaw=a.yaw+Math.atan2(Math.sin(b.yaw-a.yaw),Math.cos(b.yaw-a.yaw))*t;return p;}
// Correct the simulation on packet receipt, then decay the visual correction.
// Never pull a moving car toward the same stale network position every frame.
export class RacePrediction{
  constructor(ground){this.ground=ground;this.parked=[];this.state=null;this.previous=null;this.pending=[];this.seq=0;this.acc=0;this.offset={x:0,y:0,z:0};}
  accept(p){if(!this.state||p.version!==this.state.version||p.dead){this.state={...p};this.previous={...p};this.pending=[];this.offset={x:0,y:0,z:0};return;}
    const before={...this.state};this.pending=this.pending.filter(i=>i.seq>p.ack);this.state={...p};for(const i of this.pending)driveRacer(this.state,i,1/60,this.ground,this.parked);
    const error=Math.hypot(before.x-this.state.x,before.z-this.state.z);if(error<10)for(const k of ['x','y','z'])this.offset[k]+=before[k]-this.state[k];else this.offset={x:0,y:0,z:0};this.previous={...this.state};
  }
  update(dt,input,locked=false){if(!this.state)return null;this.acc=Math.min(this.acc+dt,.12);while(this.acc>=1/60){this.previous={...this.state};const command={...(locked?{brake:true}:input),seq:++this.seq};this.pending.push(command);if(this.pending.length>120)this.pending.shift();driveRacer(this.state,command,1/60,this.ground,this.parked);this.acc-=1/60;}const p=blendRacer(this.previous,this.state,this.acc*60);for(const k of ['x','y','z']){this.offset[k]*=Math.exp(-dt*10);p[k]+=this.offset[k];}return p;}
  command(input){return {...input,seq:this.seq};}
  reset(){this.state=null;this.previous=null;this.pending=[];this.seq=0;this.acc=0;this.offset={x:0,y:0,z:0};}
}
