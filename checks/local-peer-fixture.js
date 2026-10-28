// Test-only signalling adapter. Production still loads vendor/peerjs.min.js.
// Browser RTCDataChannels carry actual packets; BroadcastChannel exchanges SDP/ICE.
window.__localPeers=[];
class Events {constructor(){this.events=new Map();this.counts={};}on(name,fn){if(!this.events.has(name))this.events.set(name,[]);this.events.get(name).push(fn);return this;}emit(name,...args){this.counts[name]=(this.counts[name]||0)+1;for(const fn of this.events.get(name)||[])fn(...args);}}
class LocalConnection extends Events {
  constructor(owner,id,metadata){super();this.owner=owner;this.peer=id;this.metadata=metadata;this.open=false;this.pc=new RTCPeerConnection({iceServers:[]});this.pending=[];this.pc.onicecandidate=e=>{if(e.candidate)owner.signal(id,'ice',e.candidate.toJSON());};this.pc.ondatachannel=e=>this.attach(e.channel);}
  get bufferSize(){return Math.ceil((this.channel?.bufferedAmount||0)/65536);}
  attach(channel){this.channel=channel;const opened=()=>{if(this.open)return;this.open=true;this.emit('open');};channel.onopen=opened;channel.onmessage=e=>this.emit('data',JSON.parse(e.data));channel.onclose=()=>{this.open=false;this.emit('close');};channel.onerror=e=>this.emit('error',e);if(channel.readyState==='open')queueMicrotask(opened);}
  send(value){this.channel.send(JSON.stringify(value));}
  close(){this.channel?.close();this.pc.close();this.open=false;}
  async remote(description){await this.pc.setRemoteDescription(description);for(const c of this.pending)await this.pc.addIceCandidate(c);this.pending=[];}
}
window.Peer=class extends Events {
  constructor(id){super();this.id=id||crypto.randomUUID();this.links=new Map();this.early=new Map();this.channel=new BroadcastChannel('selene-local-signalling-test');this.channel.onmessage=e=>this.receive(e.data).catch(error=>this.emit('error',error));window.__localPeers.push(this);queueMicrotask(()=>this.emit('open',this.id));}
  signal(target,type,value,metadata){this.channel.postMessage({from:this.id,target,type,value,metadata});}
  connect(id,options){const link=new LocalConnection(this,id,options.metadata);this.links.set(id,link);link.attach(link.pc.createDataChannel('selene',{ordered:true}));(async()=>{await link.pc.setLocalDescription(await link.pc.createOffer());this.signal(id,'offer',link.pc.localDescription.toJSON(),options.metadata);})().catch(e=>this.emit('error',e));return link;}
  async receive(m){if(m.target!==this.id)return;let link=this.links.get(m.from);if(m.type==='offer'){link=new LocalConnection(this,m.from,m.metadata);link.pending=this.early.get(m.from)||[];this.early.delete(m.from);this.links.set(m.from,link);this.emit('connection',link);await link.remote(m.value);await link.pc.setLocalDescription(await link.pc.createAnswer());this.signal(m.from,'answer',link.pc.localDescription.toJSON());}else if(m.type==='answer')await link.remote(m.value);else if(m.type==='ice'){if(link?.pc.remoteDescription)await link.pc.addIceCandidate(m.value);else if(link)link.pending.push(m.value);else {if(!this.early.has(m.from))this.early.set(m.from,[]);this.early.get(m.from).push(m.value);}}}
  destroy(){this.destroyed=true;for(const link of this.links.values())link.close();this.channel.close();}
  reconnect(){}
};
