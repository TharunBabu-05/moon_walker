import {hash,randomGenerator} from './landscape.js';
import {FLAG_EXHIBITS} from './lunar-sites.js';
import {clearRaceLane} from './stadium-layout.js';

// Rendering, the host and client prediction share these world-space records.
// Consume all random values before culling: changing the viewer must never move rocks.
export function rockRecord(x,z,radius,yaw,variant,ground,heights){
  if(radius>.32&&clearRaceLane(x,z))return null;
  if(FLAG_EXHIBITS.some(e=>Math.hypot(x-e.x,z-e.z)<3+radius)||Math.abs(x+25)<19+radius&&Math.abs(z-28)<20+radius||Math.hypot(x,z)<2.7||Math.hypot(x-3,z-2)<3.5||Math.hypot(x+4,z-5)<1)return null;
  const bottom=Math.min(ground(x,z),ground(x+radius*.55,z),ground(x-radius*.55,z),ground(x,z+radius*.55),ground(x,z-radius*.55))-radius*.15;
  return {x,z,radius,yaw,variant,bottom,top:bottom+heights[variant]*radius};
}
export function rockCell(ix,iz,ground,heights){
  const rng=randomGenerator((hash(ix+373,iz-99)*0xffffffff)>>>0),records=[];
  for(let i=0;i<23;i++){
    const x=(ix+rng())*64,z=(iz+rng())*64,radius=.07+rng()**4*1.45,yaw=rng()*Math.PI*2,variant=Math.floor(rng()*3);
    const r=rockRecord(x,z,radius,yaw,variant,ground,heights);if(r)records.push(r);
  }
  return records;
}
export function landmarkRocks(ground,heights){return [[-3,-5,1.12,.7,0],[6,-12,1.8,2,1],[-13,-22,2.4,1.1,2],[18,-38,3.1,2.5,0]].map(r=>rockRecord(...r,ground,heights)).filter(Boolean);}
export function createRockQuery(ground,heights){
  const cells=new Map(),landmarks=landmarkRocks(ground,heights);
  return (x,z,radius=7)=>{
    const nearby=[];
    for(let ix=Math.floor((x-radius-4)/64);ix<=Math.floor((x+radius+4)/64);ix++)for(let iz=Math.floor((z-radius-4)/64);iz<=Math.floor((z+radius+4)/64);iz++){
      const key=ix+','+iz;let records=cells.get(key);
      if(!records){records=rockCell(ix,iz,ground,heights);cells.set(key,records);if(cells.size>256)cells.delete(cells.keys().next().value);}
      for(const r of records)if(Math.hypot(x-r.x,z-r.z)<radius+r.radius)nearby.push(r);
    }
    for(const r of landmarks)if(Math.hypot(x-r.x,z-r.z)<radius+r.radius)nearby.push(r);
    return nearby;
  };
}
