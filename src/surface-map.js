import {mapToWorld,worldToMap,SURFACE_MAP_LIMIT} from './navigation.js';
export function createSurfaceMap({getState,heightAt,landmarks,onPin}){
  const $=id=>document.getElementById(id),canvas=$('surface-map'),ctx=canvas.getContext('2d'),background=document.createElement('canvas');background.width=180;background.height=115;const bg=background.getContext('2d');
  let center={x:0,z:0},span=500,drag=null,dirty=true;
  const project=p=>worldToMap(p,center,span,canvas.width,canvas.height);
  function pin(x,z,label='Custom waypoint'){onPin({x:Math.max(-SURFACE_MAP_LIMIT,Math.min(SURFACE_MAP_LIMIT,x)),z:Math.max(-SURFACE_MAP_LIMIT,Math.min(SURFACE_MAP_LIMIT,z)),label});draw();}
  function draw(){
    const state=getState(),player=state.player,navigation=state.navigation;
    if(dirty){const image=bg.createImageData(180,115);for(let y=0;y<115;y++)for(let x=0;x<180;x++){const p=mapToWorld((x+.5)/180,(y+.5)/115,center,span,180/115),h=heightAt(p.x,p.z),gradient=heightAt(p.x-2,p.z-2)-h,shade=Math.max(20,Math.min(100,45+gradient*8)),contour=Math.abs(h/3-Math.round(h/3))<.065?18:0,i=(y*180+x)*4;image.data[i]=shade+contour;image.data[i+1]=shade+8+contour;image.data[i+2]=shade+11+contour;image.data[i+3]=255;}bg.putImageData(image,0,0);dirty=false;}
    ctx.drawImage(background,0,0,canvas.width,canvas.height);ctx.strokeStyle='#afc9d11c';ctx.lineWidth=1;for(let x=0;x<720;x+=72){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,460);ctx.stroke();}for(let y=0;y<460;y+=72){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(720,y);ctx.stroke();}
    const route=navigation.points||[];if(route.length){ctx.strokeStyle='#e5c48a';ctx.lineWidth=3;ctx.setLineDash([9,6]);ctx.beginPath();route.slice(navigation.index||0).forEach((p,i)=>{const q=project(p);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y);});ctx.stroke();ctx.setLineDash([]);}
    const you=project(player),flagPoints=[];
    for(const l of landmarks){const p=project(l);if(p.x<8||p.x>712||p.y<8||p.y>452)continue;ctx.fillStyle=l.flag?'#dcbea0':'#b5d8d1';ctx.fillRect(p.x-3,p.y-3,6,6);ctx.font='11px monospace';if(l.flag&&span>210){flagPoints.push(p);continue;}if(Math.hypot(p.x-you.x,p.y-you.y)>45)ctx.fillText((l.short||l.label).replace(' FLAG',''),p.x+8,p.y+4);}
    if(flagPoints.length){const x=flagPoints.reduce((sum,p)=>sum+p.x,0)/flagPoints.length,y=flagPoints[0].y;ctx.fillStyle='#dcbea0';ctx.textAlign='center';ctx.fillText('HISTORICAL FLAG EXHIBITS',x,y+23);ctx.textAlign='left';}
    if(navigation.destination){const p=project(navigation.destination);ctx.strokeStyle='#f9d292';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,9,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(p.x-14,p.y);ctx.lineTo(p.x+14,p.y);ctx.moveTo(p.x,p.y-14);ctx.lineTo(p.x,p.y+14);ctx.stroke();}
    const p=project(player);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(-player.yaw);ctx.fillStyle='#d1fff0';ctx.beginPath();ctx.moveTo(0,-11);ctx.lineTo(7,8);ctx.lineTo(0,4);ctx.lineTo(-7,8);ctx.closePath();ctx.fill();ctx.restore();ctx.strokeStyle='#d1fff0';ctx.beginPath();ctx.arc(p.x,p.y,18,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#e1fff2';ctx.font='bold 12px monospace';ctx.fillText('YOU',p.x+24,p.y+4);
    $('surface-position').textContent=`YOU · ${Math.abs(player.x).toFixed(1)} ${player.x>=0?'E':'W'} / ${Math.abs(player.z).toFixed(1)} ${player.z<=0?'N':'S'} m`;$('surface-map-scale').textContent=`${span.toFixed(0)} m across`;
    $('surface-route-status').textContent=navigation.destination?`${navigation.destination.label} · ${navigation.status==='arrived'?'ARRIVED':navigation.status==='ready'?Math.round(navigation.distance)+' m remaining':navigation.status==='blocked'?'Choose clear ground for your destination':'No walkable route found; try a nearer point'}`:'Click the terrain to set a destination. Drag to pan. Scroll to zoom.';
    $('surface-clear').disabled=!navigation.destination;
  }
  const pointer=e=>{const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};};
  canvas.onpointerdown=e=>{const p=pointer(e);drag={...p,start:p,center:{...center},moved:false};canvas.setPointerCapture(e.pointerId);};
  canvas.onpointermove=e=>{if(!drag)return;const p=pointer(e);if(Math.hypot(p.x-drag.start.x,p.y-drag.start.y)>.01)drag.moved=true;if(drag.moved){center={x:drag.center.x-(p.x-drag.x)*span,z:drag.center.z-(p.y-drag.y)*span/(720/460)};dirty=true;draw();}};
  canvas.onpointerup=e=>{if(drag&&!drag.moved){const p=pointer(e),world=mapToWorld(p.x,p.y,center,span,720/460);pin(world.x,world.z);}drag=null;};canvas.onpointercancel=()=>{drag=null;};
  canvas.onwheel=e=>{e.preventDefault();const p=pointer(e),before=mapToWorld(p.x,p.y,center,span,720/460);span=Math.max(100,Math.min(20000,span*Math.exp(e.deltaY*.001)));const after=mapToWorld(p.x,p.y,center,span,720/460);center.x+=before.x-after.x;center.z+=before.z-after.z;dirty=true;draw();};
  canvas.onkeydown=e=>{const moves={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(moves[e.key]){e.preventDefault();center.x+=moves[e.key][0]*span*.05;center.z+=moves[e.key][1]*span*.05;dirty=true;draw();}if(e.key==='Enter'){e.preventDefault();pin(center.x,center.z);}};
  $('surface-center').onclick=()=>{center={x:getState().player.x,z:getState().player.z};dirty=true;draw();};
  $('surface-clear').onclick=()=>{onPin(null);draw();};
  $('coordinate-pin').onsubmit=e=>{e.preventDefault();pin(Number($('pin-east').value),-Number($('pin-north').value));};
  const list=$('surface-landmarks');for(const l of landmarks){const b=document.createElement('button');b.textContent=l.label;b.onclick=()=>pin(l.x,l.z,l.label);list.append(b);}
  return {draw,open(){center={x:getState().player.x,z:getState().player.z};span=500;dirty=true;draw();},snapshot:()=>({center:{...center},span})};
}
