/* MediaPipe classic is lazy-loaded; the app shell never depends on a CDN. */
(function(){
"use strict";
const S=window.SL,VERSION="0.5.1675469404";
const CDNS=[
 "https://cdn.jsdelivr.net/npm/@mediapipe/pose@"+VERSION+"/",
 "https://unpkg.com/@mediapipe/pose@"+VERSION+"/"
];
let model=null,loading=null,tail=Promise.resolve(),latest=null,baseURL=CDNS[0],failed=false;
function loadScript(url){
 return new Promise((resolve,reject)=>{
  const script=document.createElement("script");script.src=url;script.crossOrigin="anonymous";
  let settled=false;const finish=(ok)=>{if(settled)return;settled=true;clearTimeout(timer);if(ok)resolve();else{script.remove();reject(new Error("模型程式下載失敗："+url));}};
  const timer=setTimeout(()=>finish(false),20000);
  script.onload=()=>finish(true);script.onerror=()=>finish(false);document.head.append(script);
 });
}
async function init(notify=()=>{}){
 if(failed)throw new Error("模型處理曾失敗。請重新整理釋放模型資源，再重試。");
 if(model)return model;if(loading)return loading;
 loading=(async()=>{
  notify("正在載入人體辨識程式；首次使用需要網路。");
  if(!window.Pose){
   let err;
   for(const base of CDNS){try{await loadScript(base+"pose.js");if(window.Pose){baseURL=base;break;}}catch(e){err=e;}}
   if(!window.Pose)throw new Error("兩個模型來源都無法載入。請檢查網路或內容阻擋器；其他紀錄功能仍可用。"+(err?"":""));
  }
  model=new window.Pose({locateFile:file=>baseURL+file});
  model.setOptions({modelComplexity:1,smoothLandmarks:false,enableSegmentation:false,minDetectionConfidence:.55,minTrackingConfidence:.55});
  model.onResults(result=>{latest=result;});
  failed=false;
  notify("正在準備模型；載入完成後會出現骨架。");
  return model;
 })().catch(e=>{model=null;throw e;}).finally(()=>{loading=null;});
 return loading;
}
async function run(image, notify){
 const task=async()=>{
  const p=await init(notify);if(failed)throw new Error("模型處於錯誤狀態，請重新整理後重試。");
  latest=null;
  try{
   let timer;
   try{await Promise.race([p.send({image}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error("模型處理逾時，可能是下載受阻或裝置資源不足。請重新整理後重試。")),90000);})]);}
   finally{clearTimeout(timer);}
   const lm=latest?.poseLandmarks;
   return lm?lm.map(p=>({x:p.x,y:p.y,z:p.z,visibility:p.visibility??0})):null;
  }catch(e){failed=true;throw e;}
 };
 const result=tail.then(task,task);tail=result.catch(()=>{});return result;
}
function valid(p){return p&&S.finite(p.x)&&S.finite(p.y)&&(p.visibility??0)>=.5&&p.x>=-.1&&p.x<=1.1&&p.y>=-.1&&p.y<=1.1;}
function angle(a,b,c,w,h){if(![a,b,c].every(valid))return null;const ux=(a.x-b.x)*w,uy=(a.y-b.y)*h,vx=(c.x-b.x)*w,vy=(c.y-b.y)*h;const den=Math.hypot(ux,uy)*Math.hypot(vx,vy);if(den<1e-6)return null;return Math.acos(S.clamp((ux*vx+uy*vy)/den,-1,1))*180/Math.PI;}
function metrics(lm,w,h,baseline){
 const out={le:null,re:null,lk:null,rk:null,trunk:null,head:null};if(!lm)return out;
 out.le=angle(lm[11],lm[13],lm[15],w,h);out.re=angle(lm[12],lm[14],lm[16],w,h);
 out.lk=angle(lm[23],lm[25],lm[27],w,h);out.rk=angle(lm[24],lm[26],lm[28],w,h);
 if([11,12,23,24].every(i=>valid(lm[i]))){const sx=(lm[11].x+lm[12].x)/2,sy=(lm[11].y+lm[12].y)/2,hx=(lm[23].x+lm[24].x)/2,hy=(lm[23].y+lm[24].y)/2;out.trunk=Math.atan2(Math.abs((sx-hx)*w),(hy-sy)*h)*180/Math.PI;}
 if(valid(lm[0])&&S.finite(baseline))out.head=Math.abs(lm[0].x-baseline)*100;
 return out;
}
const LINKS=[[11,12],[11,13],[13,15],[15,17],[15,19],[12,14],[14,16],[16,18],[16,20],[11,23],[12,24],[23,24],[23,25],[25,27],[27,29],[29,31],[27,31],[24,26],[26,28],[28,30],[30,32],[28,32]];
function fit(video,canvas){
 const rect=canvas.getBoundingClientRect(),w=rect.width,h=rect.height;
 const vw=video.videoWidth||640,vh=video.videoHeight||360,ratio=Math.min(w/vw,h/vh);
 return{x:(w-vw*ratio)/2,y:(h-vh*ratio)/2,w:vw*ratio,h:vh*ratio,canvasW:w,canvasH:h};
}
function setupOverlay(canvas){
 const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
 if(canvas.width!==Math.round(r.width*dpr)||canvas.height!==Math.round(r.height*dpr)){canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);}
 const ctx=canvas.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,r.width,r.height);return ctx;
}
function draw(ctx,lm,box){
 if(!lm)return;const point=p=>({x:box.x+p.x*box.w,y:box.y+p.y*box.h});
 ctx.lineWidth=2;ctx.lineCap="round";
 for(const [a,b] of LINKS){if(!valid(lm[a])||!valid(lm[b]))continue;const x=point(lm[a]),y=point(lm[b]);ctx.strokeStyle=a%2?"#b9ef79":"#80d9cd";ctx.beginPath();ctx.moveTo(x.x,x.y);ctx.lineTo(y.x,y.y);ctx.stroke();}
 for(let i=11;i<33;i++){if(!valid(lm[i]))continue;const p=point(lm[i]);ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fillStyle="#eef8c7";ctx.fill();ctx.lineWidth=1;ctx.strokeStyle="#315546";ctx.stroke();}
 if(valid(lm[0])){const p=point(lm[0]);ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fillStyle="#edf7ce";ctx.fill();}
}
function renderMetrics(container,m={},view="face"){
 const defs=[["le","左手肘","°"],["re","右手肘","°"],["lk","左膝","°"],["rk","右膝","°"],["trunk",view==="face"?"軀幹側傾（投影）":"軀幹前傾（投影）","°"],["head","頭部水平偏移","%畫寬"]];
 container.innerHTML=defs.map(([key,label,u])=>`<div class="pose-metric"><span>${label}</span><strong>${S.finite(m[key])?m[key].toFixed(key==="head"?1:0):"—"}<small>${u}</small></strong></div>`).join("");
}
S.pose={run,init,valid,metrics,angle,fit,setupOverlay,draw,renderMetrics};
})();
