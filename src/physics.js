export const GRAVITY = 1.62;
export const WALK_SPEED = 1.1;
export const BOUND_SPEED = 2.8;
export const JUMP_SPEED = 2.0;
export const FIXED_STEP = 1 / 120;
export const SURFACE_LIMIT = 11000;
export function clamp(v,a,b) { return Math.min(b,Math.max(a,v)); }
export function damp(a,b,rate,dt) { return a+(b-a)*(1-Math.exp(-rate*dt)); }
export function angleDelta(a,b) { return Math.atan2(Math.sin(b-a),Math.cos(b-a)); }
export function createPlayer(heightAt) {
  return {x:0,z:0,y:heightAt(0,0),vx:0,vz:0,vy:0,yaw:0,grounded:true,speed:0,distance:0,landed:false,landingSpeed:0};
}
// The continuous terrain is a solid lower bound, independent of streamed rocks
// and raised platforms. Also repairs penetration caused by external corrections.
export function enforceTerrainFloor(p,terrainAt){
  const floor=terrainAt(p.x,p.z);
  if(!Number.isFinite(floor)||!Number.isFinite(p.y)||p.y>=floor)return false;
  p.landingSpeed=Math.max(0,-p.vy);p.y=floor;p.vy=0;p.grounded=true;p.landed=true;
  return true;
}
// Fixed-time semi-implicit integration: metres, seconds, and lunar gravity.
// Terrain-following contact uses the same height function as the rendered mesh.
export function stepPlayer(p,input,dt,heightAt,terrainAt=heightAt) {
  p.landed=false;
  enforceTerrainFloor(p,terrainAt);
  const maxSpeed=input.fast?BOUND_SPEED:WALK_SPEED;
  const mag=Math.hypot(input.x,input.z);
  const ix=mag>1?input.x/mag:input.x, iz=mag>1?input.z/mag:input.z;
  const accel=p.grounded?3.0:.25;
  const tx=ix*maxSpeed,tz=iz*maxSpeed;
  const dvx=tx-p.vx,dvz=tz-p.vz,dv=Math.hypot(dvx,dvz);
  const amount=Math.min(dv,accel*dt);
  if(dv>0){p.vx+=dvx/dv*amount;p.vz+=dvz/dv*amount;}
  if(input.jump&&p.grounded){p.vy=JUMP_SPEED;p.grounded=false;}
  const oldX=p.x,oldZ=p.z,oldGround=heightAt(p.x,p.z);
  let nx=clamp(p.x+p.vx*dt,-SURFACE_LIMIT,SURFACE_LIMIT);
  let nz=clamp(p.z+p.vz*dt,-SURFACE_LIMIT,SURFACE_LIMIT);
  const nextHeight=heightAt(nx,nz),distance=Math.hypot(nx-p.x,nz-p.z);
  if(p.grounded&&distance>0&&nextHeight-oldGround>distance*.8){nx=p.x;nz=p.z;p.vx*=.7;p.vz*=.7;}
  // Stop an airborne body entering a taller surface from its side, including
  // steep terrain that has no separate rock collider to push it back out.
  if(!p.grounded&&nextHeight>p.y+.06&&nextHeight>oldGround+.001){nx=p.x;nz=p.z;p.vx=0;p.vz=0;}
  p.x=nx;p.z=nz;
  const ground=heightAt(nx,nz);
  if(p.grounded&&oldGround-ground>.13){p.grounded=false;p.vy=0;}
  if(!p.grounded){
    const previousY=p.y;
    p.vy-=GRAVITY*dt;p.y+=p.vy*dt;
    // A descending boot must cross the top from above. Entering a cliff's
    // side is a horizontal collision, not permission to snap onto its summit.
    if(previousY>=ground-.06&&p.y<=ground&&p.vy<=0){p.landingSpeed=-p.vy;p.y=ground;p.vy=0;p.grounded=true;p.landed=true;}
  } else {p.y=ground;p.vy=0;}
  enforceTerrainFloor(p,terrainAt);
  p.speed=Math.hypot(p.vx,p.vz);p.distance+=Math.hypot(p.x-oldX,p.z-oldZ);
  if(p.speed>.05){const target=Math.atan2(-p.vx,-p.vz);p.yaw+=angleDelta(p.yaw,target)*Math.min(1,dt*6);}
  return p;
}
