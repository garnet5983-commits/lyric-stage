/* LYRIC STAGE motion renderer. All dimensions scale from the preview to Full HD. */
(() => {
  const TAU = Math.PI * 2;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const ease = x => 1 - Math.pow(1 - clamp(x), 3);
  const outBack = x => { x = clamp(x) - 1; return 1 + 2.70158 * x*x*x + 1.70158 * x*x; };
  const rgba = (hex, alpha) => {
    const n = parseInt((hex || '#ffffff').slice(1), 16);
    return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${alpha})`;
  };
  const themes = {
    cinema: { accent:'#f2cc83', second:'#fff3d9', ink:'#faf7f1', tag:'CINEMA' },
    neon: { accent:'#ff65c0', second:'#79eaff', ink:'#ffffff', tag:'AFTER DARK' },
    mono: { accent:'#ffffff', second:'#9a9a9a', ink:'#ffffff', tag:'MONO' },
    electric: { accent:'#d4ff40', second:'#9589ff', ink:'#ffffff', tag:'ELECTRIC' }
  };
  const labels = {
    cinema:'シネマ', punch:'インパクト', kinetic:'文字ごと', neon:'ネオン', editorial:'エディトリアル', echo:'残像', wipe:'ワイプ', split:'スプリット', spotlight:'スポット', karaoke:'カラー進行', minimal:'ミニマル',
    float:'ゆっくり漂う', heartbeat:'鼓動', jitter:'細かく震える', chromatic:'RGB色ずれ', glitch:'グリッチ', orbit:'軌道を描く', ripple:'文字の波', bounce:'跳ねる', spin:'揺れる回転', cascade:'連鎖', scroll:'横スライド', flip:'反転', laser:'レーザースキャン', breathing:'呼吸', dance:'踊る文字', tilt:'傾く', flash:'光の爆発', rain:'文字の雨', trace:'なぞり塗り', smear:'スピード残像'
  };
  Object.assign(labels,window.LyricScenes.names);
  const keys = Object.keys(labels);
  const fontCSS = (font, size) => `${font === 'serif' ? '700' : '900'} ${size}px ${window.LyricFonts.cssFamily(font) || (font === 'serif' ? '"Hiragino Mincho ProN","Yu Mincho",serif' : font === 'mono' ? 'ui-monospace,Menlo,monospace' : font === 'rounded' ? '"Hiragino Maru Gothic ProN",system-ui,sans-serif' : '"Hiragino Kaku Gothic ProN",system-ui,sans-serif')}`;
  const fontFace = (font) => fontCSS(font, 12).replace(/^\d+ \d+px /, '');

  function linesFor(ctx, text, maxWidth) {
    const result = [];
    for (const row of text.split('\n')) {
      let line = '';
      for (const char of Array.from(row)) {
        if (line && ctx.measureText(line + char).width > maxWidth) { result.push(line); line = char; }
        else line += char;
      }
      result.push(line);
    }
    return result;
  }
  function roundRect(ctx, x, y, w, h, r) {
    const R = Math.min(r, h/2, w/2);
    ctx.beginPath(); ctx.moveTo(x+R,y); ctx.arcTo(x+w,y,x+w,y+h,R);
    ctx.arcTo(x+w,y+h,x,y+h,R); ctx.arcTo(x,y+h,x,y,R);
    ctx.arcTo(x,y,x+w,y,R); ctx.closePath();
  }
  function letterbox(ctx, w, h, u, opacity) {
    ctx.fillStyle = `rgba(0,0,0,${opacity})`;
    ctx.fillRect(0,0,w,Math.min(h*.052,u*29));
    ctx.fillRect(0,h-Math.min(h*.052,u*29),w,Math.min(h*.052,u*29));
  }
  function decoration(ctx, w, h, u, theme, effect, alpha) {
    ctx.save(); ctx.globalAlpha *= alpha;
    if (effect === 'cinema' || effect === 'minimal') {
      letterbox(ctx,w,h,u,effect==='cinema'?.88:.7);
      ctx.strokeStyle=rgba(theme.accent,.75);ctx.lineWidth=1.2*u;
      ctx.beginPath();ctx.moveTo(w*.08,h*.12);ctx.lineTo(w*.19,h*.12);ctx.moveTo(w*.81,h*.12);ctx.lineTo(w*.92,h*.12);ctx.stroke();
      ctx.font=`700 ${11*u}px system-ui,sans-serif`;ctx.letterSpacing=`${2*u}px`;
      ctx.fillStyle=rgba(theme.ink,.7);ctx.textAlign='left';ctx.fillText('LYRIC / STAGE',w*.08,h*.10);
    } else if(effect==='editorial') {
      ctx.fillStyle=rgba(theme.accent,.85);ctx.fillRect(w*.075,h*.27,4*u,h*.43);
      ctx.fillStyle=rgba(theme.accent,.12);ctx.fillRect(w*.075,h*.27,w*.84,1.5*u);
      ctx.font=`700 ${12*u}px system-ui,sans-serif`;ctx.letterSpacing=`${3*u}px`;
      ctx.textAlign='left';ctx.fillStyle=theme.accent;ctx.fillText(theme.tag,w*.085,h*.25);
    } else if(effect==='neon' || effect==='spotlight') {
      const glow=ctx.createRadialGradient(w*.5,h*.5,0,w*.5,h*.5,w*.5);
      glow.addColorStop(0,rgba(theme.accent,effect==='neon'?.17:.13));glow.addColorStop(1,rgba(theme.accent,0));
      ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
    }
    ctx.restore();
  }
  function baseText(ctx, lines, x, y, lh, color, stroke, size, alpha = 1) {
    ctx.save();ctx.globalAlpha*=alpha;ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
    ctx.strokeStyle=stroke;ctx.lineWidth=Math.max(size*.11,4);ctx.fillStyle=color;
    lines.forEach((line,i)=>{const yy=y+(i-(lines.length-1)/2)*lh;ctx.strokeText(line,x,yy);ctx.fillText(line,x,yy)});ctx.restore();
  }
  function glyphs(ctx, lines, cx, cy, lh, fn) {
    ctx.textAlign='left';ctx.textBaseline='middle';let seq=0;
    lines.forEach((line,row)=>{const chars=Array.from(line);const widths=chars.map(c=>ctx.measureText(c).width);let x=cx-widths.reduce((a,b)=>a+b,0)/2;
      chars.forEach((ch,j)=>{fn(ch,x+widths[j]/2,cy+(row-(lines.length-1)/2)*lh,seq++,widths[j]);x+=widths[j]})});
  }
  function render({ctx,canvas,phrase,index,time,life,font,fontSize,color,themeName,intensity,pulse}) {
    if (!phrase || !phrase.text) return;
    const w=canvas.width,h=canvas.height,u=Math.min(w,h)/540;
    const theme=themes[themeName]||themes.cinema;
    const effect=keys.includes(phrase.effect)?phrase.effect:'cinema';
    if(effect.startsWith('scene_')){window.LyricScenes.render({ctx,canvas,phrase,time,life,font,fontSize,color,theme,intensity,pulse});return}
    const local=Math.max(0,time-phrase.start),tail=clamp((life-local)/.27),entry=ease(local/(effect==='minimal'?.42:.56));
    const amp=clamp(Number(intensity)/100||.7,.1,1.5);
    const p=clamp(pulse||0),ink=color||theme.ink,accent=phrase.color||theme.accent;
    let size=fontSize*u, lineHeight=size*1.21;ctx.font=fontCSS(font,size);
    let lines=linesFor(ctx,phrase.text.replace(/[【】]/g,''),w*(effect==='editorial'?.71:.82));
    while(lines.length>3 && size>24*u){size*=.92;ctx.font=fontCSS(font,size);lines=linesFor(ctx,phrase.text.replace(/[【】]/g,''),w*.82)}
    lineHeight=size*1.19;
    const cy=h*(effect==='minimal'?.76:effect==='editorial'?.51:.53);
    const cx=effect==='editorial'?w*.5:w*.5;
    const outline=themeName==='mono'?'rgba(0,0,0,.9)':'rgba(7,6,18,.92)';
    ctx.save();ctx.globalAlpha=tail;decoration(ctx,w,h,u,theme,effect,entry);
    if(effect==='cinema') {
      ctx.save();ctx.beginPath();const spread=ease(local/.65)*h*.6;ctx.rect(0,cy-spread,w,spread*2);ctx.clip();
      ctx.translate(0,(1-entry)*24*u*amp);ctx.globalAlpha=entry;
      ctx.shadowColor=rgba(accent,.5);ctx.shadowBlur=18*u*amp;
      baseText(ctx,lines,cx,cy,lineHeight,ink,outline,size);ctx.restore();
      ctx.fillStyle=rgba(accent,entry*.9);ctx.fillRect(w*.42,cy+lines.length*lineHeight*.55+20*u,w*.16,2*u);
    } else if(effect==='punch') {
      const shock=clamp(local/.15),bounce=outBack(local/.49);
      const shake=(1-shock)*Math.sin(local*95)*18*u*amp;
      ctx.save();ctx.translate(cx+shake,cy);ctx.scale(Math.max(.12,bounce),Math.max(.12,bounce));
      ctx.globalAlpha=entry;ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
      ctx.lineWidth=size*.12;ctx.strokeStyle=outline;ctx.fillStyle=ink;
      ctx.shadowColor=rgba(accent,.85);ctx.shadowBlur=(14+22*p)*u*amp;
      lines.forEach((line,i)=>{let y=(i-(lines.length-1)/2)*lineHeight;ctx.strokeText(line,0,y);ctx.fillText(line,0,y)});ctx.restore();
      ctx.save();ctx.globalAlpha=(1-ease(local/.42))*.5;ctx.strokeStyle=accent;ctx.lineWidth=3*u;
      ctx.beginPath();ctx.ellipse(cx,cy,w*.46*shock,h*.17*shock,0,0,TAU);ctx.stroke();ctx.restore();
    } else if(effect==='kinetic') {
      ctx.save();ctx.shadowColor=rgba(accent,.65);ctx.shadowBlur=10*u*amp;
      glyphs(ctx,lines,cx,cy,lineHeight,(ch,x,y,n)=>{const q=ease((local-n*.043)/.39);
        if(q<=0)return;ctx.save();ctx.globalAlpha=q;ctx.translate(x,y+(1-q)*size*.95*amp);ctx.rotate((1-q)*(n%2?-.14:.14)*amp);
        ctx.scale(.7+.3*q,.7+.3*q);ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=size*.1;ctx.strokeStyle=outline;ctx.fillStyle=n%6===0?accent:ink;
        ctx.strokeText(ch,0,0);ctx.fillText(ch,0,0);ctx.restore()});ctx.restore();
    } else if(effect==='neon') {
      const flicker=local<.4?(Math.sin(local*95)>-.3?.96:.37):1;
      ctx.save();ctx.globalAlpha=entry*flicker;ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.shadowColor=accent;ctx.shadowBlur=(25+25*p)*u*amp;ctx.strokeStyle=accent;ctx.lineWidth=2.5*u;
      lines.forEach((line,i)=>ctx.strokeText(line,cx,cy+(i-(lines.length-1)/2)*lineHeight));
      ctx.shadowBlur=(42+24*p)*u*amp;baseText(ctx,lines,cx,cy,lineHeight,ink,outline,size);ctx.restore();
      ctx.save();ctx.globalAlpha=entry;ctx.fillStyle=accent;ctx.shadowColor=accent;ctx.shadowBlur=13*u;
      ctx.fillRect(w*.2,cy+lines.length*lineHeight*.6,w*.6,2*u);ctx.restore();
    } else if(effect==='editorial') {
      ctx.save();ctx.globalAlpha=entry;ctx.beginPath();ctx.rect(w*.09,cy-lines.length*lineHeight*.8,w*.82,lines.length*lineHeight*1.6);ctx.clip();
      ctx.translate((1-entry)*(-w*.16)*amp,0);baseText(ctx,lines,cx,cy,lineHeight,ink,outline,size);ctx.restore();
      ctx.fillStyle=rgba(accent,entry);ctx.fillRect(w*.12,cy+lines.length*lineHeight*.68,w*.28*entry,2*u);
    } else if(effect==='echo') {
      ctx.save();ctx.globalAlpha=entry;
      for(let j=3;j>=1;j--){ctx.save();ctx.globalAlpha=.12+(3-j)*.045;ctx.translate(j*12*u*amp,-j*9*u*amp);
        baseText(ctx,lines,cx,cy,lineHeight,j%2?theme.second:accent,'transparent',size);ctx.restore()}
      baseText(ctx,lines,cx,cy,lineHeight,ink,outline,size);ctx.restore();
    } else if(effect==='wipe') {
      const sweep=ease(local/.57);ctx.save();ctx.beginPath();ctx.rect(0,0,w*sweep,h);ctx.clip();
      baseText(ctx,lines,cx,cy,lineHeight,ink,outline,size);ctx.restore();
      ctx.save();ctx.globalAlpha=(1-sweep)*.9;ctx.fillStyle=accent;ctx.shadowColor=accent;ctx.shadowBlur=21*u*amp;
      ctx.fillRect(w*sweep-2*u,cy-lines.length*lineHeight*.7,4*u,lines.length*lineHeight*1.4);ctx.restore();
    } else if(effect==='split') {
      const q=ease(local/.55);ctx.save();ctx.globalAlpha=q;
      lines.forEach((line,i)=>{const yy=cy+(i-(lines.length-1)/2)*lineHeight;
        ctx.save();ctx.beginPath();ctx.rect(0,yy-lineHeight*.8,w,lineHeight*.8);ctx.clip();
        ctx.translate((1-q)*(-w*.3)*amp,0);baseText(ctx,[line],cx,yy,lineHeight,ink,outline,size);ctx.restore();
        ctx.save();ctx.beginPath();ctx.rect(0,yy,w,lineHeight*.8);ctx.clip();
        ctx.translate((1-q)*(w*.3)*amp,0);baseText(ctx,[line],cx,yy,lineHeight,ink,outline,size);ctx.restore()});ctx.restore();
      ctx.fillStyle=rgba(accent,entry*.8);ctx.fillRect(w*.2,cy+lines.length*lineHeight*.62,w*.6,2*u);
    } else if(effect==='spotlight') {
      const lightX=cx+(1-entry)*w*.3;const grad=ctx.createRadialGradient(lightX,cy,5*u,lightX,cy,w*.65);
      grad.addColorStop(0,rgba(accent,.20*entry));grad.addColorStop(1,rgba(accent,0));ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
      ctx.save();ctx.globalAlpha=entry;ctx.shadowColor=accent;ctx.shadowBlur=(14+18*p)*u*amp;
      baseText(ctx,lines,cx,cy,lineHeight,ink,outline,size);ctx.restore();
    } else if(effect==='karaoke') {
      ctx.save();ctx.globalAlpha=entry;baseText(ctx,lines,cx,cy,lineHeight,rgba(ink,.65),outline,size);
      ctx.beginPath();const progress=clamp((local-.12)/Math.max(.45,life-.4));ctx.rect(0,0,w*progress,h);ctx.clip();
      ctx.shadowColor=accent;ctx.shadowBlur=12*u*amp;baseText(ctx,lines,cx,cy,lineHeight,accent,outline,size);ctx.restore();
      ctx.fillStyle=rgba(accent,.85*entry);ctx.fillRect(w*.17,cy+lines.length*lineHeight*.63,w*.66*clamp(local/life),2*u);
    } else if(effect==='float') {
      ctx.save();ctx.globalAlpha=entry;ctx.translate(0,Math.sin(local*2.5)*17*u*amp);
      ctx.rotate(Math.sin(local*1.2)*.025*amp);
      ctx.shadowColor=accent;ctx.shadowBlur=(8+8*p)*u*amp;
      baseText(ctx,lines,cx,cy,lineHeight,ink,outline,size);ctx.restore();
    } else if(effect==='heartbeat') {
      const beat=Math.pow(Math.max(0,Math.sin(local*5.5)),9);
      ctx.save();ctx.globalAlpha=entry;ctx.translate(cx,cy);ctx.scale(1+beat*.11*amp,1+beat*.11*amp);
      ctx.shadowColor=accent;ctx.shadowBlur=(8+beat*28)*u*amp;
      baseText(ctx,lines,0,0,lineHeight,ink,outline,size);ctx.restore();
      ctx.save();ctx.globalAlpha=beat*.5;ctx.strokeStyle=accent;ctx.lineWidth=2*u;
      ctx.beginPath();ctx.ellipse(cx,cy,w*.33+beat*w*.08,h*.1+beat*h*.04,0,0,TAU);ctx.stroke();ctx.restore();
    } else if(effect==='jitter') {
      const dx=(Math.sin(local*39)+Math.sin(local*73))*3.3*u*amp;
      const dy=Math.sin(local*54)*3.2*u*amp;
      ctx.save();ctx.globalAlpha=entry;ctx.translate(dx,dy);
      baseText(ctx,lines,cx,cy,lineHeight,ink,outline,size);ctx.restore();
      ctx.save();ctx.globalAlpha=.28*entry;ctx.translate(-dx*2,dy*.7);
      baseText(ctx,lines,cx,cy,lineHeight,accent,'transparent',size);ctx.restore();
    } else if(effect==='chromatic') {
      const shift=(5+Math.sin(local*11)*3)*u*amp;
      ctx.save();ctx.globalAlpha=entry*.7;ctx.globalCompositeOperation='screen';
      baseText(ctx,lines,cx-shift,cy,lineHeight,'#ff336b','transparent',size);
      baseText(ctx,lines,cx+shift,cy,lineHeight,'#38ddff','transparent',size);ctx.restore();
      ctx.save();ctx.globalAlpha=entry*.92;baseText(ctx,lines,cx,cy,lineHeight,ink,outline,size);ctx.restore();
    } else if(effect==='glitch') {
      ctx.save();ctx.globalAlpha=entry;baseText(ctx,lines,cx,cy,lineHeight,ink,outline,size);ctx.restore();
      const frame=Math.floor(local*13),bands=4;
      for(let j=0;j<bands;j++){
        const bandY=cy-(lines.length*lineHeight)/2+(j+.3)*lineHeight*lines.length/bands;
        const shift=Math.sin(frame*23+j*18)*Math.pow(Math.abs(Math.sin(frame*4+j)),8)*23*u*amp;
        if(Math.abs(shift)<3*u)continue;
        ctx.save();ctx.globalAlpha=.8*entry;ctx.beginPath();ctx.rect(0,bandY,w,Math.max(8*u,lineHeight*.19));ctx.clip();
        baseText(ctx,lines,cx+shift,cy,lineHeight,j%2?theme.second:accent,outline,size);ctx.restore();
      }
    } else if(effect==='orbit') {
      const dx=Math.cos(local*2.1)*12*u*amp,dy=Math.sin(local*2.1)*10*u*amp;
      ctx.save();ctx.globalAlpha=entry;ctx.translate(dx,dy);
      baseText(ctx,lines,cx,cy,lineHeight,ink,outline,size);ctx.restore();
      ctx.save();ctx.globalAlpha=.55*entry;ctx.strokeStyle=accent;ctx.lineWidth=1.5*u;
      ctx.beginPath();ctx.ellipse(cx,cy,w*.38,h*.13,Math.sin(local*.5)*.15,0,TAU);ctx.stroke();
      const theta=local*2.1;ctx.fillStyle=accent;ctx.beginPath();ctx.arc(cx+Math.cos(theta)*w*.38,cy+Math.sin(theta)*h*.13,4*u,0,TAU);ctx.fill();ctx.restore();
    } else if(effect==='ripple') {
      ctx.save();ctx.shadowColor=rgba(accent,.5);ctx.shadowBlur=8*u*amp;
      glyphs(ctx,lines,cx,cy,lineHeight,(ch,x,y,n)=>{
        const wave=Math.sin(local*5-n*.45)*15*u*amp;
        ctx.save();ctx.globalAlpha=entry;ctx.translate(x,y+wave);ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.strokeStyle=outline;ctx.lineWidth=5*u;ctx.fillStyle=n%5===0?accent:ink;
        ctx.strokeText(ch,0,0);ctx.fillText(ch,0,0);ctx.restore();
      });ctx.restore();
    } else if(effect==='bounce') {
      glyphs(ctx,lines,cx,cy,lineHeight,(ch,x,y,n)=>{
        const jump=Math.abs(Math.sin(local*4.2-n*.55))*20*u*amp;
        ctx.save();ctx.globalAlpha=entry;ctx.translate(x,y-jump);ctx.scale(1,1+jump/(180*u));
        ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=5*u;
        ctx.strokeStyle=outline;ctx.fillStyle=ink;ctx.strokeText(ch,0,0);ctx.fillText(ch,0,0);ctx.restore();
      });
    } else if(effect==='spin') {
      ctx.save();ctx.globalAlpha=entry;ctx.translate(cx,cy);
      ctx.rotate(Math.sin(local*2.9)*.08*amp);ctx.scale(1+Math.sin(local*4)*.025,1+Math.sin(local*4)*.025);
      baseText(ctx,lines,0,0,lineHeight,ink,outline,size);ctx.restore();
      ctx.fillStyle=accent;ctx.fillRect(w*.22,cy+lines.length*lineHeight*.65,w*.56,2*u);
    } else if(effect==='cascade') {
      glyphs(ctx,lines,cx,cy,lineHeight,(ch,x,y,n)=>{
        const appear=ease((local-n*.035)/.4);
        const movement=Math.sin(local*3.8-n*.5)*9*u*amp;
        ctx.save();ctx.globalAlpha=appear*tail;ctx.translate(x,y-(1-appear)*85*u*amp+movement);
        ctx.rotate((1-appear)*.2*(n%2?1:-1));ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.lineWidth=5*u;ctx.strokeStyle=outline;ctx.fillStyle=ink;
        ctx.strokeText(ch,0,0);ctx.fillText(ch,0,0);ctx.restore();
      });
    } else if(effect==='scroll') {
      const move=Math.sin(local*1.65)*w*.18*amp;
      ctx.save();ctx.globalAlpha=entry;ctx.beginPath();ctx.rect(w*.05,0,w*.9,h);ctx.clip();
      baseText(ctx,lines,cx+move,cy,lineHeight,ink,outline,size);ctx.restore();
      ctx.fillStyle=rgba(accent,.7);ctx.fillRect(w*.08,cy+lines.length*lineHeight*.7,w*.84,2*u);
    } else if(effect==='flip') {
      const scale=Math.max(.09,Math.abs(Math.cos(local*2.1)));
      ctx.save();ctx.globalAlpha=entry;ctx.translate(cx,cy);ctx.scale(scale,1);
      ctx.shadowColor=accent;ctx.shadowBlur=(1-scale)*25*u;
      baseText(ctx,lines,0,0,lineHeight,ink,outline,size);ctx.restore();
    } else if(effect==='laser') {
      ctx.save();ctx.globalAlpha=entry;baseText(ctx,lines,cx,cy,lineHeight,rgba(ink,.8),outline,size);ctx.restore();
      const x=w*.12+(local*0.65%1)*w*.76;
      ctx.save();ctx.beginPath();ctx.rect(x-31*u,0,62*u,h);ctx.clip();ctx.globalAlpha=entry;
      ctx.shadowColor=accent;ctx.shadowBlur=23*u*amp;
      baseText(ctx,lines,cx,cy,lineHeight,accent,'transparent',size);ctx.restore();
      ctx.fillStyle=rgba(accent,entry*.75);ctx.fillRect(x-1*u,cy-lines.length*lineHeight*.7,2*u,lines.length*lineHeight*1.4);
    } else if(effect==='breathing') {
      const scale=1+Math.sin(local*2.4)*.075*amp;
      ctx.save();ctx.globalAlpha=entry;ctx.translate(cx,cy);ctx.scale(scale,scale);
      ctx.shadowColor=accent;ctx.shadowBlur=(8+Math.sin(local*2.4)*6+14*p)*u*amp;
      baseText(ctx,lines,0,0,lineHeight,ink,outline,size);ctx.restore();
    } else if(effect==='dance') {
      glyphs(ctx,lines,cx,cy,lineHeight,(ch,x,y,n)=>{
        const offset=Math.sin(local*5+n*.9),rot=Math.sin(local*4+n*.63)*.11*amp;
        ctx.save();ctx.globalAlpha=entry;ctx.translate(x,y+offset*15*u*amp);ctx.rotate(rot);
        ctx.textAlign='center';ctx.textBaseline='middle';ctx.strokeStyle=outline;ctx.lineWidth=5*u;
        ctx.fillStyle=n%4===0?accent:ink;ctx.strokeText(ch,0,0);ctx.fillText(ch,0,0);ctx.restore();
      });
    } else if(effect==='tilt') {
      ctx.save();ctx.globalAlpha=entry;ctx.translate(cx,cy);
      const skew=Math.sin(local*2.6)*.19*amp;ctx.transform(1,0,skew,1,0,0);
      ctx.translate(Math.sin(local*2)*12*u*amp,0);
      baseText(ctx,lines,0,0,lineHeight,ink,outline,size);ctx.restore();
    } else if(effect==='flash') {
      const f=Math.pow(Math.max(0,Math.sin(local*3.2)),14);
      ctx.save();ctx.globalAlpha=entry;ctx.translate(cx,cy);ctx.scale(1+f*.10*amp,1+f*.10*amp);
      ctx.shadowColor=accent;ctx.shadowBlur=(7+f*35)*u*amp;
      baseText(ctx,lines,0,0,lineHeight,ink,outline,size);ctx.restore();
      ctx.save();ctx.globalAlpha=f*.48*entry;ctx.strokeStyle=accent;ctx.lineWidth=2*u;
      for(let n=0;n<12;n++){const a=n*TAU/12+local*.15;ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*w*.28,cy+Math.sin(a)*h*.1);ctx.lineTo(cx+Math.cos(a)*w*.38,cy+Math.sin(a)*h*.15);ctx.stroke()}ctx.restore();
    } else if(effect==='rain') {
      ctx.save();ctx.globalAlpha=entry;baseText(ctx,lines,cx,cy,lineHeight,ink,outline,size);ctx.restore();
      ctx.save();ctx.fillStyle=accent;
      for(let n=0;n<22;n++){
        const x=(n*79.7%w),y=((local*(38+n%5*9)*u+n*97)%(h+40*u))-20*u;
        ctx.globalAlpha=entry*(.13+n%4*.06);
        ctx.fillRect(x,y,Math.max(1,u),8*u+n%3*4*u);
      }ctx.restore();
    } else if(effect==='trace') {
      ctx.save();ctx.globalAlpha=entry;ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
      ctx.strokeStyle=ink;ctx.lineWidth=2*u;
      lines.forEach((line,i)=>ctx.strokeText(line,cx,cy+(i-(lines.length-1)/2)*lineHeight));ctx.restore();
      const progress=clamp((Math.sin(local*1.6-Math.PI/2)+1)/2);
      ctx.save();ctx.globalAlpha=entry;ctx.beginPath();ctx.rect(0,0,w*progress,h);ctx.clip();
      baseText(ctx,lines,cx,cy,lineHeight,accent,outline,size);ctx.restore();
    } else if(effect==='smear') {
      const dx=Math.sin(local*3.2)*32*u*amp;
      ctx.save();ctx.globalAlpha=.12*entry;
      for(let n=4;n>=1;n--)baseText(ctx,lines,cx-dx*n*.33,cy,lineHeight,n%2?accent:theme.second,'transparent',size);
      ctx.restore();ctx.save();ctx.globalAlpha=entry;
      baseText(ctx,lines,cx+dx,cy,lineHeight,ink,outline,size);ctx.restore();
    } else { // minimal lower-third
      ctx.save();ctx.globalAlpha=entry;ctx.translate(0,(1-entry)*22*u*amp);
      const boxH=lines.length*lineHeight+38*u;
      ctx.fillStyle='rgba(0,0,0,.48)';roundRect(ctx,w*.055,cy-boxH/2,w*.89,boxH,12*u);ctx.fill();
      ctx.fillStyle=accent;ctx.fillRect(w*.055,cy-boxH/2,4*u,boxH);
      baseText(ctx,lines,cx,cy,lineHeight,ink,'rgba(0,0,0,.1)',size*.78);ctx.restore();
    }
    ctx.restore();
  }
  window.LyricEffects={render,keys,labels,themes,fontFace};
})();
