/* Application controller. All unknown performance values remain null. */
(function(){
"use strict";
const S=window.SL,$=S.$;
const NAV=[
 ["flight","scan","自動分析","自動","AUTO ANALYSIS","選好影片，分析就開始。","上傳或開鏡頭，人體分析自動進行；手動校正只是選用。"],
 ["overview","overview","練習總覽","總覽","THE PRACTICE STUDIO","每一桿，都更有方向。","動作、數據與回顧，放在同一個練習空間。"],
 ["capture","camera","即時攝影","即時","LIVE ANALYSIS","瞄準這一桿的進步。","手機鏡頭、人體骨架與錄影，準備好就開始。"],
 ["video","video","影片分析","影片","REPLAY STUDIO","把細節，看得更清楚。","回放、標記與校正，讓影片成為你的練習筆記。"],
 ["history","history","紀錄與比較","紀錄","YOUR PRACTICE JOURNAL","讓進步，有跡可循。","保存每一次練習，找出穩定的改變。"],
 ["settings","settings","設定與裝置","設定","YOUR WORKSPACE","依你的習慣，準備就緒。","管理單位、資料與儲存空間。"]
];
let rangeScene,flightScene,lastFocus=null,comparisonURLs=[],routeGeneration=0;
const toMetric=(key,shot,cls="stat-card")=>{
 const f=S.field(key),val=S.value(shot,key),u=S.unit(key);
 return `<div class="${cls}"><div class="metric-label">${S.esc(f.label)}<small>${S.esc(f.en)}</small></div><div class="metric-value">${S.format(key,val)}<small>${u}</small></div><div class="metric-source">${S.source(shot,key)}</div></div>`;
};
function navHTML(mobile=false){return NAV.map(([route,icon,label,short])=>`<a href="#${route}" class="nav-item ${route===S.state.route?"active":""}" aria-label="${label}" ${route===S.state.route?'aria-current="page"':""}>${S.icon(icon)}<span>${mobile?short:label}</span></a>`).join("");}
function fillClubs(){
 const options=S.clubs.map(club=>`<option value="${club}">${club==="Driver"?"Driver / 開球木桿":club}</option>`).join("");
 document.querySelectorAll(".club-options").forEach(n=>{n.innerHTML=options;n.value="7I";});
 ["overviewClub","historyClub"].forEach(id=>$(id).insertAdjacentHTML("beforeend",options));
}
function refreshCommon(){
 const dataPage=["overview","history"].includes(S.state.route)||(S.state.route==="flight"&&$("flightExternalDetails").open);
 $("sourceChip").textContent=S.state.demo&&dataPage?"示範資料":"本機資料";
 $("demoToggle").textContent=S.state.demo?"返回我的資料":"體驗示範";
 $("demoBanner").hidden=!(S.state.demo&&dataPage);
 $("sessionName").textContent=S.state.demo?"示範練習 · 7 號鐵":S.state.settings.name||"我的練習";
 $("sessionDate").textContent=new Date().toLocaleDateString("zh-TW",{month:"2-digit",day:"2-digit"});
 document.querySelectorAll(".distance-unit").forEach(el=>el.textContent=S.state.settings.distanceUnit);
 $("targetDistance").value=Math.round(S.displayNumber("carry",S.state.settings.target));
}
function filteredShots(){return S.shots().filter(s=>S.state.filterClub==="all"||s.club===S.state.filterClub);}
function currentFiltered(){const arr=filteredShots();return arr.find(s=>s.id===S.state.selected)||arr.at(-1)||null;}
function renderOverview(){
 const data=filteredShots(),shot=currentFiltered();
 $("shotHeading").textContent=shot?`Shot ${String(shot.no||data.indexOf(shot)+1).padStart(2,"0")} · ${shot.club}`:"單球數據";
 $("rangeShot").textContent=shot?`SHOT ${String(shot.no||1).padStart(2,"0")} · ${shot.club}`:"尚無擊球";
 $("rangeOrigin").textContent=S.state.demo?"示範資料 · 示意重建":"示意重建 · 非實拍追球";
 const canShowLanding=shot&&S.finite(shot.carry)&&S.finite(shot.offline);
 $("rangeEmpty").hidden=!!canShowLanding;
 if(!canShowLanding){
  $("rangeEmpty").innerHTML=shot?
   `<span class="empty-orbit"></span><strong>動作與數據，分開看得清。</strong><p>這一球尚缺 Carry 或左右偏移，不能重建落點。<br>手機姿態分析不會自動生成雷達數據。</p><button class="btn primary" data-edit-shot="${S.esc(shot.id)}">${S.icon("edit")}補充擊球資料</button>`:
   `<span class="empty-orbit"></span><strong>把下一球，變成看得見的進步。</strong><p>開啟相機，或匯入你的擊球資料。</p><a href="#capture" class="btn primary">${S.icon("camera")}開始練習</a>`;
 }
 $("primaryMetrics").innerHTML=["carry","total","clubSpeed","ballSpeed"].map(k=>toMetric(k,shot,"featured-metric")).join("");
 $("secondaryMetrics").innerHTML=["smash","launch","attack","spin","apex","flightTime"].map(k=>toMetric(k,shot)).join("");
 $("shotSourceNote").textContent=shot?`${S.sourceName(shot)} · ${S.shortDate(shot.createdAt)}。${shot.source==="camera"||shot.source==="video"?"已保存動作分析；彈道欄位須另外提供。":(shot.notes||"缺少的數值保持空白，不以示意圖冒充實測。")}`:"尚未量測的欄位保持空白。可先開啟相機，或使用手動／外部資料建立一球。";
 $("editSelected").disabled=!shot||S.state.demo;$("allDataButton").disabled=!shot;
 $("shotRail").innerHTML=data.length?data.slice(-10).map((s,i)=>`<button class="shot-pill ${shot?.id===s.id?"active":""}" data-select-shot="${S.esc(s.id)}"><span>SHOT ${String(s.no||i+1).padStart(2,"0")} · ${S.esc(s.club)}</span><strong>${S.format("carry",S.value(s,"carry"))}</strong><em>${S.unit("carry")}</em></button>`).join(""):'<span class="muted">尚無擊球紀錄 · 「體驗示範」可先查看完整介面</span>';
 rangeScene.set(shot);
 $("dispersionCount").textContent=data.filter(s=>S.finite(s.carry)&&S.finite(s.offline)).length+" 球";
 S.visuals.scatter($("dispersionCanvas"),data);
 const key=$("trendMetric").value,vals=data.map(s=>S.value(s,key)).filter(S.finite);
 $("trendStats").innerHTML=[["平均",vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null],["最低",vals.length?Math.min(...vals):null],["最高",vals.length?Math.max(...vals):null],["有效筆數",vals.length]].map(([label,value],i)=>`<div><span>${label}</span><strong>${i===3?value:S.format(key,value)}<small> ${i===3?"":S.unit(key)}</small></strong></div>`).join("");
 S.visuals.trend($("trendCanvas"),data,key);
 $("recentShots").innerHTML=data.length?data.slice(-4).reverse().map(s=>`<div class="recent-row"><div class="recent-id"><span class="club-icon">${S.esc(s.club)}</span><div><strong>Shot ${s.no||"—"}</strong><small>${S.shortDate(s.createdAt)}</small></div></div><div><small>Carry · ${S.unit("carry")}</small><span class="recent-value">${S.format("carry",s.carry)}</span></div><div><small>Club Speed · ${S.unit("clubSpeed")}</small><span class="recent-value">${S.format("clubSpeed",s.clubSpeed)}</span></div><div class="recent-fourth"><small>來源</small><span>${S.sourceName(s)}</span></div><button class="icon-btn" data-view-shot="${S.esc(s.id)}" aria-label="查看 Shot ${s.no}">${S.icon("arrow")}</button></div>`).join(""):'<div class="empty-state"><p>錄製一段揮桿，開始累積你的練習紀錄。</p><a class="text-btn" href="#capture">前往即時攝影 →</a></div>';
}
function renderFlight(){
 const arr=S.shots(),shot=S.selected();
 $("flightShot").innerHTML=arr.length?arr.slice().reverse().map(s=>`<option value="${S.esc(s.id)}">Shot ${s.no||"—"} · ${S.esc(s.club)} · ${S.shortDate(s.createdAt)}</option>`).join(""):'<option value="">尚無擊球</option>';
 if(shot)$("flightShot").value=shot.id;
 flightScene.set(shot);
 $("deliveryDiagram").innerHTML=S.visuals.delivery(shot);
 $("deliverySource").textContent=S.sourceName(shot);
 $("deliveryNumbers").innerHTML=["clubPath","faceAngle","faceToPath"].map(k=>`<div><span>${S.field(k).label}</span><strong>${S.format(k,S.value(shot,k))}<small>°</small></strong></div>`).join("");
 $("fullMetrics").innerHTML=S.fields.map(f=>toMetric(f.key,shot)).join("");
 const projected=shot?.analysisSummary?.projectedMaxMps;
 if(S.finite(projected))$("fullMetrics").insertAdjacentHTML("beforeend",`<div class="stat-card"><div class="metric-label">桿頭投影速度<small>人工校正 · 2D 估算</small></div><div class="metric-value">${(projected*3.6).toFixed(1)}<small>km/h</small></div><div class="metric-source">不是雷達桿速，不填入 Club Speed</div></div>`);
 $("editFlightShot").disabled=!shot||S.state.demo;
 $("flightCaption").textContent=shot&&S.finite(shot.carry)&&S.finite(shot.offline)&&S.finite(shot.apex)?"此曲線只以 Carry、Apex、Offline 等資料做示意插值，未模擬空氣阻力與旋轉，不是實拍或物理彈道預測。":"需要 Carry、Apex、Offline 才能繪製完整示意。缺少資料時不補零；只有落點資料則僅顯示落點。";
}
function statsCard(label,en,value,unit=""){return `<div class="stat-card"><div class="metric-label">${label}<small>${en}</small></div><div class="metric-value">${value}<small>${unit}</small></div></div>`;}
function renderHistory(){
 const all=S.shots(),query=$("historySearch").value.toLowerCase().trim(),club=$("historyClub").value,source=$("historySource").value;
 const filtered=all.filter(s=>(club==="all"||s.club===club)&&(source==="all"||s.source===source)&&(!query||`${s.club} ${s.notes||""} ${s.createdAt} ${s.no}`.toLowerCase().includes(query)));
 const carry=all.map(s=>s.carry).filter(S.finite),speeds=all.map(s=>s.clubSpeed).filter(S.finite);
 $("historyStats").innerHTML=statsCard("累積擊球","SHOT COUNT",all.length,"球")+statsCard("平均 Carry","AVERAGE CARRY",S.format("carry",carry.length?carry.reduce((a,b)=>a+b,0)/carry.length:null),S.unit("carry"))+statsCard("最高桿頭速度","MAX CLUB SPEED",S.format("clubSpeed",speeds.length?Math.max(...speeds):null),S.unit("clubSpeed"))+statsCard("已存影片","SAVED VIDEOS",all.filter(s=>s.mediaId).length,"段");
 $("historyEmpty").hidden=!!filtered.length;
 $("historyBody").innerHTML=filtered.slice(-200).reverse().map(s=>`<tr><td><input type="checkbox" data-compare="${S.esc(s.id)}" aria-label="比較 Shot ${s.no}" ${S.state.comparison.has(s.id)?"checked":""}></td><td><b>Shot ${s.no||"—"} · ${S.esc(s.club)}</b><small>${S.shortDate(s.createdAt)}</small></td><td><span class="chip ${s.source==="demo"?"warn":""}">${S.sourceName(s)}</span></td><td>${S.format("carry",s.carry)} <small>${S.unit("carry")}</small></td><td>${S.format("clubSpeed",s.clubSpeed)}<small>${S.unit("clubSpeed")}</small></td><td>${S.format("smash",S.value(s,"smash"))}</td><td>${S.format("offline",s.offline)}<small>${S.unit("offline")}</small></td><td>${s.mediaId?`<button class="icon-btn" data-play-shot="${S.esc(s.id)}" aria-label="回放">${S.icon("play")}</button>`:"—"}</td><td><div class="table-actions"><button class="icon-btn" data-view-shot="${S.esc(s.id)}" aria-label="查看數據">${S.icon("flight")}</button>${s.source==="demo"?"":`<button class="icon-btn" data-edit-shot="${S.esc(s.id)}" aria-label="編輯">${S.icon("edit")}</button><button class="icon-btn" data-delete-shot="${S.esc(s.id)}" aria-label="刪除">${S.icon("trash")}</button>`}</div></td></tr>`).join("");
 if(filtered.length>200)$("historyBody").insertAdjacentHTML("beforeend",'<tr><td colspan="9">顯示最新 200 筆；匯出功能會包含所有紀錄。</td></tr>');
 $("compareBar").hidden=S.state.comparison.size<1;$("compareCount").textContent=`已選 ${S.state.comparison.size} / 3 球`;$("compareSelected").disabled=S.state.comparison.size<2;
 const grouped=S.clubs.map(c=>{const arr=all.filter(s=>s.club===c&&S.finite(s.carry));return{club:c,n:arr.length,avg:arr.length?arr.reduce((a,s)=>a+s.carry,0)/arr.length:0};}).filter(x=>x.n).sort((a,b)=>b.avg-a.avg),max=Math.max(1,...grouped.map(x=>x.avg));
 $("clubGapping").innerHTML=grouped.length?grouped.map(g=>`<div class="gapping-row"><span class="club-tag">${g.club}</span><span class="gapping-track"><i style="width:${Math.max(2,g.avg/max*100)}%"></i></span><span class="gapping-number">${S.format("carry",g.avg)} ${S.unit("carry")}</span><small>${g.n} 球</small></div>`).join(""):'<div class="empty-state"><p>有 Carry 資料後，這裡會比較不同球桿的平均距離。</p></div>';
}
function renderSettings(){
 const set=S.state.settings;
 $("profileName").value=set.name;$("distanceUnit").value=set.distanceUnit;$("speedUnit").value=set.speedUnit;$("handedness").value=set.handedness;$("recordLimit").value=set.recordLimit;$("autoStore").checked=set.autoStore;
 ["temperature","humidity","pressure"].forEach(k=>$(k).value=set.environment[k]??"");
 const checks=[
 ["HTTPS 安全環境",window.isSecureContext,"可使用相機權限","需要 HTTPS"],
 ["相機 API",!!navigator.mediaDevices?.getUserMedia,"可用","未提供"],
 ["網頁錄影",!!window.MediaRecorder,"API 可用，需實機測試","此瀏覽器不支援"],
 ["Web Bluetooth",!!navigator.bluetooth,"API 可用；X1 協定未串接","目前瀏覽器未提供"],
 ["本機影片儲存",!!window.indexedDB,"IndexedDB 可用","無法保存影片"]
 ];
 $("capabilities").innerHTML=checks.map(([l,ok,yes,no])=>`<div class="capability"><span>${l}</span><b class="${ok?"":"unavailable"}">${ok?yes:no}</b></div>`).join("");
 storageInfo();
}
async function storageInfo(){
 try{const est=await navigator.storage?.estimate?.();$("storageInfo").textContent=est?`此網站約用 ${(est.usage/1024/1024).toFixed(1)} MB；估計配額 ${(est.quota/1024/1024).toFixed(0)} MB。配額非永久保證。`:"此瀏覽器未提供儲存空間估計。";}
 catch(_) {$("storageInfo").textContent="無法讀取空間資訊，請定期匯出備份。";}
}
function refresh(){refreshCommon();if(S.state.route==="overview")renderOverview();if(S.state.route==="flight")renderFlight();if(S.state.route==="history")renderHistory();}
async function route(){
 const generation=++routeGeneration,previous=S.state.route;
 const requested=location.hash.slice(1)||"flight",next=NAV.some(n=>n[0]===requested)?requested:"flight";
 if(next!==previous&&S.live.isActive()){
  if(S.live.isRecording()&&!confirm("切換頁面會停止錄影並關閉相機。繼續？")){history.replaceState(null,"","#"+previous);return;}
  S.flight.suppress(true);await S.live.close();S.flight.suppress(false);
 }
 if(generation!==routeGeneration)return;
 if(previous!==next)S.review.pause();
 S.flight.mount(next);
 rangeScene?.stop();flightScene?.stop();
 S.state.route=next;const meta=NAV.find(n=>n[0]===next);
 document.querySelector(".desktop-nav").innerHTML=navHTML();document.querySelector(".mobile-nav").innerHTML=navHTML(true);
 document.querySelectorAll(".page").forEach(p=>{const active=p.id==="page-"+next;p.hidden=!active;p.classList.toggle("active",active);});
 $("breadcrumb").textContent=meta[2];$("pageEyebrow").textContent=meta[4];$("pageTitle").textContent=meta[5];$("pageDescription").textContent=meta[6];
 refresh();if(next==="settings")renderSettings();if(next==="video"||next==="flight")S.review.draw();
 window.scrollTo({top:0,behavior:"instant"});
}
function modal(id){
 lastFocus=document.activeElement;$(id).hidden=false;document.body.style.overflow="hidden";setTimeout(()=>$(id).querySelector("input:not([type=hidden]),button,select")?.focus(),0);
}
function closeModal(id){
 $(id).hidden=true;document.body.style.overflow="";if(id==="compareModal"){comparisonURLs.forEach(URL.revokeObjectURL);comparisonURLs=[];$("comparisonContent").querySelectorAll("video").forEach(v=>v.pause());}
 lastFocus?.focus?.();
}
function showShot(shot=null){
 if(shot?.source==="demo"){S.toast("示範資料不可存為實測。請返回我的資料新增一球。");return;}
 $("shotModalTitle").textContent=shot?"編輯 Shot "+shot.no:"新增一球";$("shotID").value=shot?.id||"";$("formClub").value=shot?.club||"7I";$("formDate").value=S.localDateTime(shot?new Date(shot.createdAt):new Date());$("formNotes").value=shot?.notes||"";$("shotFormError").textContent="";
 $("shotFields").innerHTML=S.fields.filter(f=>!f.derived).map(f=>{const val=S.value(shot,f.key),shown=S.displayNumber(f.key,val);return `<label>${f.label} · ${S.unit(f.key)}<input id="field-${f.key}" name="${f.key}" type="number" step="${f.type==="spin"?"1":"any"}" inputmode="decimal" value="${shown===null?"":Number(shown.toFixed(4))}" placeholder="未提供"></label>`;}).join("");
 modal("shotModal");
}
function saveForm(e){
 e.preventDefault();const old=S.state.shots.find(s=>s.id===$("shotID").value);
 try{
  const raw={club:$("formClub").value,createdAt:new Date($("formDate").value).toISOString(),notes:$("formNotes").value};
  for(const f of S.fields.filter(f=>!f.derived))raw[f.key]=S.canonical(f.key,$("field-"+f.key).value);
  const clean=S.validateShot(raw),shot=old?{...old,...clean}:S.createShot({...clean,source:"manual"});
  shot.metricSources={...(old?.metricSources||{})};
  for(const f of S.fields.filter(f=>!f.derived)){if(shot[f.key]!==old?.[f.key])shot.metricSources[f.key]="manual";}
  S.state.filterClub="all";$("overviewClub").value="all";
  if(S.saveShot(shot)){closeModal("shotModal");S.toast(old?"這一球已更新。":"這一球已加入紀錄。");}
 }catch(err){$("shotFormError").textContent=err.message||"請檢查欄位格式。";}
}
async function playShot(id){
 const shot=S.state.shots.find(s=>s.id===id);if(!shot?.mediaId)return;
 try{
  const item=await S.media.get(shot.mediaId);if(!item?.blob)throw new Error("找不到影片。可能已被瀏覽器清除，或此紀錄由不含影片的備份匯入。");
  location.hash="video";await S.review.load(item.blob,{shotId:shot.id,source:shot.source,analysis:item.analysis});
 }catch(e){S.toast(e.message);}
}
async function deleteShot(id){
 const shot=S.state.shots.find(s=>s.id===id);if(!shot)return;if(!confirm(`刪除 Shot ${shot.no} 及保存在本機的對應影片？無法復原。`))return;
 const previous=S.state.shots.slice();S.state.shots=S.state.shots.filter(s=>s.id!==id);
 if(!S.persist()){S.state.shots=previous;return;}
 try{if(shot.mediaId)await S.media.remove(shot.mediaId);}catch(_){S.toast("紀錄已刪除，但本機影片清理失敗。");}
 S.state.comparison.delete(id);S.emit("data");S.toast("紀錄已刪除。");
}
async function compare(){
 const shots=S.shots().filter(s=>S.state.comparison.has(s.id));if(shots.length<2)return;
 const rows=S.fields.map(f=>`<tr><td>${S.esc(f.label)} <small>${S.unit(f.key)}</small></td>${shots.map(s=>`<td>${S.format(f.key,S.value(s,f.key))}</td>`).join("")}</tr>`).join("");
 $("comparisonContent").innerHTML=`<p class="hint" style="margin:0 0 17px">僅比較資料，不把較高數字一律判定為更好。不同球桿、來源與拍攝條件應分開解讀。</p><div id="compareVideos" class="comparison-videos"></div><div class="table-scroll"><table class="comparison-table"><thead><tr><th>指標</th>${shots.map(s=>`<th>Shot ${s.no} · ${S.esc(s.club)}<br><small>${S.sourceName(s)}</small></th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>`;
 modal("compareModal");
 for(const shot of shots){
  if(!shot.mediaId)continue;
  try{const item=await S.media.get(shot.mediaId);if($("compareModal").hidden)return;if(item?.blob){const u=URL.createObjectURL(item.blob);comparisonURLs.push(u);const div=document.createElement("div");const label=document.createElement("small");label.textContent=`Shot ${shot.no} · 原始影片`;const vid=document.createElement("video");vid.src=u;vid.controls=true;vid.playsInline=true;vid.muted=true;div.append(label,vid);$("compareVideos").append(div);}}catch(_){}
 }
}
const columns={carry_m:"carry",total_m:"total",clubSpeed_mps:"clubSpeed",ballSpeed_mps:"ballSpeed",launch_deg:"launch",attack_deg:"attack",spin_rpm:"spin",spinAxis_deg:"spinAxis",apex_m:"apex",flightTime_s:"flightTime",offline_m:"offline",clubPath_deg:"clubPath",faceAngle_deg:"faceAngle",launchDir_deg:"launchDir"};
function csvText(shots,onlyHeader=false){
 const heads=["createdAt","club","source",...Object.keys(columns),"notes"];
 const rows=onlyHeader?[heads]:[heads,...shots.map(s=>[s.createdAt,s.club,s.source,...Object.values(columns).map(k=>s[k]??""),s.notes||""])];
 return "\uFEFF"+rows.map(r=>r.map(S.csvCell).join(",")).join("\r\n");
}
function exportCSV(){S.download(new Blob([csvText(S.shots())],{type:"text/csv;charset=utf-8"}),"swinglab-shots.csv");}
function exportJSON(){const shots=S.shots().map(({mediaId,...rest})=>({...rest,videoNotIncluded:!!mediaId}));S.download(new Blob([JSON.stringify({schema:"swinglab.v2",demo:S.state.demo,units:{distance:"m",speed:"m/s"},exportedAt:new Date().toISOString(),notes:"Shot data only. Video and per-frame analysis are exported separately.",shots},null,2)],{type:"application/json"}),"swinglab-data.json");}
function fingerprint(s){return JSON.stringify([s.createdAt,s.club,...S.fields.filter(f=>!f.derived).map(f=>s[f.key]??null),s.notes||""]);}
async function importFile(file){
 if(!file)return;
 try{
  if(file.size>5*1024*1024)throw new Error("單次匯入上限 5 MB，請拆成較小檔案。");
  let rows,rawText=await file.text();
  if(file.name.toLowerCase().endsWith(".csv")){
   const table=S.csvParse(rawText);if(table.length<2)throw new Error("CSV 只有表頭，請先填入數據。");
   const headers=table.shift().map(h=>h.trim());if(!headers.includes("club")||!headers.some(h=>h in columns))throw new Error("欄位不符合範本，請使用 SI 單位範本（公尺與 m/s）。");
   rows=table.map(r=>{const obj={};headers.forEach((h,i)=>{obj[columns[h]||h]=r[i]??"";});return obj;});
  }else{
   const parsed=JSON.parse(rawText);
   if(parsed?.demo)throw new Error("示範資料備份不能匯入為實測紀錄。");
   if(parsed.units&&(parsed.units.distance!=="m"||parsed.units.speed!=="m/s"))throw new Error("JSON 匯入使用公尺與 m/s，請先轉換單位。");
   rows=Array.isArray(parsed)?parsed:parsed.shots;
  }
  if(!Array.isArray(rows)||!rows.length)throw new Error("找不到擊球資料陣列。");
  if(rows.length>2000)throw new Error("單次匯入最多 2,000 筆。");
  if(rows.some(r=>r.source==="demo"))throw new Error("檔案含有示範資料，不能當作實測匯入。");
  const valid=rows.map((raw,i)=>{const clean=S.validateShot(raw,i);
 if(raw.environment&&typeof raw.environment==="object"){
  const e=raw.environment;clean.environment={
   temperature:S.finite(e.temperature)&&e.temperature>=-20&&e.temperature<=60?e.temperature:null,
   humidity:S.finite(e.humidity)&&e.humidity>=0&&e.humidity<=100?e.humidity:null,
   pressure:S.finite(e.pressure)&&e.pressure>=500&&e.pressure<=1100?e.pressure:null
  };
 }
 if(raw.analysisSummary&&typeof raw.analysisSummary==="object"){
  const a=raw.analysisSummary;clean.analysisSummary={
   sampleCount:S.finite(a.sampleCount)?Math.max(0,Math.floor(a.sampleCount)):0,
   view:a.view==="dtl"?"dtl":"face",
   projectedMaxMps:S.finite(a.projectedMaxMps)&&a.projectedMaxMps>=0?a.projectedMaxMps:null
  };
 }
 return clean;
}),known=new Set(S.state.shots.map(fingerprint));
  const added=[];let no=Math.max(0,...S.state.shots.map(s=>s.no||0));
  valid.forEach(r=>{const fp=fingerprint(r);if(known.has(fp))return;known.add(fp);added.push({...r,id:S.id(),no:++no,source:"import",metricSources:Object.fromEntries(S.fields.filter(f=>!f.derived&&S.finite(r[f.key])).map(f=>[f.key,"import"]))});});
  if(S.state.shots.length+added.length>2000)throw new Error("本機資料上限為 2,000 筆，請先備份整理。");
  const backup=S.state.shots.slice();S.state.shots.push(...added);if(!S.persist()){S.state.shots=backup;throw new Error("本機空間不足，匯入未寫入。");}
  S.state.demo=false;S.state.selected=added.at(-1)?.id||null;S.emit("data");$("importStatus").textContent=`匯入完成：${added.length} 筆。略過 ${rows.length-added.length} 筆重複紀錄。影片不在資料檔內。`;S.toast(`已匯入 ${added.length} 筆資料。`);
 }catch(e){$("importStatus").textContent="未匯入："+e.message;S.toast("匯入失敗："+e.message);}
 finally{$("importFile").value="";}
}
async function migrate(){
 try{
  let a=JSON.parse(localStorage.getItem("golfShots")||"[]"),b=JSON.parse(localStorage.getItem("golfSessionShots")||"[]");
  const rows=[...(Array.isArray(a)?a:[]),...(Array.isArray(b)?b:[])];
  if(!rows.length){S.toast("此瀏覽器沒有找到舊版手動擊球紀錄。");return;}
  const known=new Set(S.state.shots.map(fingerprint)),add=[];let no=Math.max(0,...S.state.shots.map(s=>s.no||0));
  for(const r of rows){
   let d=new Date(r.time);if(!Number.isFinite(d.getTime()))d=new Date();
   const shot=S.validateShot({club:"7I",createdAt:d.toISOString(),carry:S.num(r.carry)===null?null:S.num(r.carry)*.9144,ballSpeed:S.num(r.ball)===null?null:S.num(r.ball)*.44704,clubSpeed:S.num(r.club)===null?null:S.num(r.club)*.44704,launch:r.launch,notes:"從舊版手動紀錄移入："+(r.shape||"")});
   const f=fingerprint(shot);if(!known.has(f)){known.add(f);add.push({...shot,id:S.id(),no:++no,source:"import"});}
  }
  const backup=S.state.shots.slice();S.state.shots.push(...add);if(!S.persist()){S.state.shots=backup;return;}S.state.demo=false;S.emit("data");S.toast(`移入 ${add.length} 筆舊版數據；舊版原始資料保留不刪除。`);
 }catch(e){S.toast("舊版資料格式無法讀取："+e.message);}
}
function init(){
 S.hydrate();fillClubs();
 rangeScene=new S.visuals.RangeScene($("rangeCanvas"));flightScene=new S.visuals.RangeScene($("flightCanvas"));
 S.review.init();S.live.init();S.flight.init();S.feedback.init();S.automation.init();
 document.querySelectorAll('[data-action="new-shot"]').forEach(b=>b.onclick=()=>showShot());
 $("demoToggle").onclick=()=>{S.state.demo=!S.state.demo;S.state.selected=null;S.state.comparison.clear();refresh();};$("leaveDemo").onclick=()=>{S.state.demo=false;S.state.selected=null;S.state.comparison.clear();refresh();};
 $("overviewClub").onchange=e=>{S.state.filterClub=e.target.value;renderOverview();};
 $("targetDistance").onchange=()=>{const v=S.canonical("carry",$("targetDistance").value);if(!S.finite(v)||v<=0||v>400){S.toast("目標距離需在合理範圍內。");refreshCommon();return;}S.state.settings.target=v;S.saveSettings();refresh();};
 $("trendMetric").onchange=renderOverview;
 $("rangeViews").onclick=e=>{const b=e.target.closest("[data-view]");if(!b)return;$("rangeViews").querySelectorAll("button").forEach(n=>n.classList.toggle("active",n===b));rangeScene.view(b.dataset.view);};
 $("flightViews").onclick=e=>{const b=e.target.closest("[data-view]");if(!b)return;$("flightViews").querySelectorAll("button").forEach(n=>n.classList.toggle("active",n===b));flightScene.view(b.dataset.view);};
 $("replayFlight").onclick=()=>rangeScene.animate();
 $("flightShot").onchange=e=>{S.state.selected=e.target.value;renderFlight();};
 $("allDataButton").onclick=()=>{const s=currentFiltered();if(s)S.state.selected=s.id;location.hash="flight";};
 $("editSelected").onclick=()=>showShot(currentFiltered());$("editFlightShot").onclick=()=>showShot(S.selected());
 document.addEventListener("click",e=>{
  const select=e.target.closest("[data-select-shot]");if(select){S.state.selected=select.dataset.selectShot;renderOverview();}
  const view=e.target.closest("[data-view-shot]");if(view){S.state.selected=view.dataset.viewShot;location.hash="flight";}
  const edit=e.target.closest("[data-edit-shot]");if(edit)showShot(S.state.shots.find(s=>s.id===edit.dataset.editShot));
  const del=e.target.closest("[data-delete-shot]");if(del)deleteShot(del.dataset.deleteShot);
  const play=e.target.closest("[data-play-shot]");if(play)playShot(play.dataset.playShot);
 });
 document.addEventListener("change",e=>{if(!e.target.matches("[data-compare]"))return;const id=e.target.dataset.compare;if(e.target.checked){if(S.state.comparison.size>=3){e.target.checked=false;S.toast("最多同時比較三球。");return;}S.state.comparison.add(id);}else S.state.comparison.delete(id);renderHistory();});
 ["historySearch","historyClub","historySource"].forEach(id=>$(id).addEventListener(id==="historySearch"?"input":"change",renderHistory));
 $("compareSelected").onclick=compare;$("clearComparison").onclick=()=>{S.state.comparison.clear();renderHistory();};
 $("shotForm").onsubmit=saveForm;
 document.querySelectorAll(".modal-close").forEach(b=>b.onclick=()=>closeModal(b.closest(".modal-backdrop").id));
 document.querySelectorAll(".modal-backdrop").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)closeModal(m.id);}));
 document.addEventListener("keydown",e=>{
  const m=document.querySelector(".modal-backdrop:not([hidden])");if(!m)return;
  if(e.key==="Escape")closeModal(m.id);
  if(e.key==="Tab"){const a=[...m.querySelectorAll('button:not([disabled]),input:not([type=hidden]),select,textarea,a[href]')].filter(n=>n.offsetParent!==null),first=a[0],last=a.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
 });
 $("exportCSV").onclick=exportCSV;$("exportJSON").onclick=exportJSON;
 $("getTemplate").onclick=()=>S.download(new Blob([csvText([],true)],{type:"text/csv;charset=utf-8"}),"swinglab-import-template.csv");
 $("importFile").onchange=e=>importFile(e.target.files?.[0]);
 $("saveSettings").onclick=()=>{
  Object.assign(S.state.settings,{name:$("profileName").value.trim()||"我的練習",distanceUnit:$("distanceUnit").value,speedUnit:$("speedUnit").value,handedness:$("handedness").value,recordLimit:Number($("recordLimit").value),autoStore:$("autoStore").checked});
  if(S.saveSettings()){refreshCommon();S.toast("設定已儲存。數據本體保持公尺與 m/s。");}
 };
 $("saveEnvironment").onclick=()=>{
  const env={temperature:S.num($("temperature").value),humidity:S.num($("humidity").value),pressure:S.num($("pressure").value)};
  if((env.temperature!==null&&(env.temperature<-20||env.temperature>60))||(env.humidity!==null&&(env.humidity<0||env.humidity>100))||(env.pressure!==null&&(env.pressure<500||env.pressure>1100))){S.toast("請檢查環境欄位範圍。");return;}
  S.state.settings.environment=env;if(S.saveSettings())S.toast("環境備註已儲存；不作為自動感測或距離校正。");
 };
 $("requestPersistence").onclick=async()=>{try{const ok=await navigator.storage?.persist?.();S.toast(ok?"瀏覽器已授予持續儲存權限，仍建議另存備份。":"瀏覽器未授予持續儲存權限，請定期另存影片與數據。");}catch(e){S.toast("無法請求保留空間。");}storageInfo();};
 $("migrateLegacy").onclick=migrate;
 $("clearAll").onclick=async()=>{if(!confirm("永久刪除這個瀏覽器內全部 SwingLab v2 紀錄和影片？請先備份。"))return;try{await S.media.clear();S.state.shots=[];S.state.selected=null;S.state.comparison.clear();S.state.demo=false;if(S.persist()){S.emit("data");storageInfo();S.toast("SwingLab v2 本機紀錄已清除。舊版紀錄不受影響。");}}catch(e){S.toast("刪除未完成："+e.message);}};
 window.addEventListener("hashchange",route);window.addEventListener("sl:data",refresh);
 const observer=new ResizeObserver(()=>{if(S.state.route==="overview"){rangeScene.draw();S.visuals.scatter($("dispersionCanvas"),filteredShots());S.visuals.trend($("trendCanvas"),filteredShots(),$("trendMetric").value);}if(S.state.route==="flight")flightScene.draw();});
 ["rangeCanvas","flightCanvas","dispersionCanvas","trendCanvas"].forEach(id=>observer.observe($(id)));
 route();
}
S.app={refresh,playShot,renderOverview,renderHistory};
init();
})();
