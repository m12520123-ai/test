/* SwingLab v2.0 - standalone, no build step. Units at rest: metres and m/s. */
(function () {
"use strict";
const icons = {
 overview:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
 camera:'<path d="M8 5l1.5-2h5L16 5h4a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V7a2 2 0 012-2z"/><circle cx="12" cy="13" r="4"/>',
 video:'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M10 8l6 4-6 4z"/>',
 flight:'<path d="M3 20h18M4 18C8-2 14-1 20 17"/><circle cx="20" cy="17" r="1.5"/><path d="M8 20v-2m4 2v-2m4 2v-2"/>',
 history:'<path d="M4 8a9 9 0 119 13"/><path d="M4 3v5h5m3-1v6l4 2"/><path d="M3 13h4m-4 4h6m-6 4h5"/>',
 settings:'<path d="M12 8a4 4 0 100 8 4 4 0 000-8z"/><path d="M10 2h4l1 3 3 1 3 3-1 3 1 3-3 3-3 1-1 3h-4l-1-3-3-1-3-3 1-3-1-3 3-3 3-1z"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',arrow:'<path d="M4 12h16m-6-6l6 6-6 6"/>',
 edit:'<path d="M14 5l5 5M4 20l5-1L21 7a2 2 0 00-5-5L4 14z"/>',
 play:'<path d="M8 4l12 8-12 8z"/>',pause:'<path d="M8 4v16M16 4v16"/>',
 close:'<path d="M5 5l14 14M19 5L5 19"/>',search:'<circle cx="10" cy="10" r="6"/><path d="M15 15l6 6"/>',
 download:'<path d="M12 3v12m-5-5l5 5 5-5M4 15v6h16v-6"/>',
 upload:'<path d="M12 16V3m-5 5l5-5 5 5M4 16v5h16v-5"/>',
 back:'<path d="M5 4v16M19 5L8 12l11 7z"/>', next:'<path d="M19 4v16M5 5l11 7-11 7z"/>',
 person:'<circle cx="12" cy="4" r="2"/><path d="M8 9h8l2 7m-12 0l2-7m4 0v7m0 0l-5 7m5-7l5 7"/>',
 scan:'<path d="M3 8V3h5m8 0h5v5M3 16v5h5m8 0h5v-5M3 12h18"/>',
 cursor:'<path d="M4 3l7 18 3-8 7-3z"/>',
 target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
 golf:'<path d="M7 3l9 15m-5-2l6-1 4 4-2 3h-7z"/>',
 ruler:'<path d="M3 16L16 3l5 5L8 21zM6 13l3 3m0-6l2 2m1-5l3 3m0-6l2 2"/>',
 line:'<path d="M4 20L20 4"/><circle cx="4" cy="20" r="1"/><circle cx="20" cy="4" r="1"/>',
 angle:'<path d="M6 3v17h16M6 13a7 7 0 017 7"/>',
 archive:'<rect x="3" y="3" width="18" height="5" rx="1"/><path d="M5 8v13h14V8m-10 4h6"/>',
 radar:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12l8-8M12 3v2M3 12h2m7 7v2m7-9h2"/>',
 trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
 check:'<path d="M4 12l5 5L20 6"/>',
 compare:'<path d="M4 4h6v16H4zm10 0h6v16h-6"/>'
};
const fields = [
 {key:"carry",label:"飛行距離",en:"Carry",type:"distance",min:0,max:600},
 {key:"total",label:"總距離",en:"Total",type:"distance",min:0,max:700},
 {key:"clubSpeed",label:"桿頭速度",en:"Club Speed",type:"speed",min:0,max:120},
 {key:"ballSpeed",label:"球速",en:"Ball Speed",type:"speed",min:0,max:150},
 {key:"smash",label:"擊球效率",en:"Smash Factor",type:"ratio",derived:true},
 {key:"launch",label:"起飛角",en:"Launch Angle",type:"angle",min:-20,max:90},
 {key:"attack",label:"攻擊角",en:"Attack Angle",type:"angle",min:-90,max:90},
 {key:"spin",label:"旋轉速率",en:"Spin Rate",type:"spin",min:0,max:30000},
 {key:"spinAxis",label:"旋轉軸",en:"Spin Axis",type:"angle",min:-180,max:180},
 {key:"apex",label:"最高點",en:"Apex",type:"distance",min:0,max:200},
 {key:"flightTime",label:"飛行時間",en:"Flight Time",type:"time",min:0,max:60},
 {key:"offline",label:"左右偏移",en:"Offline · 右正左負",type:"distance",min:-500,max:500},
 {key:"clubPath",label:"球桿路徑",en:"Club Path · 右正左負",type:"angle",min:-90,max:90},
 {key:"faceAngle",label:"桿面方向",en:"Face Angle · 右正左負",type:"angle",min:-90,max:90},
 {key:"launchDir",label:"出球方向",en:"Launch Direction",type:"angle",min:-90,max:90},
 {key:"faceToPath",label:"桿面相對路徑",en:"Face to Path",type:"angle",derived:true}
];
const clubs=["Driver","3W","5W","4I","5I","6I","7I","8I","9I","PW","GW","SW","LW"];
const defaults={name:"我的練習",distanceUnit:"yd",speedUnit:"mph",handedness:"right",recordLimit:30,autoStore:true,target:137.16,environment:{temperature:null,humidity:null,pressure:null}};
const KEY="swinglab.v2.data",SETTINGS="swinglab.v2.settings";
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function parseLocal(key, fallback){try{const v=JSON.parse(localStorage.getItem(key));return v===null?fallback:v;}catch(_){return fallback;}}
const storedSettings=parseLocal(SETTINGS,{});
const state={shots:[],demo:false,selected:null,route:"overview",filterClub:"all",comparison:new Set(),settings:{...defaults,...storedSettings,environment:{...defaults.environment,...storedSettings.environment}}};
if(!["yd","m"].includes(state.settings.distanceUnit))state.settings.distanceUnit="yd";
if(!["mph","kmh","mps"].includes(state.settings.speedUnit))state.settings.speedUnit="mph";
const old=parseLocal(KEY,[]);state.shots=Array.isArray(old)?old.filter(s=>s&&typeof s.id==="string").slice(-2000):[];
let toastTimer;
function toast(text){const n=$("toast");if(!n)return;n.textContent=text;n.classList.add("visible");clearTimeout(toastTimer);toastTimer=setTimeout(()=>n.classList.remove("visible"),5000);}
function icon(name){return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${icons[name]||icons.target}</svg>`;}
function hydrate(el=document){el.querySelectorAll("[data-icon]").forEach(n=>{n.innerHTML=icon(n.dataset.icon);});}
function emit(name, detail){window.dispatchEvent(new CustomEvent("sl:"+name,{detail}));}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state.shots));return true;}catch(e){toast("儲存失敗：本機空間可能不足。請先匯出備份。");return false;}}
function saveSettings(){try{localStorage.setItem(SETTINGS,JSON.stringify(state.settings));return true;}catch(e){toast("設定暫時無法儲存。");return false;}}
function id(){return window.crypto?.randomUUID?.()||("sl-"+Date.now()+"-"+Math.random().toString(36).slice(2));}
const finite=x=>typeof x==="number"&&Number.isFinite(x);
function num(x){if(x===null||x===undefined||String(x).trim()==="")return null;const n=Number(x);return Number.isFinite(n)?n:null;}
function clamp(x,a,b){return Math.max(a,Math.min(b,x));}
function value(shot,key){if(!shot)return null;if(key==="smash")return finite(shot.ballSpeed)&&finite(shot.clubSpeed)&&shot.clubSpeed>0?shot.ballSpeed/shot.clubSpeed:null;if(key==="faceToPath")return finite(shot.faceAngle)&&finite(shot.clubPath)?shot.faceAngle-shot.clubPath:null;return finite(shot[key])?shot[key]:null;}
function field(key){return fields.find(f=>f.key===key);}
function unit(key){const t=field(key)?.type;return t==="distance"?state.settings.distanceUnit:t==="speed"?({mph:"mph",kmh:"km/h",mps:"m/s"})[state.settings.speedUnit]:t==="angle"?"°":t==="spin"?"rpm":t==="time"?"s":"";}
function displayNumber(key,v){if(!finite(v))return null;const t=field(key)?.type;if(t==="distance"&&state.settings.distanceUnit==="yd")return v/0.9144;if(t==="speed"){return state.settings.speedUnit==="mph"?v/0.44704:state.settings.speedUnit==="kmh"?v*3.6:v;}return v;}
function canonical(key,v){v=num(v);if(v===null)return null;const t=field(key)?.type;if(t==="distance"&&state.settings.distanceUnit==="yd")return v*0.9144;if(t==="speed"){return state.settings.speedUnit==="mph"?v*0.44704:state.settings.speedUnit==="kmh"?v/3.6:v;}return v;}
function format(key,v){const n=displayNumber(key,v);if(n===null)return"—";const t=field(key)?.type;return n.toFixed(t==="spin"?0:t==="ratio"?2:t==="time"?2:1);}
function source(shot,key){if(!shot)return"未提供";if(shot.source==="demo")return"示範資料";if(field(key)?.derived&&finite(value(shot,key)))return"計算值";if(!finite(value(shot,key)))return"未提供";if(shot.metricSources?.[key])return shot.metricSources[key]==="import"?"外部匯入":"手動輸入";return shot.source==="import"?"外部匯入":"手動輸入";}
function sourceName(shot){return({demo:"示範資料",manual:"手動輸入",import:"外部匯入",camera:"相機姿態",video:"影片分析"})[shot?.source]||"未驗證資料";}
function shortDate(d){const date=new Date(d);return Number.isNaN(date.getTime())?"未提供":date.toLocaleString("zh-TW",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false});}
function localDateTime(date=new Date()){return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);}
function makeDemo(){
 const rows=[[144.2,148.2,82.8,104.9,19.0,-4.9,5720,1.6,22.8,5.32,4.1],[151.6,155.4,85.0,110.7,18.2,-4.4,5900,-2.1,25.6,5.48,-5.3],[147.0,151.3,83.5,107.6,19.3,-5.0,6010,2.5,24.1,5.40,7.5],[156.2,160.9,86.2,113.6,18.6,-3.7,5620,-1.3,26.8,5.66,-2.8],[149.8,153.7,84.1,109.2,18.9,-4.4,5810,1.0,24.8,5.44,2.9],[158.4,162.7,87.1,115.0,18.0,-4.3,5570,-1.7,27.1,5.78,-4.6],[153.1,157.2,85.5,111.8,18.4,-4.0,5720,.8,25.5,5.60,1.7],[157.9,162.1,87.9,116.7,18.6,-4.2,5680,1.2,27.4,5.74,3.2]];
 return rows.map((r,i)=>({id:"demo-"+i,no:i+1,club:"7I",createdAt:new Date(Date.now()-(8-i)*80000).toISOString(),source:"demo",carry:r[0]*.9144,total:r[1]*.9144,clubSpeed:r[2]*.44704,ballSpeed:r[3]*.44704,launch:r[4],attack:r[5],spin:r[6],spinAxis:r[7],apex:r[8],flightTime:r[9],offline:r[10],clubPath:1.8+i*.12,faceAngle:0.8+i*.07,launchDir:0.7,notes:"僅供介面展示，不是任何人的實測數據。"}));
}
const demoShots=makeDemo();
function shots(){return(state.demo?demoShots:state.shots).slice().sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));}
function selected(){const a=shots();return a.find(s=>s.id===state.selected)||a.at(-1)||null;}
function saveShot(shot){const backup=state.shots.slice();const i=state.shots.findIndex(s=>s.id===shot.id);if(i>=0)state.shots[i]=shot;else state.shots.push(shot);if(!persist()){state.shots=backup;return false;}state.demo=false;state.selected=shot.id;emit("data");return true;}
function createShot(extra={}){return{id:id(),no:Math.max(0,...state.shots.map(s=>s.no||0))+1,createdAt:new Date().toISOString(),club:"7I",source:"manual",notes:"",environment:{...state.settings.environment},...extra};}
let dbPromise;
function database(){if(dbPromise)return dbPromise;dbPromise=new Promise((resolve,reject)=>{if(!window.indexedDB){reject(new Error("此瀏覽器無法儲存影片。"));return;}const req=indexedDB.open("SwingLabStudio",1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains("media"))req.result.createObjectStore("media",{keyPath:"id"});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>{dbPromise=null;reject(req.error);};req.onblocked=()=>reject(new Error("請關閉另一個 SwingLab 分頁後重試。"));});return dbPromise;}
async function mediaAction(mode, callback){const db=await database();return new Promise((resolve,reject)=>{let result;const tx=db.transaction("media",mode);const store=tx.objectStore("media");const req=callback(store);req.onsuccess=()=>result=req.result;req.onerror=()=>reject(req.error);tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error("儲存已中止。"));});}
const media={put:item=>mediaAction("readwrite",s=>s.put(item)),get:id=>mediaAction("readonly",s=>s.get(id)),remove:id=>mediaAction("readwrite",s=>s.delete(id)),clear:()=>mediaAction("readwrite",s=>s.clear())};
function download(blob,name){const u=URL.createObjectURL(blob);const a=document.createElement("a");a.href=u;a.download=name;a.rel="noopener";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000);}
function csvCell(s){let x=String(s??"");if(/^[=+@]/.test(x)||(/^-/.test(x)&&!Number.isFinite(Number(x))))x="'"+x;return /[,"\r\n]/.test(x)?'"'+x.replace(/"/g,'""')+'"':x;}
function csvParse(text){const rows=[];let row=[],cell="",quoted=false;const t=text.replace(/^\uFEFF/,"");for(let i=0;i<t.length;i++){const ch=t[i];if(quoted){if(ch==='"'){if(t[i+1]==='"'){cell+='"';i++;}else quoted=false;}else cell+=ch;}else if(ch==='"'){quoted=true;}else if(ch===","){row.push(cell);cell="";}else if(ch==="\n"){row.push(cell.replace(/\r$/,""));if(row.some(x=>x.trim()))rows.push(row);row=[];cell="";}else cell+=ch;}if(quoted)throw new Error("CSV 引號沒有成對結束。");row.push(cell.replace(/\r$/,""));if(row.some(x=>x.trim()))rows.push(row);return rows;}
function validateShot(input, index=0){if(!input||typeof input!=="object"||Array.isArray(input))throw new Error(`第 ${index+1} 筆不是資料物件。`);const out={club:clubs.includes(input.club)?input.club:"7I",createdAt:input.createdAt||new Date().toISOString(),notes:String(input.notes||"").slice(0,500)};if(!Number.isFinite(new Date(out.createdAt).getTime()))throw new Error(`第 ${index+1} 筆日期格式不正確。`);for(const f of fields.filter(x=>!x.derived)){const n=num(input[f.key]);if(input[f.key]!==undefined&&input[f.key]!==null&&input[f.key]!==""&&n===null)throw new Error(`第 ${index+1} 筆 ${f.en} 不是數字。`);if(n!==null&&(n<f.min||n>f.max))throw new Error(`第 ${index+1} 筆 ${f.en} 超出有效範圍。`);out[f.key]=n;}if(finite(out.total)&&finite(out.carry)&&out.total<out.carry)throw new Error(`第 ${index+1} 筆 Total 不可小於 Carry。`);return out;}
function delay(ms){return new Promise(r=>setTimeout(r,ms));}
function waitVideo(video, timeout=15000){if(video.readyState>=2&&video.videoWidth>0)return Promise.resolve();return new Promise((resolve,reject)=>{let timer;const clean=()=>{clearTimeout(timer);["loadeddata","canplay"].forEach(e=>video.removeEventListener(e,ready));video.removeEventListener("error",fail);};const ready=()=>{if(video.readyState>=2&&video.videoWidth>0){clean();resolve();}};const fail=()=>{clean();reject(new Error("瀏覽器無法解碼這個影片，請試 H.264 MP4。"));};["loadeddata","canplay"].forEach(e=>video.addEventListener(e,ready));video.addEventListener("error",fail);timer=setTimeout(()=>{clean();reject(new Error("影片尚未準備好，請先點播放或改用可解碼影片。"));},timeout);});}
function waitMetadata(video,timeout=15000){
 const ready=()=>video.readyState>=1&&video.videoWidth>0;
 if(ready())return Promise.resolve();
 return new Promise((resolve,reject)=>{let timer;const clean=()=>{clearTimeout(timer);["loadedmetadata","loadeddata","canplay","resize"].forEach(e=>video.removeEventListener(e,check));video.removeEventListener("error",fail);};const check=()=>{if(ready()){clean();resolve();}};const fail=()=>{clean();reject(new Error("\u5f71\u7247\u8cc7\u8a0a\u8b80\u53d6\u5931\u6557\uff0c\u8acb\u5617\u8a66\u53ef\u64ad\u653e\u7684 MP4 / MOV\u3002"));};["loadedmetadata","loadeddata","canplay","resize"].forEach(e=>video.addEventListener(e,check));video.addEventListener("error",fail);timer=setTimeout(()=>{clean();reject(new Error("\u5f71\u7247\u8cc7\u8a0a\u8b80\u53d6\u903e\u6642\u3002\u8acb\u9ede\u64ad\u653e\u6216\u91cd\u65b0\u9078\u6a94\u3002"));},timeout);check();});
}
function seek(video,time){
 const duration=Number.isFinite(video.duration)?video.duration:Math.max(video.currentTime,time,0)+1;
 const target=clamp(time,0,Math.max(0,duration-.0001));
 if(Math.abs(video.currentTime-target)<.0001&&!video.seeking&&video.readyState>=2)return Promise.resolve();
 return new Promise((resolve,reject)=>{let timer;const clean=()=>{clearTimeout(timer);["seeked","loadeddata","canplay"].forEach(e=>video.removeEventListener(e,done));video.removeEventListener("error",fail);};const done=()=>{if(!video.seeking&&video.readyState>=2&&Math.abs(video.currentTime-target)<.04){clean();resolve();}};const fail=()=>{clean();reject(new Error("\u5f71\u7247\u8df3\u8f49\u5931\u6557\u3002"));};["seeked","loadeddata","canplay"].forEach(e=>video.addEventListener(e,done));video.addEventListener("error",fail);timer=setTimeout(()=>{clean();reject(new Error("\u9019\u500b\u6642\u9ede\u5c1a\u7121\u53ef\u8b80\u756b\u9762\uff0c\u8acb\u5148\u9ede\u64ad\u653e\u518d\u66ab\u505c\u3002"));},8000);try{video.currentTime=target;}catch(e){clean();reject(e);}done();});
}
window.SL={$,esc,icon,hydrate,toast,emit,fields,clubs,state,finite,num,clamp,id,field,value,unit,displayNumber,canonical,format,source,sourceName,shortDate,localDateTime,shots,selected,saveShot,createShot,persist,saveSettings,media,download,csvCell,csvParse,validateShot,delay,waitVideo,waitMetadata,seek};
})();
