import {reconcileContacts} from './contacts.js';
export const MAX_CREW=8;
// Changing the wire contract requires a fresh room so an older client cannot
// silently omit pose fields that affect shared animation.
const PROTOCOL=13;
const PREFIX=`selene-expedition-${PROTOCOL}-`;
const numeric=['x','y','z','vx','vy','vz','yaw','speed','distance'];

export function sanitizeState(value){
  if(!value||typeof value!=='object')return null;
  const p={};
  for(const key of numeric){if(!Number.isFinite(value[key]))return null;p[key]=value[key];}
  if(Math.abs(p.x)>11020||Math.abs(p.z)>11020||Math.abs(p.y)>5000||p.speed<0||p.speed>40)return null;
  p.grounded=!!value.grounded;p.riding=!!value.riding;p.aiming=!!value.aiming;p.landed=false;p.landingSpeed=0;
  p.costume=value.costume===2?2:1;
  p.arena=!!value.arena;
  p.ack=Number.isSafeInteger(value.ack)?value.ack:0;
  if(value.dismount&&p.riding){const d=value.dismount;if(Number.isFinite(d.progress)&&d.progress>=0&&d.progress<=1&&[d.from,d.to].every(v=>v&&['x','y','z','yaw'].every(k=>Number.isFinite(v[k])))&&Math.hypot(d.from.x-d.to.x,d.from.z-d.to.z)<5)p.dismount={progress:d.progress,side:d.side===1?1:-1,from:{...d.from},to:{...d.to}};}
  if(value.rover&&typeof value.rover==='object'){
    const r={};for(const key of ['x','y','z','vx','vz','vy','yaw','speed','steering','pitch','roll','wheelTravel']){
      if(!Number.isFinite(value.rover[key]))return null;r[key]=value.rover[key];
    }
    if(Math.abs(r.x)>11020||Math.abs(r.z)>11020||Math.abs(r.y)>5000||r.speed>40)return null;
    r.grounded=!!value.rover.grounded;p.rover=r;
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

export function createExpedition({getState,onChange,onRoster,onSpawn,onNotice,onCorrection=()=>{},onSampleRequest=()=>{},onSampleWorld=()=>{},onSampleReset=()=>{},onRaceRequest=()=>{},onRaceWorld=()=>{},onRaceReset=()=>{}}){
  let peer=null,host=false,code='',name='Explorer',phase='solo',message='Explore solo, or invite a crew.',lastSend=0,generation=0;
  const links=new Map(),members=new Map(),pending=new Map();let connectionTimer,lastBroadcast=-Infinity,sequence=0,ack=0,correctionSerial=0,contactCount=0;
  const notify=()=>onChange({phase,host,code,name,message,count:phase==='connected'?members.size+1:1,max:MAX_CREW});
  const send=(link,data)=>{if(link?.open&&link.bufferSize<3){try{link.send(data);}catch{/* closed between frames */}}};
  const broadcast=data=>links.forEach(link=>send(link,data));
  const roster=()=>onRoster([...members].map(([id,m])=>({id,...m})));
  function disconnect(showNotice=false){
    generation++;clearTimeout(connectionTimer);
    if(host)broadcast({type:'ended'});
    for(const link of links.values())link.close();links.clear();peer?.destroy();peer=null;
    members.clear();pending.clear();sequence=ack=correctionSerial=contactCount=0;host=false;code='';phase='solo';message='Explore solo, or invite a crew.';onSampleReset();roster();notify();
    onRaceReset();
    if(showNotice)onNotice('You left the expedition. Continue exploring solo.');
  }
  function fail(text){disconnect();phase='error';message=text;notify();}
  const payload=()=>({name,state:sanitizeState({...getState(),ack}),stamp:performance.now(),seq:++sequence});
  function publishRoster(){
    if(performance.now()-lastBroadcast>=45){
      const local={id:peer.id,...payload()};
      const entries=[local,...[...members].filter(([id,m])=>m.state&&!pending.has(id)).map(([id,m])=>({id,...m}))];
      for(const result of reconcileContacts(entries)){
        const serial=++correctionSerial;contactCount++;
        if(result.id===peer.id){onCorrection(result.change);local.state=sanitizeState({...getState(),ack});}
        else{
          const member=members.get(result.id);member.state=result.state;
          pending.set(result.id,{serial,since:performance.now()});send(links.get(result.id),{type:'correction',serial,change:result.change});
        }
      }
      broadcast({type:'world',members:[local,...[...members].map(([id,m])=>({id,...m}))]});lastBroadcast=performance.now();
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
        else attach(peer.connect(PREFIX+code,{reliable:true,serialization:'json',metadata:{name,version:PROTOCOL}}));
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
            if(members.size>=MAX_CREW-1||link.metadata?.version!==PROTOCOL){send(link,{type:'rejected',message:'This expedition is full or uses a different game version.'});setTimeout(()=>link.close(),100);return;}
            links.set(link.peer,link);members.set(link.peer,{name:cleanName(link.metadata?.name),state:null});
            const p=getState(),slot=members.size;
            send(link,{type:'welcome',spawn:{x:p.x+slot*6,z:p.z+7}});
            publishRoster();onNotice(`${cleanName(link.metadata?.name)} joined the expedition.`);
          }else{
            links.set(link.peer,link);clearTimeout(connectionTimer);phase='connected';message='Connected. Your crew shares this landing site.';notify();
            send(link,{type:'state',...payload()});
          }
        });
        link.on('data',data=>{
          if(session!==generation||!data||typeof data!=='object')return;
          if(host){
            if(data.type==='race-request'&&members.has(link.peer)){
              const type=data.request?.type;if(!['input','join','leave','ready','start','practice','end'].includes(type))return;
              const member=members.get(link.peer),now=performance.now(),field=type==='input'?'lastRaceInput':'raceControl-'+type;if(now-(member[field]||0)<(type==='input'?25:200))return;member[field]=now;
              const notice=onRaceRequest(link.peer,data.request,member.name);if(notice)send(link,{type:'race-notice',message:notice});return;
            }
            if(data.type==='sample-request'&&members.has(link.peer)){
              const member=members.get(link.peer),now=performance.now();if(now-(member.lastSampleRequest||0)<250)return;member.lastSampleRequest=now;
              const error=onSampleRequest(link.peer,member.state,data.request);if(error)send(link,{type:'sample-notice',message:error});return;
            }
            if(!members.has(link.peer)||data.type!=='state')return;
            const state=sanitizeState(data.state);if(!state)return;
            const member=members.get(link.peer);if(!Number.isFinite(data.stamp)||!Number.isSafeInteger(data.seq)||data.seq<=(member.seq||0))return;
            const correction=pending.get(link.peer);
            if(correction&&state.ack<correction.serial&&performance.now()-correction.since<1500)return;
            pending.delete(link.peer);Object.assign(member,{state,stamp:data.stamp,seq:data.seq});publishRoster();
          }else if(data.type==='race-world')onRaceWorld(data.world);
          else if(data.type==='sample-world')onSampleWorld(data.world);
          else if(data.type==='sample-notice'||data.type==='race-notice')onNotice(String(data.message).slice(0,160));
          else if(data.type==='welcome'&&Number.isFinite(data.spawn?.x)&&Number.isFinite(data.spawn?.z))onSpawn(data.spawn);
          else if(data.type==='world'&&Array.isArray(data.members)){
            members.clear();
            for(const entry of data.members.slice(0,MAX_CREW)){
              if(typeof entry.id!=='string'||entry.id===peer.id)continue;
              const state=sanitizeState(entry.state);if(state&&Number.isFinite(entry.stamp)&&Number.isSafeInteger(entry.seq))members.set(entry.id,{name:cleanName(entry.name),state,stamp:entry.stamp,seq:entry.seq});
            }
            roster();notify();
          }else if(data.type==='correction'&&Number.isSafeInteger(data.serial)&&data.serial>ack){
            const change={};for(const kind of ['player','rover'])if(data.change?.[kind]){
              const delta=data.change[kind];if(['x','z','vx','vz'].every(k=>Number.isFinite(delta[k])&&Math.abs(delta[k])<30))change[kind]=delta;
            }
            onCorrection(change);ack=data.serial;contactCount++;
          }else if(data.type==='ended')fail('The host closed the expedition. You can keep exploring solo or start a new expedition.');
          else if(data.type==='rejected')fail(String(data.message).slice(0,160));
        });
        link.on('close',()=>{
          if(session!==generation)return;links.delete(link.peer);
          if(host){const member=members.get(link.peer);members.delete(link.peer);pending.delete(link.peer);publishRoster();if(member)onNotice(`${member.name} left the expedition.`);}
          else fail('Connection to the host was lost. Continue solo or join another expedition.');
        });
        link.on('error',()=>{if(session===generation&&!host)fail('The direct connection failed. Try another network or ask the host for a new invite.');});
      }
    }catch(error){if(session===generation)fail(error.message||'Could not start the connection.');}
  }
  notify();
  return {
    identity:()=>phase==='connected'?peer.id:'solo',
    authority:()=>host||phase!=='connected',
    requestRace(request){if(host||phase!=='connected'){const notice=onRaceRequest(phase==='connected'?peer.id:'solo',request,name);if(notice)onNotice(notice);}else for(const link of links.values()){if(request.type==='join')send(link,{type:'state',...payload()});send(link,{type:'race-request',request});}},
    publishRace(world){if(host&&phase==='connected')broadcast({type:'race-world',world});},
    sampleEntries:()=>[{id:phase==='connected'?peer.id:'solo',state:getState()},...[...members].filter(([,m])=>m.state).map(([id,m])=>({id,state:m.state}))],
    requestSample(request){if(host||phase!=='connected'){const error=onSampleRequest(phase==='connected'?peer.id:'solo',getState(),request);if(error)onNotice(error);}else for(const link of links.values()){send(link,{type:'state',...payload()});send(link,{type:'sample-request',request});}},
    publishSamples(world){
      if(!host||phase!=='connected')return;
      for(const [id,link] of links){
        const state=members.get(id)?.state;if(!state)continue;
        const nearby=world.stones.filter(r=>Math.hypot(r.x-state.x,r.z-state.z)<145);
        send(link,{type:'sample-world',world:{...world,stones:nearby,events:world.events.slice(-16)}});
      }
    },
    host:name=>open('host','',name),join:(room,name)=>open('join',room,name),leave:()=>disconnect(true),
    update(now){if(phase!=='connected'||now-lastSend<.05)return;lastSend=now;if(host)publishRoster();else {const data={type:'state',...payload()};for(const link of links.values())send(link,data);}},
    snapshot:()=>({phase,host,code,contactCount,sendRate:20,count:phase==='connected'?members.size+1:1,members:[...members].map(([id,m])=>({id,name:m.name,state:m.state}))}),
    invite(){const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('room',code);return url.href;}
  };
}
