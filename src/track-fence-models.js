import * as THREE from 'three';
import {TRACK_FENCES,FENCE_HEIGHT,START_GATE} from './track-boundary.js';
import {PADDOCK,coursePoint} from './stadium-layout.js';

export function createTrackFences(root,ground,makeSign){
  const group=new THREE.Group();group.name='Continuous course safety fences';root.add(group);
  const steel=new THREE.MeshStandardMaterial({color:0x747d83,metalness:.65,roughness:.55});
  const panels=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.85,metalness:.2});
  const glow=new THREE.MeshBasicMaterial({color:0xffc35e});
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');
  ctx.strokeStyle='#c4cbd1';ctx.lineWidth=4;for(let i=-128;i<=256;i+=32){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i+128,128);ctx.moveTo(i,0);ctx.lineTo(i-128,128);ctx.stroke();}
  const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(3,1);
  const net=new THREE.MeshStandardMaterial({map:texture,alphaTest:.4,side:THREE.DoubleSide,metalness:.5,roughness:.7});
  const count=TRACK_FENCES.length,matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),position=new THREE.Vector3(),scale=new THREE.Vector3(),up=new THREE.Vector3(0,1,0),delta=new THREE.Vector3(),color=new THREE.Color();
  function instances(geo,material,n){const mesh=new THREE.InstancedMesh(geo,material,n);mesh.receiveShadow=true;group.add(mesh);return mesh;}
  const posts=instances(new THREE.BoxGeometry(1,1,1),steel,count*2),base=instances(new THREE.BoxGeometry(1,1,1),panels,count),rails=instances(new THREE.BoxGeometry(1,1,1),steel,count*3),strip=instances(new THREE.BoxGeometry(1,1,1),glow,count),wire=instances(new THREE.PlaneGeometry(1,1),net,count);
  posts.castShadow=base.castShadow=true;
  let postIndex=0,railIndex=0;
  function put(mesh,i,x,y,z,sx,sy,sz,rotation=null){position.set(x,y,z);scale.set(sx,sy,sz);q.copy(rotation||new THREE.Quaternion());matrix.compose(position,q,scale);mesh.setMatrixAt(i,matrix);}
  function span(mesh,i,a,b,y0,y1,width,depth){delta.set(b.x-a.x,y1-y0,b.z-a.z);const length=delta.length(),rotation=new THREE.Quaternion().setFromUnitVectors(up,delta.normalize());put(mesh,i,(a.x+b.x)/2,(y0+y1)/2,(a.z+b.z)/2,width,length,depth,rotation);}
  for(let i=0;i<count;i++){
    const f=TRACK_FENCES[i],a=f.a,b=f.b,ya=ground(a.x,a.z),yb=ground(b.x,b.z),yaw=Math.atan2(b.x-a.x,b.z-a.z);
    for(const [p,y] of [[a,ya],[b,yb]])put(posts,postIndex++,p.x,y+FENCE_HEIGHT/2,p.z,.23,FENCE_HEIGHT+.15,.23);
    matrix.makeBasis(new THREE.Vector3(b.x-a.x,yb-ya,b.z-a.z),new THREE.Vector3(0,1.16,0),new THREE.Vector3(-Math.cos(yaw)*.64,0,Math.sin(yaw)*.64));matrix.setPosition((a.x+b.x)/2,(ya+yb)/2+.58,(a.z+b.z)/2);base.setMatrixAt(i,matrix);
    // Vertical bars are oriented along each sloping span. Panel side colours
    // alternate in long blocks, making the course readable from far away.
    color.setHex(Math.floor(f.index/4)%2?0xd99b43:0xd7d9d5);base.setColorAt(i,color);
    for(const h of [1.18,2.48,FENCE_HEIGHT])span(rails,railIndex++,a,b,ya+h,yb+h,.14,.14);
    span(strip,i,a,b,ya+1.28,yb+1.28,.10,.10);
    // Plane vertices follow both endpoint elevations (including steep banks).
    const basisX=new THREE.Vector3(b.x-a.x,yb-ya,b.z-a.z),basisY=new THREE.Vector3(0,FENCE_HEIGHT-1.2,0),basisZ=new THREE.Vector3(-Math.cos(yaw),0,Math.sin(yaw));
    matrix.makeBasis(basisX,basisY,basisZ);matrix.setPosition((a.x+b.x)/2,(ya+yb)/2+(FENCE_HEIGHT+1.2)/2,(a.z+b.z)/2);wire.setMatrixAt(i,matrix);
  }
  for(const m of [posts,base,rails,strip,wire]){m.computeBoundingSphere();m.instanceMatrix.needsUpdate=true;}
  // A full-width gantry makes the shared start / finish unmissable.
  const [left,right]=START_GATE.posts,top=Math.max(ground(left.x,left.z),ground(right.x,right.z))+12;
  const gate=new THREE.Group();gate.name='Start and finish gantry';root.add(gate);
  const gatePosts=instances(new THREE.BoxGeometry(1.2,1,1.2),steel,4);let gi=0;
  for(const p of [left,right]){const y=ground(p.x,p.z);put(gatePosts,gi++,p.x,(y+top)/2,p.z,1,top-y,1);}
  const banner=makeSign('START / FINISH  •  2 LAPS',START_GATE.width,4.4);banner.position.set(PADDOCK.x,top,PADDOCK.z);banner.rotation.y=START_GATE.yaw;gate.add(banner);
  const chevrons=makeSign('PADDOCK  →  FOLLOW THE FENCES',27,2.4);const p=coursePoint(.006);chevrons.position.set(p.x+41,ground(p.x+41,p.z)+5,p.z);chevrons.rotation.y=Math.PI/2;gate.add(chevrons);
  for(const side of [-1,1]){const x=chevrons.position.x,z=p.z+side*11,y=ground(x,z),height=chevrons.position.y-y;put(gatePosts,gi++,x,y+height/2,z,.35,height,.35);}gatePosts.computeBoundingSphere();
  return {segments:count,height:FENCE_HEIGHT};
}
