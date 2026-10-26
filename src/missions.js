// Local fieldwork objectives in the fictional SELENE landing area.
export const MISSIONS=[
 {id:'landing-survey',name:'First field sample',x:-9,z:8,radius:9,rocks:1,soil:1,brief:'Travel to the survey circle. Bag one small stone and scoop one soil sample.'},
 {id:'ejecta-survey',name:'Ejecta survey',x:23,z:-26,radius:12,rocks:2,soil:1,brief:'Compare two loose stones and one soil sample from the eastern ejecta field.'},
 {id:'highland-survey',name:'Highland comparison',x:55,z:18,radius:14,rocks:2,soil:2,brief:'Collect two stones and two soil samples from the highland survey circle.'}
];
export const SAMPLE_DEPOT={x:-25,z:45,radius:5,label:'Research station sample depot'};
export function newMissionState(){return {index:0,stage:'available',rocks:[],soil:0,completed:0};}
export function missionAt(state){return MISSIONS[state?.index||0]||null;}
export function inMissionArea(m,p){return !!m&&Math.hypot(p.x-m.x,p.z-m.z)<=m.radius;}
export function recordMissionSample(state,type,p,id){
 const m=missionAt(state);if(state.stage!=='collect'||!inMissionArea(m,p))return;
 if(type==='rock'&&!state.rocks.includes(id))state.rocks.push(id);
 if(type==='soil')state.soil++;
 if(state.rocks.length>=m.rocks&&state.soil>=m.soil)state.stage='return';
}
