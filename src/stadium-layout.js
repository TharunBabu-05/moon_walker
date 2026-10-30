// Shared by terrain workers, the renderer, route planning and race physics.
export const STADIUM={x:1475,z:28,radius:1200,gate:{x:275,z:28},laps:2};
export const TAU=Math.PI*2;
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const smooth=(x,a,b)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
export function coursePoint(t){const a=Math.PI+t*TAU,r=800+85*Math.sin(3*a)+55*Math.sin(5*a);return {x:STADIUM.x+Math.cos(a)*r,z:STADIUM.z+Math.sin(a)*r};}
export function courseInfo(x,z){const a=Math.atan2(z-STADIUM.z,x-STADIUM.x),r=800+85*Math.sin(3*a)+55*Math.sin(5*a);return {offset:Math.hypot(x-STADIUM.x,z-STADIUM.z)-r,t:((a-Math.PI)/TAU+2)%1};}
export const CHECKPOINTS=Array.from({length:16},(_,i)=>({...coursePoint(i/16),name:['Paddock','Dust bend','Boulder pass','High wall','Rim climb','Summit','Rockfall chute','North descent','Arch valley','Basalt turn','Crater floor','Broken ridge','Ejecta field','Long traverse','Home slope','Final bend'][i]}));
export const PADDOCK={...coursePoint(0)};
const dips=[.09,.28,.43,.66,.87].map(coursePoint);
const tangent=coursePoint(.001),gridYaw=Math.atan2(-(tangent.x-PADDOCK.x),-(tangent.z-PADDOCK.z));
export function gridPlace(slot){return {x:PARKING.x-Math.floor(slot/4)*14,z:PARKING.z+(slot%4-1.5)*12,yaw:gridYaw};}
export const PARKING={x:PADDOCK.x-100,z:PADDOCK.z};
export const ACCESS_LIGHTS=Array.from({length:12},(_,i)=>{const t=i/11;return {x:STADIUM.gate.x+(PARKING.x-STADIUM.gate.x)*t,z:STADIUM.gate.z+(PARKING.z-STADIUM.gate.z)*t+(i%2?14:-14)};});
export const ROCKFALLS=[.20,.36,.54,.76].map((t,i)=>({...coursePoint(t),id:i,radius:3.4+i*.35,period:19+i*3,warning:4,drop:30+i*5}));
export const ARCHES=[.14,.35,.53,.72].map(coursePoint);
export const ARCH_PILLARS=ARCHES.flatMap(p=>{const a=Math.atan2(p.z-STADIUM.z,p.x-STADIUM.x);return [-1,1].map(s=>({x:p.x+Math.cos(a)*s*49,z:p.z+Math.sin(a)*s*49,radius:17}));});
// Long tilted bedrock shelves, with a drivable toe and fractured, steeper back.
// Their height is part of the Moon itself, so tyres and walkers use the same surface.
export const SLOPE_ROCKS=Array.from({length:18},(_,i)=>{
  const t=.045+i*.052,p=coursePoint(t),q=coursePoint(t+.001),a=Math.atan2(p.z-STADIUM.z,p.x-STADIUM.x),side=i%2?-1:1,offset=78+(i%3)*13;
  const yaw=Math.atan2(q.x-p.x,q.z-p.z);
  return {x:p.x+Math.cos(a)*offset*side,z:p.z+Math.sin(a)*offset*side,yaw,c:Math.cos(yaw),s:Math.sin(yaw),width:36+(i%4)*5,length:65+(i%3)*12,height:18+(i%5)*4};
});
export function slopeRockHeight(p,x,z){
  const dx=x-p.x,dz=z-p.z;if(Math.abs(dx)>145||Math.abs(dz)>145)return 0;
  const c=p.c,s=p.s,u=(c*dx-s*dz)/p.width,v=(s*dx+c*dz)/p.length;
  if(Math.abs(u)>=1||Math.abs(v)>=1)return 0;
  const sides=(1-smooth(Math.abs(u),.58,1)),toe=smooth(v,-1,.58),back=1-smooth(v,.66,1);
  const fracture=1+.025*Math.sin(u*17+v*7)+.012*Math.sin(v*31-u*11);
  return p.height*sides*toe*back*fracture;
}
export function rockfallPose(site,time,ground){const cycle=((time+site.id*5)%site.period+site.period)%site.period,fall=cycle-site.warning,duration=Math.sqrt(2*site.drop/1.62);return {id:site.id,x:site.x,z:site.z,radius:site.radius,warning:cycle<site.warning,active:fall>=0&&fall<duration+1.5,y:ground+site.radius+Math.max(0,site.drop-.81*Math.max(0,fall)**2),impact:fall>=duration&&fall<duration+1.5,cycle:Math.floor((time+site.id*5)/site.period)};}
export function stadiumSurface(x,z,original,anchor){
  const dx=x-STADIUM.x,dz=z-STADIUM.z,r=Math.hypot(dx,dz);if(r>1420)return original;
  const a=Math.atan2(dz,dx);
  // Keep the existing multi-scale craters and irregular regolith. Avoid periodic
  // sine-wave ridges, which made the old arena floor look like a manufactured mat.
  let h=anchor-22+(original-anchor)*.6;
  h+=105*smooth(r,870,1140)*(1-.38*smooth(r,1200,1400));
  h+=72*Math.exp(-(((a+.65)/.34)**2))*Math.exp(-(((r-820)/240)**2));
  for(const p of dips){const d=Math.hypot(x-p.x,z-p.z);if(d<32)h-=4*(1-smooth(d,0,32));}
  const pad=Math.hypot(x-PADDOCK.x,z-PADDOCK.z);h=h+(anchor-5-h)*(1-smooth(pad,38,100));
  const parking=Math.hypot(x-PARKING.x,z-PARKING.z);h+=(anchor-5-h)*(1-smooth(parking,38,80));
  const corridor=(1-smooth(Math.abs(dz),28,65))*smooth(dx,-1380,-1250)*(1-smooth(dx,-800,-650));
  const accessHeight=anchor-5+clamp((-dx-800)/400,0,1)*45;
  h+=(accessHeight-h)*corridor;
  for(const rock of SLOPE_ROCKS)h+=slopeRockHeight(rock,x,z);
  return original+(h-original)*(1-smooth(r,1250,1420));
}
export function clearRaceLane(x,z){const r=Math.hypot(x-STADIUM.x,z-STADIUM.z);return r<1200&&(Math.abs(courseInfo(x,z).offset)<23||Math.hypot(x-PADDOCK.x,z-PADDOCK.z)<65||Math.hypot(x-PARKING.x,z-PARKING.z)<48)||Math.abs(z-STADIUM.z)<20&&x>250&&x<PADDOCK.x;}
