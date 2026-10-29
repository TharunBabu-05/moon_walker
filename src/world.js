import {clamp, damp, GRAVITY, SURFACE_LIMIT} from './physics.js';
import {resolveTrackFence} from './track-boundary.js';
import {ROVER_CONTACT,moveVehicleWithRocks} from './vehicle-contact.js';

export function resolveObstacles(body, obstacles, radius=.32, surfaceAt=null,blocks=null) {
  let collided=false;
  for (let pass=0;pass<3;pass++) for (const rock of obstacles) {
    if (body.y >= rock.top-.06 || body.y+1.9 < rock.bottom) continue;
    const dx=body.x-rock.x,dz=body.z-rock.z,limit=radius+rock.radius;
    const distance=Math.hypot(dx,dz);
    if (distance>=limit) continue;
    if(blocks&&!blocks(rock))continue;
    if(surfaceAt){
      const surface=surfaceAt(rock,body.x,body.z);
      if(Number.isFinite(surface)&&body.y>=surface-.06)continue;
    }
    const nx=distance>1e-6?dx/distance:1,nz=distance>1e-6?dz/distance:0;
    let separation=limit-distance+.001;
    if(surfaceAt){
      // The circle is only a broad-phase bound. Check the model under the
      // capsule's footprint before ejecting a walker from empty space.
      const intersects=(x,z)=>{
        for(const [ox,oz] of [[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius]]){
          if(surfaceAt(rock,x+ox,z+oz)>body.y+.08)return true;
        }
        return false;
      };
      if(!intersects(body.x,body.z))continue;
      let low=0,high=separation;
      for(let i=0;i<7;i++){const mid=(low+high)/2;if(intersects(body.x+nx*mid,body.z+nz*mid))low=mid;else high=mid;}
      separation=high+.001;
    }
    body.x+=nx*separation;body.z+=nz*separation;
    const into=body.vx*nx+body.vz*nz;
    if (into<0) {body.vx-=into*nx;body.vz-=into*nz;}
    collided=true;
  }
  return collided;
}

export function createRoverState(groundAt,x=3,z=2) {
  return {x,z,y:groundAt(x,z),vx:0,vz:0,vy:0,yaw:-.35,speed:0,steering:0,pitch:0,roll:0,wheelTravel:0,grounded:true};
}

// The rendered chassis underside is 0.425 m above the wheel contact datum.
// Leave a little clearance margin; tyres can negotiate smaller 0.22 m bumps.
export const ROVER_CLEARANCE=.40,ROVER_STEP_HEIGHT=.22;
export function roverRockBlocks(p,rock,groundAt){
  const dx=rock.x-p.x,dz=rock.z-p.z,c=Math.cos(p.yaw),s=Math.sin(p.yaw);
  const lateral=c*dx-s*dz,longitudinal=s*dx+c*dz;
  const pitch=p.pitch||0,roll=p.roll||0;
  const underside=p.y+ROVER_CLEARANCE*Math.cos(pitch)*Math.cos(roll)
    +clamp(lateral,-.84,.84)*Math.sin(roll)-clamp(longitudinal,-1.36,1.36)*Math.sin(pitch);
  if(rock.top>=underside)return true;
  const nearTyre=Math.abs(Math.abs(lateral)-1.01)<rock.radius+.16;
  return nearTyre&&rock.top-groundAt(rock.x,rock.z)>ROVER_STEP_HEIGHT;
}
export function roverWheelHeight(x,z,groundAt,obstacles,surfaceAt=null){
  const base=groundAt(x,z);let floor=base;
  for(const rock of obstacles){
    if(Math.abs(x-rock.x)>=rock.radius||Math.abs(z-rock.z)>=rock.radius)continue;
    const distance=Math.hypot(x-rock.x,z-rock.z);if(distance>=rock.radius)continue;
    if(rock.top-groundAt(rock.x,rock.z)>ROVER_STEP_HEIGHT)continue;
    const top=surfaceAt?surfaceAt(rock,x,z):rock.bottom+(rock.top-rock.bottom)*Math.sqrt(Math.max(0,1-(distance/rock.radius)**2));
    if(Number.isFinite(top))floor=Math.max(floor,Math.min(top,base+ROVER_STEP_HEIGHT));
  }
  return floor;
}

// Bicycle steering, limited lunar traction, and ballistic chassis flight.
export function stepRover(p,input,dt,groundAt,obstacles=[],surfaceAt=null) {
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
  const oldY=p.y,oldX=p.x,oldZ=p.z;
  p.x=clamp(p.x+p.vx*dt,-SURFACE_LIMIT+3,SURFACE_LIMIT-3);
  p.z=clamp(p.z+p.vz*dt,-SURFACE_LIMIT+3,SURFACE_LIMIT-3);
  moveVehicleWithRocks(p,oldX,oldZ,groundAt,obstacles,surfaceAt,ROVER_CONTACT);
  resolveTrackFence(p,oldX,oldZ,groundAt,1.12,.32,2.7);
  const fx=-Math.sin(p.yaw),fz=-Math.cos(p.yaw),rx=Math.cos(p.yaw),rz=-Math.sin(p.yaw);
  const corners=[];
  for(const side of [-1,1])for(const end of [-1,1])corners.push(roverWheelHeight(p.x+rx*1.01*side+fx*1.05*end,p.z+rz*1.01*side+fz*1.05*end,groundAt,obstacles,surfaceAt));
  const front=(corners[1]+corners[3])/2,back=(corners[0]+corners[2])/2,left=(corners[0]+corners[1])/2,right=(corners[2]+corners[3])/2;
  const floor=Math.max(groundAt(p.x,p.z),corners.reduce((a,b)=>a+b,0)/4,Math.max(...corners)-.26);
  if (p.grounded && oldY-floor>.035) {p.grounded=false;p.vy=0;}
  if (!p.grounded) {p.vy-=GRAVITY*dt;p.y+=p.vy*dt;}
  if (p.y<=floor || p.grounded) {p.y=floor;p.vy=0;p.grounded=true;}
  p.pitch=damp(p.pitch,clamp(Math.atan2(front-back,2.1),-.65,.65),8,dt);
  p.roll=damp(p.roll,clamp(Math.atan2(right-left,1.9),-.5,.5),8,dt);
  p.speed=Math.hypot(p.vx,p.vz);p.wheelTravel+=speed*dt;
  return p;
}
