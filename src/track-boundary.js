import {coursePoint,STADIUM,PADDOCK} from './stadium-layout.js';

export const TRACK_EDGE=32,FENCE_HEIGHT=3.8,FENCE_THICKNESS=.32;
const ahead=coursePoint(.0001),gateYaw=Math.atan2(-(ahead.x-PADDOCK.x),-(ahead.z-PADDOCK.z));
export const START_GATE={yaw:gateYaw,width:112,posts:[-1,1].map(s=>({x:PADDOCK.x+Math.cos(gateYaw)*56*s,z:PADDOCK.z-Math.sin(gateYaw)*56*s}))};
export function trackEdgePoint(t,side){const p=coursePoint(t),a=Math.PI+t*Math.PI*2;return {x:p.x+Math.cos(a)*TRACK_EDGE*side,z:p.z+Math.sin(a)*TRACK_EDGE*side};}
export function trackGate(x,z,side){return Math.hypot(x-PADDOCK.x,z-PADDOCK.z)<(side<0?74:43);}
// The very same short segments drive the visible fence and collision. Small
// terrain-following spans prevent gaps beneath rails on crater slopes.
export const TRACK_FENCES=[];
const bins=new Map(),cell=32;
for(const side of [-1,1])for(let i=0;i<1024;i++){
  const a=trackEdgePoint(i/1024,side),b=trackEdgePoint((i+1)/1024,side);
  if(trackGate((a.x+b.x)/2,(a.z+b.z)/2,side))continue;
  const fence={a,b,side,index:i,id:TRACK_FENCES.length};TRACK_FENCES.push(fence);
  for(let x=Math.floor((Math.min(a.x,b.x)-5)/cell);x<=Math.floor((Math.max(a.x,b.x)+5)/cell);x++)for(let z=Math.floor((Math.min(a.z,b.z)-5)/cell);z<=Math.floor((Math.max(a.z,b.z)+5)/cell);z++){
    const key=x+','+z;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(fence);
  }
}
export function nearTrackFences(x,z){return bins.get(Math.floor(x/cell)+','+Math.floor(z/cell))||[];}
export function resolveTrackFence(p,oldX,oldZ,ground,radius=1.85,halfAxle=.55,height=3){
  // Swept movement also works for walkers and the exploration rover. Cars may
  // slide along a rail; no invisible force pushes them towards the track centre.
  if(Math.hypot(p.x-STADIUM.x,p.z-STADIUM.z)>1250)return 0;
  const dx=p.x-oldX,dz=p.z-oldZ,steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/Math.max(.18,radius*.45)));
  const sx=Math.sin(p.yaw||0),cz=Math.cos(p.yaw||0);let x=oldX,z=oldZ,impact=0;
  for(let step=0;step<steps;step++){
    x+=dx/steps;z+=dz/steps;
    for(let pass=0;pass<2;pass++)for(const fence of nearTrackFences(x,z))for(const end of halfAxle?[-1,1]:[0]){
      const px=x+sx*halfAxle*end,pz=z+cz*halfAxle*end,ax=fence.a.x,az=fence.a.z,fx=fence.b.x-ax,fz=fence.b.z-az;
      const t=Math.max(0,Math.min(1,((px-ax)*fx+(pz-az)*fz)/(fx*fx+fz*fz))),qx=ax+fx*t,qz=az+fz*t,rx=px-qx,rz=pz-qz,d=Math.hypot(rx,rz),limit=radius+FENCE_THICKNESS;
      if(d>=limit)continue;
      const base=ground(ax,az)*(1-t)+ground(fence.b.x,fence.b.z)*t;
      if(p.y>base+FENCE_HEIGHT||p.y+height<base-.3)continue;
      let nx,nz;if(d>.00001){nx=rx/d;nz=rz/d;}else{const len=Math.hypot(fx,fz),sign=((oldX-ax)*fz-(oldZ-az)*fx)>=0?1:-1;nx=fz/len*sign;nz=-fx/len*sign;}
      x+=nx*(limit-d+.001);z+=nz*(limit-d+.001);
      const into=p.vx*nx+p.vz*nz;if(into<0){impact=Math.max(impact,-into);p.vx-=into*nx;p.vz-=into*nz;}
    }
    for(const post of START_GATE.posts){const rx=x-post.x,rz=z-post.z,d=Math.hypot(rx,rz),limit=radius+.85;if(d>=limit)continue;const base=ground(post.x,post.z);if(p.y>base+18||p.y+height<base)continue;const nx=d?rx/d:1,nz=d?rz/d:0;x+=nx*(limit-d+.001);z+=nz*(limit-d+.001);const into=p.vx*nx+p.vz*nz;if(into<0){impact=Math.max(impact,-into);p.vx-=into*nx;p.vz-=into*nz;}}
  }
  p.x=x;p.z=z;return impact;
}
