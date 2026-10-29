// Contact dimensions are measured from the rendered wheel-ground datum (metres).
export const RACE_CONTACT={clearance:.72,halfWidth:1.08,halfLength:2.16,track:1.57,axles:[-1.65,1.65],tyreWidth:.24,tyreContactLength:.65,step:.34};
export const SIX_WHEEL_CONTACT={...RACE_CONTACT,halfWidth:1.24,axles:[-1.65,0,1.65]};
export const ROVER_CONTACT={clearance:.40,halfWidth:.84,halfLength:1.36,track:1.01,axles:[-1.05,1.05],tyreWidth:.16,tyreContactLength:.32,step:.22};
export function rockSurface(rock,x,z,surfaceAt){
  if(surfaceAt)return surfaceAt(rock,x,z);
  const d=Math.hypot(x-rock.x,z-rock.z)/rock.radius;
  return d>=1?-Infinity:rock.bottom+(rock.top-rock.bottom)*Math.sqrt(1-d*d);
}
export function wheelSurface(x,z,ground,rocks,surfaceAt,step){
  let height=ground(x,z);
  for(const r of rocks){
    if(Math.abs(x-r.x)>r.radius||Math.abs(z-r.z)>r.radius||r.top-ground(r.x,r.z)>step+.02)continue;
    const top=rockSurface(r,x,z,surfaceAt);if(Number.isFinite(top))height=Math.max(height,top);
  }
  return height;
}
function overlaps(p,r,shape,ground,surfaceAt){
  if(r.top<p.y-.02||r.bottom>p.y+2.8)return false;
  const c=Math.cos(p.yaw),s=Math.sin(p.yaw),dx=r.x-p.x,dz=r.z-p.z,lx=c*dx-s*dz,lz=s*dx+c*dz;
  if(Math.abs(lx)>shape.track+shape.tyreWidth+r.radius||Math.abs(lz)>shape.halfLength+r.radius)return false;
  const underside=(x,z)=>p.y+shape.clearance+x*Math.sin(p.roll||0)-z*Math.sin(p.pitch||0);
  // Probe the intersection of the rock footprint and each physical rectangle.
  // No full-width invisible bumper at ground level: the gap between tyres is open.
  const rectangle=(cx,cz,hx,hz,threshold)=>{
    const x0=Math.max(cx-hx,lx-r.radius),x1=Math.min(cx+hx,lx+r.radius),z0=Math.max(cz-hz,lz-r.radius),z1=Math.min(cz+hz,lz+r.radius);
    if(x0>x1||z0>z1)return false;
    const nx=Math.max(1,Math.ceil((x1-x0)/.22)),nz=Math.max(1,Math.ceil((z1-z0)/.22));
    for(let ix=0;ix<=nx;ix++)for(let iz=0;iz<=nz;iz++){
      const x=x0+(x1-x0)*ix/nx,z=z0+(z1-z0)*iz/nz,limit=threshold(x,z);
      if(r.top<=limit+.015)continue;
      if(rockSurface(r,p.x+c*x+s*z,p.z-s*x+c*z,surfaceAt)>limit+.015)return true;
    }
    return false;
  };
  if(rectangle(0,0,shape.halfWidth,shape.halfLength,underside))return true;
  if(r.top-ground(r.x,r.z)<=shape.step+.02)return false;
  for(const side of [-1,1])for(const axle of shape.axles){
    // Radius .84 on racers, .38 on the exploration rover. Check the tyre's
    // lower leading edge; a tall rock on a wheel path must stop that wheel.
    if(rectangle(side*shape.track,axle,shape.tyreWidth,shape.tyreContactLength,()=>Math.max(p.y+.05,ground(r.x,r.z)+shape.step)))return true;
  }
  return false;
}
export function moveVehicleWithRocks(p,oldX,oldZ,ground,rocks,surfaceAt,shape){
  const dx=p.x-oldX,dz=p.z-oldZ,steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.14));
  const endX=p.x,endZ=p.z;let lastX=oldX,lastZ=oldZ,impact=0;
  for(let step=1;step<=steps;step++){
    p.x=oldX+dx*step/steps;p.z=oldZ+dz*step/steps;
    const rock=rocks.find(r=>{
      if(!overlaps(p,r,shape,ground,surfaceAt))return false;
      // A steering change can put a tyre slightly into a neighbouring rock.
      // Always permit escape away from it, rather than trapping reverse gear.
      return (p.x-r.x)*dx+(p.z-r.z)*dz<=0;
    });
    if(rock){
      p.x=lastX;p.z=lastZ;
      // Remove only velocity into the rock; retain tangential motion to slide.
      const rx=p.x-rock.x,rz=p.z-rock.z,d=Math.hypot(rx,rz)||1,nx=rx/d,nz=rz/d,v=p.vx*nx+p.vz*nz;
      impact=Math.max(impact,-v);if(v<0){p.vx-=v*nx;p.vz-=v*nz;}
      return impact;
    }
    lastX=p.x;lastZ=p.z;
  }
  p.x=endX;p.z=endZ;return impact;
}
