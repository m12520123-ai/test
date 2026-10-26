/* Video review, manual annotations and explicitly calibrated 2D estimates. */
(function(){
"use strict";
const S=window.SL,$=S.$,P=S.pose;
let v,c,ctx,currentFile=null,url=null,token=0,scanToken=0,scanning=false,tool="none",baseline=null,loaded=false,shotId=null,source="video";
let currentClub="7I",frameBusy=false,frameToken=0,aiPending=false;
let samples=[],marks={ball:[],club:[],scale:[],lines:[],angles:[],target:[],face:[]},phases={},undo=[],pending=[],seekBusy=false,paintRAF=0;
const emptyMarks=()=>({ball:[],club:[],scale:[],lines:[],angles:[],target:[],face:[]});
function status(t,error=false){$("videoStatus").textContent=t;$("videoStatus").className="status-line"+(error?" error":"");}
function info(){return{view:$("videoView").value,slowRatio:S.num($("slowRatio").value)||1,scaleCm:S.num($("scaleCm").value),width:v.videoWidth,height:v.videoHeight,phases:{...phases},marks:JSON.parse(JSON.stringify(marks)),samples:samples.map(s=>({...s})),projected:estimate(),projectedDelivery:deliveryEstimate(),schema:"swinglab.analysis.v2"};}
function controls(){
 const lock=!loaded||scanning;
 ["markNext","finishMarks","undoAnnotation","clearAnnotations","resultSave","exportMarksCSV"].forEach(id=>{if($(id))$(id).disabled=lock;});

 ["analyzeVideo","analyzeClip","stepBack","stepNext","saveVideoShot","exportAnalysis","snapshotVideo","downloadReviewSource"].forEach(id=>$(id).disabled=!loaded||scanning);
 $("videoFile").disabled=scanning;$("videoSeek").disabled=!loaded||scanning;$("cancelAnalysis").hidden=!scanning;
 $("togglePlayback").disabled=!loaded||scanning;
 $("annotationTools").querySelectorAll("button").forEach(b=>b.disabled=lock);
 $("analyzeVideo").disabled=lock||frameBusy||aiPending;$("analyzeClip").disabled=lock||frameBusy||aiPending;
 if($("cancelAnalysis"))$("cancelAnalysis").hidden=!scanning&&!frameBusy;
}
async function load(file,options={}){
 if(!file)return;
 if(!(file instanceof Blob)||file.size===0){status("選到的影片是空檔案。",true);return;}
 cancelScan();const my=++token;v.pause();currentFile=file;loaded=false;shotId=options.shotId||null;source=options.source||"video";currentClub=options.club||S.state.shots.find(s=>s.id===shotId)?.club||"7I";
 samples=[];marks=emptyMarks();phases={};pending=[];undo=[];baseline=null;tool="none";
 $("scaleCm").value="";$("slowRatio").value="1";$("playbackRate").value="1";v.playbackRate=1;
 if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(file);v.src=url;
 $("videoPlaceholder").hidden=true;$("reviewStage").classList.remove("marking");$("videoFile").value="";
 $("annotationTools").querySelectorAll("button").forEach(b=>b.classList.toggle("active",b.dataset.tool==="none"));
 $("analysisProgress").hidden=true;renderPhases();draw();updateEstimate();controls();status("正在讀取影片，與 AI 模型載入分開處理…");v.load();S.emit("review-loaded",meta());
 try{
  await S.waitMetadata(v);if(my!==token)return;
  loaded=true;const analysis=options.analysis;
  if(analysis){
   samples=Array.isArray(analysis.samples)?analysis.samples:[];marks=analysis.marks?{...emptyMarks(),...analysis.marks}:emptyMarks();phases=analysis.phases||{};
   if(["face","dtl"].includes(analysis.view))$("videoView").value=analysis.view;
   $("scaleCm").value=analysis.scaleCm??"";$("slowRatio").value=String(analysis.slowRatio||1);
  }
  $("clipEnd").value=Math.min(5,Number.isFinite(v.duration)?v.duration:5).toFixed(2);$("clipStart").value="0";
  $("videoSeek").max=Number.isFinite(v.duration)?v.duration:1;
  status(`影片已就緒 · ${v.videoWidth} × ${v.videoHeight} · ${Number.isFinite(v.duration)?v.duration.toFixed(2):"未知"} 秒。${samples.length?"已有 "+samples.length+" 筆姿態資料。":""}`);
  controls();renderPhases();draw();updateEstimate();syncTime();S.emit("review-loaded",meta());
 }catch(e){if(my===token){status(e.message,true);controls();S.emit("review-loaded",meta());}}
}
function syncTime(){
 if(!v)return;
 const t=v.currentTime||0;$("videoTime").textContent=`${t.toFixed(2)} / ${Number.isFinite(v.duration)?v.duration.toFixed(2):"—"}`;$("videoSeek").value=t;
 $("togglePlayback").innerHTML=S.icon(v.paused?"play":"pause");
}
function nearestSample(){
 if(!samples.length)return null;let best=null,dist=Infinity;
 for(const s of samples){const d=Math.abs(s.t-v.currentTime);if(d<dist){dist=d;best=s;}}
 return dist<=.22?best:null;
}
function draw(){
 if(!v||!c)return;ctx=P.setupOverlay(c);const box=P.fit(v,c);if(!loaded){P.renderMetrics($("videoMetrics"));return;}
 const sample=nearestSample();if(sample?.lm)P.draw(ctx,sample.lm,box);
 P.renderMetrics($("videoMetrics"),sample?.metrics||{},$("videoView").value);
 const xy=p=>({x:box.x+p.x*box.w,y:box.y+p.y*box.h});
 function poly(points,color,numbered=false){
  if(!points.length)return;const sorted=points.slice().sort((a,b)=>(a.t||0)-(b.t||0));
  ctx.beginPath();sorted.forEach((p,i)=>{const q=xy(p);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y);});ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();
  sorted.forEach((p,i)=>{const q=xy(p);ctx.beginPath();ctx.arc(q.x,q.y,3,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();if(numbered){ctx.font="10px -apple-system";ctx.strokeStyle="#06120f";ctx.lineWidth=3;ctx.strokeText(String(i+1),q.x+6,q.y-6);ctx.fillText(String(i+1),q.x+6,q.y-6);}});
 }
 // Wrist path remains an image-space path; it is not clubhead speed.
 const wrists=samples.filter(s=>s.lm&&P.valid(s.lm[15])&&P.valid(s.lm[16])).map(s=>({x:(s.lm[15].x+s.lm[16].x)/2,y:(s.lm[15].y+s.lm[16].y)/2,t:s.t}));
 if(wrists.length>1){ctx.globalAlpha=.4;poly(wrists,"#8bd9c0");ctx.globalAlpha=1;}
 function arrow(points,color,label){
  if(!Array.isArray(points)||points.length!==2)return;
  poly(points,color);const a=xy(points[0]),b=xy(points[1]),angle=Math.atan2(b.y-a.y,b.x-a.x);
  ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(b.x-10*Math.cos(angle-.45),b.y-10*Math.sin(angle-.45));ctx.lineTo(b.x,b.y);ctx.lineTo(b.x-10*Math.cos(angle+.45),b.y-10*Math.sin(angle+.45));ctx.stroke();ctx.fillStyle=color;ctx.font="11px -apple-system";ctx.fillText(label,b.x+7,b.y-7);
 }
 arrow(marks.target,"#80cbd8","TARGET");arrow(marks.face,"#e8b8ed","FACE / MANUAL");
 poly(marks.ball,"#f4d47b",true);poly(marks.club,"#c8f56a",true);poly(marks.scale,"#86cbd9");
 marks.lines.forEach(a=>poly(a,"#e8cf95"));
 marks.angles.forEach(a=>{poly(a,"#dcb3e5");if(a.length===3){const A={...a[0],visibility:1},B={...a[1],visibility:1},C={...a[2],visibility:1};const n=P.angle(A,B,C,v.videoWidth,v.videoHeight),q=xy(B);ctx.font="12px -apple-system";ctx.fillStyle="#f3dbfa";ctx.fillText(n.toFixed(1)+"°",q.x+10,q.y+18);}});
 if(pending.length)poly(pending,"#e6f8b5",true);
 if(marks.scale.length===2){const p=xy(marks.scale[1]);ctx.fillStyle="#9edeea";ctx.font="11px -apple-system";ctx.fillText(($("scaleCm").value||"?")+" cm",p.x+7,p.y+14);}
}
function saveUndo(){undo.push(JSON.stringify(marks));if(undo.length>40)undo.shift();}
function chooseTool(which){
 if(!loaded){status("\u8acb\u5148\u9078\u64c7\u5f71\u7247\u3002",true);return;}
 if(scanning){status("\u8acb\u5148\u53d6\u6d88 AI \u6383\u63cf\uff0c\u518d\u4f7f\u7528\u6a19\u8a18\u5de5\u5177\u3002",true);return;}
 if(!["none","ball","club","scale","line","angle","target","face"].includes(which))return;
 tool=which;pending=[];if(tool!=="none")v.pause();
 $("annotationTools").querySelectorAll("button").forEach(b=>b.classList.toggle("active",b.dataset.tool===tool));
 $("reviewStage").classList.toggle("marking",tool!=="none");
 const help={
  none:"瀏覽模式：可操作播放器。人體骨架只在有對應分析資料的時間顯示。",
  ball:"球路標記：每個時間點選一次球的位置，再使用時間步距換到下一個畫面。黃線是人工標記軌跡。",
  club:"桿頭標記：點真正的桿頭，不是手腕。在不同時間重複標記，至少兩點才能計算投影速度。",
  scale:"依序點出已知實際長度的兩端，參考物須與桿頭運動在相近深度；再填入下方長度。",
  line:"點兩個位置建立參考線；此線會保留在各個時間點，供動作比較。",
  angle:"依序點三個位置，第二個點是角度頂點。數值為畫面投影角度。",
  target:"\u76ee\u6a19\u65b9\u5411\uff1a\u5148\u9ede\u8d77\u9ede\u3001\u518d\u9ede\u6307\u5411\u76ee\u6a19\u7684\u7d42\u9ede\u3002\u50c5\u8a18\u9304\u756b\u9762\u4e0a\u7684\u53c3\u8003\u65b9\u5411\uff0c\u8acb\u56fa\u5b9a\u93e1\u982d\u3002",
  face:"\u687f\u9762\u671d\u5411\uff1a\u5148\u5b9a\u683c\uff0c\u518d\u7531\u687f\u9762\u4e2d\u5fc3\u9ede\u5411\u4f60\u5224\u8b80\u7684\u6b63\u524d\u65b9\uff08\u4e0d\u662f\u6cbf\u687f\u9762\u908a\u7de3\uff09\u3002\u8f38\u51fa\u50c5\u662f\u5169\u689d\u624b\u756b\u65b9\u5411\u7dda\u7684\u593e\u89d2\uff0c\u975e\u81ea\u52d5\u8fa8\u8b58\u6216\u771f\u5be6 Face Angle\u3002"
 };
 $("toolHelp").textContent=help[tool];v.controls=tool==="none";draw();S.emit("review-changed");
}
function annotate(e){
 if(!loaded||scanning||tool==="none")return;
 e.preventDefault();v.pause();
 if(v.seeking||v.readyState<2){status("\u756b\u9762\u5c1a\u672a\u5b9a\u683c\uff0c\u8acb\u5148\u64ad\u653e\u518d\u66ab\u505c\uff0c\u6216\u7b49\u5f85\u6642\u9593\u8df3\u8f49\u5b8c\u6210\u3002",true);return;}

 const box=P.fit(v,c),r=c.getBoundingClientRect(),x=(e.clientX-r.left-box.x)/box.w,y=(e.clientY-r.top-box.y)/box.h;
 if(x<0||x>1||y<0||y>1)return;
 const p={x,y,t:v.currentTime};
 if(["club","ball"].includes(tool)){
  saveUndo();const arr=marks[tool],at=arr.findIndex(a=>Math.abs(a.t-p.t)<.0005);if(at>=0)arr[at]=p;else arr.push(p);
  arr.sort((a,b)=>a.t-b.t);
 }else{
  if(pending.length&&Math.abs(pending[0].t-p.t)>.001)pending=[];
  pending.push(p);
  const needed=tool==="angle"?3:2;
  if(pending.length===needed){
   saveUndo();
   if(tool==="scale"){const dist=Math.hypot((pending[0].x-pending[1].x)*v.videoWidth,(pending[0].y-pending[1].y)*v.videoHeight);if(dist<3){S.toast("比例點太靠近，請重新設定較長的參考距離。");pending=[];draw();return;}marks.scale=pending.slice();}
   else if(["target","face"].includes(tool))marks[tool]=pending.slice();
   else if(tool==="line")marks.lines.push(pending.slice());else marks.angles.push(pending.slice());
   pending=[];
  }
 }
 draw();updateEstimate();
}
function estimate(){
 const cm=S.num($("scaleCm").value),ratio=S.num($("slowRatio").value)||1;
 if(marks.scale.length!==2||!cm||cm<=0||!v.videoWidth)return null;
 const [a,b]=marks.scale,pixels=Math.hypot((a.x-b.x)*v.videoWidth,(a.y-b.y)*v.videoHeight);
 if(pixels<3)return null;
 const scale=(cm/100)/pixels,points=marks.club.slice().sort((a,b)=>a.t-b.t),segments=[];
 for(let i=1;i<points.length;i++){
  const p=points[i-1],q=points[i],dt=(q.t-p.t)/ratio;if(dt<=.00001)continue;
  const distance=Math.hypot((q.x-p.x)*v.videoWidth,(q.y-p.y)*v.videoHeight)*scale;
  segments.push({start:p.t,end:q.t,mps:distance/dt,metres:distance,seconds:dt});
 }
 if(!segments.length)return null;
 const peak=segments.reduce((a,b)=>a.mps>b.mps?a:b);
 return{label:"calibrated_2d_projected_clubhead_speed_not_radar",maxMps:peak.mps,meanMps:segments.reduce((s,x)=>s+x.metres,0)/segments.reduce((s,x)=>s+x.seconds,0),peakVideoTime:peak.end,segments,metresPerPixel:scale,slowRatio:ratio};
}
function deliveryEstimate(){return S.projection.directionDifference(marks.target,marks.face,v?.videoWidth,v?.videoHeight);}
function meta(){return {loaded,name:currentFile?.name||null,source,club:currentClub,shotId,duration:Number.isFinite(v?.duration)?v.duration:null,width:v?.videoWidth||0,height:v?.videoHeight||0};}
function updateEstimate(){
 const face=deliveryEstimate();
 $("projectedFace").innerHTML=face?`${face.degrees.toFixed(1)}<small>\u00b0</small>`:"\u2014<small>\u00b0</small>";
 $("projectedFaceInfo").textContent=face?`\u5b9a\u683c ${face.frameTime?.toFixed(3)??"\u2014"}s \u00b7 \u76f8\u5c0d\u76ee\u6a19\u65b9\u5411\uff0c\u756b\u9762\u9006\u6642\u91dd\u70ba\u6b63\u3002\u50c5\u6bd4\u8f03\u624b\u756b\u65b9\u5411\uff0c\u4e0d\u5224\u5b9a\u771f\u5be6\u687f\u9762\u958b\u9589\u3002`:"\u5404\u9ede\u5169\u9ede\u8a2d\u5b9a\u76ee\u6a19\u65b9\u5411\u548c\u687f\u9762\u671d\u5411\u7bad\u982d\u3002\u4e0d\u7b49\u65bc\u771f\u5be6\u687f\u9762\u958b\u9589\u89d2\u3002";
 S.emit("review-changed");
 const est=estimate();
 $("projectedSpeed").innerHTML=est?`${(est.maxMps*3.6).toFixed(1)}<small> km/h</small>`:"—<small> km/h</small>";
 $("projectedInfo").textContent=est?`最大區間平均值；全段平均 ${(est.meanMps*3.6).toFixed(1)} km/h。${est.segments.length} 個有效時段。${est.maxMps>100?"數值偏高，請核對比例、時點與慢動作倍率。":"僅為標記點的 2D 投影速度，不是擊球瞬間真實桿速。"}`
 :"先用「設定比例」點兩端，再於不同時間標記桿頭。未校正時不產生速度數字。";
}
async function step(dir){
 if(!loaded||scanning||seekBusy)return;
 seekBusy=true;v.pause();
 try{await S.seek(v,v.currentTime+dir/(S.num($("stepFPS").value)||30));draw();syncTime();}
 catch(e){status(e.message,true);}finally{seekBusy=false;}
}
async function runFrozen(notify){
 if(v.readyState<2||v.seeking)throw new Error("\u756b\u9762\u5c1a\u672a\u5c31\u7dd2\uff0c\u8acb\u5148\u9ede\u64ad\u653e\u518d\u66ab\u505c\u3002");
 const image=document.createElement("canvas");image.width=v.videoWidth;image.height=v.videoHeight;
 image.getContext("2d").drawImage(v,0,0);aiPending=true;controls();
 try{return await P.run(image,notify);}finally{aiPending=false;controls();}
}
async function analyzeFrame(){
 if(!loaded||scanning||frameBusy||aiPending)return;
 v.pause();const my=token,ft=++frameToken,t=v.currentTime;frameBusy=true;controls();
 try{
  const lm=await runFrozen(msg=>{if(ft===frameToken)status(msg);});if(my!==token||ft!==frameToken)return;
  if(lm&&baseline===null&&P.valid(lm[0]))baseline=lm[0].x;
  const metric=P.metrics(lm,v.videoWidth,v.videoHeight,baseline),sample={t,lm,metrics:metric};
  samples=samples.filter(a=>Math.abs(a.t-t)>.001);samples.push(sample);samples.sort((a,b)=>a.t-b.t);
  status(lm?"這個畫面已分析。數值是 2D 投影角度。":"這個畫面未偵測到足夠的人體關鍵點，不保留前一幀數值。");
  draw();
 }catch(e){if(ft===frameToken)status(e.message,true);}finally{frameBusy=false;controls();S.emit("review-changed");}
}
async function scan(){
 if(!loaded||scanning||frameBusy||aiPending)return;
 const start=S.num($("clipStart").value),end=S.num($("clipEnd").value),fps=S.num($("sampleFPS").value)||15;
 if(start===null||end===null||start<0||end<=start||!Number.isFinite(v.duration)||end>v.duration+.01){status("請輸入影片範圍內有效的起點與終點。",true);return;}
 const count=Math.ceil((end-start)*fps);
 if(count>900){status("本次最多分析 900 個時間點，請縮短區段或降低取樣頻率。",true);return;}
 v.pause();const original=v.currentTime,my=++scanToken,fileToken=token;
 chooseTool("none");scanning=true;samples=[];baseline=null;controls();$("analysisProgress").hidden=false;$("analysisProgress").value=0;
 let completed=0;
 try{
  for(let i=0;i<count;i++){
   if(my!==scanToken||fileToken!==token)break;
   const t=Math.min(start+i/fps,v.duration-.001);await S.seek(v,t);
   if(my!==scanToken||fileToken!==token)break;
   const lm=await runFrozen(msg=>{if(my===scanToken)status(msg);});
   if(my!==scanToken||fileToken!==token)break;
   if(lm&&baseline===null&&P.valid(lm[0]))baseline=lm[0].x;
   samples.push({t:v.currentTime,lm,metrics:P.metrics(lm,v.videoWidth,v.videoHeight,baseline)});completed++;
   $("analysisProgress").value=completed/count;
   status(`分析 ${completed} / ${count} 個時間點 · ${samples.filter(s=>s.lm).length} 個畫面有人體資料。`);
   draw();syncTime();await S.delay(0);
  }
  if(my===scanToken){status(`區段完成：${completed} 個時間點，${samples.filter(s=>s.lm).length} 個畫面取得人體姿態。取樣頻率不等同原始拍攝 FPS。`);}
  else status(`已取消，保留 ${completed} 個已完成的時間點。`);
 }catch(e){status("分析已停止："+e.message,true);}
 finally{
  scanning=false;controls();S.emit("review-changed");
  if(my===scanToken&&fileToken===token&&loaded){try{await S.seek(v,original);}catch(_){}draw();syncTime();}
 }
}
function cancelScan(){scanToken++;frameToken++;scanning=false;if($("cancelAnalysis"))controls();S.emit("review-changed");}
function renderPhases(){
 S.emit("review-phases");
 document.querySelectorAll("[data-phase]").forEach(b=>{const p=b.dataset.phase,bVal=phases[p];b.classList.toggle("set",S.finite(bVal));$("phase-"+p).textContent=S.finite(bVal)?bVal.toFixed(3)+" 秒":"設為目前時間";});
 const {address:a,top:b,impact:c,finish:d}=phases,r=S.num($("slowRatio").value)||1;
 if([a,b,c].every(S.finite)){
  if(!(a<b&&b<c)||(S.finite(d)&&d<c)){$("tempoInfo").textContent="時點順序不正確：預備位 < 頂點 < 擊球，收桿不能早於擊球。";return;}
  $("tempoInfo").innerHTML=`上桿 <strong>${((b-a)/r).toFixed(2)}s</strong>　下桿 <strong>${((c-b)/r).toFixed(2)}s</strong>　節奏 <strong>${((b-a)/(c-b)).toFixed(2)} : 1</strong><br><small>依人工標記時點與慢動作倍率計算；不是自動偵測擊球。</small>`;
 }else $("tempoInfo").textContent="先標記預備位、頂點、擊球時點，再計算上桿／下桿時間比。";
}
async function save(){
 if(!loaded||!currentFile)return;
 const button=$("saveVideoShot");button.disabled=true;
 try{
  const existing=S.state.shots.find(s=>s.id===shotId);
  const shot=existing?{...existing}:S.createShot({source,club:currentClub,notes:"手機影片姿態／人工標記分析"});
  const analysis=info();shot.mediaId=shot.id;shot.analysisSummary={sampleCount:samples.filter(s=>s.lm).length,view:analysis.view,projectedMaxMps:analysis.projected?.maxMps??null,manualFaceDirectionDeg:analysis.projectedDelivery?.degrees??null,phases:{...phases}};
  await S.media.put({id:shot.id,blob:currentFile,analysis});
  if(!S.saveShot(shot))throw new Error("數據寫入失敗；請匯出分析 JSON 和原始影片保留。");
  shotId=shot.id;S.emit("review-changed");status("影片與分析已儲存，可從紀錄重新開啟。");S.toast("影片與分析已儲存。");
 }catch(e){S.toast("未完成儲存："+e.message);}finally{controls();}
}
async function snapshot(){
 if(!loaded)return;
 const out=document.createElement("canvas");out.width=v.videoWidth;out.height=v.videoHeight;const oc=out.getContext("2d");oc.drawImage(v,0,0,out.width,out.height);
 draw();const box=P.fit(v,c),dpr=c.width/box.canvasW;
 oc.drawImage(c,box.x*dpr,box.y*dpr,box.w*dpr,box.h*dpr,0,0,out.width,out.height);
 const font=Math.max(16,out.width/45);oc.fillStyle="#07140fbd";oc.fillRect(0,0,out.width,font*3.8);oc.fillStyle="#d8f5a4";oc.font=`${font}px sans-serif`;oc.fillText("SWINGLAB / 2D VIDEO REVIEW",font,font*1.5);oc.fillStyle="#e0ece6";oc.font=`${font*.7}px sans-serif`;oc.fillText(`t=${v.currentTime.toFixed(3)}s  |  Manual marks / image estimates, not radar`,font,font*2.7);
 out.toBlob(blob=>{if(blob)S.download(blob,"swinglab-review-"+Date.now()+".png");else S.toast("截圖匯出失敗。");},"image/png");
}
function playbackDraw(){cancelAnimationFrame(paintRAF);if(!v.paused&&(S.state.route==="video"||(S.state.route==="flight"&&S.flight?.mode()==="video"))){draw();syncTime();paintRAF=requestAnimationFrame(playbackDraw);}}
function init(){
 v=$("reviewVideo");c=$("reviewOverlay");
 P.renderMetrics($("videoMetrics"));
 $("videoFile").addEventListener("change",e=>{const f=e.target.files?.[0];if(f)load(f);});
 $("analyzeVideo").onclick=analyzeFrame;$("analyzeClip").onclick=scan;$("cancelAnalysis").onclick=()=>{cancelScan();status("已取消掃描，標記、播放與匯出已解鎖。AI 請求若仍在處理，會在結束後才能再按分析。");};
 $("stepBack").onclick=()=>step(-1);$("stepNext").onclick=()=>step(1);
 $("togglePlayback").onclick=async()=>{if(!loaded)return;if(tool!=="none")chooseTool("none");if(v.paused){try{await v.play();}catch(e){status("播放失敗："+e.message,true);}}else v.pause();};
 $("videoSeek").addEventListener("input",()=>{if(loaded&&!scanning){v.pause();v.currentTime=Number($("videoSeek").value);}});
 $("playbackRate").onchange=()=>v.playbackRate=Number($("playbackRate").value);
 v.addEventListener("timeupdate",()=>{syncTime();if(v.paused)draw();});v.addEventListener("seeked",()=>{syncTime();draw();});
 v.addEventListener("play",playbackDraw);v.addEventListener("pause",()=>{cancelAnimationFrame(paintRAF);syncTime();draw();});
 v.addEventListener("error",()=>{status("影片解碼失敗。請改用瀏覽器可播放的格式；副檔名不代表編碼。",true);});
 $("annotationTools").addEventListener("click",e=>{const b=e.target.closest("[data-tool]");if(b&&!b.disabled)chooseTool(b.dataset.tool);});
 c.addEventListener("pointerdown",annotate);
 $("undoAnnotation").onclick=()=>{if(pending.length)pending.pop();else if(undo.length)marks=JSON.parse(undo.pop());draw();updateEstimate();};
 $("clearAnnotations").onclick=()=>{if(!confirm("清除這支影片的球路、桿頭與幾何標記？"))return;saveUndo();marks=emptyMarks();pending=[];draw();updateEstimate();};
 ["scaleCm","slowRatio"].forEach(id=>$(id).addEventListener(id==="scaleCm"?"input":"change",()=>{updateEstimate();renderPhases();draw();}));
 document.querySelectorAll("[data-phase]").forEach(b=>b.addEventListener("click",()=>{if(!loaded){S.toast("請先載入影片。");return;}v.pause();phases[b.dataset.phase]=v.currentTime;renderPhases();}));
 $("clearPhases").onclick=()=>{phases={};renderPhases();};
 $("saveVideoShot").onclick=save;$("snapshotVideo").onclick=snapshot;
 $("downloadReviewSource").onclick=()=>{if(currentFile)S.download(currentFile,"swinglab-source-"+Date.now()+(currentFile.type.includes("quicktime")?".mov":currentFile.type.includes("mp4")?".mp4":".webm"));};
 $("exportAnalysis").onclick=()=>S.download(new Blob([JSON.stringify(info(),null,2)],{type:"application/json"}),"swinglab-analysis-"+Date.now()+".json");
 $("videoView").onchange=draw;
 ["loadedmetadata","loadeddata","canplay","durationchange"].forEach(ev=>v.addEventListener(ev,()=>{
 if(currentFile&&v.readyState>=1&&v.videoWidth>0){if(!loaded){loaded=true;$("videoPlaceholder").hidden=true;controls();S.emit("review-loaded",meta());}if(Number.isFinite(v.duration))$("videoSeek").max=v.duration;syncTime();draw();S.emit("review-changed");}
 }));
 new ResizeObserver(()=>draw()).observe($("reviewStage"));controls();
}
function removeMark(kind,index){
 if(!["ball","club"].includes(kind)||!Number.isInteger(index)||!marks[kind][index]||scanning)return;
 saveUndo();marks[kind].splice(index,1);draw();updateEstimate();
}
async function gotoTime(t){if(!loaded||scanning)return;v.pause();try{await S.seek(v,t);syncTime();draw();}catch(e){status(e.message,true);}}
function getState(){return {tool,pending:pending.length,scanning,frameBusy,aiPending,time:v?.currentTime||0,decoded:(v?.readyState||0)>=2,scaleCount:marks.scale.length,clubCount:marks.club.length,ballCount:marks.ball.length,targetCount:marks.target.length,faceCount:marks.face.length};}
S.review={init,load,save,draw,cancelScan,step,gotoTime,removeMark,getState,analyzeFrame,scan,pause:()=>{if(v)v.pause();cancelScan();},getInfo:info,getMeta:meta,chooseTool,isScanning:()=>scanning};
})();
