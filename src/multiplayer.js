export const MAX_CREW=8;
const PREFIX='selene-expedition-3-';
const numeric=['x','y','z','vx','vy','vz','yaw','speed','distance'];

export function sanitizeState(value){
  if(!value||typeof value!=='object')return null;
  const p={};
  for(const key of numeric){if(!Number.isFinite(value[key]))return null;p[key]=value[key];}
  if(Math.abs(p.x)>11020||Math.abs(p.z)>11020||Math.abs(p.y)>5000||p.speed<0||p.speed>40)return null;
  p.grounded=!!value.grounded;p.riding=!!value.riding;p.landed=false;p.landingSpeed=0;
  if(value.rover&&typeof value.rover==='object'){
    const r={};for(const key of ['x','y','z','vx','vz','vy','yaw','speed','steering','pitch','roll','wheelTravel']){
      if(!Number.isFinite(value.rover[key]))return null;r[key]=value.rover[key];
    }
    if(Math.abs(r.x)>11020||Math.abs(r.z)>11020||Math.abs(r.y)>5000||r.speed>40)return null;
    p.rover=r;
  }
  return p;
}
export const cleanName=value=>String(value||'Explorer').replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,20)||'Explorer';

let library;
async function loadPeer(){
  if(globalThis.Peer)return globalThis.Peer;
  library||=new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src='vendor/peerjs.min.js';
    script.onload=()=>globalThis.Peer?resolve(globalThis.Peer):reject(new Error('Connection library could not load.'));
    script.onerror=()=>{library=null;script.remove();reject(new Error('Connection library could not load. Please reload.'));};document.head.append(script);
  });
  return library;
}

