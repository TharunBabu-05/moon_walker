import {GRAVITY,clamp} from './physics.js';
export const THROW_MIN_SPEED=2.4,THROW_MAX_SPEED=10.5,THROW_CHARGE_SECONDS=2.2;
export const throwSpeed=charge=>THROW_MIN_SPEED+(THROW_MAX_SPEED-THROW_MIN_SPEED)*clamp(Number.isFinite(charge)?charge:0,0,1);
export function containsSample(b,x,y,z,r){
  if(b.state){const p=b.state;if(y+r<p.y||y-r>p.y+b.height)return false;const dx=x-p.x,dz=z-p.z,c=Math.cos(p.yaw||0),s=Math.sin(p.yaw||0);return b.shape==='box'?Math.abs(c*dx-s*dz)<b.hx+r&&Math.abs(s*dx+c*dz)<b.hz+r:Math.hypot(dx,dz)<(b.radius||.34)+r;}
  return y+r>b.bottom&&y-r<b.top&&Math.hypot(x-b.x,z-b.z)<b.radius+r;
}
// Shared launch origin and speed; preview ends at the first contact, before bounce.
export function predictThrow(origin,direction,charge,radius,groundAt,obstacles,points=new Float32Array(241*3)){
  const speed=throwSpeed(charge),dt=1/120;let x=origin.x,y=origin.y,z=origin.z,vy=direction.y*speed,count=1,hit=null;
  points.set([x,y,z]);
  for(let step=1;step<=1440;step++){
    vy-=GRAVITY*dt;x+=direction.x*speed*dt;y+=vy*dt;z+=direction.z*speed*dt;
    const obstacle=obstacles.find(b=>containsSample(b,x,y,z,radius)),floor=groundAt(x,z)+radius;
    if(obstacle||y<=floor){if(!obstacle)y=floor;hit=obstacle?.kind==='player'?'EXPLORER':obstacle?'OBSTACLE':'GROUND';points.set([x,y,z],count++*3);break;}
    if(step%6===0){points.set([x,y,z],count++*3);}
  }
  return {count,hit:hit||'OUT OF RANGE',x,y,z,distance:Math.hypot(x-origin.x,z-origin.z),speed};
}
