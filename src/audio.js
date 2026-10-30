// Decoded, reusable foley buffers and a persistent synth graph: no audio assets
// are fetched or decoded from the animation loop. Sounds are a cinematic suit feed.
const CLIPS=['footstep_snow_000','footstep_snow_001','footstep_snow_002','footstep_snow_003','footstep_concrete_000','footstep_concrete_001','footstep_carpet_000','impactSoft_medium_000','impactSoft_heavy_000','impactMining_000','impactMining_001','impactMetal_light_000','impactGeneric_light_000','click_001','confirmation_001','switch_001','error_001'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function createAudio(){
  let settings={volume:.65,ambience:.35,muted:false};
  try{const s=JSON.parse(localStorage.getItem('selene-audio-v1'));if(s){if(Number.isFinite(s.volume))settings.volume=clamp(s.volume,0,1);if(Number.isFinite(s.ambience))settings.ambience=clamp(s.ambience,0,1);settings.muted=s.muted===true;}}catch{}
  let context,master,ambient,motor,motorGain,rollingGain,charge,chargeGain,loading,unlocked=false,failed=0,played=0,steps=0,lastStep=-1,lastUpdate=-1,actionKey='',actionMask=0;
  const buffers=new Map(),voices=new Set(),counts={},cooldowns=new Map();
  const $=id=>document.getElementById(id);
  // Start small downloads alongside the welcome screen, not during a footfall.
  const downloads=Promise.all(CLIPS.map(async name=>{try{const r=await fetch(new URL(`../assets/audio/${name}.ogg`,import.meta.url));if(!r.ok)throw Error(r.status);return [name,await r.arrayBuffer()];}catch{return [name,null];}}));
  const save=()=>{try{localStorage.setItem('selene-audio-v1',JSON.stringify(settings));}catch{}};
  function apply(){
    if(master){master.gain.cancelScheduledValues(context.currentTime);master.gain.setTargetAtTime(settings.muted?0:settings.volume*.65,context.currentTime,.035);}
    $('audio-volume').value=Math.round(settings.volume*100);$('audio-value').textContent=Math.round(settings.volume*100)+'%';
    $('audio-ambience').value=Math.round(settings.ambience*100);$('ambience-value').textContent=Math.round(settings.ambience*100)+'%';
    $('audio-mute').textContent=settings.muted?'Unmute sound':'Mute all sound';$('audio-mute').setAttribute('aria-pressed',String(settings.muted));
    $('audio-button').textContent=settings.muted?'SOUND OFF':'SOUND';
  }
  function gain(value=0){const g=context.createGain();g.gain.value=value;return g;}
  function init(){
    if(context)return;
    const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('Audio is unavailable in this browser.');
    context=new Audio();master=gain(0);const limiter=context.createDynamicsCompressor();limiter.threshold.value=-16;limiter.ratio.value=5;master.connect(limiter);limiter.connect(context.destination);
    // Filtered airflow with a very gentle breathing envelope, generated once.
    const noise=context.createBuffer(1,context.sampleRate*4,context.sampleRate),data=noise.getChannelData(0);let brown=0;
    for(let i=0;i<data.length;i++){brown=(brown+(Math.random()*2-1)*.035)/1.02;data[i]=brown*(.55+.22*Math.sin(i/context.sampleRate*Math.PI/2));}
    const source=context.createBufferSource();source.buffer=noise;source.loop=true;
    const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=850;ambient=gain();source.connect(filter);filter.connect(ambient);ambient.connect(master);source.start();
    motor=context.createOscillator();motor.type='triangle';motor.frequency.value=65;motorGain=gain();motor.connect(motorGain);motorGain.connect(master);motor.start();
    const rolling=context.createBiquadFilter();rolling.type='bandpass';rolling.frequency.value=240;rolling.Q.value=.6;rollingGain=gain();source.connect(rolling);rolling.connect(rollingGain);rollingGain.connect(master);
    charge=context.createOscillator();charge.type='sine';charge.frequency.value=280;chargeGain=gain();charge.connect(chargeGain);chargeGain.connect(master);charge.start();
    loading=downloads.then(async entries=>{for(const [name,bytes] of entries){if(!bytes){failed++;continue;}try{buffers.set(name,await context.decodeAudioData(bytes));}catch{failed++;}}status();});
    apply();
  }
  function status(){if(!context)return;$('audio-status').textContent=failed?'Some sounds could not load. Reload to retry.':buffers.size===CLIPS.length?'Sound ready. Settings are saved on this device.':'Preparing suit audio…';}
  async function unlock(){
    try{init();await context.resume();unlocked=true;status();}catch{$('audio-status').textContent='Sound could not start. Use Test sound to retry.';}
  }
  function play(name,volume=.3,rate=1,pan=0){
    if(!context||context.state!=='running'||document.hidden||settings.muted||settings.volume===0||!buffers.has(name)||voices.size>=20)return false;
    const source=context.createBufferSource(),level=gain(volume),stereo=context.createStereoPanner();source.buffer=buffers.get(name);source.playbackRate.value=rate;stereo.pan.value=clamp(pan,-1,1);source.connect(level);level.connect(stereo);stereo.connect(master);voices.add(source);
    source.onended=()=>{voices.delete(source);source.disconnect();level.disconnect();stereo.disconnect();};source.start();played++;counts[name]=(counts[name]||0)+1;return true;
  }
  function effect(type,strength=1,pan=0){
    if(!context)return;const now=context.currentTime;if(now-(cooldowns.get(type)??-10)<.08)return;cooldowns.set(type,now);
    if(type==='raceFire'||type==='raceExplosion'){
      const osc=context.createOscillator(),level=context.createGain(),blast=type==='raceExplosion';
      osc.type=blast?'sawtooth':'triangle';osc.frequency.setValueAtTime(blast?110:940,now);osc.frequency.exponentialRampToValueAtTime(blast?25:180,now+(blast?.45:.12));
      level.gain.setValueAtTime(.065*strength,now);level.gain.exponentialRampToValueAtTime(.0001,now+(blast?.5:.14));osc.connect(level);level.connect(master);osc.start(now);osc.stop(now+(blast?.52:.16));osc.onended=()=>{osc.disconnect();level.disconnect();};return;
    }
    const table={ui:['click_001',.18],confirm:['confirmation_001',.22],suit:['footstep_carpet_000',.23],pick:['impactMining_001',.22],bag:['impactSoft_medium_000',.36],shovel:['impactMetal_light_000',.16],scoop:['footstep_snow_002',.32],pour:['footstep_snow_003',.3],throw:['footstep_carpet_000',.35],bounce:['impactMining_000',.32],hit:['impactSoft_heavy_000',.5],land:['impactSoft_heavy_000',.4],jump:['footstep_carpet_000',.25],board:['switch_001',.3],door:['impactMetal_light_000',.25],step:['footstep_snow_001',.28],collision:['impactGeneric_light_000',.4],error:['error_001',.18]};
    const [name,volume]=table[type]||table.ui;play(name,volume*clamp(strength,0,1.5),.94+Math.random()*.12,pan);
  }
  function footstep(strength=1,hard=false,pan=0){
    if(!context||context.currentTime-lastStep<.12)return;lastStep=context.currentTime;
    const index=(steps++)%(hard?2:4),name=`footstep_${hard?'concrete':'snow'}_00${index}`;
    play(name,.34*strength,.88+Math.random()*.18,pan);
  }
  function sample(action){
    if(!action){actionKey='';actionMask=0;return;}
    const key=action.type+':'+action.start;if(key!==actionKey){actionKey=key;actionMask=0;}
    const cues={pick:[[.12,'suit'],[.48,'pick']],store:[[.15,'suit'],[.72,'bag']],retrieve:[[.18,'bag'],[.72,'pick']],soil:[[.12,'shovel'],[.44,'scoop'],[.72,'pour']],throw:[[.12,'suit'],[.53,'throw']],deliver:[[.2,'bag'],[.72,'pick']]};
    (cues[action.type]||[]).forEach(([at,type],i)=>{if(action.progress>=at&&!(actionMask&(1<<i))){actionMask|=1<<i;effect(type);}});
  }
  function event(e,listener,heading){
    if(!listener)return;const dx=e.x-listener.x,dz=e.z-listener.z,distance=Math.hypot(dx,dz);if(distance>24)return;
    const pan=clamp((Math.cos(heading)*dx-Math.sin(heading)*dz)/Math.max(2,distance),-1,1);
    effect(e.type==='mission'?'confirm':e.type,e.strength===undefined?1/(1+distance*.2):e.strength/(1+distance*.2),pan);
  }
  function update({active,riding,speed,grounded,aiming,charge:power=0}){
    if(!context||context.state!=='running')return;
    const now=context.currentTime;if(now-lastUpdate<.08)return;lastUpdate=now;
    const enabled=active&&!document.hidden;
    ambient.gain.setTargetAtTime(enabled?settings.ambience*.11:0,now,.2);
    motorGain.gain.setTargetAtTime(enabled&&riding?.018+Math.min(7,Math.abs(speed))*.008:0,now,.12);
    motor.frequency.setTargetAtTime(65+Math.min(7,Math.abs(speed))*23,now,.16);
    rollingGain.gain.setTargetAtTime(enabled&&riding&&grounded?Math.min(7,Math.abs(speed))*.03:0,now,.12);
    chargeGain.gain.setTargetAtTime(enabled&&aiming?.018:0,now,.05);charge.frequency.setTargetAtTime(280+power*420,now,.06);
  }
  function hush(){if(context){ambient.gain.value=motorGain.gain.value=rollingGain.gain.value=chargeGain.gain.value=0;for(const voice of voices){try{voice.stop();}catch{}}context.suspend().catch(()=>{});}}
  const soundButton=document.createElement('button');soundButton.id='audio-button';soundButton.setAttribute('aria-label','Open sound settings');$('toolbar-items').insertBefore(soundButton,$('help-button'));
  soundButton.onclick=()=>{if(document.pointerLockElement)document.exitPointerLock();$('audio-dialog').showModal();};$('close-audio').onclick=()=>$('audio-dialog').close();
  $('audio-mute').onclick=()=>{settings.muted=!settings.muted;apply();save();if(!settings.muted)unlock();};
  $('audio-volume').oninput=e=>{settings.volume=Number(e.target.value)/100;apply();save();};$('audio-ambience').oninput=e=>{settings.ambience=Number(e.target.value)/100;apply();save();};
  $('audio-test').onclick=async()=>{await unlock();if(loading)await loading;effect('confirm');};apply();
  document.addEventListener('click',e=>{if(e.target.closest('button,summary')&&e.target.id!=='audio-test')effect('ui');});
  document.addEventListener('pointerdown',()=>{if(unlocked&&context?.state==='suspended'&&!document.hidden)unlock();},{passive:true});
  window.addEventListener('blur',hush);document.addEventListener('visibilitychange',()=>{if(document.hidden)hush();else if(unlocked)unlock();});window.addEventListener('focus',()=>{if(unlocked&&!document.hidden)unlock();});
  return {unlock,effect,footstep,sample,event,update,snapshot:()=>({state:context?.state||'locked',loaded:buffers.size,failed,voices:voices.size,played,steps,motor:{frequency:motor?.frequency.value||0,gain:motorGain?.gain.value||0},settings:{...settings},counts:{...counts}})};
}
