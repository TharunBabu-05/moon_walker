// Local fieldwork objectives in the fictional SELENE landing area.
export const MISSIONS=[
 {id:'landing-survey',name:'First field sample',x:-9,z:8,radius:9,rocks:1,soil:1,brief:'Travel to the survey circle. Bag one small stone and scoop one soil sample.'},
 {id:'ejecta-survey',name:'Ejecta survey',x:23,z:-26,radius:12,rocks:2,soil:1,brief:'Compare two loose stones and one soil sample from the eastern ejecta field.'},
 {id:'highland-survey',name:'Highland comparison',x:55,z:18,radius:14,rocks:2,soil:2,brief:'Collect two stones and two soil samples from the highland survey circle.'}
];
export const SAMPLE_DEPOT={x:-21,z:44.2,radius:1.3,label:'Sample receiving bench',bench:{x:-21,z:43.25}};
export function newMissionState(){return {index:0,stage:'available',rocks:[],soil:0,completed:0};}
export function missionAt(state){return MISSIONS[state?.index||0]||null;}
export function inMissionArea(m,p){return !!m&&Math.hypot(p.x-m.x,p.z-m.z)<=m.radius;}
export function missionGuidance(state,p,{held=false,nearest=false,busy=false}={}){
 const m=missionAt(state);if(!m)return 'All surveys delivered. Explore freely or join your crew.';
 if(state.stage==='available')return state.index===0?'Start here: accept this assignment. M opens the map; the gold route will guide you.':'Next survey ready: accept the assignment, then follow its gold route. M opens the map.';
 if(busy)return 'Finish the current action before continuing.';
 if(state.stage==='return')return Math.hypot(p.x-SAMPLE_DEPOT.x,p.z-SAMPLE_DEPOT.z)<=SAMPLE_DEPOT.radius?'At the receiving bench. Select Hand over samples to place them in the tray.':'Follow the gold route to the labelled sample receiving bench beside the station ramp.';
 const distance=Math.hypot(p.x-m.x,p.z-m.z);
 if(held)return 'Stone in hand: press B to bag it. Only bagged stones count toward the assignment.';
 if(distance>m.radius)return `${Math.ceil(distance-m.radius)} m to the survey boundary. Follow the gold route into the outlined circle.`;
 if(state.rocks.length<m.rocks)return nearest?'Inside the survey area. F picks up the ringed stone; then B puts it in your bag.':'Inside the survey area. Walk toward a small loose stone until its gold pickup ring appears.';
 return 'Rock sample secured. Stand on clear regolith inside the circle and press G to scoop soil.';
}
export function recordMissionSample(state,type,p,id){
 const m=missionAt(state);if(state.stage!=='collect'||!inMissionArea(m,p))return;
 if(type==='rock'&&!state.rocks.includes(id))state.rocks.push(id);
 if(type==='soil')state.soil++;
 if(state.rocks.length>=m.rocks&&state.soil>=m.soil)state.stage='return';
}
