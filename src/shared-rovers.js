// Seat reservations are serialized by the expedition host. Only the assigned
// driver can publish motion; a passenger never simulates a second vehicle.
export class SharedRovers {
  constructor(groundAt=null){this.groundAt=groundAt;this.vehicles=new Map();this.version=0;}
  reset(){this.vehicles.clear();this.version++;}
  seat(id){for(const v of this.vehicles.values()){if(v.driver===id)return {vehicle:v.id,role:'driver'};if(v.passenger===id)return {vehicle:v.id,role:'passenger'};}return null;}
  sync(entries){
    const ids=new Set(entries.map(e=>e.id));
    for(const e of entries)if(!this.vehicles.has(e.id)&&e.state.rover)this.vehicles.set(e.id,{id:e.id,driver:null,passenger:null,exiting:null,initialized:e.state.vehicleId===e.id,state:{...e.state.rover}});
    for(const v of this.vehicles.values()){
      const owner=entries.find(e=>e.id===v.id);if(!v.initialized&&owner?.state.rover&&!v.driver&&!v.passenger){v.state={...owner.state.rover};v.initialized=owner.state.vehicleId===v.id;}
      if(v.driver&&!ids.has(v.driver)){v.driver=null;Object.assign(v.state,{vx:0,vz:0,vy:0,speed:0});if(this.groundAt){v.state.y=this.groundAt(v.state.x,v.state.z);v.state.grounded=true;}v.exiting=null;}
      if(v.passenger&&!ids.has(v.passenger)){v.passenger=null;v.exiting=null;}
      const driver=entries.find(e=>e.id===v.driver);
      if(driver?.state.vehicleId===v.id&&driver.state.seat==='driver'&&driver.state.rover&&!v.exiting)v.state={...driver.state.rover};
      if(!ids.has(v.id)&&!v.driver&&!v.passenger)this.vehicles.delete(v.id);
    }
    this.version++;
  }
  request(id,request,person){
    const current=this.seat(id);
    if(request.type==='board'){
      if(current)return 'You already have a seat.';
      const v=this.vehicles.get(request.vehicle);
      if(!v||!person||person.arena||Math.hypot(person.x-v.state.x,person.z-v.state.z)>4.2||Math.abs(person.y-v.state.y)>3)return 'Walk beside a buggy to board.';
      if(v.state.speed>.7||!v.state.grounded||v.exiting)return 'Wait for the buggy to stop.';
      if(!v.driver)v.driver=id;else if(!v.passenger)v.passenger=id;else return 'Both seats are occupied.';
    }else if(current){
      const v=this.vehicles.get(current.vehicle);
      if(request.type==='exit'){
        if(v.state.speed>.7||!v.state.grounded)return 'Wait for the buggy to stop and land.';
        if(v.exiting&&v.exiting!==id)return 'Wait for your crewmate to finish stepping down.';
        v.exiting=id;Object.assign(v.state,{vx:0,vz:0,vy:0,speed:0});
      }else if(request.type==='leave'&&v.exiting===id){v[current.role]=null;v.exiting=null;}
      else return 'Unknown seat request.';
    }
    this.version++;
  }
  snapshot(){return {version:this.version,vehicles:[...this.vehicles.values()].map(v=>({...v,state:{...v.state}}))};}
}
