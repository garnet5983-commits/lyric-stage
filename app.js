'use strict';
const $=id=>document.getElementById(id);
const ui={audio:$('audio'),video:$('video'),canvas:$('preview'),wrap:$('canvasWrap'),audioFile:$('audioFile'),visualFile:$('visualFile'),lyrics:$('lyrics'),phrases:$('phrases'),status:$('status')};
const ctx=ui.canvas.getContext('2d',{alpha:false});
const presets=window.LyricEffects.keys;
const fonts=['bold','serif','rounded','mono'];
const state={phrases:[],duration:180,ratio:'9:16',visual:null,visualType:null,audioURL:null,audioFile:null,beats:[],visualURL:null,exporting:false,syncIndex:0,random:false,raf:0,previewRaf:0,audioContext:null,audioSource:null,output:null};
function setStatus(message){ui.status.textContent=message}
function format(t){t=Math.max(0,Number(t)||0);return `${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function resize(){const landscape=$('ratio').value==='16:9';ui.canvas.width=landscape?960:540;ui.canvas.height=landscape?540:960;ui.canvas.style.aspectRatio=landscape?'16/9':'9/16';draw()}
function seeded(n){let x=Math.sin(n*91.345+13.67)*43758.5453;return x-Math.floor(x)}
function randomStyle(i,phrase){
 const theme=$('visualTheme').value;
 const sets={cinema:['scene_poster','cinema','float','scene_whisper','editorial','spotlight','scene_depth','ripple','echo','trace'],neon:['scene_split','neon','chromatic','scene_depth','dance','laser','glitch','scene_burst','kinetic','flash'],mono:['scene_whisper','minimal','scene_poster','scroll','tilt','cascade','scene_split','karaoke','trace'],electric:['scene_burst','punch','bounce','scene_split','jitter','flash','scene_depth','kinetic','smear','heartbeat']};
 const sequence=sets[theme]||sets.cinema;
 let effect=sequence[i%sequence.length];
 if(/【[^】]+】/.test(phrase.text))effect=theme==='mono'?'scene_whisper':'scene_poster';
 else if(/[!！?？]/.test(phrase.text))effect=theme==='neon'?'scene_burst':'punch';
 else if(Array.from(phrase.text).length<7 && i%3===0)effect='kinetic';
 return {effect,font:'global',color:''};
}
function duration(){return Number.isFinite(ui.audio.duration)&&ui.audio.duration>0?ui.audio.duration:state.duration}
function parseLyrics(){const raw=ui.lyrics.value.split(/\r?\n/).map(v=>v.trim()).filter(Boolean);if(!raw.length){setStatus('先に歌詞を入力してください。');return}
 const lrc=raw.map(line=>{const m=line.match(/^\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]\s*(.*)$/);return m?{start:Number(m[1])*60+Number(m[2])+Number('0.'+(m[3]||'0').padEnd(2,'0')),text:m[4]}:null});
 const hasLrc=lrc.every(Boolean);const lines=hasLrc?lrc.filter(x=>x.text):raw.map(text=>({text}));if(!lines.length)return;
 const total=duration();state.phrases=lines.map((item,i)=>({text:item.text,start:hasLrc?item.start:i*total/lines.length,effect:'cinema',font:'global',color:''}));state.phrases.sort((a,b)=>a.start-b.start);state.syncIndex=0;renderPhrases();draw();$('parseNote').textContent=hasLrc?'LRCの時刻を読み込みました。':'フレーズを仮配置しました。「再生位置で記録」で曲に合わせてください。';}
function renderPhrases(){if(!state.phrases.length){ui.phrases.innerHTML='<p class="empty">歌詞を貼って「フレーズを作成」を押してください。</p>';return}
 ui.phrases.innerHTML=state.phrases.map((p,i)=>`<div class="phrase" data-index="${i}"><div class="phrase-head"><b>${String(i+1).padStart(2,'0')}</b><input data-field="text" aria-label="${i+1}番の歌詞" value="${escapeHTML(p.text)}"></div><div class="phrase-controls"><label>開始（秒）<input data-field="start" type="number" min="0" max="${Math.ceil(duration())}" step="0.01" value="${p.start.toFixed(2)}"></label><label>演出<select data-field="effect"><optgroup label="登場・切り替え">${presets.slice(0,11).map(v=>`<option value="${v}" ${p.effect===v?'selected':''}>${window.LyricEffects.labels[v]}</option>`).join('')}</optgroup><optgroup label="動き続ける演出">${presets.slice(11,31).map(v=>`<option value="${v}" ${p.effect===v?'selected':''}>${window.LyricEffects.labels[v]}</option>`).join('')}</optgroup><optgroup label="MV構図・強調語">${presets.slice(31).map(v=>`<option value="${v}" ${p.effect===v?'selected':''}>${window.LyricEffects.labels[v]}</option>`).join('')}</optgroup></select></label><label>フォント<select data-field="font">${['global','bold','serif','rounded','mono'].map(v=>`<option value="${v}" ${p.font===v?'selected':''}>${{global:'全体設定',bold:'太ゴシック',serif:'明朝',rounded:'丸ゴシック',mono:'モノ'}[v]}</option>`).join('')}</select></label><label>文字色<input data-field="color" type="color" value="${p.color||$('globalColor').value}"></label></div><div class="phrase-actions"><button data-action="preview">演出を見る</button><button data-action="jump">ここから再生</button><button data-action="set">現在位置に設定</button><button data-action="delete">削除</button></div></div>`).join('');highlight()}
ui.phrases.addEventListener('input',e=>{const field=e.target.dataset.field;if(!field)return;const row=e.target.closest('.phrase'),p=state.phrases[Number(row.dataset.index)];if(field==='start'){if(e.target.value==='')return;p.start=Math.max(0,Math.min(duration(),Number(e.target.value)||0))}else p[field]=e.target.value;draw()});
ui.phrases.addEventListener('click',e=>{const action=e.target.dataset.action;if(!action)return;const i=Number(e.target.closest('.phrase').dataset.index);if(action==='preview'){previewEffect(i);return}if(action==='delete'){state.phrases.splice(i,1);state.syncIndex=Math.min(state.syncIndex,state.phrases.length);renderPhrases();draw()}if(action==='set'){state.phrases[i].start=ui.audio.currentTime;renderPhrases();draw()}if(action==='jump'){ui.audio.currentTime=state.phrases[i].start;syncVideo();draw();ui.audio.play().catch(()=>setStatus('先に音楽を選択してください。'))}});
function currentPhrase(t){let idx=-1;for(let i=0;i<state.phrases.length;i++)if(t>=state.phrases[i].start&&(!state.phrases[i+1]||t<state.phrases[i+1].start))idx=i;return idx}
function highlight(){const active=currentPhrase(ui.audio.currentTime);ui.phrases.querySelectorAll('.phrase').forEach((el,i)=>el.classList.toggle('active',i===active))}
function cover(media,w,h,t){
 const sw=media.videoWidth||media.naturalWidth,sh=media.videoHeight||media.naturalHeight;
 if(!sw||!sh)return false;
 const image=state.visualType==='image';
 const zoom=image?1.035+.015*Math.sin(t*.12):1;
 const scale=Math.max(w/sw,h/sh)*zoom,dw=sw*scale,dh=sh*scale;
 const pan=image?Math.sin(t*.11)*Math.min(18,w*.03):0;
 ctx.drawImage(media,(w-dw)/2+pan,(h-dh)/2,dw,dh);
 return true;
}
function background(t,w,h){
 const theme=$('visualTheme').value;
 const palettes={cinema:['#080d1b','#263049','#371d34'],neon:['#070d20','#1c1b48','#251b39'],mono:['#08090d','#292a31','#101115'],electric:['#111427','#31224d','#181c30']};
 const colors=palettes[theme]||palettes.cinema;
 const grad=ctx.createLinearGradient(0,0,w,h);
 colors.forEach((c,i)=>grad.addColorStop(i/2,c));
 ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
 if(state.visual){try{cover(state.visual,w,h,t)}catch{}}
 else {
  const glow=ctx.createRadialGradient(w*.75,h*.27,0,w*.75,h*.27,w*.7);
  glow.addColorStop(0,theme==='electric'?'#9e60b433':theme==='neon'?'#6a5bdf30':'#d8b27e18');
  glow.addColorStop(1,'#00000000');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
 }
 const vignette=ctx.createRadialGradient(w*.5,h*.48,w*.1,w*.5,h*.48,Math.max(w,h)*.82);
 vignette.addColorStop(0,'#00000000');vignette.addColorStop(1,'#0000008c');
 ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
 ctx.fillStyle=`rgba(0,0,0,${Number($('dim').value)/100})`;ctx.fillRect(0,0,w,h);
}
function draw(time=ui.audio.currentTime,forcedIndex=-1,preview=false){
 const w=ui.canvas.width,h=ui.canvas.height,t=Number.isFinite(time)?time:0;
 background(t,w,h);
 const idx=forcedIndex>=0?forcedIndex:currentPhrase(t);if(idx<0)return;
 const p=state.phrases[idx],next=state.phrases[idx+1];
 const gfont=$('globalFont').value;
 const font=p.font==='global'?(gfont==='random'?fonts[Math.floor(seeded(idx+21)*fonts.length)]:gfont):p.font;
 let pulse=beatPulse(t);
 if(state.analyser&&state.audioContext?.state==='running'&&!ui.audio.paused){
  state.analyser.getByteFrequencyData(state.frequencyData);
  let sum=0;for(let i=1;i<Math.min(24,state.frequencyData.length);i++)sum+=state.frequencyData[i];
  pulse=Math.max(pulse,sum/(23*255));
 }
 window.LyricEffects.render({ctx,canvas:ui.canvas,phrase:p,index:idx,time:t,
  life:preview?4:Math.max(.2,(next?next.start:duration())-p.start),font,
  fontSize:Number($('fontSize').value),color:$('globalColor').value,
  themeName:$('visualTheme').value,intensity:Number($('intensity').value),pulse});
}
function previewEffect(i){
 cancelAnimationFrame(state.previewRaf);state.previewRaf=0;ui.audio.pause();
 const start=performance.now(),phrase=state.phrases[i];
 function step(now){
  const elapsed=(now-start)/1000;
  if(elapsed>3.5){state.previewRaf=0;draw();return}
  draw(phrase.start+elapsed,i,true);
  state.previewRaf=requestAnimationFrame(step);
 }
 state.previewRaf=requestAnimationFrame(step);
 setStatus('選択した文字演出をプレビューしています。');
}
function frame(){if(!state.previewRaf)draw();ui.raf=requestAnimationFrame(frame)}
function startFrame(){if(!ui.raf)ui.raf=requestAnimationFrame(frame)}
function stopFrame(){cancelAnimationFrame(ui.raf);ui.raf=0;draw()}
function tick(){const d=duration();$('seek').value=String(Math.min(1000,Math.round(ui.audio.currentTime/d*1000)));$('timeLabel').textContent=`${format(ui.audio.currentTime)} / ${format(d)}`;highlight()}
function syncVideo(){if(state.visualType!=='video')return;const v=ui.video;if(v.readyState<1)return;const target=ui.audio.currentTime%(v.duration||duration());if(Math.abs(v.currentTime-target)>.3)try{v.currentTime=target}catch{}if(ui.audio.paused)v.pause();else v.play().catch(()=>{})}
ui.audio.addEventListener('loadedmetadata',()=>{state.duration=duration();$('durationLabel').textContent=format(duration());tick();if(state.phrases.length&&$('parseNote').textContent.includes('仮配置'))equalTiming()});ui.audio.addEventListener('timeupdate',()=>{tick();if(state.visualType==='video'&&Math.abs(ui.video.currentTime-ui.audio.currentTime%(ui.video.duration||duration()))>.35)syncVideo()});ui.audio.addEventListener('play',()=>{$('playBtn').textContent='Ⅱ';syncVideo();startFrame()});ui.audio.addEventListener('pause',()=>{$('playBtn').textContent='▶';syncVideo();stopFrame()});ui.audio.addEventListener('ended',()=>{$('playBtn').textContent='▶';stopFrame()});
$('playBtn').onclick=async()=>{cancelAnimationFrame(state.previewRaf);state.previewRaf=0;if(!state.audioURL){setStatus('先に音楽を選択してください。');return}try{if(ui.audio.paused){await setupAudio();await ui.audio.play()}else ui.audio.pause()}catch(err){setStatus(`再生できません: ${err.message}`)}};
$('seek').oninput=e=>{ui.audio.currentTime=Number(e.target.value)/1000*duration();syncVideo();tick();draw()};
ui.audioFile.onchange=e=>{const file=e.target.files[0];if(!file)return;if(state.audioURL)URL.revokeObjectURL(state.audioURL);state.audioURL=URL.createObjectURL(file);state.audioFile=file;state.beats=[];ui.audio.src=state.audioURL;$('audioName').textContent=file.name;setStatus('音楽を読み込みました。')};
ui.visualFile.onchange=e=>{const file=e.target.files[0];if(!file)return;if(state.visualURL)URL.revokeObjectURL(state.visualURL);state.visualURL=URL.createObjectURL(file);$('visualName').textContent=file.name;if(file.type.startsWith('video/')){state.visualType='video';ui.video.src=state.visualURL;state.visual=ui.video;ui.video.load()}else if(file.type.startsWith('image/')){state.visualType='image';const img=new Image();img.onload=draw;img.src=state.visualURL;state.visual=img}else{setStatus('動画または画像を選択してください。');return}draw()};
$('parseBtn').onclick=parseLyrics;
function equalTiming(){const d=duration();state.phrases.forEach((p,i)=>p.start=i*d/state.phrases.length);state.syncIndex=0;renderPhrases();draw()}
$('resetTimingBtn').onclick=equalTiming;
$('syncBtn').onclick=()=>{if(!state.phrases.length)return setStatus('先にフレーズを作成してください。');if(!state.audioURL)return setStatus('先に音楽を選択してください。');if(state.syncIndex>=state.phrases.length){state.syncIndex=0;setStatus('最初のフレーズに戻りました。もう一度押して記録できます。');return}state.phrases[state.syncIndex].start=ui.audio.currentTime;state.syncIndex++;renderPhrases();setStatus(`${state.syncIndex} / ${state.phrases.length} フレーズを記録しました。`)};
$('autoBtn').onclick=()=>{if(!state.phrases.length)parseLyrics();if(!state.phrases.length)return;state.phrases.forEach((p,i)=>Object.assign(p,randomStyle(i,p)));renderPhrases();draw();setStatus('テーマに合わせて演出を構成しました。気になる行だけ個別に変更できます。')};
$('ratio').onchange=resize;for(const id of ['globalFont','globalColor','fontSize','dim','visualTheme','intensity'])$(id).addEventListener('input',draw);
async function setupAudio(){if(!state.audioContext){const C=window.AudioContext||window.webkitAudioContext;if(!C)throw new Error('このブラウザでは音声ミキシングを利用できません。');state.audioContext=new C();state.audioSource=state.audioContext.createMediaElementSource(ui.audio);state.output=state.audioContext.createMediaStreamDestination();state.analyser=state.audioContext.createAnalyser();state.analyser.fftSize=256;state.frequencyData=new Uint8Array(state.analyser.frequencyBinCount);state.audioSource.connect(state.analyser);state.analyser.connect(state.output);state.analyser.connect(state.audioContext.destination)}await state.audioContext.resume()}
function beatPulse(t){
 const beats=state.beats;if(!beats.length)return 0;
 let lo=0,hi=beats.length;
 while(lo<hi){const mid=(lo+hi)>>1;if(beats[mid]<=t)lo=mid+1;else hi=mid}
 const dt=t-beats[lo-1];return dt>=0&&dt<.35?Math.exp(-dt*12):0;
}
async function detectBeats(){
 if(!state.audioFile){setStatus('先にMP3などの音楽ファイルを選択してください。');return}
 const button=$('beatBtn');button.disabled=true;setStatus('端末内で曲の強い拍を解析しています…');
 let ac;
 try{
  const C=window.AudioContext||window.webkitAudioContext;
  if(!C)throw Error('この端末で音声解析を利用できません。');
  ac=new C();const bytes=await state.audioFile.arrayBuffer();
  const decoded=await ac.decodeAudioData(bytes);const samples=decoded.getChannelData(0);
  const hop=2048,rate=decoded.sampleRate,energy=[];
  for(let i=0;i+hop<samples.length;i+=hop){let sum=0;for(let j=i;j<i+hop;j++)sum+=samples[j]*samples[j];energy.push(Math.sqrt(sum/hop))}
  const averages=[];for(let i=0,sum=0;i<energy.length;i++){
   sum+=energy[i];if(i>=12)sum-=energy[i-12];averages[i]=sum/Math.min(i+1,12);
  }
  const global=energy.reduce((a,b)=>a+b,0)/Math.max(1,energy.length);
  const beats=[],spacing=Math.max(3,Math.round(.26*rate/hop));
  for(let i=8;i<energy.length-1;i++){
   if(energy[i]>Math.max(global*.65,averages[i]*1.38)&&
      energy[i]>energy[i-1]&&energy[i]>=energy[i+1]&&
      (!beats.length||i*hop/rate-beats[beats.length-1]>.26)){
    let best=i;for(let k=i+1;k<Math.min(i+spacing,energy.length-1);k++)if(energy[k]>energy[best]&&energy[k]>energy[k-1]&&energy[k]>=energy[k+1])best=k;
    beats.push(best*hop/rate);i=best+spacing-1;
   }
  }
  state.beats=beats;setStatus(beats.length?`強い拍を${beats.length}か所検出しました。文字の強調に反映します。歌声の時刻とは別なので、歌詞の開始時刻は調整してください。`:'強い拍を検出できませんでした。通常の演出は使えます。');
 }catch(err){setStatus(`曲の解析ができませんでした: ${err.message}`)}
 finally{await ac?.close().catch(()=>{});button.disabled=false;draw()}
}
$('beatBtn').onclick=detectBeats;
function getMime(){if(!window.MediaRecorder)return '';const types=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];return types.find(x=>MediaRecorder.isTypeSupported(x))||''}
async function exportVideo(){cancelAnimationFrame(state.previewRaf);state.previewRaf=0;if(state.exporting)return;if(!state.audioURL)return setStatus('先に音楽を選択してください。');if(!state.phrases.length)return setStatus('先に歌詞のフレーズを作成してください。');if(!ui.canvas.captureStream||!window.MediaRecorder)return setStatus('このブラウザは動画書き出しに対応していません。PCのChromeまたは対応ブラウザで開いてください。');
 const mime=getMime();if(!mime)return setStatus('この端末は動画の録画形式に対応していません。PCのChromeでも試してください。');
 let recorder,stream,resolveStop;const final=new Promise(resolve=>resolveStop=resolve);const originalSize=[ui.canvas.width,ui.canvas.height];const button=$('exportBtn');let chunks=[];
 try{state.exporting=true;button.disabled=true;ui.audio.pause();ui.audio.currentTime=0;resize();const landscape=$('ratio').value==='16:9';ui.canvas.width=landscape?1920:1080;ui.canvas.height=landscape?1080:1920;draw(0);await setupAudio();stream=ui.canvas.captureStream(30);state.output.stream.getAudioTracks().forEach(track=>stream.addTrack(track));recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:8000000,audioBitsPerSecond:192000});recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};recorder.onerror=e=>{setStatus('書き出し中にエラーが発生しました。');resolveStop()};recorder.onstop=()=>resolveStop();
 recorder.start(1000);setStatus(`書き出し中：0%（曲の長さだけかかります）`);await ui.audio.play();startFrame();await new Promise((resolve,reject)=>{const onEnd=()=>{cleanup();resolve()};const onErr=()=>{cleanup();reject(new Error('音楽を再生できません。'))};function cleanup(){ui.audio.removeEventListener('ended',onEnd);ui.audio.removeEventListener('error',onErr)}ui.audio.addEventListener('ended',onEnd);ui.audio.addEventListener('error',onErr);if(ui.audio.ended)onEnd()});if(recorder.state!=='inactive')recorder.stop();await final;
 if(!chunks.length)throw new Error('録画データがありません。この端末のブラウザが動画録画をサポートしていない可能性があります。');const ext=mime.includes('mp4')?'mp4':'webm',blob=new Blob(chunks,{type:mime}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`lyric-stage-${Date.now()}.${ext}`;link.textContent=`動画を保存（${(blob.size/1048576).toFixed(1)} MB・${ext.toUpperCase()}）`;link.className='download';link.style.cssText='display:block;text-align:center;color:#fff;background:#7043ac;padding:12px;border-radius:9px';ui.status.replaceChildren(document.createTextNode('完成しました。保存が始まらない場合はこちら：'),link);link.click();setTimeout(()=>URL.revokeObjectURL(url),3600000);
 }catch(e){if(recorder&&recorder.state!=='inactive')recorder.stop();setStatus(`書き出し失敗：${e.message}`)}finally{state.exporting=false;button.disabled=false;ui.audio.pause();stream?.getVideoTracks().forEach(track=>track.stop());ui.canvas.width=originalSize[0];ui.canvas.height=originalSize[1];draw()}}
$('exportBtn').onclick=exportVideo;
ui.audio.addEventListener('timeupdate',()=>{if(state.exporting)ui.status.textContent=`書き出し中：${Math.floor(ui.audio.currentTime/duration()*100)}%（画面を閉じないでください）`});
$('saveBtn').onclick=()=>{const data={version:1,lyrics:ui.lyrics.value,phrases:state.phrases,ratio:$('ratio').value,font:$('globalFont').value,color:$('globalColor').value,fontSize:$('fontSize').value,dim:$('dim').value,theme:$('visualTheme').value,intensity:$('intensity').value,duration:duration()};const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='lyric-stage-project.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);setStatus('編集データを保存しました。音楽・映像ファイルは含まれないため、再開時に選び直してください。')};
$('loadBtn').onclick=()=>$('loadFile').click();$('loadFile').onchange=async e=>{try{const data=JSON.parse(await e.target.files[0].text());if(data.version!==1||!Array.isArray(data.phrases))throw new Error('対応していないデータです。');ui.lyrics.value=data.lyrics||'';state.phrases=data.phrases.filter(x=>typeof x.text==='string'&&Number.isFinite(x.start)).map(x=>({text:x.text,start:x.start,effect:presets.includes(x.effect)?x.effect:'cinema',font:['global',...fonts].includes(x.font)?x.font:'global',color:/^#[0-9a-f]{6}$/i.test(x.color)?x.color:''}));state.duration=Number(data.duration)||180;$('ratio').value=data.ratio==='16:9'?'16:9':'9:16';$('globalFont').value=[...fonts,'random'].includes(data.font)?data.font:'bold';if(/^#[0-9a-f]{6}$/i.test(data.color))$('globalColor').value=data.color;$('fontSize').value=data.fontSize||68;$('dim').value=data.dim??30;$('visualTheme').value=window.LyricEffects.themes[data.theme]?data.theme:'cinema';$('intensity').value=data.intensity||75;resize();renderPhrases();setStatus('編集データを読み込みました。音楽・映像ファイルを選び直してください。')}catch(err){setStatus(`読み込み失敗：${err.message}`)}e.target.value=''};
$('networkState').textContent=navigator.onLine?'● オフライン対応':'● オフライン';window.addEventListener('online',()=>{$('networkState').textContent='● オフライン対応'});window.addEventListener('offline',()=>{$('networkState').textContent='● オフライン'});if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));resize();tick();
