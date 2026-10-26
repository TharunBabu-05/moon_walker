import {clamp, damp, GRAVITY, SURFACE_LIMIT} from './physics.js';

export function resolveObstacles(body, obstacles, radius=.32, surfaceAt=null) {
  let collided=false;
  for (let pass=0;pass<3;pass++) for (const rock of obstacles) {
    if (body.y >= rock.top-.06 || body.y+1.9 < rock.bottom) continue;
    const dx=body.x-rock.x,dz=body.z-rock.z,limit=radius+rock.radius;
    const distance=Math.hypot(dx,dz);
    if (distance>=limit) continue;
    if(surfaceAt&&body.y>rock.bottom+.12){
      const surface=surfaceAt(rock,body.x,body.z);
      if(Number.isFinite(surface)&&body.y>=surface-.06)continue;
    }
    const nx=distance>1e-6?dx/distance:1,nz=distance>1e-6?dz/distance:0;
    body.x+=nx*(limit-distance+.001);body.z+=nz*(limit-distance+.001);
    const into=body.vx*nx+body.vz*nz;
    if (into<0) {body.vx-=into*nx;body.vz-=into*nz;}
    collided=true;
  }
  return collided;
}

export function createRoverState(groundAt,x=3,z=2) {
  return {x,z,y:groundAt(x,z),vx:0,vz:0,vy:0,yaw:-.35,speed:0,steering:0,pitch:0,roll:0,wheelTravel:0,grounded:true};
}

// Bicycle steering, limited lunar traction, and ballistic chassis flight.
export function stepRover(p,input,dt,groundAt,obstacles=[]) {
  const throttle=clamp(input.throttle||0,-1,1),steer=clamp(input.steer||0,-1,1);
  p.steering=damp(p.steering,steer*.48,5,dt);
  let speed=-Math.sin(p.yaw)*p.vx-Math.cos(p.yaw)*p.vz;
  if (p.grounded) {
    const brake=input.brake?4:throttle===0?.24:.07;
    speed=damp(speed,0,brake,dt);
    speed=clamp(speed+throttle*1.05*dt,-3.0,input.fast?7:5.2);
    p.yaw+=speed/2.15*Math.tan(p.steering)*dt;
    const fx=-Math.sin(p.yaw),fz=-Math.cos(p.yaw);
    const gx=(groundAt(p.x+.5,p.z)-groundAt(p.x-.5,p.z));
    const gz=(groundAt(p.x,p.z+.5)-groundAt(p.x,p.z-.5));
    const rx=Math.cos(p.yaw),rz=-Math.sin(p.yaw),sideways=(p.vx*rx+p.vz*rz)*Math.exp(-3.2*dt);
    p.vx=fx*speed+rx*sideways-gx*GRAVITY*dt;
    p.vz=fz*speed+rz*sideways-gz*GRAVITY*dt;
  }
  const oldY=p.y;
  p.x=clamp(p.x+p.vx*dt,-SURFACE_LIMIT+3,SURFACE_LIMIT-3);
  p.z=clamp(p.z+p.vz*dt,-SURFACE_LIMIT+3,SURFACE_LIMIT-3);
  if(resolveObstacles(p,obstacles,1.08)){p.vx*=.92;p.vz*=.92;}
  const fx=-Math.sin(p.yaw),fz=-Math.cos(p.yaw),rx=Math.cos(p.yaw),rz=-Math.sin(p.yaw);
  const front=groundAt(p.x+fx*1.05,p.z+fz*1.05),back=groundAt(p.x-fx*1.05,p.z-fz*1.05);
  const left=groundAt(p.x-rx*.95,p.z-rz*.95),right=groundAt(p.x+rx*.95,p.z+rz*.95);
  const corners=[];
  for(const side of [-1,1])for(const end of [-1,1])corners.push(groundAt(p.x+rx*.95*side+fx*1.05*end,p.z+rz*.95*side+fz*1.05*end));
  const floor=Math.max(groundAt(p.x,p.z),corners.reduce((a,b)=>a+b,0)/4,Math.max(...corners)-.26);
  if (p.grounded && oldY-floor>.035) {p.grounded=false;p.vy=0;}
  if (!p.grounded) {p.vy-=GRAVITY*dt;p.y+=p.vy*dt;}
  if (p.y<=floor || p.grounded) {p.y=floor;p.vy=0;p.grounded=true;}
  p.pitch=damp(p.pitch,clamp(Math.atan2(front-back,2.1),-.65,.65),8,dt);
  p.roll=damp(p.roll,clamp(Math.atan2(right-left,1.9),-.5,.5),8,dt);
  p.speed=Math.hypot(p.vx,p.vz);p.wheelTravel+=speed*dt;
  return p;
}
