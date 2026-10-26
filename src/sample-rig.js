import * as THREE from 'three';
import {smooth} from './dismount.js';
import {SAMPLE_DURATIONS,RELEASE,GRASP,samplePoint} from './sample-world.js';
const v=a=>new THREE.Vector3(...a);
const lerp=(a,b,t)=>v(a).lerp(v(b),smooth(t,0,1));
function curve(keys,t){for(let i=1;i<keys.length;i++)if(t<=keys[i][0])return lerp(keys[i-1][1],keys[i][1],(t-keys[i-1][0])/(keys[i][0]-keys[i-1][0]));return v(keys.at(-1)[1]);}

export function createSampleRig(avatar,makeRock){
  const fabric=new THREE.MeshStandardMaterial({color:0xb3a88e,roughness:1}),rim=new THREE.MeshStandardMaterial({color:0x656968,roughness:.65,metalness:.3}),steel=new THREE.MeshStandardMaterial({color:0xb2b8b9,roughness:.42,metalness:.75}),soil=new THREE.MeshStandardMaterial({color:0x777773,roughness:1});
  const mesh=(parent,g,m,pos)=>{const o=new THREE.Mesh(g,m);o.position.copy(v(pos));o.castShadow=o.receiveShadow=true;parent.add(o);return o;};
  const bag=new THREE.Group();bag.position.set(-.37,.99,-.08);avatar.torso.add(bag);
  mesh(bag,new THREE.SphereGeometry(.15,16,12),fabric,[0,-.13,0]).scale.set(.85,1.35,.75);
  const mouth=mesh(bag,new THREE.TorusGeometry(.105,.013,8,24),rim,[0,.015,0]);mouth.rotation.x=Math.PI/2;mouth.scale.y=.7;
  const opening=mesh(bag,new THREE.CircleGeometry(.092,24),new THREE.MeshStandardMaterial({color:0x292b28,side:THREE.DoubleSide}),[0,.014,0]);opening.rotation.x=-Math.PI/2;
  mesh(bag,new THREE.BoxGeometry(.11,.06,.012),fabric,[0,-.09,-.12]);
  const cargo=new THREE.Group();bag.add(cargo);const cargoMeshes=new Map();
  const soilPouch=new THREE.Group();soilPouch.position.set(.39,.94,-.06);avatar.torso.add(soilPouch);
  mesh(soilPouch,new THREE.SphereGeometry(.115,14,10),fabric,[0,-.07,0]).scale.set(.74,1,.66);
  const soilMouth=mesh(soilPouch,new THREE.TorusGeometry(.078,.011,7,20),rim,[0,.02,0]);soilMouth.rotation.x=Math.PI/2;
  const soilOpening=mesh(soilPouch,new THREE.CircleGeometry(.068,20),new THREE.MeshStandardMaterial({color:0x292b28,side:THREE.DoubleSide}),[0,.02,0]);soilOpening.rotation.x=-Math.PI/2;
  const soilCargo=new THREE.Group();soilPouch.add(soilCargo);for(let i=0;i<9;i++){const s=mesh(soilCargo,new THREE.IcosahedronGeometry(.018+(i%3)*.004,1),soil,[(i%3-.9)*.028,.025+Math.floor(i/3)*.009,-.012]);s.scale.set(1,.66,.8);}
  const pocket=new THREE.Group();pocket.position.set(.32,1.01,.08);avatar.torso.add(pocket);mesh(pocket,new THREE.BoxGeometry(.14,.23,.09),fabric,[0,0,0]);
  const shovel=new THREE.Group(),handle=mesh(shovel,new THREE.CylinderGeometry(.014,.014,.25,12),steel,[0,-.08,0]);
  const blade=mesh(shovel,new THREE.BoxGeometry(.105,.11,.018),steel,[0,-.25,-.025]);blade.rotation.x=-.35;
  for(const s of [-1,1])mesh(shovel,new THREE.BoxGeometry(.012,.1,.045),steel,[s*.052,-.25,-.015]);
  mesh(shovel,new THREE.TorusGeometry(.038,.009,8,16),rim,[0,.07,0]);
  const load=mesh(shovel,new THREE.SphereGeometry(.045,12,8),soil,[0,-.25,-.047]);load.scale.set(1,.8,.25);load.visible=false;
  const glove=new THREE.Group();glove.position.set(0,-.36,-.015);avatar.arms.find(a=>a.side===1).elbow.add(glove);
  const attachment=new THREE.Group();glove.add(attachment);attachment.add(shovel);
  let stone=makeRock(.065,0),stoneKey='';attachment.add(stone);stone.visible=false;
  // Fingers wrap around the sample/tool instead of leaving a rigid open mitten.
  const fingers=[];for(let i=0;i<4;i++){const finger=mesh(glove,new THREE.CapsuleGeometry(.012,.045,4,8),fabric,[-.038+i*.024,-.025,-.045]);fingers.push(finger);}
  const grains=new THREE.Points(new THREE.BufferGeometry(),new THREE.PointsMaterial({color:0xa1a19a,size:.012}));const grainPositions=new Float32Array(24*3);grains.geometry.setAttribute('position',new THREE.BufferAttribute(grainPositions,3));avatar.root.add(grains);grains.visible=false;
  const idle=[.34,1.1,-.32],pocketHand=[.32,1.12,.06],bagHand=[-.37,1.06,-.08],soilHand=[.39,1.13,-.06];
  function update(p,person,time){
    const a=person?.action,t=a?Math.min(1,a.progress):0,held=!!person?.held,active=!!a;
    const specimen=person?.specimen;
    if(specimen&&stoneKey!==specimen.id){stone.removeFromParent();stone=makeRock(specimen.radius,specimen.variant);attachment.add(stone);stoneKey=specimen.id;}
    stone.visible=held;shovel.visible=true;shovel.rotation.set(0,0,0);load.visible=false;grains.visible=false;
    // Pocket shovel is visible when holstered; it travels with the right glove during sampling.
    if(a?.type==='soil'&&t>.12&&t<.94){if(shovel.parent!==attachment)attachment.add(shovel);shovel.position.set(0,0,0);}
    else{if(shovel.parent!==pocket)pocket.add(shovel);shovel.position.set(0,.11,-.02);}
    bag.scale.y=1+(person?.soil||0)*.012+(person?.bag?.length||0)*.008;
    const contents=person?.bagItems||[],ids=new Set(contents.map(r=>r.id));
    for(const [id,o] of cargoMeshes)if(!ids.has(id)){o.removeFromParent();cargoMeshes.delete(id);}
    contents.slice(0,12).forEach((r,i)=>{let o=cargoMeshes.get(r.id);if(!o){o=makeRock(Math.min(.038,r.radius*.55),r.variant);cargoMeshes.set(r.id,o);cargo.add(o);}o.position.set(-.06+(i%4)*.038,.026+Math.floor(i/4)*.014,-.015+(Math.floor(i/4)%2)*.012);o.rotation.set(i*.7,i*1.9,i*.37);});
    const bagOpen=a?.type==='soil'?smooth(t,.55,.65)*(1-smooth(t,.82,.98)):a?.type==='store'||a?.type==='retrieve'?Math.sin(t*Math.PI):0;
    bag.position.set(-.37+bagOpen*.19,.99,-.08-bagOpen*.11);mouth.scale.x=1+bagOpen*.12;
    soilPouch.position.set(.39-bagOpen*.16,.94,-.06);soilMouth.scale.x=1+bagOpen*.18;soilCargo.visible=(person?.soil||0)>0;
    let right=null,left=null,crouch=0,tilt=0,twist=0;
    if(active){
      const localTarget=a.target?avatar.root.worldToLocal(new THREE.Vector3(a.target.x,a.target.y,a.target.z)):v([.25,0,-.65]);
      if(a.type==='pick'){
        crouch=.60*smooth(t,0,.35)*(1-smooth(t,.58,.96));tilt=-1.0*smooth(t,0,.38)*(1-smooth(t,.58,.96));
        right=curve([[0,[.35,.8,-.08]],[.40,localTarget.toArray()],[GRASP,localTarget.toArray()],[.72,[.38,.6,-.5]],[1,idle]],t);
        left=curve([[0,[-.35,.84,-.05]],[.38,[-.35,.46,-.3]],[.60,[-.35,.46,-.3]],[1,[-.35,.84,-.05]]],t);
      }else if(a.type==='soil'){
        crouch=.36*smooth(t,.18,.35)*(1-smooth(t,.5,.67));tilt=-.48*smooth(t,.18,.36)*(1-smooth(t,.5,.68));
        const target=localTarget.clone();target.y+=.31;
        right=curve([[0,[.35,.8,-.08]],[.12,pocketHand],[.22,[.38,1.13,-.26]],[.38,[target.x,target.y,target.z+.1]],[.49,[target.x,target.y,target.z-.08]],[.60,[.3,1.22,-.43]],[.70,[.39,1.13,-.06]],[.80,[.39,1.13,-.06]],[.93,pocketHand],[1,[.35,.8,-.08]]],t);
        left=curve([[0,[-.35,.84,-.05]],[.38,[-.35,.5,-.24]],[.65,[.43,1.08,-.09]],[.84,[.43,1.08,-.09]],[1,[-.35,.84,-.05]]],t);
        load.visible=t>.46&&t<.75;shovel.rotation.z=-smooth(t,.66,.72)*.65*(1-smooth(t,.8,.86));
        if(t>.71&&t<.79){grains.visible=true;for(let i=0;i<24;i++){const age=((t-.71)*SAMPLE_DURATIONS.soil+i*.013)%.36;grainPositions.set([.39+Math.sin(i*7)*.035,1.17-.81*age*age,-.06+Math.cos(i*3)*.025],i*3);}grains.geometry.attributes.position.needsUpdate=true;}
      }else if(a.type==='store'||a.type==='retrieve'){
        right=curve([[0,a.type==='store'?idle:[.35,.8,-.08]],[.5,bagHand],[.74,bagHand],[1,a.type==='retrieve'?idle:[.35,.8,-.08]]],t);
        left=v(a.type==='store'?[-.28,1.02,-.19]:[.46,1.03,-.07]);tilt=-Math.sin(t*Math.PI)*.08;
      }else if(a.type==='throw'){
        right=curve([[0,idle],[.32,[.43,1.77,.30]],[RELEASE,[.34,1.52,-.56]],[.72,[.20,1.25,-.59]],[1,[.35,.8,-.08]]],t);
        left=curve([[0,[-.35,.84,-.05]],[.3,[-.42,1.2,-.33]],[.7,[-.48,1.06,.06]],[1,[-.35,.84,-.05]]],t);
        twist=Math.sin(t*Math.PI*2)*.12;tilt=Math.sin(t*Math.PI*2)*.06;
      }
      const world=point=>point?point.applyMatrix4(avatar.root.matrixWorld):null;
      avatar.samplePose(p,{crouch,tilt,twist,right:world(right),left:world(left)});
    }else if(held){
      // Holding T raises the specimen into the camera's line of throw, matching
      // the live trajectory preview before the throw animation begins.
      const at=samplePoint(p,...(p.aiming?[.34,1.46,-.53]:idle));
      avatar.solveHand(1,new THREE.Vector3(at.x,at.y,at.z));
    }
    if(person?.hit){const age=time-person.hit.time;if(age>=0&&age<1.1){const recoil=Math.sin(Math.min(1,age/.18)*Math.PI/2)*Math.exp(-age*4)*person.hit.strength;avatar.torso.rotation.x+=recoil*.20;avatar.torso.rotation.z+=recoil*.12;avatar.head.rotation.x-=recoil*.14;}}
    avatar.root.updateMatrixWorld(true);
    // Keep held props upright in astronaut space, independent of elbow IK rotation.
    const q=glove.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(avatar.root.getWorldQuaternion(new THREE.Quaternion()));attachment.quaternion.copy(q);
    stone.position.set(0,-.015,-.035);
    for(const f of fingers)f.rotation.x=held||active?-.65:0;
    const rockId=person?.held;
    return {rockId,hand:glove.getWorldPosition(new THREE.Vector3()),active};
  }
  function dispose(){stone.removeFromParent();for(const o of cargoMeshes.values())o.removeFromParent();cargoMeshes.clear();for(const o of [bag,soilPouch,pocket,attachment,glove,grains]){o.traverse(m=>{m.geometry?.dispose();if(m.material)m.material.dispose();});o.removeFromParent();}fabric.dispose();rim.dispose();steel.dispose();soil.dispose();}
  return {update,dispose};
}
