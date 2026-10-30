import {CHECKPOINTS} from './stadium-layout.js';
export function rankRacers(racers){
  const progress=p=>p.lap*CHECKPOINTS.length+(p.next===0?CHECKPOINTS.length:p.next)-1;
  const distance=p=>Math.hypot(p.x-CHECKPOINTS[p.next].x,p.z-CHECKPOINTS[p.next].z);
  return [...racers].sort((a,b)=>{
    if(a.finish||b.finish)return a.finish&&b.finish?a.finish-b.finish:a.finish?-1:1;
    return progress(b)-progress(a)||distance(a)-distance(b)||a.slot-b.slot;
  });
}
