/* Camera and recording lifecycle. Original video + timestamped 2D analysis are kept separate. */
(function(){
"use strict";
const S=window.SL,$=S.$,P=S.pose;
let video,canvas,stream=null,runToken=0,raf=0,opening=false,aiReady=false,baseline=null,lastLm=null;
let recorder=null,recState="idle",countToken=0,chunks=[],recSamples=[],recStart=0,recordInfo=null,lastRecording=null,recTimer=0,stopResolve=null,stopPending=null,wake=null;
function status(msg,error=false){$("liveStatus").textContent=msg;$("liveStatus").className="status-line"+(error?" error":"");}
function setState(text){$("liveState").textContent=text;}
function updateControls(){
 const has=!!stream,busy=recState!=="idle";
 $("openCamera").disabled=opening||has;
 $("stopCamera").disabled=!has&&!opening;
 $("cameraFacing").disabled=opening||busy||has;
 $("liveView").disabled=busy;$("liveClub").disabled=busy;
 $("recordButton").disabled=(recState==="idle"&&(!has||!aiReady||!window.MediaRecorder))||recState==="stopping";
 $("recordButton").classList.toggle("recording",recState==="recording");
 $("recordButton").innerHTML=recState==="countdown"?"取消倒數":recState==="recording"?"停止錄影":recState==="stopping"?"正在整理影片…":"<i></i>3 秒倒數錄影";
 $("resetBaseline").disabled=!has||!aiReady;
}
async function open(){
 if(opening||stream)return;opening=true;updateControls();const my=++runToken;
 try{
  if(!window.isSecureContext)throw new Error("相機需要 HTTPS。請從 GitHub Pages 網址開啟，不要直接開本機 HTML。");
  if(!navigator.mediaDevices?.getUserMedia)throw new Error("此瀏覽器沒有可用的相機 API。");
  status("正在要求相機權限…");setState("準備相機");
  const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:$("cameraFacing").value},width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30,max:60}},audio:false});
  if(my!==runToken){s.getTracks().forEach(t=>t.stop());return;}
  stream=s;video.srcObject=s;await video.play();await S.waitVideo(video);
  if(my!==runToken)return;
  $("livePlaceholder").hidden=true;baseline=null;aiReady=false;lastLm=null;
  setState("相機就緒 · AI 載入中");status("相機已開啟，正在載入人體模型。");
  s.getVideoTracks()[0].addEventListener("ended",()=>{if(stream){close();status("相機串流已中斷，請重新開啟。",true);}},{once:true});
  loop(my);
 }catch(e){
  if(my!==runToken)return;
  const friendly={NotAllowedError:"未取得相機權限。請在 Safari 的網站設定允許相機。",NotFoundError:"找不到可用鏡頭。",NotReadableError:"鏡頭可能被另一個程式占用，請關閉後重試。"};
  status(friendly[e.name]||e.message,true);setState("相機未開啟");
  if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}
 }finally{if(my===runToken){opening=false;updateControls();}}
}
async function loop(my){
 if(my!==runToken||!stream)return;
 const began=performance.now(),captureTime=performance.now(),frameWidth=video.videoWidth,frameHeight=video.videoHeight;
 try{
  const lm=await P.run(video,msg=>{if(my===runToken)status(msg);});
  if(my!==runToken||!stream)return;
  aiReady=true;lastLm=lm;
  if(lm&&baseline===null&&P.valid(lm[0]))baseline=lm[0].x;
  const m=P.metrics(lm,frameWidth,frameHeight,baseline);
  const ctx=P.setupOverlay(canvas);P.draw(ctx,lm,P.fit(video,canvas));P.renderMetrics($("liveMetrics"),m,$("liveView").value);
  const fps=1000/Math.max(1,performance.now()-began);
  $("liveFPS").textContent=`AI ${Math.min(fps,12).toFixed(1)} 次／秒`;
  if(recState==="recording"&&captureTime>=recStart)recSamples.push({t:(captureTime-recStart)/1000,lm,metrics:m});
  setState(recState==="recording"?"REC · AI LIVE":"AI LIVE");
  status(lm?(recState==="recording"?"錄製原始影片中，同步保留姿態資料；時間對齊為近似值。":"人體姿態已偵測；被遮住或低信心的關節不顯示數值。"):"目前未取得可靠人體姿態，請讓全身清楚入鏡。");
  updateControls();
 }catch(e){
  if(my===runToken){aiReady=false;status("姿態分析停止："+e.message,true);setState("相機開啟 · AI 失敗");updateControls();}return;
 }
 const wait=Math.max(0,85-(performance.now()-began));await S.delay(wait);
 if(my===runToken&&stream)raf=requestAnimationFrame(()=>loop(my));
}
async function close(){
 ++runToken;cancelAnimationFrame(raf);opening=false;countToken++;
 if(recState==="countdown"){recState="idle";$("countdown").textContent="";}
 if(recState==="recording"||recState==="stopping")await stopRecord();
 if(stream){const s=stream;stream=null;s.getTracks().forEach(t=>t.stop());}
 video.pause();video.srcObject=null;aiReady=false;lastLm=null;
 P.setupOverlay(canvas);P.renderMetrics($("liveMetrics"),{},$("liveView").value);
 $("livePlaceholder").hidden=false;$("liveFPS").textContent="AI 待機";setState("相機未開啟");updateControls();
}
function cancelCountdown(){countToken++;recState="idle";$("countdown").textContent="";status("已取消倒數。");updateControls();}
async function startRecord(){
 if(recState==="countdown"){cancelCountdown();return;}
 if(recState==="recording"){stopRecord();return;}
 if(recState!=="idle"||!stream||!aiReady)return;
 if(!window.MediaRecorder){status("此瀏覽器不支援網頁錄影，仍可使用姿態分析。",true);return;}
 recState="countdown";const my=++countToken;updateControls();
 for(let i=3;i>=1;i--){if(my!==countToken||!stream)return;$("countdown").textContent=i;await S.delay(1000);}
 if(my!==countToken||!stream)return;$("countdown").textContent="";
 let mime="";
 for(const m of ["video/mp4;codecs=avc1.42E01E","video/mp4","video/webm;codecs=vp8","video/webm"]){try{if(MediaRecorder.isTypeSupported(m)){mime=m;break;}}catch(_){}}
 try{
  try{recorder=new MediaRecorder(stream,mime?{mimeType:mime}:{});}catch(_){recorder=new MediaRecorder(stream);}
  chunks=[];recSamples=[];baseline=null;recStart=performance.now();
  recordInfo={id:S.id(),view:$("liveView").value,club:$("liveClub").value,width:video.videoWidth,height:video.videoHeight,createdAt:new Date().toISOString()};
  recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};
  recorder.onerror=e=>{status("錄影錯誤："+(e.error?.message||"無法完成錄影"),true);stopRecord();};
  recorder.onstop=finishRecording;
  recorder.start(300);recState="recording";
  setState("REC · AI LIVE");$("liveResult").hidden=true;updateControls();
  recTimer=setInterval(()=>{const seconds=(performance.now()-recStart)/1000;$("recClock").textContent=String(Math.floor(seconds/60)).padStart(2,"0")+":"+String(Math.floor(seconds%60)).padStart(2,"0");if(seconds>=S.state.settings.recordLimit)stopRecord();},200);
  try{if(navigator.wakeLock)wake=await navigator.wakeLock.request("screen");}catch(_){}
 }catch(e){recState="idle";status("無法開始錄影："+e.message,true);updateControls();}
}
async function stopRecord(){
 if(recState==="countdown"){cancelCountdown();return;}
 if(recState==="stopping")return stopPending;
 if(recState!=="recording"||!recorder||recorder.state==="inactive")return;
 recState="stopping";clearInterval(recTimer);updateControls();
 stopPending=new Promise(resolve=>{
  stopResolve=resolve;
  try{recorder.stop();}catch(e){recState="idle";updateControls();resolve();}
 });
 return stopPending;
}
async function finishRecording(){
 clearInterval(recTimer);
 const duration=(performance.now()-recStart)/1000;
 if(wake){try{await wake.release();}catch(_){}wake=null;}
 const type=recorder?.mimeType||chunks[0]?.type||"video/webm",blob=new Blob(chunks,{type});
 recState="idle";updateControls();
 if(!blob.size){status("沒有取得錄影資料，請重新錄製。",true);if(stopResolve){stopResolve();stopResolve=null;stopPending=null;}return;}
 lastRecording={blob,shotId:null,info:{...recordInfo,duration},analysis:{schema:"swinglab.analysis.v2",view:recordInfo.view,width:recordInfo.width,height:recordInfo.height,slowRatio:1,scaleCm:null,phases:{},marks:{ball:[],club:[],scale:[],lines:[],angles:[]},samples:recSamples.map(s=>({...s})),timingNote:"Pose timestamps are approximate relative to recording start, not hardware-synchronized."}};
 $("liveResult").hidden=false;
 $("liveResultInfo").textContent=`${duration.toFixed(1)} 秒 · ${(blob.size/1024/1024).toFixed(1)} MB · ${recSamples.filter(s=>s.lm).length} 個人體姿態畫面。原始影片不燒錄骨架；回放頁會另行疊加。`;
 $("saveRecording").disabled=false;$("saveRecording").textContent="儲存到紀錄";status("錄影完成。可回放、保存紀錄或另存影片。");setState(stream?"AI LIVE":"相機未開啟");
 if(S.state.settings.autoStore)await saveRecording();
 if(stopResolve){stopResolve();stopResolve=null;stopPending=null;}
}
async function saveRecording(){
 if(!lastRecording)return;
 const rec=lastRecording;$("saveRecording").disabled=true;
 try{
  let shot=S.state.shots.find(s=>s.id===rec.shotId);
  shot=shot?{...shot}:S.createShot({id:rec.info.id,createdAt:rec.info.createdAt,club:rec.info.club,source:"camera",notes:"手機原始影片＋2D 人體姿態"});
  shot.mediaId=shot.id;shot.analysisSummary={sampleCount:rec.analysis.samples.filter(s=>s.lm).length,view:rec.analysis.view,projectedMaxMps:null};
  await S.media.put({id:shot.id,blob:rec.blob,analysis:rec.analysis});
  if(!S.saveShot(shot))throw new Error("擊球數據無法寫入。");
  rec.shotId=shot.id;$("saveRecording").textContent="已儲存到紀錄";S.toast("影片與動作資料已儲存在此瀏覽器。");
 }catch(e){S.toast("尚未儲存成功："+e.message+"。請先另存影片。");$("saveRecording").disabled=false;}
}
function init(){
 video=$("liveVideo");canvas=$("liveOverlay");P.renderMetrics($("liveMetrics"));
 $("openCamera").onclick=open;$("stopCamera").onclick=()=>close().then(()=>status("相機已關閉。"));
 $("recordButton").onclick=startRecord;
 $("resetBaseline").onclick=()=>{baseline=lastLm&&P.valid(lastLm[0])?lastLm[0].x:null;S.toast("已重設頭部位置基準。");};
 $("liveView").onchange=()=>{
  baseline=null;$("liveGuide").textContent=$("liveView").value==="face"?"正面：鏡頭朝向胸口，固定於手部附近高度，全身與球桿盡量完整入鏡。":"後方：鏡頭朝向目標方向，沿手部線取景，固定在手部附近高度。不要站在飛球路線內。";
 };
 $("saveRecording").onclick=saveRecording;
 $("downloadRecording").onclick=()=>{if(lastRecording)S.download(lastRecording.blob,"swinglab-"+Date.now()+(lastRecording.blob.type.includes("mp4")?".mp4":".webm"));};
 $("openRecorded").onclick=async()=>{if(!lastRecording)return;location.hash="video";await S.review.load(lastRecording.blob,{analysis:lastRecording.analysis,shotId:lastRecording.shotId,source:"camera"});};
 new ResizeObserver(()=>{if(lastLm){const ctx=P.setupOverlay(canvas);P.draw(ctx,lastLm,P.fit(video,canvas));}}).observe($("liveStage"));
 document.addEventListener("visibilitychange",()=>{if(document.hidden){if(recState==="recording")stopRecord();if(recState==="countdown")cancelCountdown();}});
 window.addEventListener("pagehide",()=>{++runToken;if(recorder?.state==="recording")recorder.stop();if(stream)stream.getTracks().forEach(t=>t.stop());});
 updateControls();
}
S.live={init,open,close,isActive:()=>!!stream||opening,isRecording:()=>recState!=="idle"};
})();
