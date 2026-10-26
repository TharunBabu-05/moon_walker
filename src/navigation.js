import {clamp} from './physics.js';
export const SURFACE_MAP_LIMIT=10500;
export const mapToWorld=(u,v,center,span,aspect)=>({x:center.x+(u-.5)*span,z:center.z+(v-.5)*span/aspect});
export const worldToMap=(p,center,span,width,height)=>({x:width/2+(p.x-center.x)*width/span,y:height/2+(p.z-center.z)*width/span});
export function remainingRoute(position,path){
  if(!path.length)return {distance:0,index:0};
  let best=Infinity,index=0,point=path[0];
  for(let i=0;i<path.length-1;i++){const a=path[i],b=path[i+1],dx=b.x-a.x,dz=b.z-a.z,t=clamp(((position.x-a.x)*dx+(position.z-a.z)*dz)/(dx*dx+dz*dz||1),0,1),q={x:a.x+t*dx,z:a.z+t*dz},d=Math.hypot(position.x-q.x,position.z-q.z);if(d<best){best=d;index=i;point=q;}}
  let distance=Math.hypot(position.x-point.x,position.z-point.z);
  if(path.length===1)distance=Math.hypot(position.x-path[0].x,position.z-path[0].z);
  else{distance+=Math.hypot(path[index+1].x-point.x,path[index+1].z-point.z);for(let i=index+1;i<path.length-1;i++)distance+=Math.hypot(path[i+1].x-path[i].x,path[i+1].z-path[i].z);}
  return {distance,index,offRoute:Number.isFinite(best)?best:distance};
}
// Bounded A* over surface heights. Rock/body clearance is supplied by the scene.
export function planRoute(start,goal,heightAt,blocked=()=>false){
  const distance=Math.hypot(goal.x-start.x,goal.z-start.z),step=Math.max(3,distance/110),margin=Math.max(36,distance*.2),minX=Math.min(start.x,goal.x)-margin,minZ=Math.min(start.z,goal.z)-margin;
  const nx=Math.ceil((Math.abs(goal.x-start.x)+margin*2)/step)+1,nz=Math.ceil((Math.abs(goal.z-start.z)+margin*2)/step)+1;
  const cells=new Map(),key=(x,z)=>z*nx+x;
  function cell(x,z){if(x<0||z<0||x>=nx||z>=nz)return null;const id=key(x,z);if(!cells.has(id)){const wx=minX+x*step,wz=minZ+z*step;cells.set(id,{id,x,z,wx,wz,h:heightAt(wx,wz),blocked:Math.abs(wx)>SURFACE_MAP_LIMIT||Math.abs(wz)>SURFACE_MAP_LIMIT||blocked(wx,wz),g:Infinity,f:Infinity,closed:false,parent:null});}return cells.get(id);}
  const first=cell(Math.round((start.x-minX)/step),Math.round((start.z-minZ)/step)),last=cell(Math.round((goal.x-minX)/step),Math.round((goal.z-minZ)/step));
  if(blocked(goal.x,goal.z)||!last||last.blocked)return {points:[],status:'blocked'};
  const heap=[];function push(n){heap.push(n);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p].score<=heap[i].score)break;[heap[p],heap[i]]=[heap[i],heap[p]];i=p;}}
  function pop(){const n=heap[0],end=heap.pop();if(heap.length){heap[0]=end;let i=0;while(true){let c=i*2+1;if(c>=heap.length)break;if(c+1<heap.length&&heap[c+1].score<heap[c].score)c++;if(heap[i].score<=heap[c].score)break;[heap[i],heap[c]]=[heap[c],heap[i]];i=c;}}return n.node;}
  first.g=0;push({node:first,score:0});let visited=0,found=false;
  while(heap.length&&visited++<14000){const a=pop();if(a.closed)continue;a.closed=true;if(a===last){found=true;break;}
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
      const b=cell(a.x+dx,a.z+dz);if(!b||b.blocked||b.closed)continue;if(dx&&dz&&(cell(a.x+dx,a.z)?.blocked||cell(a.x,a.z+dz)?.blocked))continue;
      const length=Math.hypot(dx,dz)*step,slope=Math.abs(b.h-a.h)/length;if(slope>.58)continue;
      // Check along the edge as well as grid centres to avoid narrow obstacles.
      let clear=true;for(let t=.25;t<1;t+=.25)if(blocked(a.wx+(b.wx-a.wx)*t,a.wz+(b.wz-a.wz)*t)){clear=false;break;}if(!clear)continue;
      const g=a.g+length*(1+slope*4);if(g<b.g){b.g=g;b.parent=a;push({node:b,score:g+Math.hypot(b.wx-goal.x,b.wz-goal.z)});}
    }
  }
  if(!found)return {points:[],status:'no-route'};
  const points=[];for(let a=last;a;a=a.parent)points.push({x:a.wx,z:a.wz});points.reverse();points[0]={x:start.x,z:start.z};points.push({x:goal.x,z:goal.z});
  return {points,status:'ready'};
}
