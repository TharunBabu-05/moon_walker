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
export function gridPlace(slot){const side=36+(slot%4-1.5)*7,back=Math.floor(slot/4)*10;return {x:PADDOCK.x+Math.cos(gridYaw)*side+Math.sin(gridYaw)*back,z:PADDOCK.z-Math.sin(gridYaw)*side+Math.cos(gridYaw)*back,yaw:gridYaw};}
export const ROCKFALLS=[.20,.36,.54,.76].map((t,i)=>({...coursePoint(t),id:i,radius:3.4+i*.35,period:19+i*3,warning:4,drop:30+i*5}));
export const ARCHES=[.14,.35,.53,.72].map(coursePoint);
export const ARCH_PILLARS=ARCHES.flatMap(p=>{const a=Math.atan2(p.z-STADIUM.z,p.x-STADIUM.x);return [-1,1].map(s=>({x:p.x+Math.cos(a)*s*49,z:p.z+Math.sin(a)*s*49,radius:17}));});
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
  const corridor=(1-smooth(Math.abs(dz),28,65))*smooth(dx,-1380,-1250)*(1-smooth(dx,-800,-650));
  const accessHeight=anchor-5+clamp((-dx-800)/400,0,1)*45;
  h+=(accessHeight-h)*corridor;
  return original+(h-original)*(1-smooth(r,1250,1420));
}
export function clearRaceLane(x,z){const r=Math.hypot(x-STADIUM.x,z-STADIUM.z);return r<1200&&(Math.abs(courseInfo(x,z).offset)<23||Math.hypot(x-PADDOCK.x,z-PADDOCK.z)<65)||Math.abs(z-STADIUM.z)<20&&x>250&&x<PADDOCK.x;}
