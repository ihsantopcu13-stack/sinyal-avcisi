
(function(){
  const ARAMA_MODULLER=[
    {ad:'Dashboard',anahtar:'Dashboard',ikon:'📊'},
    {ad:'Sinyal Lab',anahtar:'Sinyal Lab',ikon:'🔬'},
    {ad:'Günlük Tuzak',anahtar:'Günlük Tuzak',ikon:'🎯'},
    {ad:'SAT Metodu',anahtar:'SAT Metodu',ikon:'⚡'},
    {ad:'Paragraf',anahtar:'Paragraf',ikon:'📖'},
    {ad:'S+V+O',anahtar:'S+V+O',ikon:'📐'},
    {ad:'Kelime Kartları',anahtar:'Kelime Kartları',ikon:'🃏'},
    {ad:'Avcı Master',anahtar:'Avcı Master',ikon:'🏹'},
    {ad:'Raporlar',anahtar:'Raporlar',ikon:'📈'},
    {ad:'Hata Defteri',anahtar:'Hata Defteri',ikon:'📝'},
    {ad:'Zayıf Alan Radarı',anahtar:'Zayıf Alan Radarı',ikon:'🎯'},
    {ad:'İstatistiklerim',anahtar:'İstatistiklerim',ikon:'📊'},
    {ad:'Çalışma Planım',anahtar:'Çalışma Planım',ikon:'📅'},
    {ad:'Acil Kurtarma Planı',anahtar:'Acil Kurtarma Planı',ikon:'🚨'},
    {ad:'Liderlik',anahtar:'Liderlik',ikon:'🏆'},
    {ad:'Mini Dersler',anahtar:'Mini Dersler',ikon:'🎬'},
    {ad:'Canlı Ders',anahtar:'Canlı Ders',ikon:'🎓'},
    {ad:'KLOD — AI Öğretmen',anahtar:'KLOD',ikon:'🤖'},
    {ad:'Ses Kurs',anahtar:'Ses Kurs',ikon:'🎧'},
    {ad:'Öğrenme Teknikleri',anahtar:'Öğrenme',ikon:'🧠'},
    {ad:'Dil Avcısı',anahtar:'DİL AVCISI',ikon:'🌍'},
  ];
  const ARAMA_DIL_AVCISI_ALT=[
    {ad:'Fonetik Dedektif',id:'fd-modul',ikon:'🔬'},
    {ad:'Anlama Modülü',id:'anlama-modul',ikon:'🧩'},
    {ad:'Kelime Hafızası',id:'kelime-hafiza-modul',ikon:'🧠'},
    {ad:'Paragraf Diseksiyonu',id:'paragraf-diseksiyon-modul',ikon:'✂️'},
    {ad:'Soru Tipi Tespiti',id:'soru-tipi-modul',ikon:'🧭'},
    {ad:'Sınav Simülatörü',id:'sinav-simulator-modul',ikon:'📝'},
    {ad:'Günlük Antrenman',id:'gunluk-antrenman-modul',ikon:'☀️'},
  ];

  function aramaEscHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function aramaModulGit(anahtar){
    const item=[...document.querySelectorAll('.dn-item')].find(e=>e.textContent.includes(anahtar));
    if(item)item.click();
    document.getElementById('dashboard')?.scrollIntoView({behavior:'smooth'});
  }

  function aramaDilAvcisiAltGit(scrollId,sonAksiyon){
    const item=[...document.querySelectorAll('.dn-item')].find(e=>e.textContent.includes('DİL AVCISI'));
    if(item)item.click();
    setTimeout(()=>{
      const el=document.getElementById(scrollId);
      if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
      if(sonAksiyon)setTimeout(sonAksiyon,350);
    },300);
  }

  let ARAMA_INDEX=null;
  function aramaIndexOlustur(){
    const idx=[];
    ARAMA_MODULLER.forEach(m=>{
      idx.push({baslik:m.ad,kategori:'Modül',ikon:m.ikon,aksiyon:()=>aramaModulGit(m.anahtar)});
    });
    ARAMA_DIL_AVCISI_ALT.forEach(m=>{
      idx.push({baslik:m.ad,kategori:'Dil Avcısı',ikon:m.ikon,aksiyon:()=>aramaDilAvcisiAltGit(m.id)});
    });
    if(typeof CL_KONULAR!=='undefined'){
      CL_KONULAR.forEach((k,i)=>{
        idx.push({baslik:k.baslik,altbaslik:(k.aciklama||'').slice(0,80),kategori:'Canlı Ders',ikon:'🎓',aksiyon:()=>medyaCanliDersGit(i)});
      });
    }
    if(window.AM_TEKNIKLER){
      window.AM_TEKNIKLER.forEach(t=>{
        idx.push({baslik:t.baslik,altbaslik:t.neZaman,kategori:'Anlama Tekniği',ikon:t.ikon,aksiyon:()=>aramaDilAvcisiAltGit('anlama-modul',()=>{if(typeof amKartAc==='function')amKartAc(t.no);})});
      });
    }
    if(window.KH_KELIMELER){
      window.KH_KELIMELER.forEach(k=>{
        idx.push({baslik:k.kelime.toUpperCase(),altbaslik:k.anlam,kategori:'Kelime',ikon:'🃏',aksiyon:()=>aramaDilAvcisiAltGit('kelime-hafiza-modul')});
      });
    }
    if(typeof FONETIK_SESLILER!=='undefined'){
      FONETIK_SESLILER.forEach((s,i)=>{
        idx.push({baslik:s.harf+' Sesi — kısa/uzun okunuş',altbaslik:s.aciklama,kategori:'Fonetik',ikon:'🔤',aksiyon:()=>aramaDilAvcisiAltGit('fon-grid',()=>{if(typeof fonetikSesliAc==='function')fonetikSesliAc(i);})});
      });
    }
    if(typeof OKUMA_DIGRAPHS!=='undefined'){
      OKUMA_DIGRAPHS.forEach((d,i)=>{
        idx.push({baslik:'"'+d.harfler+'" harf çifti ('+d.ses+')',altbaslik:d.ipucu,kategori:'Okuma Kuralı',ikon:'📖',aksiyon:()=>aramaDilAvcisiAltGit('ok-grid',()=>{if(typeof okumaDigraphAc==='function')okumaDigraphAc(i);})});
      });
    }
    if(window.ST_TIPLER){
      window.ST_TIPLER.forEach(t=>{
        idx.push({baslik:t.teknikAdi,altbaslik:t.etiket,kategori:'Soru Tipi',ikon:'🧭',aksiyon:()=>aramaDilAvcisiAltGit('soru-tipi-modul')});
      });
    }
    return idx;
  }

  function aramaVurgula(baslik,sorgu){
    const esc=aramaEscHtml(baslik);
    const q=sorgu.trim();
    if(!q)return esc;
    const idx=esc.toLowerCase().indexOf(q.toLowerCase());
    if(idx===-1)return esc;
    return esc.slice(0,idx)+'<mark>'+esc.slice(idx,idx+q.length)+'</mark>'+esc.slice(idx+q.length);
  }

  function aramaFiltrele(sorgu){
    if(!ARAMA_INDEX)ARAMA_INDEX=aramaIndexOlustur();
    const q=sorgu.trim().toLowerCase();
    if(!q)return [];
    return ARAMA_INDEX.filter(it=>{
      const hay=(it.baslik+' '+(it.altbaslik||'')+' '+it.kategori).toLowerCase();
      return hay.includes(q);
    }).slice(0,40);
  }

  let aramaMevcutSonuclar=[];
  let aramaSeciliIndex=-1;

  function aramaRenderSonuclar(sonuclar,sorgu){
    const el=document.getElementById('arama-sonuclar');
    aramaSeciliIndex=sonuclar.length?0:-1;
    if(!sorgu.trim()){
      el.innerHTML='<div class="arama-bos">Modül, konu, kelime veya soru tipi aramak için yazmaya başla...</div>';
      return;
    }
    if(!sonuclar.length){
      el.innerHTML='<div class="arama-bos">"'+aramaEscHtml(sorgu)+'" için sonuç bulunamadı.</div>';
      return;
    }
    el.innerHTML=sonuclar.map((s,i)=>`
      <div class="arama-sonuc-item${i===0?' arama-secili':''}" onclick="aramaSonucSec(${i})" role="button" tabindex="0">
        <div class="arama-sonuc-ikon">${s.ikon}</div>
        <div class="arama-sonuc-metin">
          <div class="arama-sonuc-baslik">${aramaVurgula(s.baslik,sorgu)}</div>
          ${s.altbaslik?`<div class="arama-sonuc-alt">${aramaEscHtml(s.altbaslik)}</div>`:''}
        </div>
        <div class="arama-sonuc-kategori">${aramaEscHtml(s.kategori)}</div>
      </div>
    `).join('');
  }

  function aramaAra(){
    const sorgu=document.getElementById('arama-input').value;
    aramaMevcutSonuclar=aramaFiltrele(sorgu);
    aramaRenderSonuclar(aramaMevcutSonuclar,sorgu);
  }

  function aramaSonucSec(i){
    const s=aramaMevcutSonuclar[i];
    if(!s)return;
    globalAramaKapat();
    setTimeout(()=>{ if(s.aksiyon)s.aksiyon(); },200);
  }

  function aramaSeciliGuncelle(){
    document.querySelectorAll('#arama-sonuclar .arama-sonuc-item').forEach((el,i)=>{
      el.classList.toggle('arama-secili',i===aramaSeciliIndex);
    });
    const secili=document.querySelector('#arama-sonuclar .arama-sonuc-item.arama-secili');
    if(secili)secili.scrollIntoView({block:'nearest'});
  }

  function globalAramaKeydown(e){
    if(e.key==='Escape'){globalAramaKapat();return;}
    if(e.key==='ArrowDown'){e.preventDefault();if(aramaMevcutSonuclar.length){aramaSeciliIndex=Math.min(aramaSeciliIndex+1,aramaMevcutSonuclar.length-1);aramaSeciliGuncelle();}return;}
    if(e.key==='ArrowUp'){e.preventDefault();if(aramaMevcutSonuclar.length){aramaSeciliIndex=Math.max(aramaSeciliIndex-1,0);aramaSeciliGuncelle();}return;}
    if(e.key==='Enter'){e.preventDefault();if(aramaSeciliIndex>=0)aramaSonucSec(aramaSeciliIndex);return;}
  }

  function globalAramaAc(){
    if(!ARAMA_INDEX)ARAMA_INDEX=aramaIndexOlustur();
    const modal=document.getElementById('arama-modal');
    modal.classList.add('acik');
    const input=document.getElementById('arama-input');
    input.value='';
    aramaRenderSonuclar([],'');
    setTimeout(()=>input.focus(),50);
    document.body.style.overflow='hidden';
  }

  function globalAramaKapat(){
    document.getElementById('arama-modal').classList.remove('acik');
    document.body.style.overflow='';
  }

  window.addEventListener('keydown',function(e){
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){
      e.preventDefault();
      globalAramaAc();
    }
  });

  window.globalAramaAc=globalAramaAc;
  window.globalAramaKapat=globalAramaKapat;
  window.globalAramaKeydown=globalAramaKeydown;
  window.aramaAra=aramaAra;
  window.aramaSonucSec=aramaSonucSec;
})();



(function(){
  const ahkKok = document.getElementById('aha-karti-modul');
  if (ahkKok) {
    ahkKok.addEventListener('click', function(e){
      const card = e.target.closest('[data-ahk-action="flip"]');
      if(!card)return;
      card.classList.toggle('ahk-flipped');
    });
  }

  window.ahkGit = function(){
    const item=[...document.querySelectorAll('.dn-item')].find(function(e){ return e.textContent.includes('DİL AVCISI'); });
    if(item)item.click();
    setTimeout(function(){
      const el=document.getElementById('aha-karti-modul');
      if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
    },300);
  };
})();