export function createExpedition({getState,onChange,onRoster,onSpawn,onNotice}){
  let peer=null,host=false,code='',name='Explorer',phase='solo',message='Explore solo, or invite a crew.',lastSend=0,generation=0;
  const links=new Map(),members=new Map();let connectionTimer,lastBroadcast=-Infinity;
  const notify=()=>onChange({phase,host,code,name,message,count:phase==='connected'?members.size+1:1,max:MAX_CREW});
  const send=(link,data)=>{if(link?.open&&link.bufferSize<3){try{link.send(data);}catch{/* closed between frames */}}};
  const broadcast=data=>links.forEach(link=>send(link,data));
  const roster=()=>onRoster([...members].map(([id,m])=>({id,...m})));
  function disconnect(showNotice=false){
    generation++;clearTimeout(connectionTimer);
    if(host)broadcast({type:'ended'});
    for(const link of links.values())link.close();links.clear();peer?.destroy();peer=null;
    members.clear();host=false;code='';phase='solo';message='Explore solo, or invite a crew.';roster();notify();
    if(showNotice)onNotice('You left the expedition. Continue exploring solo.');
  }
  function fail(text){disconnect();phase='error';message=text;notify();}
  const payload=()=>({name,state:sanitizeState(getState())});
  function publishRoster(){
    if(performance.now()-lastBroadcast>=90){
      broadcast({type:'world',members:[{id:peer.id,...payload()},...[...members].map(([id,m])=>({id,...m}))]});lastBroadcast=performance.now();
    }
    roster();notify();
  }
  async function open(kind,room,displayName){
    disconnect();const session=++generation;
    host=kind==='host';name=cleanName(displayName);code=host?Array.from(crypto.getRandomValues(new Uint8Array(4)),n=>n.toString(16).padStart(2,'0')).join(''):String(room).trim().toLowerCase();
    if(!/^[a-f0-9]{8}$/.test(code)){fail('Enter the 8 character expedition code from your friend.');return;}
    phase='connecting';message=host?'Opening expedition…':'Contacting expedition host…';notify();
    try{
      const Peer=await loadPeer();if(session!==generation)return;
      peer=new Peer(host?PREFIX+code:undefined,{debug:0,secure:true});
      connectionTimer=setTimeout(()=>{if(session===generation)fail('Could not connect. Check your connection and ask the host to keep their tab open. Some networks block direct connections.');},20000);
      peer.on('open',()=>{
        if(session!==generation)return;
        if(host){clearTimeout(connectionTimer);phase='connected';message='Expedition open. Copy the invite link for your friends.';notify();}
        else if([...links.values()].some(link=>link.open)){message='Connected. Your crew shares this landing site.';notify();}
        else attach(peer.connect(PREFIX+code,{reliable:true,serialization:'json',metadata:{name,version:3}}));
      });
      peer.on('connection',link=>{
        if(!host||session!==generation){link.close();return;}
        attach(link);
      });
      peer.on('error',error=>{
        if(session!==generation)return;
        const messages={'peer-unavailable':'Expedition not found. Ask your friend to start hosting and share a new invite.','unavailable-id':'This expedition code is already in use. Start a new expedition.','network':'Connection service unavailable. Check your internet connection and try again.','webrtc':'Direct connection failed. Try a different network.'};
        if(phase!=='connected'||!host)fail(messages[error.type]||'Could not connect to the expedition. Please try again.');
        else{message='A guest could not connect. Your expedition remains open.';notify();}
      });
      peer.on('disconnected',()=>{
        if(session!==generation)return;
        message='Reconnecting to the invite service…';notify();
        if(!peer.destroyed)peer.reconnect();
      });
      function attach(link){
        link.on('open',()=>{
          if(session!==generation){link.close();return;}
          if(host){
            if(members.size>=MAX_CREW-1||link.metadata?.version!==3){send(link,{type:'rejected',message:'This expedition is full or uses a different game version.'});setTimeout(()=>link.close(),100);return;}
            links.set(link.peer,link);members.set(link.peer,{name:cleanName(link.metadata?.name),state:null});
            const p=getState(),slot=members.size;
            send(link,{type:'welcome',spawn:{x:p.x+slot*3.5,z:p.z+5}});
            publishRoster();onNotice(`${cleanName(link.metadata?.name)} joined the expedition.`);
          }else{
            links.set(link.peer,link);clearTimeout(connectionTimer);phase='connected';message='Connected. Your crew shares this landing site.';notify();
            send(link,{type:'state',state:getState()});
          }
        });
        link.on('data',data=>{
          if(session!==generation||!data||typeof data!=='object')return;
          if(host){
            if(!members.has(link.peer)||data.type!=='state')return;
            const state=sanitizeState(data.state);if(!state)return;
            members.get(link.peer).state=state;publishRoster();
          }else if(data.type==='welcome'&&Number.isFinite(data.spawn?.x)&&Number.isFinite(data.spawn?.z))onSpawn(data.spawn);
          else if(data.type==='world'&&Array.isArray(data.members)){
            members.clear();
            for(const entry of data.members.slice(0,MAX_CREW)){
              if(typeof entry.id!=='string'||entry.id===peer.id)continue;
              const state=sanitizeState(entry.state);if(state)members.set(entry.id,{name:cleanName(entry.name),state});
            }
            roster();notify();
          }else if(data.type==='ended')fail('The host closed the expedition. You can keep exploring solo or start a new expedition.');
          else if(data.type==='rejected')fail(String(data.message).slice(0,160));
        });
        link.on('close',()=>{
          if(session!==generation)return;links.delete(link.peer);
          if(host){const member=members.get(link.peer);members.delete(link.peer);publishRoster();if(member)onNotice(`${member.name} left the expedition.`);}
          else fail('Connection to the host was lost. Continue solo or join another expedition.');
        });
        link.on('error',()=>{if(session===generation&&!host)fail('The direct connection failed. Try another network or ask the host for a new invite.');});
      }
    }catch(error){if(session===generation)fail(error.message||'Could not start the connection.');}
  }
  notify();
  return {
    host:name=>open('host','',name),join:(room,name)=>open('join',room,name),leave:()=>disconnect(true),
    update(now){if(phase!=='connected'||now-lastSend<.1)return;lastSend=now;if(host)publishRoster();else for(const link of links.values())send(link,{type:'state',state:getState()});},
    snapshot:()=>({phase,host,code,count:phase==='connected'?members.size+1:1,members:[...members].map(([id,m])=>({id,name:m.name,state:m.state}))}),
    invite(){const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('room',code);return url.href;}
  };
}
