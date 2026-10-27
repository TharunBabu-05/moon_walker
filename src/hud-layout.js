// Layout preferences are local to this browser; no work is done in the render loop.
export function createHUDLayout(){
  const $=id=>document.getElementById(id),key='selene-layout-v1';
  let saved={};try{const value=JSON.parse(localStorage.getItem(key));if(value&&typeof value==='object'&&!Array.isArray(value))saved=value;}catch{}
  const persist=()=>{try{localStorage.setItem(key,JSON.stringify(saved));}catch{}};
  const button=(id,label)=>{const b=document.createElement('button');b.id=id;b.type='button';b.textContent=label;return b;};
  const dock=document.createElement('aside');dock.id='panel-dock';dock.setAttribute('aria-label','Expedition panels');
  const dockToggle=button('dock-toggle','PANELS −'),list=document.createElement('div');list.id='panel-list';
  const hint=document.createElement('small');hint.className='dock-hint';hint.textContent='Scroll panels · select a heading to fold';
  dockToggle.setAttribute('aria-controls',list.id);dock.append(dockToggle,list,hint);$('hud').append(dock);
  const panels=[['rover-card','Lunar buggy'],['mission-card','Field assignment'],['sample-card','Field sampling'],['route-card','Waypoint'],['orbit-tools','Orbital observatory']];
  const telemetry=document.querySelector('.telemetry');telemetry.id='telemetry-card';panels.push(['telemetry-card','Telemetry']);
  for(const [id,title] of panels){
    const card=$(id);card.classList.add('hud-card');
    let details=card.querySelector(':scope > details');
    if(!details){
      details=document.createElement('details');const summary=document.createElement('summary');summary.textContent=title;
      const body=document.createElement('div');body.className='panel-content';body.append(...card.childNodes);details.append(summary,body);card.append(details);
    }else{
      const summary=details.querySelector('summary'),body=document.createElement('div');body.className='panel-content';
      const count=summary.querySelector('#sample-count');if(count)body.append(count);
      body.append(...[...details.childNodes].filter(n=>n!==summary));summary.textContent=title;details.append(body);
    }
    details.className='hud-panel';details.open=saved.panels?.[id]??!['telemetry-card','rover-card'].includes(id);
    if(id==='mission-card')details.querySelector('summary').append($('mission-number'));
    details.querySelector('summary').setAttribute('aria-label',`Toggle ${title.toLowerCase()} panel`);
    details.addEventListener('toggle',()=>{saved.panels??={};saved.panels[id]=details.open;persist();});list.append(card);
  }
  list.append($('crew-presence'));
  const setDock=collapsed=>{list.hidden=hint.hidden=collapsed;dockToggle.textContent=collapsed?'PANELS +':'PANELS −';dockToggle.setAttribute('aria-expanded',String(!collapsed));saved.dockCollapsed=collapsed;};
  setDock(saved.dockCollapsed??innerWidth<650);
  dockToggle.onclick=()=>{setDock(!list.hidden);persist();};

  const tools=document.querySelector('.header-tools'),items=document.createElement('div');items.id='toolbar-items';items.append(...tools.childNodes);
  const toggle=button('toolbar-toggle','TOOLS −');toggle.setAttribute('aria-controls',items.id);tools.append(items,toggle);
  const setTools=collapsed=>{items.hidden=collapsed;toggle.textContent=collapsed?'TOOLS +':'TOOLS −';toggle.setAttribute('aria-expanded',String(!collapsed));toggle.setAttribute('aria-label',collapsed?'Expand top-right tools':'Minimize top-right tools');saved.toolsCollapsed=collapsed;};
  setTools(saved.toolsCollapsed??innerWidth<1280);toggle.onclick=()=>{setTools(!items.hidden);persist();};

  const map=$('mini-map'),mapCanvas=$('map'),title=map.querySelector('.map-title');
  map.removeAttribute('role');map.removeAttribute('tabindex');map.setAttribute('aria-label','Movable local map');map.removeAttribute('title');
  mapCanvas.setAttribute('role','button');mapCanvas.tabIndex=0;mapCanvas.setAttribute('aria-label','Open lunar atlas from local map');
  const drag=button('map-drag','LOCAL RELIEF / ATLAS');drag.title='Drag to move the map. Arrow keys move; Home resets.';drag.setAttribute('aria-label','Move local map');title.replaceWith(drag);
  const toolsRow=document.createElement('div');toolsRow.className='map-controls';
  const smaller=button('map-smaller','−'),larger=button('map-larger','+'),reset=button('map-reset','RESET');
  smaller.setAttribute('aria-label','Reduce map size');larger.setAttribute('aria-label','Increase map size');reset.setAttribute('aria-label','Reset map position and size');toolsRow.append(smaller,larger,reset);map.append(toolsRow);
  const storedPosition=saved.map?.position;
  let width=Number.isFinite(saved.map?.width)?saved.map.width:innerWidth<650?138:180,position=Number.isFinite(storedPosition?.x)&&Number.isFinite(storedPosition?.y)?storedPosition:null,gesture=null;
  function place(){
    width=Math.max(124,Math.min(width,260,innerWidth-24));map.style.width=width+'px';
    const margin=12,top=innerWidth<650?106:78;
    const maxX=Math.max(margin,innerWidth-width-margin),maxY=Math.max(top,innerHeight-map.offsetHeight-margin);
    const x=position?Math.max(margin,Math.min(position.x*innerWidth,maxX)):innerWidth<=1000?18:29;
    const y=position?Math.max(top,Math.min(position.y*innerHeight,maxY)):maxY-(innerWidth<650?0:16);
    map.style.left=x+'px';map.style.top=Math.max(top,y)+'px';map.style.bottom='auto';
    document.documentElement.style.setProperty('--map-reserve',(map.offsetHeight+40)+'px');
    smaller.disabled=width<=124;larger.disabled=width>=Math.min(260,innerWidth-24);
  }
  const saveMap=()=>{saved.map={width,position};persist();};
  const move=(x,y)=>{position={x:x/innerWidth,y:y/innerHeight};place();const r=map.getBoundingClientRect();position={x:r.x/innerWidth,y:r.y/innerHeight};};
  smaller.onclick=()=>{width-=20;place();saveMap();};larger.onclick=()=>{width+=20;place();saveMap();};
  reset.onclick=()=>{position=null;width=innerWidth<650?138:180;place();saveMap();};
  drag.onpointerdown=e=>{if(e.button!==0)return;const r=map.getBoundingClientRect();gesture={x:e.clientX,y:e.clientY,left:r.x,top:r.y};drag.setPointerCapture(e.pointerId);e.preventDefault();};
  drag.onpointermove=e=>{if(gesture)move(gesture.left+e.clientX-gesture.x,gesture.top+e.clientY-gesture.y);};
  const end=()=>{if(gesture){gesture=null;saveMap();}};drag.onpointerup=end;drag.onpointercancel=end;drag.onlostpointercapture=end;
  drag.onkeydown=e=>{const delta={ArrowLeft:[-16,0],ArrowRight:[16,0],ArrowUp:[0,-16],ArrowDown:[0,16]}[e.key];if(delta){e.preventDefault();e.stopPropagation();const r=map.getBoundingClientRect();move(r.x+delta[0],r.y+delta[1]);saveMap();}else if(e.key==='Home'){e.preventDefault();reset.click();}};
  // A hidden map has no measured height. Re-clamp when returning from orbit.
  new MutationObserver(()=>{if(!map.hidden)place();}).observe(map,{attributes:true,attributeFilter:['hidden']});
  new MutationObserver(()=>{if(!$('hud').hidden)place();}).observe($('hud'),{attributes:true,attributeFilter:['hidden']});
  window.addEventListener('resize',place);place();
}
