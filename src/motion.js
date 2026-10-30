import {clamp,angleDelta} from './physics.js';
const copy=s=>({...s,rover:s.rover?{...s.rover}:undefined});
const mix=(a,b,t)=>a+(b-a)*t;
function blend(a,b,t,seconds){
  const out={...a};
  for(const key of ['x','y','z','vx','vy','vz','speed','distance','steering','pitch','roll','wheelTravel','impact']){
    if(Number.isFinite(a[key])&&Number.isFinite(b[key]))out[key]=mix(a[key],b[key],t);
  }
  // Hermite positions preserve the velocity across packet boundaries.
  for(const [key,v] of [['x','vx'],['y','vy'],['z','vz']]){
    if(!Number.isFinite(a[v])||!Number.isFinite(b[v])||Math.abs(b[key]-a[key])<.002)continue;
    const t2=t*t,t3=t2*t,h=(2*t3-3*t2+1)*a[key]+(t3-2*t2+t)*seconds*a[v]+(-2*t3+3*t2)*b[key]+(t3-t2)*seconds*b[v];
    out[key]=clamp(h,Math.min(a[key],b[key])-.025,Math.max(a[key],b[key])+.025);
  }
  out.yaw=a.yaw+angleDelta(a.yaw,b.yaw)*t;
  out.costume=t<.5?(a.costume||1):(b.costume||1);
  out.grounded=t<.5?a.grounded:b.grounded;out.riding=t<.5?a.riding:b.riding;out.aiming=t<.5?a.aiming:b.aiming;
  if(a.rover&&b.rover)out.rover=blend(a.rover,b.rover,t,seconds);
  if(a.dismount&&b.dismount)out.dismount={...b.dismount,progress:mix(a.dismount.progress,b.dismount.progress,t)};
  return out;
}
export class MotionBuffer{
  constructor(delay=120){this.delay=delay;this.samples=[];this.offset=null;this.lastSeq=-1;this.extrapolated=false;}
  push(state,stamp,seq,now){
    if(!Number.isFinite(stamp)||seq<=this.lastSeq)return false;
    this.lastSeq=seq;
    const estimate=now-stamp;
    this.offset=this.offset===null?estimate:Math.min(estimate,this.offset+.15);
    const previous=this.samples.at(-1);
    if(previous&&(Math.hypot(state.x-previous.state.x,state.z-previous.state.z)>12||state.riding!==previous.state.riding))this.samples.length=0;
    this.samples.push({stamp,state:copy(state)});if(this.samples.length>40)this.samples.shift();return true;
  }
  sample(now){
    if(!this.samples.length)return null;
    const target=now-this.offset-this.delay;this.extrapolated=false;
    while(this.samples.length>2&&this.samples[1].stamp<=target)this.samples.shift();
    const first=this.samples[0],last=this.samples.at(-1);
    if(target<=first.stamp)return copy(first.state);
    for(let i=1;i<this.samples.length;i++){
      const b=this.samples[i],a=this.samples[i-1];if(target<=b.stamp)return blend(a.state,b.state,clamp((target-a.stamp)/(b.stamp-a.stamp),0,1),(b.stamp-a.stamp)/1000);
    }
    const out=copy(last.state),dt=clamp((target-last.stamp)/1000,0,.1);this.extrapolated=dt>0;
    for(const body of [out,out.rover])if(body){body.x+=body.vx*dt;body.z+=body.vz*dt;if(!body.grounded)body.y+=body.vy*dt;}
    return out;
  }
}
