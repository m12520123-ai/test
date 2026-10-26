/* Pure, testable v2.4 motion and projection helpers. These are heuristics, not trained impact detection. */
(function(root){
'use strict';
const finite=Number.isFinite, clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function handFeature(s){
 const l=s.lm,w=s.width,h=s.height;if(!l||!w||!h)return null;
 const ok=i=>l[i]&&finite(l[i].x)&&finite(l[i].y)&&(l[i].visibility??0)>=.6;
 if(![11,12,15,16,23,24].every(ok))return null;
 const mid=(a,b)=>({x:(l[a].x+l[b].x)*w/2,y:(l[a].y+l[b].y)*h/2});
 const shoulder=mid(11,12),hip=mid(23,24),hand=mid(15,16);
 const size=Math.hypot(hip.x-shoulder.x,hip.y-shoulder.y);
 if(size<h*.07)return null;
 return {t:s.t,x:(hand.x-hip.x)/size,y:(hand.y-hip.y)/size,ready:hand.y>shoulder.y+size*.45};
}
class SwingDetector{
 constructor(){this.reset();}
 reset(){this.state='waiting';this.previous=null;this.stableSince=null;this.baseline=null;this.motion=null;this.quiet=null;this.cooldown=0;}
 feed(s){
  const p=handFeature(s);let event=null;
  if(!p){if(this.previous&&s.t-this.previous.t>.75){if(this.motion)event={type:'rejected',reason:'tracking-lost'};this.reset();}return {state:this.state,event};}
  if(this.previous&&p.t<=this.previous.t)return {state:this.state,event};
  const last=this.previous,dt=last?p.t-last.t:0;
  const speed=last&&dt>0&&dt<.65?Math.hypot(p.x-last.x,p.y-last.y)/dt:0;
  this.previous=p;
  if(dt>.65){this.state='waiting';this.motion=null;this.stableSince=null;return {state:this.state,event:{type:'rejected',reason:'sampling-gap'}};}
  if(p.t<this.cooldown){this.state='cooldown';return {state:this.state,event};}
  if(this.state==='cooldown')this.state='waiting';
  if(this.state==='waiting'){
   if(p.ready&&speed<.45){if(this.stableSince===null)this.stableSince=p.t;if(p.t-this.stableSince>=.6){this.baseline={...p};this.state='ready';}}
   else this.stableSince=null;
  }else if(this.state==='ready'){
   const d=Math.hypot(p.x-this.baseline.x,p.y-this.baseline.y);
   if(speed>.65&&d>.1){this.motion={start:last?.t??p.t,peak:speed,peakTime:p.t,excursion:d,rise:this.baseline.y-p.y,count:1};this.state='swing';event={type:'start',t:this.motion.start};}
   else if(speed<.3)this.baseline={...p};
  }else if(this.state==='swing'){
   const m=this.motion;m.count++;m.excursion=Math.max(m.excursion,Math.hypot(p.x-this.baseline.x,p.y-this.baseline.y));m.rise=Math.max(m.rise,this.baseline.y-p.y);
   if(speed>m.peak){m.peak=speed;m.peakTime=p.t;}
   if(speed<.5){if(this.quiet===null)this.quiet=p.t;}else this.quiet=null;
   const elapsed=p.t-m.start,settled=this.quiet!==null&&p.t-this.quiet>=.7;
   if(elapsed>=1.1&&(settled||elapsed>8)){
    const accepted=m.peak>=1.4&&m.excursion>=.5&&m.rise>=.2&&m.count>=6&&elapsed<=8.5;
    event=accepted?{type:'swing',start:m.start,end:p.t,peakTime:m.peakTime,peakNormalizedSpeed:m.peak,excursion:m.excursion,verification:'unconfirmed-swing'}:{type:'rejected',reason:'insufficient-pattern'};
    this.motion=null;this.state='cooldown';this.cooldown=p.t+1.1;this.stableSince=null;this.quiet=null;
   }
  }
  return {state:this.state,event,speed};
 }
}
function splitSwings(samples,w,h,ratio=1){
 const d=new SwingDetector(),events=[];
 for(const s of samples){const out=d.feed({...s,t:s.t/ratio,width:w,height:h});if(out.event?.type==='swing'){const e=out.event;events.push({...e,start:e.start*ratio,end:e.end*ratio,peakTime:e.peakTime*ratio});}}
 return events;
}
function regression(points,key){
 const n=points.length,mt=points.reduce((a,p)=>a+p.t,0)/n,my=points.reduce((a,p)=>a+p[key],0)/n;
 let xx=0,xy=0,yy=0;for(const p of points){xx+=(p.t-mt)**2;xy+=(p.t-mt)*(p[key]-my);yy+=(p[key]-my)**2;}
 if(xx<1e-12)throw new Error('NO_TIME_BASE');const slope=xy/xx,intercept=my-slope*mt;
 const residual=points.reduce((a,p)=>a+(p[key]-intercept-slope*p.t)**2,0);
 return {slope,intercept,rms:Math.sqrt(residual/n),r2:yy>1e-12?clamp(1-residual/yy,0,1):1};
}
function estimateLaunch(points,config){
 const fail=(code,detail)=>({ok:false,code,detail});
 const {width:w,height:h,reference:ref,lengthCm,slowRatio=1,confirmed=false,sideOn=false,timeChecked=false}=config;
 if(!confirmed)return fail('CONFIRM_BALL');
 if(!sideOn||!timeChecked)return fail('CHECK_GEOMETRY_TIME');
 if(!w||!h||!ref||ref.length!==2||!(lengthCm>=10&&lengthCm<=1000))return fail('CALIBRATION');
 if(!(slowRatio>=1&&slowRatio<=16))return fail('TIME_RATIO');
 const ax=(ref[1].x-ref[0].x)*w,ay=(ref[1].y-ref[0].y)*h,len=Math.hypot(ax,ay);
 if(len<30||ax<=0||Math.abs(Math.atan2(ay,ax)*180/Math.PI)>25)return fail('REFERENCE_DIRECTION');
 const ux=ax/len,uy=ay/len,mpp=lengthCm/100/len;
 let a=points.filter(p=>[p.x,p.y,p.t].every(finite)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1).slice().sort((a,b)=>a.t-b.t);
 a=a.filter((p,i)=>!i||p.t-a[i-1].t>1e-5);
 if(a.length<4)return fail('TOO_FEW_POINTS');
 const t0=a[0].t,x0=a[0].x*w,y0=a[0].y*h;
 a=a.filter(p=>(p.t-t0)/slowRatio<=.12);
 if(a.length<4)return fail('NOT_HIGH_SPEED');
 const rows=a.map(p=>{const dx=p.x*w-x0,dy=p.y*h-y0,t=(p.t-t0)/slowRatio;return {t,x:(dx*ux+dy*uy)*mpp,y:(dx*uy-dy*ux)*mpp+.5*9.80665*t*t};});
 const span=rows.at(-1).t;if(span<.006)return fail('TIME_SPAN');
 const fx=regression(rows,'x'),fy=regression(rows,'y'),speed=Math.hypot(fx.slope,fy.slope),angle=Math.atan2(fy.slope,Math.abs(fx.slope))*180/Math.PI;
 const chord=Math.hypot((a.at(-1).x-a[0].x)*w,(a.at(-1).y-a[0].y)*h);
 const rmsPx=Math.hypot(fx.rms,fy.rms)/mpp;
 if(chord<25||rmsPx>Math.max(3,chord*.04)||fx.r2<.97)return fail('UNSTABLE_TRACK',{rmsPx,chord,r2:fx.r2});
 if(speed<2||speed>110||angle<0||angle>70)return fail('IMPLAUSIBLE_MOTION');
 let same=0;for(let i=1;i<rows.length;i++)if((rows[i].x-rows[i-1].x)*fx.slope>0)same++;
 if(same/(rows.length-1)<.85)return fail('UNSTABLE_TRACK');
 return {ok:true,speedMps:speed,launchDeg:angle,vx:Math.abs(fx.slope),vy:fy.slope,spanSeconds:span,pointsUsed:a.length,metersPerPixel:mpp,residualPixels:rmsPx,firstVideoTime:t0,source:'calibrated-2d-initial-flight-estimate',notMeasured:['spin','clubSpeed','faceAngle','carry','launchDirection'],geometry:'side-on constant-depth, no lens distortion correction',slowRatio};
}
/* RK4: gravity + quadratic drag, optional no-drag comparison. No spin/lift/wind/roll model. */
function simulate(speed,angle,{cd=.25,rho=1.225,mass=.04593,diameter=.04267,height=0}={}){
 if(!finite(speed)||speed<=0||!finite(angle)||angle<=0||angle>=90||cd<0||rho<0||mass<=0||diameter<=0)return null;
 const r=angle*Math.PI/180,k=.5*rho*cd*Math.PI*(diameter/2)**2/mass,g=9.80665,dt=.005;
 let s=[0,height,speed*Math.cos(r),speed*Math.sin(r)],t=0;const path=[{x:0,y:0,z:height,t:0}];let apex=height;
 const d=a=>{const v=Math.hypot(a[2],a[3]);return[a[2],a[3],-k*v*a[2],-g-k*v*a[3]];};
 const add=(a,b,f)=>a.map((v,i)=>v+b[i]*f);
 for(let n=0;n<8000;n++){
  const prev=s,pt=t,k1=d(s),k2=d(add(s,k1,dt/2)),k3=d(add(s,k2,dt/2)),k4=d(add(s,k3,dt));
  s=s.map((v,i)=>v+dt*(k1[i]+2*k2[i]+2*k3[i]+k4[i])/6);t+=dt;apex=Math.max(apex,s[1]);
  if(s[1]<=0){const f=prev[1]/(prev[1]-s[1]);const x=prev[0]+f*(s[0]-prev[0]);t=pt+f*dt;path.push({x,y:0,z:0,t});return {rangeM:x,apexM:apex,timeS:t,path,assumptions:{cd,rho,mass,diameter,height,spin:'not-measured; lift omitted',lateral:'assumed zero, not measured',wind:'omitted',roll:'omitted'}};}
  if(n%8===0)path.push({x:s[0],y:0,z:s[1],t});
 }
 return null;
}
const api={handFeature,SwingDetector,splitSwings,estimateLaunch,simulate};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SL.motion=api;
})(typeof window!=='undefined'?window:globalThis);
