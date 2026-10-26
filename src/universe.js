import * as THREE from 'three';
import { randomGenerator } from './terrain.js';
export const MOON_RADIUS=1737.4, EARTH_RADIUS=6371, EARTH_DISTANCE=384400;

function stars(radius,count,opacity){
  const rng=randomGenerator(18261),pos=[],color=[];
  for(let i=0;i<count;i++){
    const y=rng()*2-1,a=rng()*Math.PI*2,q=Math.sqrt(1-y*y);pos.push(Math.cos(a)*q*radius,y*radius,Math.sin(a)*q*radius);
    const b=.25+rng()*.65;color.push(b*.94,b*.97,b);
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(color,3));
  return new THREE.Points(geo,new THREE.PointsMaterial({size:1.15,sizeAttenuation:false,vertexColors:true,transparent:true,opacity,depthWrite:false}));
}

function earthTexture(){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;const c=canvas.getContext('2d');c.fillStyle='#17496b';c.fillRect(0,0,1024,512);
  const shapes=[[[70,130],[125,76],[225,102],[270,170],[210,220],[171,257],[135,210],[90,180]],[[229,256],[285,280],[310,326],[267,397],[237,440],[215,346]],[[452,150],[494,130],[535,164],[566,221],[523,303],[495,336],[464,264]],[[495,122],[571,74],[698,88],[792,145],[862,127],[899,193],[806,217],[734,252],[695,205],[632,187],[567,157]],[[784,330],[839,303],[890,339],[872,376],[820,383]],[[336,65],[365,40],[390,72],[364,121]]];
  for(const shape of shapes){c.beginPath();shape.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle='#777d61';c.fill();}
  const rng=randomGenerator(193);c.globalAlpha=.24;c.strokeStyle='#e7edf1';
  for(let i=0;i<360;i++){const x=rng()*1024,y=rng()*512;c.lineWidth=2+rng()*9;c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+30,y-15,x+60,y+10,x+110,y-8);c.stroke();}
  c.globalAlpha=1;c.fillStyle='#cdd7dc';c.fillRect(0,0,1024,14);c.fillRect(0,492,1024,20);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;return tex;
}
export function createSurfaceSky(scene){
  const group=new THREE.Group();scene.add(group);group.add(stars(23000,2100,.32));
  const earth=new THREE.Mesh(new THREE.SphereGeometry(180,48,32),new THREE.MeshStandardMaterial({map:earthTexture(),roughness:.85}));earth.position.set(-3100,2300,-14000);earth.rotation.y=.4;group.add(earth);
  const sunDirection=new THREE.Vector3(.64,.36,-.68).normalize();
  const disk=new THREE.Mesh(new THREE.SphereGeometry(40,24,16),new THREE.MeshBasicMaterial({color:0xffffff}));disk.position.copy(sunDirection).multiplyScalar(18000);group.add(disk);
  return {group,sunDirection,update(camera){group.position.copy(camera.position);}};
}

export async function createUniverse(renderer,onProgress){
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x020306);
  const camera=new THREE.PerspectiveCamera(45,innerWidth/innerHeight,1,2000000);
  const sunlight=new THREE.DirectionalLight(0xffffff,3.3);sunlight.position.set(-1,1.1,2);scene.add(sunlight);scene.add(new THREE.AmbientLight(0xa4aec3,.035));
  const starField=stars(1100000,4500,.76);scene.add(starField);
  const loader=new THREE.TextureLoader();
  onProgress('Loading lunar reconnaissance imagery…');
  const [albedo,elevation]=await Promise.all([loader.loadAsync('./assets/moon-color-8k.webp'),loader.loadAsync('./assets/moon-height.jpg')]);
  albedo.colorSpace=THREE.SRGBColorSpace;albedo.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  elevation.anisotropy=albedo.anisotropy;
  const moonMaterial=new THREE.MeshStandardMaterial({map:albedo,bumpMap:elevation,bumpScale:12,roughness:1,color:0xffffff});
  const geo=new THREE.SphereGeometry(MOON_RADIUS,384,192);
  const mapCanvas=document.createElement('canvas');mapCanvas.width=elevation.image.width;mapCanvas.height=elevation.image.height;const c=mapCanvas.getContext('2d',{willReadFrequently:true});c.drawImage(elevation.image,0,0);const pixels=c.getImageData(0,0,mapCanvas.width,mapCanvas.height).data;
  const p=geo.attributes.position,uv=geo.attributes.uv;
  for(let i=0;i<p.count;i++){
    const x=Math.min(mapCanvas.width-1,Math.floor(uv.getX(i)*mapCanvas.width)),y=Math.min(mapCanvas.height-1,Math.floor((1-uv.getY(i))*mapCanvas.height));
    const height=(pixels[(y*mapCanvas.width+x)*4]/255-.5)*16;const scale=(MOON_RADIUS+height)/MOON_RADIUS;p.setXYZ(i,p.getX(i)*scale,p.getY(i)*scale,p.getZ(i)*scale);
  }
  geo.computeVertexNormals();
  const moon=new THREE.Mesh(geo,moonMaterial);moon.rotation.y=-Math.PI/2;scene.add(moon);
  const earth=new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS,64,48),new THREE.MeshStandardMaterial({map:earthTexture(),roughness:.8}));earth.position.set(EARTH_DISTANCE,0,0);scene.add(earth);
  const linePositions=[];
  for(let i=0;i<=360;i++){const a=i/360*Math.PI*2;linePositions.push(EARTH_DISTANCE+Math.cos(a)*EARTH_DISTANCE,0,Math.sin(a)*EARTH_DISTANCE);}
  const orbit=new THREE.Line(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(linePositions,3)),new THREE.LineBasicMaterial({color:0x6d849b,transparent:true,opacity:.13}));scene.add(orbit);
  const marker=new THREE.Mesh(new THREE.SphereGeometry(10,12,8),new THREE.MeshBasicMaterial({color:0x9cdbd5}));marker.position.set(-340,440,Math.sqrt(MOON_RADIUS**2-340**2-440**2)+12);scene.add(marker);
  const target=new THREE.Vector3();
  const state={distance:6500,targetDistance:6500,yaw:0,pitch:.16,target,scene,camera,moon,earth,marker};
  function update(dt){
    state.distance=Math.exp(THREE.MathUtils.lerp(Math.log(state.distance),Math.log(state.targetDistance),1-Math.exp(-dt*6)));
    const system=THREE.MathUtils.smoothstep(state.distance,40000,410000);target.set(EARTH_DISTANCE*.5*system,0,0);
    camera.position.set(target.x+Math.sin(state.yaw)*Math.cos(state.pitch)*state.distance,Math.sin(state.pitch)*state.distance,target.z+Math.cos(state.yaw)*Math.cos(state.pitch)*state.distance);
    camera.lookAt(target);camera.near=Math.max(1,(state.distance-MOON_RADIUS)*.00003);camera.far=state.distance+1800000;camera.updateProjectionMatrix();starField.position.copy(camera.position);
    marker.visible=state.distance<30000;orbit.visible=state.distance>90000;
  }
  function zoom(delta){state.targetDistance=THREE.MathUtils.clamp(state.targetDistance*Math.exp(delta*.0018),MOON_RADIUS+80,900000);}
  function preset(name){state.yaw=0;state.pitch=name==='system'?.20:.16;state.targetDistance=name==='system'?570000:6500;}
  function dispose(){albedo.dispose();elevation.dispose();}
  update(1);
  return {...state,state,update,zoom,preset,dispose};
}
