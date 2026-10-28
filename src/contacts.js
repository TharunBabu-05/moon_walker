import {clamp} from './physics.js';
// Metres, kg, seconds. Oriented chassis boxes and upright astronaut circles.
export function roverBody(state,owner='',dynamic=true){return {state,owner,kind:'rover',shape:'box',hx:1.15,hz:1.52,height:1.65,invMass:dynamic?1/400:0};}
export function walkerBody(state,owner=''){return {state,owner,kind:'player',shape:'circle',radius:.34,height:1.95,invMass:1/180};}
export function bodiesFor(owner,state){const list=[];if(state.arena)return list;if(state.rover)list.push(roverBody(state.rover,owner,state.riding));if(!state.riding)list.push(walkerBody(state,owner));return list;}
function axes(b){const c=Math.cos(b.state.yaw||0),s=Math.sin(b.state.yaw||0);return [{x:c,z:-s},{x:s,z:c}];}
function extent(b,n){if(b.shape==='circle')return b.radius;const [x,z]=axes(b);return Math.abs(x.x*n.x+x.z*n.z)*b.hx+Math.abs(z.x*n.x+z.z*n.z)*b.hz;}
export function contact(a,b){
  if(a.state.y+a.height<=b.state.y+.05||b.state.y+b.height<=a.state.y+.05)return null;
  const dx=b.state.x-a.state.x,dz=b.state.z-a.state.z;
  if(Math.hypot(dx,dz)>Math.hypot(a.hx||a.radius,a.hz||0)+Math.hypot(b.hx||b.radius,b.hz||0)+.1)return null;
  let tests=[];
  if(a.shape==='box')tests.push(...axes(a));if(b.shape==='box')tests.push(...axes(b));
  if(a.shape==='circle'&&b.shape==='circle'){const length=Math.hypot(dx,dz);tests=[{x:length?dx/length:1,z:length?dz/length:0}];}
  else if(a.shape==='circle'||b.shape==='circle'){
    const circle=a.shape==='circle'?a:b,box=a.shape==='box'?a:b,[x,z]=axes(box);
    const rx=circle.state.x-box.state.x,rz=circle.state.z-box.state.z;
    const lx=clamp(rx*x.x+rz*x.z,-box.hx,box.hx),lz=clamp(rx*z.x+rz*z.z,-box.hz,box.hz);
    const cx=box.state.x+lx*x.x+lz*z.x,cz=box.state.z+lx*x.z+lz*z.z;
    const nx=circle.state.x-cx,nz=circle.state.z-cz,length=Math.hypot(nx,nz);if(length>.0001)tests.push({x:nx/length,z:nz/length});
  }
  let depth=Infinity,normal;
  for(const n of tests){const separation=dx*n.x+dz*n.z,overlap=extent(a,n)+extent(b,n)-Math.abs(separation);if(overlap<=0)return null;if(overlap<depth){depth=overlap;normal={x:n.x*(separation>=0?1:-1),z:n.z*(separation>=0?1:-1)};}}
  return {...normal,depth};
}
export function resolvePair(a,b,{predict=false}={}){
  const hit=contact(a,b);if(!hit)return false;
  const ia=a.invMass,ib=predict?0:b.invMass,total=ia+ib;if(!total)return false;
  const push=hit.depth+.002;
  a.state.x-=hit.x*push*ia/total;a.state.z-=hit.z*push*ia/total;
  b.state.x+=hit.x*push*ib/total;b.state.z+=hit.z*push*ib/total;
  const rvx=(b.state.vx||0)-(a.state.vx||0),rvz=(b.state.vz||0)-(a.state.vz||0),normalSpeed=rvx*hit.x+rvz*hit.z;
  if(normalSpeed<0){
    const restitution=Math.abs(normalSpeed)>.8?.08:0,j=-(1+restitution)*normalSpeed/total;
    const tx=-hit.z,tz=hit.x,tangent=clamp(-(rvx*tx+rvz*tz)/total,-j*.5,j*.5);
    a.state.vx-=ia*(hit.x*j+tx*tangent);a.state.vz-=ia*(hit.z*j+tz*tangent);
    if(ib){b.state.vx+=ib*(hit.x*j+tx*tangent);b.state.vz+=ib*(hit.z*j+tz*tangent);}
  }
  for(const body of [a,b])if(body.invMass)body.state.speed=Math.hypot(body.state.vx,body.state.vz);
  return true;
}

// The host resolves each pair once and sends acknowledged delta corrections.
export function reconcileContacts(entries){
  const copies=entries.map(e=>({id:e.id,state:{...e.state,rover:e.state.rover?{...e.state.rover}:undefined}}));
  const bodies=copies.flatMap(e=>bodiesFor(e.id,e.state));
  for(let pass=0;pass<3;pass++)for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++)if(bodies[i].owner!==bodies[j].owner)resolvePair(bodies[i],bodies[j]);
  return copies.map((e,i)=>{
    const change={};
    for(const kind of ['player','rover']){
      const before=kind==='player'?entries[i].state:entries[i].state.rover,after=kind==='player'?e.state:e.state.rover;if(!before||!after)continue;
      const delta={};for(const key of ['x','z','vx','vz'])delta[key]=after[key]-before[key];
      if(Object.values(delta).some(v=>Math.abs(v)>.0001))change[kind]=delta;
    }
    return {id:e.id,state:e.state,change};
  }).filter(e=>Object.keys(e.change).length);
}
