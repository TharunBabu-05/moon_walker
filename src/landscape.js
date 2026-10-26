const mix=(a,b,t)=>a+(b-a)*t;
const smoothstep=(x,a,b)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export function randomGenerator(seed=8419){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
export function hash(x,z){let n=(Math.imul(x|0,374761393)+Math.imul(z|0,668265263))|0;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
export function noise(x,z){const ix=Math.floor(x),iz=Math.floor(z);let u=x-ix,v=z-iz;u=u*u*(3-2*u);v=v*v*(3-2*v);return mix(mix(hash(ix,iz),hash(ix+1,iz),u),mix(hash(ix,iz+1),hash(ix+1,iz+1),u),v);}
export function craterRelief(u,r,d,angle=0){
  if(u>=1.6)return 0;
  const taper=1-smoothstep(u,1.35,1.6);
  const bowl=u<1?-r*d*(1-u*u)**2:0;
  const rim=r*.064*Math.exp(-(((u-.99)/.105)**2))*(1+.13*Math.sin(angle*19));
  // Ejecta must join continuously across the rim; a conditional u>1 adds a cliff.
  const ejecta=r*.013*Math.exp(-(((u-1.12)/.28)**2))*smoothstep(u,.84,1.08);
  return (bowl+rim+ejecta+(r>200?r*.028*Math.exp(-u*u*45):0))*taper;
}

export function createLandscape(){
  const rng=randomGenerator(71903),craters=[
    {x:42,z:-138,r:153,d:.19}, {x:116,z:18,r:27,d:.22}, {x:-52,z:-8,r:16,d:.23},
    {x:-34,z:43,r:7,d:.23}, {x:30,z:13,r:4.2,d:.24}, {x:-7,z:-10,r:2.4,d:.19},
    {x:-403,z:-320,r:203,d:.14}, {x:570,z:-680,r:310,d:.15}, {x:-910,z:190,r:330,d:.17}
  ];
  for(let i=0;i<90;i++){const x=(rng()-.5)*24000,z=(rng()-.5)*24000;if(Math.hypot(x,z)<1400)continue;craters.push({x,z,r:90+rng()**2*1100,d:.12+rng()*.07});}
  for(let i=0;i<850;i++){const x=(rng()-.5)*2900,z=(rng()-.5)*2900;if(Math.hypot(x,z)<25)continue;craters.push({x,z,r:1.2+rng()**3*35,d:.17+rng()*.09});}
  for(let i=0;i<100;i++){const x=(rng()-.5)*180,z=(rng()-.5)*180;if(Math.hypot(x,z)<2.5)continue;craters.push({x,z,r:.45+rng()**2*3.2,d:.16+rng()*.10});}
  const bins=new Map(),cell=128;
  craters.forEach(c=>{
    const extent=c.r*1.7;
    for(let x=Math.floor((c.x-extent)/cell);x<=Math.floor((c.x+extent)/cell);x++)for(let z=Math.floor((c.z-extent)/cell);z<=Math.floor((c.z+extent)/cell);z++){
      const key=x+','+z;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(c);
    }
  });
  function rawHeightAt(x,z){
    let h=(noise(x*.00045+11,z*.00045+78)-.5)*220+(noise(x*.0023+7,z*.0023-8)-.5)*48+(noise(x*.009,z*.009)-.5)*8;
    h+=(noise(x*.043+20,z*.043)-.5)*1.5+(noise(x*.22,z*.22+9)-.5)*.18;
    h+=(noise(x*1.5+13,z*1.5)-.5)*.045;
    h-=(x*x+z*z)/(2*1737400);
    const nearby=bins.get(Math.floor(x/cell)+','+Math.floor(z/cell))||[];
    for(const c of nearby){
      const dx=x-c.x,dz=z-c.z,a=Math.atan2(dz,dx),d=Math.hypot(dx,dz);
      const radius=c.r*(1+.025*Math.sin(a*7+c.x)+.017*Math.sin(a*13));const u=d/radius;
      h+=craterRelief(u,c.r,c.d,a);
    }
    return h;
  }
  const padHeight=rawHeightAt(-25,28);
  function heightAt(x,z){
    const d=Math.hypot((x+25)/20,(z-28)/22);
    const blend=smoothstep(d,.9,2.5);
    return mix(padHeight,rawHeightAt(x,z),blend);
  }
  // Sample exactly the triangle interpolation of the finest (0.5 m) mesh.
  const groundSamples=new Map();
  function gridHeight(x,z){const key=x+','+z;let h=groundSamples.get(key);if(h===undefined){h=heightAt(x,z);if(groundSamples.size>=16384){const keys=groundSamples.keys();for(let i=0;i<256;i++)groundSamples.delete(keys.next().value);}groundSamples.set(key,h);}return h;}
  function groundAt(x,z){
    const step=.5,x0=Math.floor(x/step)*step,z0=Math.floor(z/step)*step,u=(x-x0)/step,v=(z-z0)/step;
    const a=gridHeight(x0,z0),b=gridHeight(x0+step,z0),c=gridHeight(x0,z0+step),d=gridHeight(x0+step,z0+step);
    return u+v<=1?a+(b-a)*u+(c-a)*v:d+(c-d)*(1-u)+(b-d)*(1-v);
  }
  return {heightAt,groundAt,craters};
}
