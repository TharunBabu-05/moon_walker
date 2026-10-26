import {LUNAR_SITES,FLAG_EXHIBITS,mapPoint,coordinateLabel} from './lunar-sites.js';
import {createSurfaceMap} from './surface-map.js';
export function createAtlas({onOpen,onOrbit,onStation,getState,heightAt,landmarks,onPin}){
  const $=id=>document.getElementById(id),dialog=$('atlas-dialog'),plane=$('atlas-plane'),viewport=$('atlas-viewport');
  let selected=LUNAR_SITES[0],zoom=1,pan={x:0,y:0},drag=null;
  const markers=new Map();
  let tab='local';
  const surface=createSurfaceMap({getState,heightAt,landmarks,onPin});
  function setTab(next){tab=next;$('atlas-local-panel').hidden=tab!=='local';$('atlas-global-panel').hidden=tab!=='global';$('atlas-local-tab').setAttribute('aria-selected',String(tab==='local'));$('atlas-global-tab').setAttribute('aria-selected',String(tab==='global'));if(tab==='local')surface.open();else transform();}
  $('atlas-local-tab').onclick=()=>setTab('local');$('atlas-global-tab').onclick=()=>setTab('global');
  function transform(){
    const maxX=viewport.clientWidth*(zoom-1)/2,maxY=viewport.clientHeight*(zoom-1)/2;
    pan.x=Math.max(-maxX,Math.min(maxX,pan.x));pan.y=Math.max(-maxY,Math.min(maxY,pan.y));
    plane.style.transform=`translate(${pan.x}px,${pan.y}px) scale(${zoom})`;
    plane.style.setProperty('--map-zoom',zoom);$('atlas-scale').textContent=`${zoom.toFixed(1)}×`;
  }
  function choose(site){
    selected=site;$('site-name').textContent=site.name;$('site-type').textContent=site.type;$('site-mission').textContent=site.mission;
    $('site-country').textContent=`${site.country} · ${site.agency}${site.year?' · '+site.year:''}`;$('site-coordinates').textContent=coordinateLabel(site.lat,site.lon);$('site-description').textContent=site.detail;
    $('site-source').href=site.source;markers.forEach((marker,id)=>marker.setAttribute('aria-pressed',String(id===site.id)));
    const flag=FLAG_EXHIBITS.find(e=>e.siteId===site.id);$('site-flag').hidden=!flag;$('site-flag-route').hidden=!flag;
    if(flag){$('site-flag-text').textContent=flag.detail+(site.id==='tranquility'?' The Apollo 11 exhibit shows the deployment; Aldrin reported that the original fell during liftoff.':'');$('site-flag-source').href=flag.source;$('site-flag-icon').textContent=flag.design==='us'?'🇺🇸':'🇨🇳';$('site-flag-route').onclick=()=>{onPin({x:flag.x+.5,z:flag.z+4,label:flag.label});setTab('local');};}
    document.querySelectorAll('[data-atlas-site]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.atlasSite===site.id)));
  }
  function filter(){
    const term=$('atlas-search').value.toLowerCase(),country=$('atlas-country').value,list=$('atlas-list');list.replaceChildren();let count=0;
    for(const site of LUNAR_SITES){
      const visible=(!country||site.country===country)&&`${site.name} ${site.country} ${site.mission}`.toLowerCase().includes(term);markers.get(site.id).hidden=!visible;if(!visible)continue;count++;
      const button=document.createElement('button');button.dataset.atlasSite=site.id;button.setAttribute('aria-pressed',String(selected.id===site.id));
      const name=document.createElement('strong'),meta=document.createElement('small');name.textContent=site.name;meta.textContent=`${site.country}${site.year?' / '+site.year:''}`;button.append(name,meta);
      button.onclick=()=>{choose(site);const p=mapPoint(site.lat,site.lon);pan.x=(.5-p.x)*viewport.clientWidth*zoom;pan.y=(.5-p.y)*viewport.clientHeight*zoom;transform();};list.append(button);
    }
    $('atlas-results').textContent=`${count} selected landmarks`;
  }
  for(const site of LUNAR_SITES){
    const point=mapPoint(site.lat,site.lon),button=document.createElement('button');button.className='atlas-marker';button.style.left=`${point.x*100}%`;button.style.top=`${point.y*100}%`;button.title=site.name;button.setAttribute('aria-label',site.name);button.textContent='';
    const label=document.createElement('span');label.textContent=site.name;button.append(label);button.onclick=()=>choose(site);plane.append(button);markers.set(site.id,button);
    if(FLAG_EXHIBITS.some(e=>e.siteId===site.id)){button.classList.add('has-flag');button.dataset.country=site.country==='China'?'CN':'US';}
  }
  for(const country of [...new Set(LUNAR_SITES.map(s=>s.country))]){const option=document.createElement('option');option.value=option.textContent=country;$('atlas-country').append(option);}
  $('atlas-search').oninput=filter;$('atlas-country').onchange=filter;
  $('close-atlas').onclick=()=>dialog.close();$('atlas-orbit').onclick=()=>{dialog.close();onOrbit(selected);};$('atlas-station').onclick=()=>{dialog.close();onStation();};
  $('atlas-zoom-in').onclick=()=>{zoom=Math.min(5,zoom*1.4);transform();};$('atlas-zoom-out').onclick=()=>{zoom=Math.max(1,zoom/1.4);transform();};
  viewport.addEventListener('wheel',event=>{event.preventDefault();zoom=Math.max(1,Math.min(5,zoom*Math.exp(-event.deltaY*.001)));transform();},{passive:false});
  viewport.onpointerdown=event=>{if(event.target.closest('button'))return;drag={x:event.clientX,y:event.clientY};viewport.setPointerCapture(event.pointerId);};
  viewport.onpointermove=event=>{if(!drag)return;pan.x+=event.clientX-drag.x;pan.y+=event.clientY-drag.y;drag={x:event.clientX,y:event.clientY};transform();};
  viewport.onpointerup=viewport.onpointercancel=()=>{drag=null;};window.addEventListener('resize',transform);
  choose(selected);filter();
  return {open(){onOpen();dialog.showModal();setTab('local');},update(){if(dialog.open&&tab==='local')surface.draw();},snapshot:()=>({selected:selected.id,zoom,count:LUNAR_SITES.length,tab,surface:surface.snapshot()})};
}
