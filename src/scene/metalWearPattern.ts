/** Deterministic, tileable data masks: scratches, cloudy scuffs, and tiny pits. */
export const METAL_WEAR_SIZE=1024;
export function createMetalWearPixels(){
 const size=METAL_WEAR_SIZE,bytes=new Uint8Array(size*size*4);
 let seed=0x5c4a7c;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const smooth=(value:number)=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};
 function mark(x:number,y:number,channel:number,value:number){
  const index=(((y%size+size)%size)*size+(x%size+size)%size)*4+channel;
  bytes[index]=Math.max(bytes[index],Math.round(Math.min(1,value)*255));
 }
 function spot(cx:number,cy:number,rx:number,ry:number,strength:number,channel:number){
  for(let y=Math.floor(cy-ry);y<=Math.ceil(cy+ry);y++)for(let x=Math.floor(cx-rx);x<=Math.ceil(cx+rx);x++){
   const radius=Math.hypot((x+.5-cx)/rx,(y+.5-cy)/ry);
   if(radius<1)mark(x,y,channel,(1-smooth(radius))*strength);
  }
 }
 for(let i=0;i<110;i++)spot(random()*size,random()*size,12+random()*100,8+random()*70,.12+random()*.7,1);
 for(let cluster=0;cluster<95;cluster++){
  const cx=random()*size,cy=random()*size,angle=random()*Math.PI;
  const count=1+Math.floor(random()*4);
  for(let i=0;i<count;i++){
   const a=angle+(random()-.5)*.65,len=12+Math.pow(random(),2)*190;
   const x0=cx+(random()-.5)*65,y0=cy+(random()-.5)*65;
   const dx=Math.cos(a)*len,dy=Math.sin(a)*len,width=.45+random()*.8,strength=.35+random()*.65;
   const phase=random()*20;
   for(let y=Math.floor(Math.min(y0,y0+dy)-2);y<=Math.ceil(Math.max(y0,y0+dy)+2);y++)for(let x=Math.floor(Math.min(x0,x0+dx)-2);x<=Math.ceil(Math.max(x0,x0+dx)+2);x++){
    const t=Math.max(0,Math.min(1,((x+.5-x0)*dx+(y+.5-y0)*dy)/(len*len)));
    const distance=Math.hypot(x+.5-x0-dx*t,y+.5-y0-dy*t);
    const tips=smooth(t/.1)*smooth((1-t)/.16);
    const broken=.55+.45*smooth((Math.sin(t*25+phase)+.3)/1.3);
    mark(x,y,0,(1-smooth((distance-width*.25)/(width+.65)))*tips*broken*strength);
   }
  }
 }
 for(let i=0;i<2200;i++){
  const radius=.6+random()*1.6;
  spot(random()*size,random()*size,radius,radius,.2+random()*.65,2);
 }
 for(let i=3;i<bytes.length;i+=4)bytes[i]=255;
 return bytes;
}
