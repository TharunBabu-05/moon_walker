import * as THREE from 'three';
import {FLAG_EXHIBITS} from './lunar-sites.js';
function flagTexture(design){
  const canvas=document.createElement('canvas');canvas.width=900;canvas.height=600;const c=canvas.getContext('2d');
  function star(x,y,r,angle=-Math.PI/2){c.beginPath();for(let i=0;i<10;i++){const a=angle+i*Math.PI/5,rr=i%2?r*.382:r;c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}c.closePath();c.fill();}
  if(design==='us'){
    c.fillStyle='#eee9de';c.fillRect(0,0,900,600);c.fillStyle='#9e2939';for(let i=0;i<13;i+=2)c.fillRect(0,i*600/13,900,600/13);
    c.fillStyle='#243958';c.fillRect(0,0,360,600*7/13);c.fillStyle='#eee9de';
    for(let row=0;row<9;row++)for(let col=0;col<(row%2?5:6);col++)star((col+1)*60-(row%2?0:30),(row+1)*600*7/13/10,12);
  }else{
    c.fillStyle='#b72528';c.fillRect(0,0,900,600);c.fillStyle='#f3ce46';star(150,150,90);
    for(const [x,y] of [[300,60],[360,120],[360,210],[300,270]])star(x,y,30,Math.atan2(150-y,150-x));
  }
  // Fine woven fibres; no wind animation in the lunar vacuum.
  c.globalAlpha=.08;c.strokeStyle='#080a0c';c.lineWidth=1;for(let i=0;i<900;i+=3){c.beginPath();c.moveTo(i,0);c.lineTo(i,600);c.stroke();}for(let y=0;y<600;y+=3){c.beginPath();c.moveTo(0,y);c.lineTo(900,y);c.stroke();}
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;return texture;
}
export function createFlagExhibits(scene,groundAt){
  const group=new THREE.Group();scene.add(group);const metal=new THREE.MeshStandardMaterial({color:0xaeb4b5,metalness:.8,roughness:.4}),foil=new THREE.MeshStandardMaterial({color:0x9b7c47,metalness:.65,roughness:.62});
  const materials=Object.fromEntries(['us','cn'].map(d=>[d,new THREE.MeshStandardMaterial({map:flagTexture(d),roughness:.96,side:THREE.DoubleSide})]));
  const colliders=[];
  for(const e of FLAG_EXHIBITS){
    const root=new THREE.Group();root.position.set(e.x,groundAt(e.x,e.z),e.z);group.add(root);
    const mesh=(geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;root.add(m);return m;};
    const china=e.design==='cn',height=china?1.65:2.35,w=china?.30:1.52,h=china?.20:.91;
    mesh(new THREE.CylinderGeometry(.015,.022,height,12),metal,0,height/2,0);
    const bar=mesh(new THREE.CylinderGeometry(.009,.009,w,8),metal,w/2,height,0);bar.rotation.z=Math.PI/2;
    const fabric=new THREE.PlaneGeometry(w,h,40,24),p=fabric.attributes.position;
    for(let i=0;i<p.count;i++){const u=(p.getX(i)+w/2)/w,v=(p.getY(i)+h/2)/h;p.setZ(i,(Math.sin(u*21+v*2)*.035+Math.sin(u*43-v*3)*.012)*Math.sin(u*Math.PI/2)*(china?.15:1));}fabric.computeVertexNormals();
    mesh(fabric,materials[e.design],w/2,height-h/2-.01,.012);
    if(china){mesh(new THREE.BoxGeometry(.75,.55,.65),foil,0,.45,0);for(const side of [-1,1])mesh(new THREE.CylinderGeometry(.025,.025,.45,8),metal,side*.3,.225,0);}
    const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#13232b';ctx.fillRect(0,0,1024,256);ctx.fillStyle='#d8e4dc';ctx.textAlign='center';ctx.font='bold 48px monospace';ctx.fillText(e.label.toUpperCase(),512,78);ctx.font='27px monospace';ctx.fillText(china?'LANDER DISPLAY / RECONSTRUCTION':'HISTORIC DEPLOYMENT / RECONSTRUCTION',512,138);ctx.fillStyle='#c9b38d';ctx.fillText('REAL MISSION LOCATION IN MOON ATLAS',512,195);
    const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
    const plaque=mesh(new THREE.PlaneGeometry(2,.5),new THREE.MeshStandardMaterial({map:tex,roughness:.8,side:THREE.DoubleSide}),.5,.65,1);plaque.rotation.x=-.22;mesh(new THREE.CylinderGeometry(.025,.025,.7,8),metal,.5,.35,1);
    colliders.push({shape:'circle',radius:china?.55:.2,height:2.4,invMass:0,owner:'flag',state:{x:e.x,z:e.z,y:root.position.y,yaw:0,vx:0,vz:0}});
  }
  return {group,colliders,exhibits:FLAG_EXHIBITS};
}
