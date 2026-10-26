import {clamp,angleDelta} from './physics.js';
export const DISMOUNT_SECONDS=1.65;
export const smooth=(t,a=0,b=1)=>{const u=clamp((t-a)/(b-a),0,1);return u*u*(3-2*u);};
export function exitPosition(d){const t=smooth(d.progress,.12,.94);return {x:d.from.x+(d.to.x-d.from.x)*t,y:d.from.y+(d.to.y-d.from.y)*t+Math.sin(Math.PI*d.progress)*.17,z:d.from.z+(d.to.z-d.from.z)*t,yaw:d.from.yaw+angleDelta(d.from.yaw,d.to.yaw)*smooth(d.progress,.15,.8)};}
