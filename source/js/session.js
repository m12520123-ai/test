/* Independent, complete MediaRecorder blocks; never splice arbitrary encoded chunks. */
(function(){
'use strict';
const S=window.SL,$=S.$,M=S.motion;
let active=false,starting=false,block=null,sessionId=null,detector=new M.SwingDetector(),timer=0,sessionStart=0,serial=Promise.resolve(),lastPose=0,wake=null;
const labels={waiting:'\u7b49\u5f85\u7a69\u5b9a\u9810\u5099\u59ff\u52e2',ready:'\u5df2\u5c31\u7dd2\uff0c\u7b49\u5f85\u63ee\u687f',swing:'\u5075\u6e2c\u63ee\u687f\u4e2d',cooldown:'\u6536\u687f\u7de9\u885d'};
function message(t,error=false){$('practiceStatus').textContent=t;$('practiceStatus').classList.toggle('error',error);}
function controls(){
 $('practiceStart').disabled=active||starting||!S.live.getStream()||S.live.manualRecording();$('practiceStop').disabled=!active&&!starting;
 $('practiceAuto').disabled=active;S.live.updateControls();
}
function render(){
 const list=S.state.shots.filter(x=>x.autoSegment&&(!sessionId||x.sessionId===sessionId)).slice().reverse();
 $('practiceCount').textContent=String(list.length);const host=$('practiceShots');host.replaceChildren();
 if(!list.length){host.innerHTML='<div class="auto-empty">\u5c1a\u7121\u63ee\u687f\u7d00\u9304\u3002\u5168\u8eab\u5165\u93e1\uff0c\u5148\u7a69\u5b9a\u7ad9\u59ff\u518d\u63ee\u687f\u3002</div>';return;}
 for(const shot of list){
  const e=document.createElement('article');e.className='practice-shot';
  if(shot.thumbnail){const im=document.createElement('img');im.src=shot.thumbnail;im.alt='\u6536\u687f\u7e2e\u5716';e.append(im);}
  const body=document.createElement('div'),title=document.createElement('strong');title.textContent='Swing '+shot.no+' \u00b7 '+shot.club;body.append(title);
  const p=document.createElement('p');p.textContent=S.shortDate(shot.createdAt)+' \u00b7 '+shot.autoSegment.clipDuration.toFixed(1)+' s';body.append(p);
  const tag=document.createElement('small');tag.textContent='\u81ea\u52d5\u5206\u6bb5\uff5c\u672a\u78ba\u8a8d\u64ca\u4e2d\u7403';body.append(tag);
  const row=document.createElement('div');row.className='control-row';
  for(const [action,label] of [['play','\u56de\u653e'],['download','\u539f\u7247'],['delete','\u522a\u9664']]){const b=document.createElement('button');b.className='btn secondary small';b.textContent=label;b.dataset.practiceAction=action;b.dataset.id=shot.id;row.append(b);}
  body.append(row);e.append(body);host.append(e);
 }
}
function thumbnail(){try{const v=S.live.getVideo(),c=document.createElement('canvas');c.width=200;c.height=Math.round(200*v.videoHeight/v.videoWidth);c.getContext('2d').drawImage(v,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.6);}catch(_){return null;}}
function recorderFor(stream){
 let mime='';for(const m of ['video/mp4;codecs=avc1.42E01E','video/mp4','video/webm;codecs=vp8','video/webm']){if(MediaRecorder.isTypeSupported(m)){mime=m;break;}}
 try{return new MediaRecorder(stream,{...(mime?{mimeType:mime}:{}),videoBitsPerSecond:2500000});}catch(_){return new MediaRecorder(stream);}
}
function startBlock(){
 if(!active||block||!S.live.getStream())return;
 try{
  const rec=recorderFor(S.live.getStream()),v=S.live.getVideo();
  const b={rec,chunks:[],samples:[],start:performance.now()/1000,event:null,stopAt:0,stopping:false,width:v.videoWidth,height:v.videoHeight,view:$('liveView').value,club:$('liveClub').value};block=b;detector.reset();
  rec.ondataavailable=e=>{if(e.data?.size)b.chunks.push(e.data);};
  rec.onerror=e=>{message('\u9023\u7e8c\u9304\u5f71\u932f\u8aa4\uff1a'+(e.error?.message||'MediaRecorder'),true);stop('recording error');};
  rec.onstop=()=>finishBlock(b);
  rec.start(500);
 }catch(e){active=false;block=null;clearInterval(timer);controls();message('\u7121\u6cd5\u555f\u52d5\u9023\u7e8c\u9304\u5f71\uff1a'+e.message,true);}
}
function stopBlock(){
 if(!block||block.stopping)return;const b=block;b.stopping=true;b.end=performance.now()/1000;
 try{b.rec.stop();}catch(e){block=null;b.resolve?.();if(active)startBlock();}
}
async function persist(b){
 const blob=new Blob(b.chunks,{type:b.rec.mimeType||b.chunks[0]?.type||'video/webm'});if(!blob.size)throw new Error('Empty recording');
 const duration=b.end-b.start,ev=b.event,clip={start:Math.max(0,ev.start-.7-b.start),end:Math.min(duration,ev.end+.4-b.start)};
 const samples=b.samples.map(s=>({...s,t:s.t-b.start}));
 const analysis={schema:'swinglab.analysis.v2.4',duration,clipWindow:clip,view:b.view,width:b.width,height:b.height,slowRatio:1,scaleCm:null,phases:{},marks:{ball:[],club:[],scale:[],lines:[],angles:[],face:[],target:[]},samples,automatic:{...S.autoCore.summarize(samples,b.width,b.height,1),candidates:[],ballAttempted:false,complete:true,version:'2.4.0'},segmentation:{...ev,start:ev.start-b.start,end:ev.end-b.start,peakTime:ev.peakTime-b.start,method:'body-relative wrist motion with setup/settle gates',verification:'unconfirmed-swing'},timingNote:'Wall-clock alignment is approximate. Clip is a playback window inside a complete recording, not a byte-trimmed video.'};
 const shot=S.createShot({source:'camera',club:b.club,sessionId:b.sessionId,notes:'\u81ea\u52d5\u63ee\u687f\u5206\u6bb5\uff08\u672a\u78ba\u8a8d\u64ca\u7403\uff09',thumbnail:b.thumbnail,autoSegment:{clipDuration:clip.end-clip.start,verification:'unconfirmed-swing'},analysisSummary:{sampleCount:samples.filter(s=>s.lm).length,view:b.view}});
 shot.mediaId=shot.id;await S.media.put({id:shot.id,blob,analysis});
 if(!S.saveShot(shot)){await S.media.remove(shot.id);throw new Error('\u7d00\u9304\u7a7a\u9593\u4e0d\u8db3');}
 render();message('Swing '+shot.no+' \u5df2\u4fdd\u5b58\u3002'+(active?'\u7e7c\u7e8c\u7b49\u5f85\u4e0b\u4e00\u6b21\u63ee\u687f\u3002':''));
}
function finishBlock(b){
 if(block===b)block=null;b.end=b.end||performance.now()/1000;
 if(b.event){b.sessionId=sessionId;serial=serial.then(()=>persist(b)).catch(e=>{message('\u672a\u4fdd\u5b58\uff1a'+e.message+'\uff0c\u5df2\u505c\u6b62\u7df4\u7fd2\u3002',true);stop('storage error');});}
 b.resolve?.();if(active)startBlock();
}
async function start(){
 if(active||starting||S.live.manualRecording())return;
 if(!S.live.getStream()){message('\u8acb\u5148\u958b\u555f\u76f8\u6a5f\u3002');return;}
 if(!window.MediaRecorder){message('\u6b64\u700f\u89bd\u5668\u7121\u6cd5\u9304\u5f71\uff0c\u4ecd\u53ef\u770b\u5373\u6642\u59ff\u614b\u3002',true);return;}
 starting=true;controls();
 try{await S.media.get('__storage_probe__');}
 catch(e){starting=false;controls();message('\u672c\u6a5f\u5132\u5b58\u4e0d\u53ef\u7528\uff1a'+e.message,true);return;}
 if(!starting||!S.live.getStream())return;
 starting=false;active=true;sessionId=S.id();sessionStart=performance.now()/1000;lastPose=0;startBlock();controls();render();
 try{if(navigator.wakeLock)wake=await navigator.wakeLock.request('screen');}catch(_){}
 message('\u7df4\u7fd2\u5df2\u555f\u52d5\uff1a\u5148\u7a69\u5b9a\u9810\u5099\u59ff\u52e2\uff0c\u518d\u9023\u7e8c\u63ee\u687f\u3002');
 clearInterval(timer);timer=setInterval(()=>{
  if(!active)return;const now=performance.now()/1000;const elapsed=now-sessionStart;$("recClock").textContent="AUTO "+String(Math.floor(elapsed/60)).padStart(2,"0")+":"+String(Math.floor(elapsed%60)).padStart(2,"0");
  if(now-sessionStart>600){stop('\u5df2\u9054 10 \u5206\u9418\u4fdd\u8b77\u4e0a\u9650');return;}
  if(lastPose&&now-lastPose>4){$('practiceStage').textContent='\u59ff\u614b\u8ffd\u8e64\u4e2d\u65b7';}
  if(block?.event&&now>=block.stopAt)stopBlock();
  else if(block&&!block.event&&now-block.start>12&&detector.state!=='swing')stopBlock();
  if(block&&block.chunks.reduce((a,c)=>a+c.size,0)>80*1024*1024)stop('\u9304\u5f71\u5340\u584a\u904e\u5927\uff0c\u5df2\u505c\u6b62');
 },200);
}
async function stop(reason='\u5df2\u7d50\u675f\u9023\u7e8c\u7df4\u7fd2'){
 active=false;starting=false;clearInterval(timer);detector.reset();if(wake){try{await wake.release();}catch(_){}wake=null;}
 if(block){const b=block;await new Promise(resolve=>{b.resolve=resolve;stopBlock();setTimeout(resolve,6000);});}
 controls();$('practiceStage').textContent='\u5f85\u6a5f';message(reason);await serial;
}
function onPose(s){
 if(!active||!block||block.stopping||s.t<block.start)return;
 lastPose=s.t;block.samples.push(s);if(block.samples.length>1600)block.samples.shift();
 if(block.event)return;
 const out=detector.feed(s);$('practiceStage').textContent=labels[out.state]||out.state;
 if(out.event?.type==='swing'){block.event=out.event;block.stopAt=out.event.end+.4;block.thumbnail=thumbnail();message('\u5df2\u627e\u5230\u4e00\u6b21\u63ee\u687f\u5019\u9078\uff0c\u6b63\u5728\u4fdd\u5b58\u2026');}
}
function init(){
 const panel=document.createElement('section');panel.className='panel practice-panel';panel.innerHTML=`
 <div class="panel-top"><div><span class="eyebrow">CONTINUOUS PRACTICE / V2.4</span><h2>\u81ea\u52d5\u9010\u7403\u7d00\u9304</h2></div><span class="chip accent" id="practiceStage">\u5f85\u6a5f</span></div>
 <label class="check-row"><input type="checkbox" id="practiceAuto" checked>\u958b\u76f8\u6a5f\u5f8c\u81ea\u52d5\u555f\u52d5\u9023\u7e8c\u7df4\u7fd2</label>
 <div class="control-row"><button class="btn primary" id="practiceStart">\u958b\u59cb\u9023\u7e8c\u7df4\u7fd2</button><button class="btn secondary" id="practiceStop" disabled>\u7d50\u675f\u7df4\u7fd2</button><span class="chip"><b id="practiceCount">0</b> \u6b21\u63ee\u687f</span></div>
 <p id="cameraActual" class="hint">\u76f8\u6a5f\u898f\u683c\uff1a\u5c1a\u672a\u958b\u555f</p>
 <p class="status-line" id="practiceStatus" role="status">\u56fa\u5b9a\u624b\u6a5f\uff0c\u5168\u8eab\u5165\u93e1\u3002\u9810\u5099\u8207\u6536\u687f\u6642\u7a69\u5b9a\u505c\u7559\uff0c\u65b9\u4fbf\u5206\u6bb5\u3002</p>
 <p class="hint">\u8a66\u63ee\u4e5f\u53ef\u80fd\u8a18\u9304\u3002\u975e\u64ca\u7403\u78ba\u8a8d\u5668\uff1b\u88ab\u906e\u4f4f\u6216\u5e40\u7387\u4e0d\u8db3\u6642\u53ef\u80fd\u6f0f\u8a18\u3002\u56de\u653e\u4f9d\u5206\u6bb5\u6642\u9593\u7bc4\u570d\uff0c\u539f\u7247\u4e0b\u8f09\u4fdd\u7559\u5f85\u6a5f\u7247\u6bb5\u3002</p><div id="practiceShots" class="practice-shots"></div>`;
 $('liveResult').after(panel);$('practiceStart').onclick=start;$('practiceStop').onclick=()=>stop();
 window.addEventListener('sl:camera-ready',e=>{const a=e.detail.settings;$('cameraActual').textContent=`\u76f8\u6a5f\u56de\u5831\uff1a${a.width||'?'} \u00d7 ${a.height||'?'} \u00b7 ${Number.isFinite(a.frameRate)?a.frameRate.toFixed(1):'?'} FPS\uff08\u4e0d\u7b49\u65bc AI \u53d6\u6a23\u7387\uff09`;controls();if($('practiceAuto').checked)start();});
 window.addEventListener('sl:camera-closed',controls);window.addEventListener('sl:live-pose',e=>onPose(e.detail));
 window.addEventListener('sl:live-ai-error',()=>{if(active)stop('\u4eba\u9ad4\u6a21\u578b\u672a\u6210\u529f\uff0c\u9023\u7e8c\u5206\u6bb5\u5df2\u505c\u6b62\uff1b\u4ecd\u53ef\u624b\u52d5\u9304\u5f71\u3002');});
 window.addEventListener('sl:data',render);
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&active)stop('\u756b\u9762\u9032\u5165\u80cc\u666f\uff0c\u7df4\u7fd2\u5df2\u505c\u6b62');});
 $('practiceShots').onclick=async e=>{
  const b=e.target.closest('[data-practice-action]');if(!b)return;const shot=S.state.shots.find(s=>s.id===b.dataset.id);if(!shot)return;
  if(b.dataset.practiceAction==='delete'){if(!confirm('\u522a\u9664\u9019\u6b21\u63ee\u687f\u8207\u5f71\u7247\uff1f'))return;await S.media.remove(shot.mediaId);S.state.shots=S.state.shots.filter(s=>s.id!==shot.id);S.persist();S.emit('data');return;}
  if(b.dataset.practiceAction==='play'){if(active){if(!confirm('\u56de\u653e\u5c07\u7d50\u675f\u9023\u7e8c\u7df4\u7fd2\u3002\u7e7c\u7e8c\uff1f'))return;await stop();}S.app.playShot(shot.id);return;}
  try{const item=await S.media.get(shot.mediaId);if(item?.blob)S.download(item.blob,'Swing-'+shot.no+(item.blob.type.includes('mp4')?'.mp4':'.webm'));}catch(e){S.toast(e.message);}
 };render();controls();
}
S.session={init,start,stop,active:()=>active||starting,render};
})();
