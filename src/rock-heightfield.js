// Rasterize model triangles once during loading, not with hundreds of raycasts
// during every physics tick. A 257² height field is shared by all instances.
export function buildRockHeightfield(geometries,size=257){
  const values=new Float32Array(size*size);values.fill(-Infinity);const scale=(size-1)/2;
  for(const geo of geometries){const p=geo.attributes.position,index=geo.index,count=index?index.count:p.count;
    for(let i=0;i<count;i+=3){
      const a=index?index.getX(i):i,b=index?index.getX(i+1):i+1,c=index?index.getX(i+2):i+2;
      const ax=p.getX(a),az=p.getZ(a),bx=p.getX(b),bz=p.getZ(b),cx=p.getX(c),cz=p.getZ(c),den=(bz-cz)*(ax-cx)+(cx-bx)*(az-cz);
      if(Math.abs(den)<1e-10)continue;
      const x0=Math.max(0,Math.ceil((Math.min(ax,bx,cx)+1)*scale)),x1=Math.min(size-1,Math.floor((Math.max(ax,bx,cx)+1)*scale));
      const z0=Math.max(0,Math.ceil((Math.min(az,bz,cz)+1)*scale)),z1=Math.min(size-1,Math.floor((Math.max(az,bz,cz)+1)*scale));
      for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++){
        const wx=x/scale-1,wz=z/scale-1,u=((bz-cz)*(wx-cx)+(cx-bx)*(wz-cz))/den,v=((cz-az)*(wx-cx)+(ax-cx)*(wz-cz))/den,w=1-u-v;
        if(u< -1e-6||v< -1e-6||w< -1e-6)continue;const y=u*p.getY(a)+v*p.getY(b)+w*p.getY(c),j=z*size+x;if(y>values[j])values[j]=y;
      }
    }
  }
  return {values,size};
}
export function sampleRockHeightfield(field,r,x,z){
  const dx=(x-r.x)/r.radius,dz=(z-r.z)/r.radius,c=Math.cos(r.yaw),s=Math.sin(r.yaw),u=(c*dx-s*dz+1)*(field.size-1)/2,v=(s*dx+c*dz+1)*(field.size-1)/2;
  if(u<0||v<0||u>=field.size-1||v>=field.size-1)return -Infinity;
  const ix=Math.floor(u),iz=Math.floor(v),fx=u-ix,fz=v-iz,i=iz*field.size+ix,a=field.values[i],b=field.values[i+1],cc=field.values[i+field.size],d=field.values[i+field.size+1];
  const top=Number.isFinite(a+b+cc+d)?a*(1-fx)*(1-fz)+b*fx*(1-fz)+cc*(1-fx)*fz+d*fx*fz:Math.max(a,b,cc,d);
  return r.bottom+top*r.radius;
}
