/* Canvas compositions shared by playback and export. Shapes are tied to phrase time and beat energy. */
(() => {
  const TAU=Math.PI*2,clamp=x=>Math.max(0,Math.min(1,x));
  const names={none:'模様なし',rings:'同心円と放射線',grid:'モジュラーグリッド',tunnel:'透視トンネル',moire:'波紋・モアレ',tiles:'六角タイル',prism:'回転プリズム',ribbons:'折り紙の帯',stencil:'文字の切り抜き'};
  const ids=Object.keys(names).filter(x=>x!=='none');
  const rgba=(hex,a)=>{const n=parseInt((hex||'#ffffff').slice(1),16);return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`};
  function line(ctx,x,y,X,Y){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(X,Y);ctx.stroke()}
  function hex(ctx,x,y,r){ctx.beginPath();for(let k=0;k<6;k++){const a=TAU*k/6;ctx[k?'lineTo':'moveTo'](x+Math.cos(a)*r,y+Math.sin(a)*r)}ctx.closePath()}
  function render({ctx,canvas,phrase,time,pulse,themeName,intensity,pattern}){
    if(!pattern||pattern==='none')return;
    const w=canvas.width,h=canvas.height,u=Math.min(w,h)/540,t=Math.max(0,time-phrase.start),p=clamp(pulse||0);
    const colors={cinema:'#f2cc83',neon:'#ff65c0',mono:'#ffffff',electric:'#d4ff40'};
    const accent=phrase.color||colors[themeName]||colors.cinema;
    const power=Math.max(.2,Math.min(1.3,intensity/100)),fade=clamp(t/.48),cx=w*.5,cy=h*.51;
    ctx.save();ctx.globalAlpha=fade*(.75+.25*power);ctx.strokeStyle=rgba(accent,.5);ctx.fillStyle=rgba(accent,.15);ctx.lineWidth=1.5*u;
    if(pattern==='rings'){
      const r=Math.min(w*.48,h*.32);
      for(let k=0;k<7;k++){const rr=r*(.13+k*.14)+p*5*u;ctx.globalAlpha=fade*(k%2?.15:.4);ctx.beginPath();ctx.arc(cx,cy,rr,0,TAU);ctx.stroke()}
      ctx.globalAlpha=fade*.35;for(let k=0;k<36;k++){const a=TAU*k/36+t*.075;line(ctx,cx+Math.cos(a)*r*.75,cy+Math.sin(a)*r*.75,cx+Math.cos(a)*r*(1.1+p*.15),cy+Math.sin(a)*r*(1.1+p*.15))}
    }else if(pattern==='grid'){
      const cols=8,rows=Math.ceil(h/(w/cols)),s=w/cols;
      for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
        const q=clamp((t-(x+y)*.032)/.38),osc=Math.sin(t*1.8+x*1.7+y*.9);
        if(q<=0)continue;ctx.globalAlpha=q*(osc>0?.29:.13)*fade;
        const px=x*s,py=y*s;ctx.strokeRect(px+2*u,py+2*u,s-4*u,s-4*u);
        if((x+2*y)%5===0){ctx.fillStyle=rgba(accent,.2+.12*p);ctx.fillRect(px+4*u,py+4*u,(s-8*u)*q,s-8*u)}
      }
    }else if(pattern==='tunnel'){
      const horizon=h*.52,step=(t*.26)%1;
      for(let i=0;i<12;i++){let z=((i+step)/12)**2,half=w*(.035+z*1.15);ctx.globalAlpha=fade*(.12+.35*z);ctx.strokeRect(cx-half,horizon-half*.56,half*2,half*1.12)}
      ctx.globalAlpha=fade*.3;for(const x of [-2,-1.2,-.5,.5,1.2,2])line(ctx,cx,horizon,cx+x*w,h);
    }else if(pattern==='moire'){
      ctx.save();ctx.beginPath();ctx.rect(w*.04,h*.16,w*.92,h*.67);ctx.clip();
      ctx.globalAlpha=fade*.32;for(let i=0;i<52;i++){
        ctx.beginPath();for(let x=0;x<=w;x+=8*u){const y=h*.18+i*12*u+Math.sin(x/(29*u)+t*1.25+i*.21)*((7+i*.1)*u+p*9*u);x?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke()
      }ctx.restore();
    }else if(pattern==='tiles'){
      const r=w/11,dx=r*1.74,dy=r*1.5;
      for(let y=-1;y<h/dy+1;y++)for(let x=-1;x<w/dx+1;x++){
        const px=x*dx+(y%2)*dx*.5,py=y*dy;
        const q=clamp((t-((x*7+y*13+41)%13)*.045)/.6);
        ctx.globalAlpha=fade*q*((x+y)%4===0?.45:.15);hex(ctx,px,py,r*(.7+.17*Math.sin(t*2+x+y)));ctx.stroke();
        if((x+2*y)%7===0){ctx.fillStyle=rgba(accent,.16+p*.1);ctx.fill()}
      }
    }else if(pattern==='prism'){
      ctx.translate(cx,cy);ctx.rotate(t*.09);const radius=Math.max(w,h)*.78;
      for(let k=0;k<16;k++){
        const a=k*TAU/16,b=(k+1)*TAU/16;
        ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*radius,Math.sin(a)*radius);ctx.lineTo(Math.cos(b)*radius,Math.sin(b)*radius);ctx.closePath();
        ctx.globalAlpha=fade*(k%2?.1:.24);ctx.fillStyle=rgba(accent,.55);ctx.fill();ctx.strokeStyle=rgba(accent,.8);ctx.stroke()
      }
      for(let r=90*u;r<radius;r+=85*u){ctx.globalAlpha=fade*.22;ctx.beginPath();ctx.arc(0,0,r+p*10*u,0,TAU);ctx.stroke()}
    }else if(pattern==='ribbons'){
      for(let k=-4;k<8;k++){
        const y=k*h/8+Math.sin(t*.7+k)*12*u,shift=(k%2?1:-1)*w*.11*Math.sin(t*.5);
        ctx.beginPath();ctx.moveTo(-w*.3,y);ctx.lineTo(w*.52+shift,y+h*.09);ctx.lineTo(w*1.3,y-h*.03);ctx.lineTo(w*1.3,y+h*.08);ctx.lineTo(w*.52+shift,y+h*.20);ctx.lineTo(-w*.3,y+h*.1);ctx.closePath();
        ctx.globalAlpha=fade*(k%3===0?.27:.13);ctx.fillStyle=rgba(accent,.8);ctx.fill();ctx.strokeStyle=rgba(accent,.8);ctx.stroke()
      }
    }
    ctx.restore();
  }
  function typeGrid({ctx,canvas,phrase,time,pulse,font,color,themeName}){
    const glyphs=Array.from(String(phrase.text).replace(/[【】\s]/g,''));
    if(glyphs.length>20)return false;
    const w=canvas.width,h=canvas.height,u=Math.min(w,h)/540,t=Math.max(0,time-phrase.start);
    const columns=Math.min(4,Math.max(2,Math.ceil(Math.sqrt(glyphs.length)))),rows=Math.ceil(glyphs.length/columns);
    const size=Math.min(w*.205,h*.53/rows),left=(w-columns*size)/2,top=(h-rows*size)/2;
    const accent=phrase.color||{cinema:'#f2cc83',neon:'#ff65c0',mono:'#ffffff',electric:'#d4ff40'}[themeName];
    const family=window.LyricFonts.cssFamily(font)||'"Hiragino Kaku Gothic ProN",sans-serif';
    ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`900 ${size*.65}px ${family}`;
    glyphs.forEach((g,i)=>{
      const x=left+i%columns*size,y=top+Math.floor(i/columns)*size,q=clamp((t-i*.065)/.43);
      if(!q)return;
      ctx.save();ctx.globalAlpha=q;ctx.translate(x+size/2,y+size/2+(1-q)*size*.32);
      ctx.rotate((1-q)*(i%2?-.19:.19));
      ctx.fillStyle=rgba(accent,(i%5===0?.45:.19)+(pulse||0)*.15);
      ctx.fillRect(-size*.46,-size*.46,size*.92*q,size*.92);
      ctx.strokeStyle=rgba(accent,.75);ctx.lineWidth=1.5*u;ctx.strokeRect(-size*.46,-size*.46,size*.92,size*.92);
      ctx.lineWidth=7*u;ctx.strokeStyle='#090a18';ctx.strokeText(g,0,0);
      ctx.fillStyle=color||'#ffffff';ctx.fillText(g,0,0);ctx.restore();
    });ctx.restore();return true;
  }
  // Draw a tinted panel, then subtract glyphs from it so the footage shines through the letterforms.
  let mask;
  function stencil({ctx,canvas,phrase,time,themeName,font}){
    const w=canvas.width,h=canvas.height,u=Math.min(w,h)/540,t=Math.max(0,time-phrase.start);
    const word=window.LyricScenes.textParts(phrase.text).hero;if(!word)return;
    if(!mask)mask=document.createElement('canvas');if(mask.width!==w||mask.height!==h){mask.width=w;mask.height=h}
    const m=mask.getContext('2d');m.clearRect(0,0,w,h);
    const alpha=clamp(t/.5)*.93;m.fillStyle=themeName==='mono'?`rgba(255,255,255,${alpha})`:`rgba(7,9,23,${alpha})`;
    m.save();m.translate(w*.5,h*.5);m.rotate(-.06);m.fillRect(-w*.7,-h*.13,w*1.4,h*.26);m.restore();
    m.globalCompositeOperation='destination-out';m.textAlign='center';m.textBaseline='middle';
    let size=Math.min(150*u,w*.28);const family=window.LyricFonts.cssFamily(font)||'"Hiragino Kaku Gothic ProN",sans-serif';
    m.font=`900 ${size}px ${family}`;while(m.measureText(word).width>w*.84&&size>25*u){size-=3*u;m.font=`900 ${size}px ${family}`}
    m.fillStyle='#000';m.fillText(word,w*.5,h*.5);m.globalCompositeOperation='source-over';
    ctx.drawImage(mask,0,0);
    const rest=window.LyricScenes.textParts(phrase.text);
    const sub=(rest.top+' '+rest.bottom).trim();
    if(sub){ctx.save();ctx.font=`700 ${Math.max(19*u,Math.min(29*u,w*.053))}px ${family}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#ffffff';ctx.shadowColor='#090a18';ctx.shadowBlur=14*u;ctx.fillText(sub,w*.5,h*.68,w*.82);ctx.restore()}
  }
  window.LyricGeometry={names,ids,render,stencil,typeGrid};
})();
