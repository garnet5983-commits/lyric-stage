/* Thirty real Japanese typefaces, fetched for the characters in this project. */
(() => {
  const families=[
    'Noto Sans JP','Noto Serif JP','M PLUS 1p','M PLUS Rounded 1c','Kosugi','Kosugi Maru',
    'Sawarabi Gothic','Sawarabi Mincho','Zen Kaku Gothic New','Zen Kaku Gothic Antique',
    'Zen Maru Gothic','Zen Old Mincho','Zen Antique','Zen Antique Soft','Dela Gothic One',
    'DotGothic16','Rampart One','Reggae One','RocknRoll One','Stick','Train One',
    'Hachi Maru Pop','Kiwi Maru','Shippori Mincho','Shippori Mincho B1',
    'Shippori Antique','Shippori Antique B1','BIZ UDPGothic','BIZ UDPMincho','Kaisei Decol'
  ];
  const list=families.map((name,i)=>({id:`web${i}`,name,alias:`LyricWeb${i}`}));
  const active=new Map(), pending=new Map();
  const unique=text=>Array.from(new Set(Array.from(String(text||'').replace(/[【】]/g,'')))).sort().join('');
  const entry=id=>list.find(x=>x.id===id);
  function cssFamily(id){const face=entry(id);return face?`"${face.alias}","Hiragino Kaku Gothic ProN",sans-serif`:null}
  async function load(id,source){
    const face=entry(id);if(!face)return true;
    const requested=unique(source)||'歌詞 光 夜 愛 夢 未来 音';
    if(active.has(id)&&Array.from(requested).every(c=>active.get(id).chars.includes(c)))return true;
    if(pending.has(id))return pending.get(id);
    const task=(async()=>{
      const cache=await caches.open('lyric-stage-fonts-v1');
      const base=new URL(`./font-${id}`,location.href).href;
      const meta=await cache.match(base+'-chars');
      const stored=meta?await meta.text():'';
      let bytes;
      if(stored&&Array.from(requested).every(c=>stored.includes(c))){
        const hit=await cache.match(base+'-data');bytes=hit&&await hit.arrayBuffer();
      }
      let chars=stored;
      if(!bytes){
        chars=unique(stored+requested);
        try{
          const cssURL=`https://fonts.googleapis.com/css2?family=${encodeURIComponent(face.name).replace(/%20/g,'+')}&text=${encodeURIComponent(chars)}&display=swap`;
          const cssResponse=await fetch(cssURL);
          if(!cssResponse.ok)throw new Error('フォントのCSSを取得できません');
          const stylesheet=await cssResponse.text();
          const urls=Array.from(stylesheet.matchAll(/url\((['"]?)(https:\/\/fonts\.gstatic\.com\/[^)'"\s]+)\1\)/g),m=>m[2]);
          if(urls.length!==1)throw new Error('フォント形式を解析できません');
          const fontResponse=await fetch(urls[0]);if(!fontResponse.ok)throw new Error('フォントデータを取得できません');
          bytes=await fontResponse.arrayBuffer();
          await cache.put(base+'-data',new Response(bytes));
          await cache.put(base+'-chars',new Response(chars));
        }catch(error){
          const hit=await cache.match(base+'-data');
          if(!hit)throw error;
          bytes=await hit.arrayBuffer();chars=stored;
        }
      }
      const loaded=new FontFace(face.alias,bytes,{weight:'100 900'});
      await loaded.load();if(active.has(id))document.fonts.delete(active.get(id).face);document.fonts.add(loaded);
      active.set(id,{chars,face:loaded});
      return Array.from(requested).every(c=>chars.includes(c));
    })().finally(()=>pending.delete(id));
    pending.set(id,task);return task;
  }
  window.LyricFonts={list,ids:['bold','serif','rounded','mono',...list.map(x=>x.id)],cssFamily,load};
})();
