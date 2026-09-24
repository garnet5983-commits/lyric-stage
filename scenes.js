/* Composed lyric scenes: intentional type hierarchy and camera movement. */
(() => {
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const ease=v=>1-Math.pow(1-clamp(v),3);
  const c=(hex,a)=>{const n=parseInt((hex||'#ffffff').slice(1),16);return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`};
  let activeFace='bold';
  const names={scene_poster:'大見出しポスター',scene_split:'画面分割',scene_depth:'立体レイヤー',scene_burst:'ビートで衝突',scene_whisper:'静寂から拡大'};
  function textParts(text){
    const m=String(text).match(/【([^】]+)】/),clean=String(text).replace(/[【】]/g,'').trim();
    if(m){const hero=m[1],at=clean.indexOf(hero);return {hero,top:clean.slice(0,at).trim(),bottom:clean.slice(at+hero.length).trim(),clean}}
    const chunks=clean.split(/[、，,。.!！？?\s]+/).filter(Boolean);
    if(chunks.length>1){const hero=chunks.reduce((best,s)=>s.length>best.length?s:best,'');const at=clean.indexOf(hero);return {hero,top:clean.slice(0,at).replace(/[、，,。.!！？?]+$/,'').trim(),bottom:clean.slice(at+hero.length).replace(/^[、，,。.!！？?]+/,'').trim(),clean}}
    const arr=Array.from(clean);
    if(arr.length<=9)return {hero:clean,top:'',bottom:'',clean};
    const cut=Math.ceil(arr.length*.52);
    return {hero:arr.slice(0,cut).join(''),top:'',bottom:arr.slice(cut).join(''),clean};
  }
  function font(font,size){return `900 ${size}px ${font==='serif'?'"Hiragino Mincho ProN","Yu Mincho",serif':font==='mono'?'ui-monospace,monospace':'"Hiragino Kaku Gothic ProN",system-ui,sans-serif'}`}
  function fitted(ctx,text,maxWidth,size,min){let s=size;ctx.font=font(activeFace,s);while(s>min&&ctx.measureText(text).width>maxWidth){s-=2;ctx.font=font(activeFace,s)}return s}
  function supporting(ctx,text,x,y,maxWidth,size,color,align='center'){
    if(!text)return;ctx.save();ctx.textBaseline='middle';ctx.textAlign=align;
    const chars=Array.from(text),lines=[];let row='';ctx.font=font(activeFace,size);
    for(const ch of chars){if(row&&ctx.measureText(row+ch).width>maxWidth){lines.push(row);row=ch}else row+=ch}lines.push(row);
    const use=Math.min(size,Math.max(size*.7,maxWidth/Math.max(1,ctx.measureText(lines[0]).width)*size));ctx.font=font(activeFace,use);
    ctx.fillStyle=color;ctx.shadowColor='#050610';ctx.shadowBlur=12*size/22;
    lines.slice(0,3).forEach((line,i)=>ctx.fillText(line,x,y+i*use*1.45));ctx.restore();
  }
  function headline(ctx,word,x,y,size,fill,outline,shadow=0){
    ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';ctx.font=font(activeFace,size);
    ctx.strokeStyle=outline;ctx.lineWidth=Math.max(size*.085,3);
    ctx.shadowColor=fill;ctx.shadowBlur=shadow;ctx.strokeText(word,x,y);ctx.fillStyle=fill;ctx.fillText(word,x,y);ctx.restore();
  }
  function backdrop(ctx,w,h,u,theme,effect,t){
    ctx.save();ctx.fillStyle=c(theme.accent,.14);
    if(effect==='scene_poster'){
      ctx.translate(w*.5,h*.5);ctx.rotate(-.14);ctx.fillRect(-w*.7,-h*.12,w*1.4,h*.21);
      ctx.strokeStyle=c(theme.accent,.28);ctx.lineWidth=u;
      for(let j=-4;j<6;j++){ctx.beginPath();ctx.moveTo(-w,j*45*u);ctx.lineTo(w,j*45*u);ctx.stroke()}
    }else if(effect==='scene_split'){
      ctx.beginPath();
      if(h>w){ctx.moveTo(0,h*.59);ctx.lineTo(w,h*.55);ctx.lineTo(w,h);ctx.lineTo(0,h)}
      else{ctx.moveTo(w*.60,0);ctx.lineTo(w,0);ctx.lineTo(w,h);ctx.lineTo(w*.42,h)}
      ctx.closePath();ctx.fill();ctx.strokeStyle=c(theme.accent,.65);ctx.lineWidth=3*u;ctx.beginPath();
      if(h>w){ctx.moveTo(0,h*.59);ctx.lineTo(w,h*.55)}else{ctx.moveTo(w*.60,0);ctx.lineTo(w*.42,h)}ctx.stroke();
    }else if(effect==='scene_depth'){
      ctx.strokeStyle=c(theme.accent,.22);ctx.lineWidth=u;
      const cx=w*.5,cy=h*.5;
      for(let k=0;k<8;k++){const radius=(k*100*u+t*17*u)%(850*u);ctx.beginPath();ctx.ellipse(cx,cy,radius,radius*.7,0,0,Math.PI*2);ctx.stroke()}
    }else if(effect==='scene_burst'){
      ctx.translate(w*.5,h*.5);ctx.rotate(t*.08);
      ctx.fillStyle=c(theme.accent,.13);for(let n=0;n<18;n++){ctx.rotate(Math.PI*2/18);ctx.fillRect(0,-4*u,w*.9,8*u)}
    }else{
      ctx.strokeStyle=c(theme.accent,.35);ctx.lineWidth=u;
      ctx.beginPath();ctx.moveTo(w*.13,h*.21);ctx.lineTo(w*.13,h*.72);ctx.stroke();
      ctx.fillStyle=c(theme.accent,.2);ctx.fillRect(w*.13,h*.21,w*.44,1*u);
    }
    ctx.restore();
  }
  function render(o){
    const {ctx,canvas,phrase,time,life,font:face,theme,intensity,pulse}=o;
    activeFace=face||'bold';
    const w=canvas.width,h=canvas.height,u=Math.min(w,h)/540;
    const mode=phrase.effect,portrait=h>w,parts=textParts(phrase.text),raw=parts.hero||parts.clean;if(!raw)return;
    const t=Math.max(0,time-phrase.start),intro=ease(t/.72),outro=clamp((life-t)/.32),power=clamp(intensity/100,.2,1.3);
    const accent=phrase.color||theme.accent,ink=o.color||theme.ink;
    const hx=mode==='scene_split'&&!portrait?w*.31:mode==='scene_whisper'?w*.46:w*.5;
    const hy=mode==='scene_split'&&portrait?h*.41:mode==='scene_whisper'?h*.45:mode==='scene_poster'?h*.49:h*.5;
    const base=mode==='scene_poster'?Math.min(w*.19,126*u):mode==='scene_burst'?Math.min(w*.2,140*u):Math.min(w*.17,112*u);
    const size=fitted(ctx,raw,w*(mode==='scene_split'&&!portrait?.53:.82),base,31*u);
    const supportSize=Math.max(21*u,Math.min(32*u,size*.31));
    ctx.save();ctx.globalAlpha=outro;
    backdrop(ctx,w,h,u,theme,mode,t);
    if(mode==='scene_poster'){
      const angle=-.035+Math.sin(t*.55)*.01,zoom=1.08-.08*intro+Math.sin(t*.9)*.008;
      ctx.save();ctx.translate(hx,hy);ctx.rotate(angle);ctx.scale(zoom,zoom);ctx.globalAlpha*=intro;
      headline(ctx,raw,0,0,size,ink,'rgba(5,5,12,.9)',10*u);ctx.restore();
      ctx.globalAlpha=outro*intro;supporting(ctx,parts.top,w*.11,h*.27,w*.78,supportSize,c(accent,.92),'left');
      supporting(ctx,parts.bottom,w*.89,h*.69,w*.78,supportSize,ink,'right');
      ctx.fillStyle=accent;ctx.fillRect(w*.11,h*.74,w*.17,4*u);
    }else if(mode==='scene_split'){
      const x=hx-(1-intro)*w*.35;
      ctx.save();ctx.beginPath();
      if(portrait)ctx.rect(0,0,w,h*.57);else ctx.rect(0,0,w*.59,h);
      ctx.clip();ctx.globalAlpha*=intro;
      headline(ctx,raw,x,hy,size,ink,'rgba(5,5,12,.94)');ctx.restore();
      const support=(parts.top+' '+parts.bottom).trim();
      ctx.globalAlpha=outro*intro;
      if(portrait){supporting(ctx,support,w*.5,h*.69,w*.74,supportSize,accent);ctx.fillStyle=c(ink,.4);ctx.fillRect(w*.15,h*.78,w*.24,2*u)}
      else{supporting(ctx,support,w*.91,h*.48,w*.27,supportSize,accent,'right');ctx.fillStyle=c(ink,.4);ctx.fillRect(w*.69,h*.61,w*.22,2*u)}
    }else if(mode==='scene_depth'){
      for(let n=7;n>=1;n--){ctx.save();ctx.globalAlpha*=intro*(.07+.065*(7-n));
        ctx.translate((7-n)*4*u,(7-n)*(-6*u));ctx.scale(1+n*.028,1+n*.028);
        headline(ctx,raw,hx,hy,size,n%2?accent:theme.second,'transparent');ctx.restore()}
      ctx.save();ctx.globalAlpha*=intro;ctx.translate(0,Math.sin(t*2)*5*u);
      headline(ctx,raw,hx,hy,size,ink,'rgba(5,5,12,.96)',10*u);ctx.restore();
      supporting(ctx,(parts.top+' '+parts.bottom).trim(),w*.5,h*.72,w*.76,supportSize,accent);
    }else if(mode==='scene_burst'){
      const hit=Math.pow(Math.max(0,Math.sin(t*4.5)),9),scale=.65+.35*intro+hit*.10*power+(pulse||0)*.07;
      ctx.save();ctx.translate(hx,hy);ctx.rotate((1-intro)*-.13);ctx.scale(scale,scale);ctx.globalAlpha*=intro;
      ctx.shadowColor=accent;ctx.shadowBlur=(14+hit*26)*u;
      headline(ctx,raw,0,0,size,ink,'rgba(5,5,12,.96)');ctx.restore();
      ctx.globalAlpha=outro*intro;supporting(ctx,(parts.top+' '+parts.bottom).trim(),w*.5,h*.71,w*.78,supportSize,accent);
    }else{
      const breath=1+Math.sin(t*1.6)*.025;
      ctx.save();ctx.translate(hx,hy);ctx.scale(breath*intro,breath*intro);
      headline(ctx,raw,0,0,size,ink,'rgba(4,5,11,.94)');ctx.restore();
      ctx.globalAlpha=outro*intro;supporting(ctx,parts.top,w*.18,h*.31,w*.7,supportSize,c(accent,.84),'left');
      supporting(ctx,parts.bottom,w*.18,h*.66,w*.7,supportSize,ink,'left');
      ctx.fillStyle=accent;ctx.fillRect(w*.15,h*.72,w*.12,2*u);
    }
    ctx.restore();
  }
  window.LyricScenes={render,names,textParts};
})();
