
(function(){
  const PVM_TOTAL = 7;
  let pvmCurrent = 0;
  const PVM_CORRECT = { 1: 'b', 2: 'c' };
  const pvmQuizAnswered = { 1: false, 2: false };

  function pvmUpdateUI(){
    document.querySelectorAll('#passive-voice-modul .pvm-slide').forEach((s,i)=>s.classList.toggle('pvm-active', i===pvmCurrent));
    document.getElementById('pvm-prevBtn').disabled = pvmCurrent===0;
    document.getElementById('pvm-nextBtn').disabled = pvmCurrent===PVM_TOTAL-1;
    document.getElementById('pvm-slideCounter').textContent = (pvmCurrent+1)+' / '+PVM_TOTAL;
    const pct = Math.round((pvmCurrent/(PVM_TOTAL-1))*100);
    document.getElementById('pvm-progressFill').style.width = pct+'%';
    document.getElementById('pvm-progressLabel').textContent = pvmCurrent+' / '+(PVM_TOTAL-1)+' tamamlandı';
  }

  function pvmChangeSlide(dir){
    const next = pvmCurrent+dir;
    if(next<0||next>=PVM_TOTAL)return;
    pvmCurrent=next;
    pvmUpdateUI();
    if(pvmCurrent===PVM_TOTAL-1 && pvmQuizAnswered[1] && pvmQuizAnswered[2])
      document.getElementById('pvm-finishScreen').classList.add('pvm-show');
  }

  function pvmCheckAnswer(btn){
    const qNum = parseInt(btn.dataset.pvmq,10);
    const val = btn.dataset.pvmval;
    if(pvmQuizAnswered[qNum])return;
    pvmQuizAnswered[qNum]=true;
    const correct = PVM_CORRECT[qNum];
    document.querySelectorAll('#passive-voice-modul [data-pvmq="'+qNum+'"]').forEach(function(b){
      b.disabled=true;
      if(b.dataset.pvmval===correct)b.classList.add('pvm-correct-ans');
    });
    if(val!==correct)btn.classList.add('pvm-wrong-ans');
    const fb = document.getElementById('pvm-q'+qNum+'-feedback');
    fb.classList.add('pvm-show');
    if(val===correct){
      fb.className='pvm-quiz-feedback pvm-show pvm-ok';
      fb.textContent = qNum===1
        ? '✅ Doğru! "yesterday" → geçmiş zaman → Past Passive → was + V3 → was reviewed.'
        : '✅ Doğru! "tomorrow" + "by the CEO" → Future Passive → will be + V3 → will be signed.';
      if(typeof xpKazan==='function')xpKazan('teknik',0);
    } else {
      fb.className='pvm-quiz-feedback pvm-show pvm-no';
      fb.textContent = qNum===1
        ? '❌ "yesterday" geçmiş zaman sinyali. Past Passive = was/were + V3 → was reviewed.'
        : '❌ "tomorrow" gelecek sinyal. Future Passive = will be + V3. "will be sign" V3 değil — V1!';
    }
    if(pvmQuizAnswered[1] && pvmQuizAnswered[2] && pvmCurrent===PVM_TOTAL-1){
      document.getElementById('pvm-finishScreen').classList.add('pvm-show');
      if(typeof klodMotionDersKaydet==='function')klodMotionDersKaydet('passive-voice');
    }
  }

  // data-pvm-action merkezi dinleyici (iOS Safari uyumlu) — sadece bu modül içinde çalışır,
  // sitenin geri kalanındaki inline onclick'lerle çakışmaz (bağımsız, ek bir mekanizma).
  const pvmKok = document.getElementById('passive-voice-modul');
  if (pvmKok) {
    pvmKok.addEventListener('click', function(e){
      const el = e.target.closest('[data-pvm-action]');
      if(!el)return;
      const action = el.dataset.pvmAction;
      if(action==='slide-next')pvmChangeSlide(1);
      else if(action==='slide-prev')pvmChangeSlide(-1);
      else if(action==='quiz-answer')pvmCheckAnswer(el);
    });
  }

  // Dil Avcısı'na geçip Passive Voice dersine kaydırır — DILA mentor kutusu ve
  // B1 skill tree'sindeki "Passive Voice" node'u buradan çağırır.
  window.pvmGit = function(){
    const item=[...document.querySelectorAll('.dn-item')].find(function(e){ return e.textContent.includes('DİL AVCISI'); });
    if(item)item.click();
    setTimeout(function(){
      const el=document.getElementById('passive-voice-modul');
      if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
    },300);
  };

  (window.__dilavcisiLazyRenders=window.__dilavcisiLazyRenders||[]).push(pvmUpdateUI);
})();



(function(){
  const BBK_TOTAL = 7;
  let bbkCurrent = 0;
  let bbkTamamlandi = false;

  function bbkUpdateUI(){
    document.querySelectorAll('#bebek-modul .bbk-slide').forEach(function(s,i){ s.classList.toggle('bbk-active', i===bbkCurrent); });
    document.getElementById('bbk-prevBtn').disabled = bbkCurrent===0;
    document.getElementById('bbk-nextBtn').disabled = bbkCurrent===BBK_TOTAL-1;
    document.getElementById('bbk-slideCounter').textContent = (bbkCurrent+1)+' / '+BBK_TOTAL;
    const pct = Math.round((bbkCurrent/(BBK_TOTAL-1))*100);
    document.getElementById('bbk-progressFill').style.width = pct+'%';
    document.getElementById('bbk-progressLabel').textContent = bbkCurrent+' / '+(BBK_TOTAL-1)+' tamamlandı';
    if(bbkCurrent===BBK_TOTAL-1 && !bbkTamamlandi){
      bbkTamamlandi=true;
      if(typeof xpKazan==='function')xpKazan('teknik',0);
      if(typeof klodMotionDersKaydet==='function')klodMotionDersKaydet('bebek-sik-avcisi');
    }
  }

  function bbkChangeSlide(dir){
    const next = bbkCurrent+dir;
    if(next<0||next>=BBK_TOTAL)return;
    bbkCurrent=next;
    bbkUpdateUI();
  }

  const bbkKok = document.getElementById('bebek-modul');
  if (bbkKok) {
    bbkKok.addEventListener('click', function(e){
      const el = e.target.closest('[data-bbk-action]');
      if(!el)return;
      const action = el.dataset.bbkAction;
      if(action==='slide-next')bbkChangeSlide(1);
      else if(action==='slide-prev')bbkChangeSlide(-1);
    });
  }

  window.bbkGit = function(){
    const item=[...document.querySelectorAll('.dn-item')].find(function(e){ return e.textContent.includes('DİL AVCISI'); });
    if(item)item.click();
    setTimeout(function(){
      const el=document.getElementById('bebek-modul');
      if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
    },300);
  };

  (window.__dilavcisiLazyRenders=window.__dilavcisiLazyRenders||[]).push(bbkUpdateUI);
})();



(function(){
  const SRT_TOTAL = 6;
  let srtCurrent = 0;
  const SRT_CORRECT = { 1:'smoking', 2:'lock', 3:'to open' };
  const SRT_ACCEPT = {
    1: ['smoking'],
    2: ['lock'],
    3: ['to open','open to'] // 'to open' doğrusu; yaygın yazım hatalarına da tolerans
  };
  const srtQuizAnswered = { 1:false, 2:false, 3:false };

  function srtUpdateUI(){
    document.querySelectorAll('#stop-remember-try-modul .srt-slide').forEach(function(s,i){ s.classList.toggle('srt-active', i===srtCurrent); });
    document.getElementById('srt-prevBtn').disabled = srtCurrent===0;
    document.getElementById('srt-nextBtn').disabled = srtCurrent===SRT_TOTAL-1;
    document.getElementById('srt-slideCounter').textContent = (srtCurrent+1)+' / '+SRT_TOTAL;
    const pct = Math.round((srtCurrent/(SRT_TOTAL-1))*100);
    document.getElementById('srt-progressFill').style.width = pct+'%';
    document.getElementById('srt-progressLabel').textContent = srtCurrent+' / '+(SRT_TOTAL-1)+' tamamlandı';
  }

  function srtChangeSlide(dir){
    const next = srtCurrent+dir;
    if(next<0||next>=SRT_TOTAL)return;
    srtCurrent=next;
    srtUpdateUI();
  }

  function srtNormalize(s){
    return (s||'').trim().toLowerCase().replace(/[.!?]+$/,'');
  }

  function srtCheckAnswer(qNum){
    if(srtQuizAnswered[qNum])return;
    const input = document.getElementById('srt-q'+qNum+'-input');
    const val = srtNormalize(input.value);
    const dogruSet = SRT_ACCEPT[qNum].map(srtNormalize);
    const dogruMu = dogruSet.indexOf(val) !== -1;
    if(!val)return; // boş göndermeyi sessizce yoksay
    srtQuizAnswered[qNum]=true;
    input.disabled=true;
    const fb = document.getElementById('srt-q'+qNum+'-feedback');
    fb.classList.add('srt-show');
    const dogruCevap = SRT_CORRECT[qNum];
    const aciklamalar = {
      1: 'stop + V-ing = bırakmak. "Sigarayı bıraktı" anlamı için "smoking" gerekir.',
      2: '"Remember to + V" = unutulmaması gereken bir görev. "lock" (infinitive, to zaten cümlede var).',
      3: 'try + to V = zor bir şeye çabalamak. Kavanozu açmak zor olduğu için "to open" doğrudur.'
    };
    if(dogruMu){
      fb.className='srt-quiz-feedback srt-show srt-ok';
      fb.textContent = '✅ Doğru! '+aciklamalar[qNum];
    } else {
      fb.className='srt-quiz-feedback srt-show srt-no';
      fb.textContent = '❌ Doğru cevap: "'+dogruCevap+'". '+aciklamalar[qNum];
    }
    if(srtQuizAnswered[1] && srtQuizAnswered[2] && srtQuizAnswered[3]){
      document.getElementById('srt-finishScreen').classList.add('srt-show');
      if(typeof xpKazan==='function')xpKazan('teknik',0);
      if(typeof klodMotionDersKaydet==='function')klodMotionDersKaydet('stop-remember-try');
    }
  }

  const srtKok = document.getElementById('stop-remember-try-modul');
  if (srtKok) {
    srtKok.addEventListener('click', function(e){
      const el = e.target.closest('[data-srt-action]');
      if(!el)return;
      const action = el.dataset.srtAction;
      if(action==='slide-next')srtChangeSlide(1);
      else if(action==='slide-prev')srtChangeSlide(-1);
      else if(action==='quiz-check')srtCheckAnswer(parseInt(el.dataset.srtq,10));
    });
    srtKok.addEventListener('keydown', function(e){
      if(e.key!=='Enter')return;
      const input = e.target.closest('.srt-quiz-input');
      if(!input)return;
      const btn = input.parentElement.querySelector('[data-srt-action="quiz-check"]');
      if(btn)srtCheckAnswer(parseInt(btn.dataset.srtq,10));
    });
  }

  window.srtGit = function(){
    const item=[...document.querySelectorAll('.dn-item')].find(function(e){ return e.textContent.includes('DİL AVCISI'); });
    if(item)item.click();
    setTimeout(function(){
      const el=document.getElementById('stop-remember-try-modul');
      if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
    },300);
  };

  (window.__dilavcisiLazyRenders=window.__dilavcisiLazyRenders||[]).push(srtUpdateUI);
})();



(function(){
  const OSM_TOTAL = 7;
  let osmCurrent = 0;
  const OSM_CORRECT = { 1:'b', 2:'c' };
  const osmQuizAnswered = { 1:false, 2:false };

  function osmUpdateUI(){
    document.querySelectorAll('#osym-sablon-modul .osm-slide').forEach(function(s,i){ s.classList.toggle('osm-active', i===osmCurrent); });
    document.getElementById('osm-prevBtn').disabled = osmCurrent===0;
    document.getElementById('osm-nextBtn').disabled = osmCurrent===OSM_TOTAL-1;
    document.getElementById('osm-slideCounter').textContent = (osmCurrent+1)+' / '+OSM_TOTAL;
    const pct = Math.round((osmCurrent/(OSM_TOTAL-1))*100);
    document.getElementById('osm-progressFill').style.width = pct+'%';
    document.getElementById('osm-progressLabel').textContent = osmCurrent+' / '+(OSM_TOTAL-1)+' tamamlandı';
  }

  function osmChangeSlide(dir){
    const next = osmCurrent+dir;
    if(next<0||next>=OSM_TOTAL)return;
    osmCurrent=next;
    osmUpdateUI();
  }

  function osmCheckAnswer(btn){
    const qNum = parseInt(btn.dataset.osmq,10);
    const val = btn.dataset.osmval;
    if(osmQuizAnswered[qNum])return;
    osmQuizAnswered[qNum]=true;
    const correct = OSM_CORRECT[qNum];
    document.querySelectorAll('#osym-sablon-modul [data-osmq="'+qNum+'"]').forEach(function(b){
      b.disabled=true;
      if(b.dataset.osmval===correct)b.classList.add('osm-correct-ans');
    });
    if(val!==correct)btn.classList.add('osm-wrong-ans');
    const fb = document.getElementById('osm-q'+qNum+'-feedback');
    fb.classList.add('osm-show');
    if(val===correct){
      fb.className='osm-quiz-feedback osm-show osm-ok';
      fb.textContent = qNum===1
        ? '✅ Doğru! Uzun çalışma ↔ mola daha iyi = ZITLIK → however.'
        : '✅ Doğru! Kirlilik arttı → yeni düzenleme = sebep-sonuç → therefore.';
    } else {
      fb.className='osm-quiz-feedback osm-show osm-no';
      fb.textContent = qNum===1
        ? '❌ Doğru cevap: however. Uzun çalışma ↔ mola daha iyi = ZITLIK.'
        : '❌ Doğru cevap: therefore. Kirlilik arttı → yeni düzenleme = sebep-sonuç.';
    }
    if(osmQuizAnswered[1] && osmQuizAnswered[2]){
      document.getElementById('osm-finishBox').style.display='flex';
      if(typeof xpKazan==='function')xpKazan('teknik',0);
      if(typeof klodMotionDersKaydet==='function')klodMotionDersKaydet('osym-sablon-sistemi');
    }
  }

  const osmKok = document.getElementById('osym-sablon-modul');
  if (osmKok) {
    osmKok.addEventListener('click', function(e){
      const el = e.target.closest('[data-osm-action]');
      if(!el)return;
      const action = el.dataset.osmAction;
      if(action==='slide-next')osmChangeSlide(1);
      else if(action==='slide-prev')osmChangeSlide(-1);
      else if(action==='quiz-answer')osmCheckAnswer(el);
    });
  }

  window.osmGit = function(){
    const item=[...document.querySelectorAll('.dn-item')].find(function(e){ return e.textContent.includes('DİL AVCISI'); });
    if(item)item.click();
    setTimeout(function(){
      const el=document.getElementById('osym-sablon-modul');
      if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
    },300);
  };

  (window.__dilavcisiLazyRenders=window.__dilavcisiLazyRenders||[]).push(osmUpdateUI);
})();



(function(){
  const DNA_ORNEKLER = [
    {phrase:'it was raining', answer:'C'},
    {phrase:'the rain', answer:'N'},
    {phrase:'prices increased', answer:'C'},
    {phrase:'high inflation', answer:'N'},
    {phrase:'the study was limited', answer:'C'},
    {phrase:'the limited study', answer:'N'},
    {phrase:'students studied hard', answer:'C'},
    {phrase:"students' hard work", answer:'N'},
    {phrase:'the policy was strict', answer:'C'},
    {phrase:'the strict policy', answer:'N'},
  ];
  const dnaAnswered = {};

  function dnaRender(){
    const grid = document.getElementById('dna-grid');
    if(!grid)return;
    grid.innerHTML = DNA_ORNEKLER.map(function(o,i){
      return '<div class="dna-ornek-item" id="dna-item-'+i+'">'+
        '<span class="dna-ornek-phrase">'+o.phrase+'</span>'+
        '<div class="dna-ornek-btns">'+
          '<button class="dna-cn-btn" data-dna-action="answer" data-dna-idx="'+i+'" data-dna-choice="C">C</button>'+
          '<button class="dna-cn-btn" data-dna-action="answer" data-dna-idx="'+i+'" data-dna-choice="N">N</button>'+
        '</div>'+
        '<div class="dna-ornek-feedback" id="dna-fb-'+i+'"></div>'+
      '</div>';
    }).join('');
  }

  function dnaUpdateProgress(){
    const n = Object.keys(dnaAnswered).length;
    const note = document.getElementById('dna-progressNote');
    if(note)note.textContent = n+' / '+DNA_ORNEKLER.length+' cevaplandı';
    if(n===DNA_ORNEKLER.length){
      if(typeof xpKazan==='function')xpKazan('teknik',0);
      if(typeof klodMotionDersKaydet==='function')klodMotionDersKaydet('dna-testi');
    }
  }

  function dnaAnswer(idx, choice){
    if(dnaAnswered[idx])return;
    dnaAnswered[idx]=true;
    const o = DNA_ORNEKLER[idx];
    const dogruMu = choice===o.answer;
    const item = document.getElementById('dna-item-'+idx);
    item.querySelectorAll('.dna-cn-btn').forEach(function(b){
      b.disabled=true;
      if(b.dataset.dnaChoice===o.answer)b.classList.add('dna-correct');
      else if(b.dataset.dnaChoice===choice)b.classList.add('dna-wrong');
    });
    const fb = document.getElementById('dna-fb-'+idx);
    fb.classList.add('dna-show');
    if(o.answer==='C'){
      fb.textContent = (dogruMu?'✅ ':'❌ ')+'Fiil var (was/studied/increased vb.) → Clause (C)';
    } else {
      fb.textContent = (dogruMu?'✅ ':'❌ ')+'Sadece isim+sıfat, fiil yok → Noun Phrase (N)';
    }
    dnaUpdateProgress();
  }

  const dnaKok = document.getElementById('dna-testi-modul');
  if (dnaKok) {
    dnaKok.addEventListener('click', function(e){
      const el = e.target.closest('[data-dna-action="answer"]');
      if(!el)return;
      dnaAnswer(parseInt(el.dataset.dnaIdx,10), el.dataset.dnaChoice);
    });
  }

  window.dnaGit = function(){
    const item=[...document.querySelectorAll('.dn-item')].find(function(e){ return e.textContent.includes('DİL AVCISI'); });
    if(item)item.click();
    setTimeout(function(){
      const el=document.getElementById('dna-testi-modul');
      if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
    },300);
  };

  (window.__dilavcisiLazyRenders=window.__dilavcisiLazyRenders||[]).push(dnaRender);
})();



(function(){
  const GI_TOTAL = 7;
  let giCurrent = 0;
  const GI_CORRECT = { 1:'c', 2:'b', 3:'c' };
  const giQuizAnswered = { 1:false, 2:false, 3:false };

  function giUpdateUI(){
    document.querySelectorAll('#gerund-infinitive-modul .gi-slide').forEach(function(s,i){ s.classList.toggle('gi-active', i===giCurrent); });
    document.getElementById('gi-prevBtn').disabled = giCurrent===0;
    document.getElementById('gi-nextBtn').disabled = giCurrent===GI_TOTAL-1;
    document.getElementById('gi-slideCounter').textContent = (giCurrent+1)+' / '+GI_TOTAL;
    const pct = Math.round((giCurrent/(GI_TOTAL-1))*100);
    document.getElementById('gi-progressFill').style.width = pct+'%';
    document.getElementById('gi-progressLabel').textContent = giCurrent+' / '+(GI_TOTAL-1)+' tamamlandı';
  }

  function giChangeSlide(dir){
    const next = giCurrent+dir;
    if(next<0||next>=GI_TOTAL)return;
    giCurrent=next;
    giUpdateUI();
  }

  function giCheckAnswer(btn){
    const qNum = parseInt(btn.dataset.giq,10);
    const val = btn.dataset.gival;
    if(giQuizAnswered[qNum])return;
    giQuizAnswered[qNum]=true;
    const correct = GI_CORRECT[qNum];
    document.querySelectorAll('#gerund-infinitive-modul [data-giq="'+qNum+'"]').forEach(function(b){
      b.disabled=true;
      if(b.dataset.gival===correct)b.classList.add('gi-correct-ans');
    });
    if(val!==correct)btn.classList.add('gi-wrong-ans');
    const fb = document.getElementById('gi-q'+qNum+'-feedback');
    fb.classList.add('gi-show');
    const aciklamalar = {
      1: 'stop + ing = bırakmak.',
      2: 'decide → TO çetesi → to + V1.',
      3: 'but + too heavy → try to (çaba ama başarısız).'
    };
    if(val===correct){
      fb.className='gi-quiz-feedback gi-show gi-ok';
      fb.textContent = '✅ Doğru! '+aciklamalar[qNum];
    } else {
      fb.className='gi-quiz-feedback gi-show gi-no';
      fb.textContent = '❌ '+aciklamalar[qNum];
    }
    if(giQuizAnswered[1] && giQuizAnswered[2] && giQuizAnswered[3]){
      document.getElementById('gi-finishBox').style.display='flex';
      if(typeof xpKazan==='function')xpKazan('teknik',0);
      if(typeof klodMotionDersKaydet==='function')klodMotionDersKaydet('gerund-infinitive');
    }
  }

  const giKok = document.getElementById('gerund-infinitive-modul');
  if (giKok) {
    giKok.addEventListener('click', function(e){
      const el = e.target.closest('[data-gi-action]');
      if(!el)return;
      const action = el.dataset.giAction;
      if(action==='slide-next')giChangeSlide(1);
      else if(action==='slide-prev')giChangeSlide(-1);
      else if(action==='quiz-answer')giCheckAnswer(el);
    });
  }

  window.giGit = function(){
    const item=[...document.querySelectorAll('.dn-item')].find(function(e){ return e.textContent.includes('DİL AVCISI'); });
    if(item)item.click();
    setTimeout(function(){
      const el=document.getElementById('gerund-infinitive-modul');
      if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
    },300);
  };

  (window.__dilavcisiLazyRenders=window.__dilavcisiLazyRenders||[]).push(giUpdateUI);
})();



(function(){
  const KF_TOTAL = 7;
  let kfCurrent = 0;
  const KF_CORRECT = { 1:'c', 2:'d', 3:'b' };
  const kfQuizAnswered = { 1:false, 2:false, 3:false };

  function kfUpdateUI(){
    document.querySelectorAll('#cumle-analizi-modul .kf-slide').forEach(function(s,i){ s.classList.toggle('kf-active', i===kfCurrent); });
    document.getElementById('kf-prevBtn').disabled = kfCurrent===0;
    document.getElementById('kf-nextBtn').disabled = kfCurrent===KF_TOTAL-1;
    document.getElementById('kf-slideCounter').textContent = (kfCurrent+1)+' / '+KF_TOTAL;
    const pct = Math.round((kfCurrent/(KF_TOTAL-1))*100);
    document.getElementById('kf-progressFill').style.width = pct+'%';
    document.getElementById('kf-progressLabel').textContent = kfCurrent+' / '+(KF_TOTAL-1)+' tamamlandı';
  }

  function kfChangeSlide(dir){
    const next = kfCurrent+dir;
    if(next<0||next>=KF_TOTAL)return;
    kfCurrent=next;
    kfUpdateUI();
  }

  function kfCheckAnswer(btn){
    const qNum = parseInt(btn.dataset.kfq,10);
    const val = btn.dataset.kfval;
    if(kfQuizAnswered[qNum])return;
    kfQuizAnswered[qNum]=true;
    const correct = KF_CORRECT[qNum];
    document.querySelectorAll('#cumle-analizi-modul [data-kfq="'+qNum+'"]').forEach(function(b){
      b.disabled=true;
      if(b.dataset.kfval===correct)b.classList.add('kf-correct-ans');
    });
    if(val!==correct)btn.classList.add('kf-wrong-ans');
    const fb = document.getElementById('kf-q'+qNum+'-feedback');
    fb.classList.add('kf-show');
    const aciklamalar = {
      1: 'V3 tek başına sıfat görevi yapar → stolen = çalınan (the car which was stolen).',
      2: 'V-ing sıfat cümleciği = which is standing.',
      3: '"the heavy traffic" = isim → Despite + isim ✅'
    };
    if(val===correct){
      fb.className='kf-quiz-feedback kf-show kf-ok';
      fb.textContent = '✅ Doğru! '+aciklamalar[qNum];
    } else {
      fb.className='kf-quiz-feedback kf-show kf-no';
      fb.textContent = '❌ '+aciklamalar[qNum];
    }
    if(kfQuizAnswered[1] && kfQuizAnswered[2] && kfQuizAnswered[3]){
      document.getElementById('kf-finishBox').style.display='flex';
      if(typeof xpKazan==='function')xpKazan('teknik',0);
      if(typeof klodMotionDersKaydet==='function')klodMotionDersKaydet('cumle-analizi');
    }
  }

  const kfKok = document.getElementById('cumle-analizi-modul');
  if (kfKok) {
    kfKok.addEventListener('click', function(e){
      const el = e.target.closest('[data-kf-action]');
      if(!el)return;
      const action = el.dataset.kfAction;
      if(action==='slide-next')kfChangeSlide(1);
      else if(action==='slide-prev')kfChangeSlide(-1);
      else if(action==='quiz-answer')kfCheckAnswer(el);
    });
  }

  window.kfGit = function(){
    const item=[...document.querySelectorAll('.dn-item')].find(function(e){ return e.textContent.includes('DİL AVCISI'); });
    if(item)item.click();
    setTimeout(function(){
      const el=document.getElementById('cumle-analizi-modul');
      if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
    },300);
  };

  (window.__dilavcisiLazyRenders=window.__dilavcisiLazyRenders||[]).push(kfUpdateUI);
})();



(function(){
  const VOC_TOTAL = 7;
  let vocCurrent = 0;
  const VOC_CORRECT = { 1:'c', 2:'b', 3:'c' };
  const vocQuizAnswered = { 1:false, 2:false, 3:false };

  function vocUpdateUI(){
    document.querySelectorAll('#kelime-strateji-modul .voc-slide').forEach(function(s,i){ s.classList.toggle('voc-active', i===vocCurrent); });
    document.getElementById('voc-prevBtn').disabled = vocCurrent===0;
    document.getElementById('voc-nextBtn').disabled = vocCurrent===VOC_TOTAL-1;
    document.getElementById('voc-slideCounter').textContent = (vocCurrent+1)+' / '+VOC_TOTAL;
    const pct = Math.round((vocCurrent/(VOC_TOTAL-1))*100);
    document.getElementById('voc-progressFill').style.width = pct+'%';
    document.getElementById('voc-progressLabel').textContent = vocCurrent+' / '+(VOC_TOTAL-1)+' tamamlandı';
  }

  function vocChangeSlide(dir){
    const next = vocCurrent+dir;
    if(next<0||next>=VOC_TOTAL)return;
    vocCurrent=next;
    vocUpdateUI();
  }

  function vocCheckAnswer(btn){
    const qNum = parseInt(btn.dataset.vocq,10);
    const val = btn.dataset.vocval;
    if(vocQuizAnswered[qNum])return;
    vocQuizAnswered[qNum]=true;
    const correct = VOC_CORRECT[qNum];
    document.querySelectorAll('#kelime-strateji-modul [data-vocq="'+qNum+'"]').forEach(function(b){
      b.disabled=true;
      if(b.dataset.vocval===correct)b.classList.add('voc-correct-ans');
    });
    if(val!==correct)btn.classList.add('voc-wrong-ans');
    const fb = document.getElementById('voc-q'+qNum+'-feedback');
    fb.classList.add('voc-show');
    const aciklamalar = {
      1: 'mitigate + risk → klasik collocation ✅',
      2: 'kötü (expensive) → iyi (improved) = zıtlık + noktalı virgül → nevertheless.',
      3: 'conduct + research/study → sabit collocation ✅'
    };
    if(val===correct){
      fb.className='voc-quiz-feedback voc-show voc-ok';
      fb.textContent = '✅ Doğru! '+aciklamalar[qNum];
    } else {
      fb.className='voc-quiz-feedback voc-show voc-no';
      fb.textContent = '❌ '+aciklamalar[qNum];
    }
    if(vocQuizAnswered[1] && vocQuizAnswered[2] && vocQuizAnswered[3]){
      document.getElementById('voc-finishBox').style.display='flex';
      if(typeof xpKazan==='function')xpKazan('teknik',0);
      if(typeof klodMotionDersKaydet==='function')klodMotionDersKaydet('kelime-stratejisi');
    }
  }

  const vocKok = document.getElementById('kelime-strateji-modul');
  if (vocKok) {
    vocKok.addEventListener('click', function(e){
      const el = e.target.closest('[data-voc-action]');
      if(!el)return;
      const action = el.dataset.vocAction;
      if(action==='slide-next')vocChangeSlide(1);
      else if(action==='slide-prev')vocChangeSlide(-1);
      else if(action==='quiz-answer')vocCheckAnswer(el);
    });
  }

  window.vocGit = function(){
    const item=[...document.querySelectorAll('.dn-item')].find(function(e){ return e.textContent.includes('DİL AVCISI'); });
    if(item)item.click();
    setTimeout(function(){
      const el=document.getElementById('kelime-strateji-modul');
      if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
    },300);
  };

  (window.__dilavcisiLazyRenders=window.__dilavcisiLazyRenders||[]).push(vocUpdateUI);
})();



(function(){
  const RD_TOTAL = 7;
  let rdCurrent = 0;
  const RD_CORRECT = { 1:'c', 2:'c', 3:'c' };
  const rdQuizAnswered = { 1:false, 2:false, 3:false };

  function rdUpdateUI(){
    document.querySelectorAll('#reading-strateji-modul .rd-slide').forEach(function(s,i){ s.classList.toggle('rd-active', i===rdCurrent); });
    document.getElementById('rd-prevBtn').disabled = rdCurrent===0;
    document.getElementById('rd-nextBtn').disabled = rdCurrent===RD_TOTAL-1;
    document.getElementById('rd-slideCounter').textContent = (rdCurrent+1)+' / '+RD_TOTAL;
    const pct = Math.round((rdCurrent/(RD_TOTAL-1))*100);
    document.getElementById('rd-progressFill').style.width = pct+'%';
    document.getElementById('rd-progressLabel').textContent = rdCurrent+' / '+(RD_TOTAL-1)+' tamamlandı';
  }

  function rdChangeSlide(dir){
    const next = rdCurrent+dir;
    if(next<0||next>=RD_TOTAL)return;
    rdCurrent=next;
    rdUpdateUI();
  }

  function rdCheckAnswer(btn){
    const qNum = parseInt(btn.dataset.rdq,10);
    const val = btn.dataset.rdval;
    if(rdQuizAnswered[qNum])return;
    rdQuizAnswered[qNum]=true;
    const correct = RD_CORRECT[qNum];
    document.querySelectorAll('#reading-strateji-modul [data-rdq="'+qNum+'"]').forEach(function(b){
      b.disabled=true;
      if(b.dataset.rdval===correct)b.classList.add('rd-correct-ans');
    });
    if(val!==correct)btn.classList.add('rd-wrong-ans');
    const fb = document.getElementById('rd-q'+qNum+'-feedback');
    fb.classList.add('rd-show');
    const aciklamalar = {
      1: 'it → hemen önceki isim = a new element ✅',
      2: 'Çıkarım (inference) = metinde açıkça yazmaz, ima var.',
      3: 'fayda (iyi) → zarar (kötü) = zıtlık → however ✅'
    };
    if(val===correct){
      fb.className='rd-quiz-feedback rd-show rd-ok';
      fb.textContent = '✅ Doğru! '+aciklamalar[qNum];
    } else {
      fb.className='rd-quiz-feedback rd-show rd-no';
      fb.textContent = '❌ '+aciklamalar[qNum];
    }
    if(rdQuizAnswered[1] && rdQuizAnswered[2] && rdQuizAnswered[3]){
      document.getElementById('rd-finishBox').style.display='flex';
      if(typeof xpKazan==='function')xpKazan('teknik',0);
      if(typeof klodMotionDersKaydet==='function')klodMotionDersKaydet('reading-stratejisi');
    }
  }

  const rdKok = document.getElementById('reading-strateji-modul');
  if (rdKok) {
    rdKok.addEventListener('click', function(e){
      const el = e.target.closest('[data-rd-action]');
      if(!el)return;
      const action = el.dataset.rdAction;
      if(action==='slide-next')rdChangeSlide(1);
      else if(action==='slide-prev')rdChangeSlide(-1);
      else if(action==='quiz-answer')rdCheckAnswer(el);
    });
  }

  window.rdGit = function(){
    const item=[...document.querySelectorAll('.dn-item')].find(function(e){ return e.textContent.includes('DİL AVCISI'); });
    if(item)item.click();
    setTimeout(function(){
      const el=document.getElementById('reading-strateji-modul');
      if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
    },300);
  };

  (window.__dilavcisiLazyRenders=window.__dilavcisiLazyRenders||[]).push(rdUpdateUI);
})();



(function(){
  const MP_TOTAL = 7;
  let mpCurrent = 0;
  const MP_CORRECT = { 1:'c', 2:'b', 3:'b' };
  const mpQuizAnswered = { 1:false, 2:false, 3:false };

  function mpUpdateUI(){
    document.querySelectorAll('#modal-perfect-modul .mp-slide').forEach(function(s,i){ s.classList.toggle('mp-active', i===mpCurrent); });
    document.getElementById('mp-prevBtn').disabled = mpCurrent===0;
    document.getElementById('mp-nextBtn').disabled = mpCurrent===MP_TOTAL-1;
    document.getElementById('mp-slideCounter').textContent = (mpCurrent+1)+' / '+MP_TOTAL;
    const pct = Math.round((mpCurrent/(MP_TOTAL-1))*100);
    document.getElementById('mp-progressFill').style.width = pct+'%';
    document.getElementById('mp-progressLabel').textContent = mpCurrent+' / '+(MP_TOTAL-1)+' tamamlandı';
  }

  function mpChangeSlide(dir){
    const next = mpCurrent+dir;
    if(next<0||next>=MP_TOTAL)return;
    mpCurrent=next;
    mpUpdateUI();
  }

  function mpCheckAnswer(btn){
    const qNum = parseInt(btn.dataset.mpq,10);
    const val = btn.dataset.mpval;
    if(mpQuizAnswered[qNum])return;
    mpQuizAnswered[qNum]=true;
    const correct = MP_CORRECT[qNum];
    document.querySelectorAll('#modal-perfect-modul [data-mpq="'+qNum+'"]').forEach(function(b){
      b.disabled=true;
      if(b.dataset.mpval===correct)b.classList.add('mp-correct-ans');
    });
    if(val!==correct)btn.classList.add('mp-wrong-ans');
    const fb = document.getElementById('mp-q'+qNum+'-feedback');
    fb.classList.add('mp-show');
    const aciklamalar = {
      1: 'kanıt var (keys missing) → kesin geçmiş kanı → must have V3.',
      2: 'geçmişte yapılmadı + eleştiri → should have V3.',
      3: 'geçmişte yapılmadı + beklenti → should have been V3 (modal perfect passive).'
    };
    if(val===correct){
      fb.className='mp-quiz-feedback mp-show mp-ok';
      fb.textContent = '✅ Doğru! '+aciklamalar[qNum];
    } else {
      fb.className='mp-quiz-feedback mp-show mp-no';
      fb.textContent = '❌ '+aciklamalar[qNum];
    }
    if(mpQuizAnswered[1] && mpQuizAnswered[2] && mpQuizAnswered[3]){
      document.getElementById('mp-finishBox').style.display='flex';
      if(typeof xpKazan==='function')xpKazan('teknik',0);
      if(typeof klodMotionDersKaydet==='function')klodMotionDersKaydet('modal-perfect');
    }
  }

  const mpKok = document.getElementById('modal-perfect-modul');
  if (mpKok) {
    mpKok.addEventListener('click', function(e){
      const el = e.target.closest('[data-mp-action]');
      if(!el)return;
      const action = el.dataset.mpAction;
      if(action==='slide-next')mpChangeSlide(1);
      else if(action==='slide-prev')mpChangeSlide(-1);
      else if(action==='quiz-answer')mpCheckAnswer(el);
    });
  }

  window.mpGit = function(){
    const item=[...document.querySelectorAll('.dn-item')].find(function(e){ return e.textContent.includes('DİL AVCISI'); });
    if(item)item.click();
    setTimeout(function(){
      const el=document.getElementById('modal-perfect-modul');
      if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
    },300);
  };

  (window.__dilavcisiLazyRenders=window.__dilavcisiLazyRenders||[]).push(mpUpdateUI);
})();



(function(){
  const KB_KELIMELER = [
    {id:'word1',en:'depend on',tr:'bağlı olmak, bağımlı olmak',ornek:'The success of the project depends on team cooperation.',grup:1},
    {id:'word2',en:'result in',tr:'yol açmak, sonuçlanmak',ornek:'The new policy resulted in higher productivity.',grup:1},
    {id:'word3',en:'contribute to',tr:'katkıda bulunmak',ornek:'Regular exercise contributes to better health.',grup:1},
    {id:'word4',en:'refer to',tr:'atıfta bulunmak, bahsetmek',ornek:'The author refers to several earlier studies.',grup:1},
    {id:'word5',en:'account for',tr:'açıklamak, oluşturmak (oran)',ornek:'Rising costs account for the price increase.',grup:1},
    {id:'word6',en:'carry out',tr:'yürütmek, gerçekleştirmek',ornek:'The team carried out a detailed investigation.',grup:1},
    {id:'word7',en:'point out',tr:'belirtmek, dikkat çekmek',ornek:'The report points out several key problems.',grup:1},
    {id:'word8',en:'give rise to',tr:'yol açmak, doğurmak',ornek:'The new law gave rise to public debate.',grup:1},
    {id:'word9',en:'bring about',tr:'meydana getirmek',ornek:'Technology has brought about major changes in education.',grup:1},
    {id:'word10',en:'set out',tr:'ortaya koymak, başlamak',ornek:'The researchers set out to test the hypothesis.',grup:1},
    {id:'word11',en:'analyze',tr:'analiz etmek',ornek:'Scientists analyzed the data carefully.',grup:2},
    {id:'word12',en:'evaluate',tr:'değerlendirmek',ornek:'Teachers evaluate student performance regularly.',grup:2},
    {id:'word13',en:'identify',tr:'tanımlamak, belirlemek',ornek:'The study aims to identify the main causes.',grup:2},
    {id:'word14',en:'demonstrate',tr:'göstermek, kanıtlamak',ornek:'The results demonstrate a clear correlation.',grup:2},
    {id:'word15',en:'establish',tr:'kurmak, ortaya koymak',ornek:'The research established a strong link between the two factors.',grup:2},
    {id:'word16',en:'indicate',tr:'göstermek, işaret etmek',ornek:'The data indicate a steady increase in sales.',grup:2},
    {id:'word17',en:'suggest',tr:'önermek, ima etmek',ornek:'The findings suggest a new approach is needed.',grup:2},
    {id:'word18',en:'argue',tr:'öne sürmek, iddia etmek',ornek:'Some experts argue that the policy is ineffective.',grup:2},
    {id:'word19',en:'examine',tr:'incelemek',ornek:'The paper examines the effects of climate change.',grup:2},
    {id:'word20',en:'investigate',tr:'araştırmak',ornek:'Researchers investigated the cause of the outbreak.',grup:2},
    {id:'word21',en:'significant',tr:'önemli, anlamlı',ornek:'There was a significant improvement in test scores.',grup:3},
    {id:'word22',en:'substantial',tr:'önemli miktarda, büyük',ornek:'The company made a substantial investment in research.',grup:3},
    {id:'word23',en:'crucial',tr:'kritik, hayati',ornek:'Sleep plays a crucial role in learning.',grup:3},
    {id:'word24',en:'evident',tr:'açık, belirgin',ornek:'The benefits of the program are evident.',grup:3},
    {id:'word25',en:'relevant',tr:'ilgili, alakalı',ornek:'Only relevant data was included in the analysis.',grup:3},
    {id:'word26',en:'comprehensive',tr:'kapsamlı',ornek:'The report offers a comprehensive review of the topic.',grup:3},
    {id:'word27',en:'potential',tr:'olası, potansiyel',ornek:'The drug has potential side effects.',grup:3},
    {id:'word28',en:'prior',tr:'önceki',ornek:'No prior experience is required for this course.',grup:3},
    {id:'word29',en:'subsequent',tr:'sonraki, akabinde gelen',ornek:'Subsequent studies confirmed the initial findings.',grup:3},
    {id:'word30',en:'inherent',tr:'doğasında olan, özünde bulunan',ornek:'There are inherent risks in any experiment.',grup:3},
    {id:'word31',en:'approach',tr:'yaklaşım',ornek:'The teacher used a new approach to explain the topic.',grup:4},
    {id:'word32',en:'framework',tr:'çerçeve, yapı',ornek:'The study is based on a theoretical framework.',grup:4},
    {id:'word33',en:'perspective',tr:'bakış açısı',ornek:'The book offers a fresh perspective on history.',grup:4},
    {id:'word34',en:'impact',tr:'etki',ornek:'Climate change has a major impact on agriculture.',grup:4},
    {id:'word35',en:'factor',tr:'etken, faktör',ornek:'Diet is an important factor in overall health.',grup:4},
    {id:'word36',en:'evidence',tr:'kanıt, delil',ornek:'There is strong evidence to support the theory.',grup:4},
    {id:'word37',en:'assumption',tr:'varsayım',ornek:'The argument is based on a false assumption.',grup:4},
    {id:'word38',en:'implication',tr:'çıkarım, ima',ornek:'The findings have important implications for policy.',grup:4},
    {id:'word39',en:'phenomenon',tr:'olgu, fenomen',ornek:'Global warming is a well-documented phenomenon.',grup:4},
    {id:'word40',en:'mechanism',tr:'mekanizma, işleyiş',ornek:'The body has a natural mechanism to fight infection.',grup:4},
    {id:'word41',en:'focus on',tr:'odaklanmak',ornek:'The course focuses on academic writing skills.',grup:5},
    {id:'word42',en:'consist of',tr:'oluşmak, meydana gelmek',ornek:'The exam consists of four sections.',grup:5},
    {id:'word43',en:'respond to',tr:'yanıt vermek',ornek:'The government responded to public criticism.',grup:5},
    {id:'word44',en:'engage in',tr:'katılmak, meşgul olmak',ornek:'Students engage in group discussions every week.',grup:5},
    {id:'word45',en:'rely on',tr:'güvenmek, dayanmak',ornek:'Many farmers rely on rainfall for irrigation.',grup:5},
    {id:'word46',en:'deal with',tr:'ile başa çıkmak, ele almak',ornek:'The company had to deal with several complaints.',grup:5},
    {id:'word47',en:'lead to',tr:'yol açmak',ornek:'Poor diet can lead to serious health problems.',grup:5},
    {id:'word48',en:'result from',tr:'kaynaklanmak',ornek:'The delay resulted from a shortage of materials.',grup:5},
    {id:'word49',en:'aim at/to',tr:'hedeflemek',ornek:'The project aims to reduce carbon emissions.',grup:5},
    {id:'word50',en:'base on',tr:'dayandırmak, temel almak',ornek:'The decision was based on careful analysis.',grup:5},
    {id:'word51',en:'yield',tr:'sonuç vermek / boyun eğmek (bağlama göre)',ornek:'The negotiations finally yielded a positive result.',ipucu:'yield results / yield to pressure',grup:6},
    {id:'word52',en:'incur',tr:'maruz kalmak, uğramak',ornek:'The company incurred significant losses last year.',ipucu:'incur costs / incur losses',grup:6},
    {id:'word53',en:'precede',tr:'önce gelmek',ornek:'A brief introduction precedes the main article.',ipucu:'precede an event',grup:6},
    {id:'word54',en:'comprise',tr:'oluşmak, kapsamak',ornek:'The committee is comprised of ten members.',ipucu:'be comprised of',grup:6},
    {id:'word55',en:'entail',tr:'gerektirmek, içermek',ornek:'The new policy will entail significant changes.',ipucu:'entail a risk / entail responsibility',grup:6},
    {id:'word56',en:'inhibit',tr:'engellemek, baskılamak',ornek:'Lack of sunlight can inhibit plant growth.',ipucu:'inhibit growth / inhibit development',grup:6},
    {id:'word57',en:'transform',tr:'dönüştürmek (köklü)',ornek:'Technology has transformed the way we communicate.',ipucu:'transform society / transform economy',grup:6},
    {id:'word58',en:'assess',tr:'değerlendirmek, ölçmek',ornek:'Experts were asked to assess the environmental impact.',ipucu:'assess the impact / assess the risk',grup:6},
    {id:'word59',en:'determine',tr:'belirlemek, saptamak',ornek:'Doctors are trying to determine the cause of the illness.',ipucu:'determine the cause / determine the outcome',grup:6},
    {id:'word60',en:'investigate',tr:'araştırmak, incelemek',ornek:'Police are investigating the cause of the fire.',ipucu:'investigate a case / investigate a matter',grup:6},
    {id:'word61',en:'subject to',tr:'maruz kalmak, tabi olmak',ornek:'All visitors are subject to security checks.',ipucu:'subject to restrictions',grup:7},
    {id:'word62',en:'comply with',tr:'uymak, riayet etmek',ornek:'Companies must comply with environmental regulations.',ipucu:'comply with regulations',grup:7},
    {id:'word63',en:'stem from',tr:'kaynaklanmak',ornek:'Many social problems stem from poverty.',ipucu:'stem from poverty',grup:7},
    {id:'word64',en:'take into account',tr:'hesaba katmak',ornek:'The plan should take into account all possible risks.',ipucu:'take into account all factors',grup:7},
    {id:'word65',en:'attribute to',tr:'atfetmek, bağlamak',ornek:'She attributes her success to hard work and discipline.',ipucu:'attribute success to hard work',grup:7},
    {id:'word66',en:'now that',tr:'artık … olduğuna göre',ornek:'Now that the exam is over, we can relax.',ipucu:'now that it is clear (SVO ister)',grup:7},
    {id:'word67',en:'given that',tr:'göz önüne alındığında',ornek:'Given that prices increased, sales dropped sharply.',ipucu:'given that prices increased (SVO ister)',grup:7},
    {id:'word68',en:'regardless of',tr:'-den bağımsız olarak',ornek:'They decided to proceed regardless of the cost.',ipucu:'regardless of the cost (isim ister)',grup:7},
    {id:'word69',en:'with a view to',tr:'amacıyla',ornek:'The company invested in training with a view to improving efficiency.',ipucu:'with a view to improving (V-ing ister)',grup:7},
    {id:'word70',en:'instead of',tr:'yerine',ornek:'He watched television instead of studying for the exam.',ipucu:'instead of studying (V-ing ister)',grup:7},
    {id:'word71',en:'sound',tr:'sağlam, güvenilir (sıfat)',ornek:'The lawyer presented a sound argument.',ipucu:'a sound argument / sound evidence',grup:8},
    {id:'word72',en:'novel',tr:'yeni, özgün (sıfat)',ornek:'The scientist proposed a novel approach to the problem.',ipucu:'a novel approach / novel discovery',grup:8},
    {id:'word73',en:'address',tr:'ele almak, çözüm aramak (fiil)',ornek:'The government must address the issue of unemployment.',ipucu:'address an issue / address a problem',grup:8},
    {id:'word74',en:'court',tr:'davetiye çıkarmak, risk almak (fiil)',ornek:'By ignoring the warning, he was courting disaster.',ipucu:'court danger / court disaster',grup:8},
    {id:'word75',en:'fine',tr:'ince, nüanslı (sıfat)',ornek:'There is a fine distinction between the two terms.',ipucu:'a fine distinction',grup:8},
    {id:'word76',en:'mean',tr:'ortalama (sıfat)',ornek:'The mean temperature in July was 28 degrees.',ipucu:'mean temperature',grup:8},
    {id:'word77',en:'cardinal',tr:'temel, en önemli (sıfat)',ornek:'Honesty is a cardinal rule in this profession.',ipucu:'cardinal rule',grup:8},
    {id:'word78',en:'obscure',tr:'gizlemek, belirsizleştirmek (fiil)',ornek:'The company tried to obscure the truth about the accident.',ipucu:'obscure the truth',grup:8},
    {id:'word79',en:'qualify',tr:'nitelendirmek, sınırlandırmak (fiil)',ornek:'The professor qualified his statement with several exceptions.',ipucu:'qualify a statement',grup:8},
    {id:'word80',en:'elaborate',tr:'ayrıntılandırmak (fiil)',ornek:'Could you elaborate on that point, please?',ipucu:'elaborate on a point',grup:8},
    {id:'word81',en:'on the contrary',tr:'tam tersine (iddiayı çürütür)',ornek:'The theory was not disproven; on the contrary, the results showed strong support.',ipucu:'on the contrary, the results showed...',grup:9},
    {id:'word82',en:'thereby',tr:'bu sayede, böylece',ornek:'The company automated the process, thereby improving efficiency.',ipucu:'thereby improving efficiency',grup:9},
    {id:'word83',en:'whereas',tr:'oysa ki, -e karşın',ornek:'Some people prefer coffee, whereas others prefer tea.',ipucu:'whereas others prefer tea',grup:9},
    {id:'word84',en:'albeit',tr:'her ne kadar … olsa da',ornek:'The economy is recovering, albeit slowly.',ipucu:'albeit slowly',grup:9},
    {id:'word85',en:'nonetheless',tr:'buna rağmen, yine de',ornek:'The budget was limited; nonetheless, the project succeeded.',ipucu:'nonetheless, the project succeeded',grup:9},
    {id:'word86',en:'henceforth',tr:'bundan böyle',ornek:'Henceforth, the new rule applies to all students.',ipucu:'henceforth, the rule applies',grup:9},
    {id:'word87',en:'notwithstanding',tr:'-e rağmen (resmi)',ornek:'Notwithstanding the difficulties, the team completed the project on time.',ipucu:'notwithstanding the difficulties',grup:9},
    {id:'word88',en:'inasmuch as',tr:'… olduğu ölçüde',ornek:'The report is useful inasmuch as it is relevant to current policy.',ipucu:'inasmuch as it is relevant',grup:9},
    {id:'word89',en:'insofar as',tr:'… olduğu kadarıyla',ornek:'The conclusion is valid insofar as the data allows.',ipucu:'insofar as the data allows',grup:9},
    {id:'word90',en:'provided that',tr:'şartıyla',ornek:'You can join the team, provided that you agree to the schedule.',ipucu:'provided that you agree',grup:9},
    {id:'word91',en:'inherent',tr:'doğasında olan',ornek:'There is an inherent risk in any scientific experiment.',ipucu:'inherent risk / inherent problem',grup:10},
    {id:'word92',en:'subsequent',tr:'sonraki, akabindeki',ornek:'Subsequent research confirmed the initial hypothesis.',ipucu:'subsequent research / subsequent events',grup:10},
    {id:'word93',en:'prior',tr:'önceki',ornek:'No prior experience is required for this position.',ipucu:'prior knowledge / prior experience',grup:10},
    {id:'word94',en:'concurrent',tr:'eş zamanlı',ornek:'The two concurrent studies produced similar results.',ipucu:'concurrent studies / concurrent processes',grup:10},
    {id:'word95',en:'comprehensive',tr:'kapsamlı',ornek:'The team conducted a comprehensive analysis of the market.',ipucu:'comprehensive study / comprehensive analysis',grup:10},
    {id:'word96',en:'preliminary',tr:'ön, hazırlık niteliğinde',ornek:'The preliminary findings suggest a link between the two factors.',ipucu:'preliminary findings / preliminary results',grup:10},
    {id:'word97',en:'marginal',tr:'sınırda olan, küçük',ornek:'The new method produced only a marginal improvement.',ipucu:'marginal improvement / marginal effect',grup:10},
    {id:'word98',en:'predominant',tr:'baskın, egemen',ornek:'Cost was the predominant factor in the decision.',ipucu:'predominant factor / predominant view',grup:10},
    {id:'word99',en:'plausible',tr:'makul, inandırıcı',ornek:'The scientist offered a plausible explanation for the anomaly.',ipucu:'plausible explanation / plausible theory',grup:10},
    {id:'word100',en:'ambiguous',tr:'belirsiz, çift anlamlı',ornek:'The survey question was too ambiguous to interpret clearly.',ipucu:'ambiguous statement / ambiguous result',grup:10},
  ];
  let kbGrupAktif = 1;

  function kbLoadProgress(){
    try{ return JSON.parse(localStorage.getItem('kb_progress')||'{}'); }catch(e){ return {}; }
  }
  function kbSaveProgress(p){
    try{ localStorage.setItem('kb_progress', JSON.stringify(p)); }catch(e){}
  }

  function kbUpdateProgress(){
    const prog = kbLoadProgress();
    const tamamlanan = KB_KELIMELER.filter(function(w){ return !!prog[w.id]; }).length;
    const fill = document.getElementById('kb-progressFill');
    const label = document.getElementById('kb-progressLabel');
    if(fill)fill.style.width = Math.round((tamamlanan/KB_KELIMELER.length)*100)+'%';
    if(label)label.textContent = tamamlanan+' / '+KB_KELIMELER.length+' kelime öğrenildi';
    if(tamamlanan===KB_KELIMELER.length){
      if(typeof xpKazan==='function')xpKazan('kelime',0);
      if(typeof klodMotionDersKaydet==='function')klodMotionDersKaydet('kelime-bankasi-500');
    }
  }

  function kbRender(){
    const grid = document.getElementById('kb-grid');
    if(!grid)return;
    const prog = kbLoadProgress();
    const kelimeler = KB_KELIMELER.filter(function(w){ return w.grup===kbGrupAktif; });
    grid.innerHTML = kelimeler.map(function(w){
      const ogrenildiMi = !!prog[w.id];
      const ipucuOn = w.ipucu ? '<span class="kb-card-ipucu">'+w.ipucu+'</span>' : '';
      const ipucuArka = w.ipucu ? '<span class="kb-card-koll">'+w.ipucu+'</span>' : '';
      return '<div class="kb-card'+(ogrenildiMi?' kb-learned':'')+'" data-kb-action="flip" data-kb-id="'+w.id+'">'+
        '<div class="kb-card-inner">'+
          '<div class="kb-card-face kb-card-front"><span class="kb-card-en">'+w.en+'</span>'+ipucuOn+'<span class="kb-card-hint">tıkla →</span></div>'+
          '<div class="kb-card-face kb-card-back"><span class="kb-card-tr">'+w.tr+'</span><span class="kb-card-ex">'+w.ornek+'</span>'+ipucuArka+'</div>'+
        '</div>'+
        '<button type="button" class="kb-ogren-btn'+(ogrenildiMi?' kb-on':'')+'" data-kb-action="ogren" data-kb-word="'+w.id+'">'+(ogrenildiMi?'Öğrenildi ✓':'Öğrendim ✓')+'</button>'+
        '<span class="kb-learned-badge">✅</span>'+
      '</div>';
    }).join('');
  }

  function kbGrupSec(grupNo){
    kbGrupAktif = grupNo;
    document.querySelectorAll('#kelime-bankasi-modul .kb-group-btn').forEach(function(b){
      b.classList.toggle('kb-active', parseInt(b.dataset.kbGrup,10)===grupNo);
    });
    kbRender();
  }

  function kbOgrendimToggle(wordId){
    const prog = kbLoadProgress();
    prog[wordId] = !prog[wordId];
    kbSaveProgress(prog);
    kbRender();
    kbUpdateProgress();
  }

  const kbKok = document.getElementById('kelime-bankasi-modul');
  if (kbKok) {
    kbKok.addEventListener('click', function(e){
      const el = e.target.closest('[data-kb-action]');
      if(!el)return;
      const action = el.dataset.kbAction;
      if(action==='grup')kbGrupSec(parseInt(el.dataset.kbGrup,10));
      else if(action==='ogren')kbOgrendimToggle(el.dataset.kbWord);
      else if(action==='flip')el.classList.toggle('kb-flipped');
    });
  }

  window.kbGit = function(){
    const item=[...document.querySelectorAll('.dn-item')].find(function(e){ return e.textContent.includes('DİL AVCISI'); });
    if(item)item.click();
    setTimeout(function(){
      const el=document.getElementById('kelime-bankasi-modul');
      if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
    },300);
  };

  (window.__dilavcisiLazyRenders=window.__dilavcisiLazyRenders||[]).push(kbRender,kbUpdateProgress);
})();



(function(){
  const SS_TOTAL = 7;
  let ssCurrent = 0;
  const SS_CORRECT = { 1:'c', 2:'b', 3:'c' };
  const ssQuizAnswered = { 1:false, 2:false, 3:false };

  function ssUpdateUI(){
    document.querySelectorAll('#skimming-scanning-modul .ss-slide').forEach(function(s,i){ s.classList.toggle('ss-active', i===ssCurrent); });
    document.getElementById('ss-prevBtn').disabled = ssCurrent===0;
    document.getElementById('ss-nextBtn').disabled = ssCurrent===SS_TOTAL-1;
    document.getElementById('ss-slideCounter').textContent = (ssCurrent+1)+' / '+SS_TOTAL;
    const pct = Math.round((ssCurrent/(SS_TOTAL-1))*100);
    document.getElementById('ss-progressFill').style.width = pct+'%';
    document.getElementById('ss-progressLabel').textContent = ssCurrent+' / '+(SS_TOTAL-1)+' tamamlandı';
  }

  function ssChangeSlide(dir){
    const next = ssCurrent+dir;
    if(next<0||next>=SS_TOTAL)return;
    ssCurrent=next;
    ssUpdateUI();
  }

  function ssCheckAnswer(btn){
    const qNum = parseInt(btn.dataset.ssq,10);
    const val = btn.dataset.ssval;
    if(ssQuizAnswered[qNum])return;
    ssQuizAnswered[qNum]=true;
    const correct = SS_CORRECT[qNum];
    document.querySelectorAll('#skimming-scanning-modul [data-ssq="'+qNum+'"]').forEach(function(b){
      b.disabled=true;
      if(b.dataset.ssval===correct)b.classList.add('ss-correct-ans');
    });
    if(val!==correct)btn.classList.add('ss-wrong-ans');
    const fb = document.getElementById('ss-q'+qNum+'-feedback');
    fb.classList.add('ss-show');
    const aciklamalar = {
      1: 'Skimming = genel konu → ilk cümle + paragraf başı/sonu.',
      2: 'Scanning = anahtar kelimeyi metinde taramak.',
      3: 'Tur 1 = hız + garanti puan; Tur 2 = zorlar (★ işaretliler).'
    };
    if(val===correct){
      fb.className='ss-quiz-feedback ss-show ss-ok';
      fb.textContent = '✅ Doğru! '+aciklamalar[qNum];
    } else {
      fb.className='ss-quiz-feedback ss-show ss-no';
      fb.textContent = '❌ '+aciklamalar[qNum];
    }
    if(ssQuizAnswered[1] && ssQuizAnswered[2] && ssQuizAnswered[3]){
      document.getElementById('ss-finishBox').style.display='flex';
      if(typeof xpKazan==='function')xpKazan('teknik',0);
      if(typeof klodMotionDersKaydet==='function')klodMotionDersKaydet('skimming-scanning');
    }
  }

  const ssKok = document.getElementById('skimming-scanning-modul');
  if (ssKok) {
    ssKok.addEventListener('click', function(e){
      const el = e.target.closest('[data-ss-action]');
      if(!el)return;
      const action = el.dataset.ssAction;
      if(action==='slide-next')ssChangeSlide(1);
      else if(action==='slide-prev')ssChangeSlide(-1);
      else if(action==='quiz-answer')ssCheckAnswer(el);
    });
  }

  window.ssGit = function(){
    const item=[...document.querySelectorAll('.dn-item')].find(function(e){ return e.textContent.includes('DİL AVCISI'); });
    if(item)item.click();
    setTimeout(function(){
      const el=document.getElementById('skimming-scanning-modul');
      if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
    },300);
  };

  (window.__dilavcisiLazyRenders=window.__dilavcisiLazyRenders||[]).push(ssUpdateUI);
})();



(function(){
  const CP_HAFTALAR = [
    {no:1, baslik:'Puan Üreten Yapı Kilidi', gunler:[
      {no:1, konu:'Although / Even though vs Despite / In spite of'},
      {no:2, konu:'Because vs Because of / Due to / Owing to'},
      {no:3, konu:'However / Therefore / Moreover (noktalama) + But / So'},
      {no:4, konu:'Unless / If (0-1-2. tip mantığı)'},
      {no:5, konu:'Tense tetikleri: since/for/ago/yesterday/last/in 1990'},
      {no:6, konu:'Passive temel: is/was/will be V3 + by'},
      {no:7, konu:'Mini Deneme 1 (40-60 soru) + detaylı analiz'}
    ]},
    {no:2, baslik:'Relative + Noun Clause + Past Perfect', gunler:[
      {no:8, konu:'who / which / that (kısa net)'},
      {no:9, konu:'where / when (yer-zaman)'},
      {no:10, konu:'whose (sahiplik) + en sık tuzaklar'},
      {no:11, konu:'Noun clause: fact that / argue that / claim that'},
      {no:12, konu:'By the time → Past Perfect (had V3)'},
      {no:13, konu:'Modal + anlam: should/can/might/could (temel)'},
      {no:14, konu:'Mini Deneme 2 (60-80 soru) + analiz'}
    ]},
    {no:3, baslik:'Modal Perfect + Passive Büyük Puan', gunler:[
      {no:15, konu:'must/should/could/might have V3 (anlam kilidi)'},
      {no:16, konu:'Modal passive: must be V3 / can be V3'},
      {no:17, konu:'Perfect Passive: has/have been V3 (+ just/already/yet)'},
      {no:18, konu:'Conditionals: If + had V3 → would have V3 (3. tip)'},
      {no:19, konu:'Bağlaç karışanlar: while / whereas / despite / although (karma)'},
      {no:20, konu:'Reading hız günü (3 paragraf) + kelime çıkarma'},
      {no:21, konu:'Mini Deneme 3 (80 soru) + analiz'}
    ]},
    {no:4, baslik:'Tam Sınav Simülasyonu + İnce Ayar', gunler:[
      {no:22, konu:'En çok yanlış gelen konu (Hata defterine göre 1 numara)'},
      {no:23, konu:'En çok yanlış gelen konu (2 numara)'},
      {no:24, konu:'En çok yanlış gelen konu (3 numara)'},
      {no:25, konu:'Reading yoğun (4 paragraf) + soru tipi ayrımı'},
      {no:26, konu:'Karma test (60 soru) — süre tut'},
      {no:27, konu:'Hafıza turu: tüm kartlar + 50 karma soru'},
      {no:28, konu:'Final Deneme (tam süre) + analiz'}
    ]}
  ];
  const CP_TOPLAM = 28;
  let cpOpenWeeks = new Set([1]);

  function cpLoadProgress(){
    try{ return JSON.parse(localStorage.getItem('cp_progress')||'{}'); }catch(e){ return {}; }
  }
  function cpSaveProgress(p){
    try{ localStorage.setItem('cp_progress', JSON.stringify(p)); }catch(e){}
  }

  function cpRender(){
    const prog = cpLoadProgress();
    let tamamlanan = 0;
    for(let i=1;i<=CP_TOPLAM;i++){ if(prog['gun'+i])tamamlanan++; }
    const fill = document.getElementById('cp-progressFill');
    const label = document.getElementById('cp-progressLabel');
    if(fill)fill.style.width = Math.round((tamamlanan/CP_TOPLAM)*100)+'%';
    if(label)label.textContent = tamamlanan+' / '+CP_TOPLAM+' gün tamamlandı';

    let bugunGun = null;
    for(let i=1;i<=CP_TOPLAM;i++){ if(!prog['gun'+i]){ bugunGun=i; break; } }

    const weeksEl = document.getElementById('cp-weeks');
    if(!weeksEl)return;
    weeksEl.innerHTML = CP_HAFTALAR.map(function(hafta){
      const acikMi = cpOpenWeeks.has(hafta.no);
      const haftaTamam = hafta.gunler.filter(function(g){ return !!prog['gun'+g.no]; }).length;
      const gunlerHtml = hafta.gunler.map(function(g){
        const done = !!prog['gun'+g.no];
        const bugunMu = g.no === bugunGun;
        return '<div class="cp-day-row'+(done?' cp-done':'')+(bugunMu?' cp-today':'')+'" data-cp-action="day-toggle" data-cp-day="'+g.no+'">'+
          '<span class="cp-day-check">'+(done?'✓':'')+'</span>'+
          '<span class="cp-day-num">G'+g.no+'</span>'+
          '<span class="cp-day-topic">'+g.konu+'</span>'+
          (bugunMu?'<span class="cp-today-badge">BUGÜN</span>':'')+
        '</div>';
      }).join('');
      return '<div class="cp-week'+(acikMi?' cp-open':'')+'" data-cp-week="'+hafta.no+'">'+
        '<button type="button" class="cp-week-header" data-cp-action="week-toggle" data-cp-week="'+hafta.no+'">'+
          '<span class="cp-week-title-wrap"><span class="cp-week-title">Hafta '+hafta.no+' — '+hafta.baslik+'</span>'+
          '<span class="cp-week-sub">'+haftaTamam+' / '+hafta.gunler.length+' gün · G'+hafta.gunler[0].no+'-G'+hafta.gunler[hafta.gunler.length-1].no+'</span></span>'+
          '<span class="cp-week-chevron">▶</span>'+
        '</button>'+
        '<div class="cp-week-body">'+gunlerHtml+'</div>'+
      '</div>';
    }).join('');
  }

  function cpToggleDay(gunNo){
    const prog = cpLoadProgress();
    prog['gun'+gunNo] = !prog['gun'+gunNo];
    cpSaveProgress(prog);
    let tamamlanan = 0;
    for(let i=1;i<=CP_TOPLAM;i++){ if(prog['gun'+i])tamamlanan++; }
    cpRender();
    if(tamamlanan===CP_TOPLAM){
      if(typeof xpKazan==='function')xpKazan('teknik',0);
      if(typeof klodMotionDersKaydet==='function')klodMotionDersKaydet('crash-plan-28gun');
    }
  }

  function cpToggleWeek(weekNo){
    if(cpOpenWeeks.has(weekNo))cpOpenWeeks.delete(weekNo);
    else cpOpenWeeks.add(weekNo);
    const el = document.querySelector('#crash-plan-modul .cp-week[data-cp-week="'+weekNo+'"]');
    if(el)el.classList.toggle('cp-open', cpOpenWeeks.has(weekNo));
  }

  function cpResetAll(){
    cpSaveProgress({});
    cpRender();
  }

  const CP_HEDEFLER = [
    {no:1, tier:'cp-hedef-1', aralik:'40-50 Puan Hedefi', oncelik:'Temel gramer iskeleti, bağlaçlar (although/because/however/therefore), en sık çıkan 100 akademik kelime', gunluk:'30 dk kelime + 30 dk bağlaç soruları', deneme:'Haftada 1 (40 soruluk mini)'},
    {no:2, tier:'cp-hedef-2', aralik:'50-60 Puan Hedefi', oncelik:'Çeviri teknikleri, cümle tamamlama, kısa okuma parçaları, Passive Voice', gunluk:'20 dk kelime + 40 dk gramer + 30 dk okuma', deneme:'Haftada 1 (60 soruluk)'},
    {no:3, tier:'cp-hedef-3', aralik:'60-70 Puan Hedefi', oncelik:'Paragraf ana fikir analizi, cümle tamamlama, kelime derinliği (eş anlamlar), Relative Clauses', gunluk:'20 dk kelime + 30 dk gramer + 40 dk okuma + 20 dk hata analizi', deneme:'Haftada 2 (80 soruluk)'},
    {no:4, tier:'cp-hedef-4', aralik:'70-80+ Puan Hedefi', oncelik:'Restatement (yakın anlam), ince paraphrase farkları, çeldirici analizi, Modal Perfect, Conditionals', gunluk:'15 dk kelime + 25 dk ileri gramer + 50 dk okuma + 30 dk çeviri + 20 dk hata analizi', deneme:'Haftada 2 tam deneme (180 dk)'},
  ];

  function cpHedefRender(hedefNo){
    const h = CP_HEDEFLER.find(function(x){ return x.no===hedefNo; });
    if(!h)return;
    document.querySelectorAll('#cp-hedefTabs .cp-hedef-tab').forEach(function(b){
      b.classList.toggle('cp-hedef-active', parseInt(b.dataset.cpHedef,10)===hedefNo);
    });
    const panel = document.getElementById('cp-hedefPanel');
    if(!panel)return;
    panel.innerHTML =
      '<div class="cp-hedef-panel '+h.tier+'">'+
        '<div class="cp-hedef-panel-baslik">'+h.aralik+'</div>'+
        '<div class="cp-hedef-row"><span class="cp-hedef-row-label">Öncelik</span><span class="cp-hedef-row-val">'+h.oncelik+'</span></div>'+
        '<div class="cp-hedef-row"><span class="cp-hedef-row-label">Günlük</span><span class="cp-hedef-row-val">'+h.gunluk+'</span></div>'+
        '<div class="cp-hedef-row"><span class="cp-hedef-row-label">Deneme</span><span class="cp-hedef-row-val">'+h.deneme+'</span></div>'+
      '</div>';
  }

  const cpKok = document.getElementById('crash-plan-modul');
  if (cpKok) {
    cpKok.addEventListener('click', function(e){
      const el = e.target.closest('[data-cp-action]');
      if(!el)return;
      const action = el.dataset.cpAction;
      if(action==='day-toggle')cpToggleDay(parseInt(el.dataset.cpDay,10));
      else if(action==='week-toggle')cpToggleWeek(parseInt(el.dataset.cpWeek,10));
      else if(action==='reset')cpResetAll();
      else if(action==='hedef-sec')cpHedefRender(parseInt(el.dataset.cpHedef,10));
    });
  }

  window.cpGit = function(){
    const item=[...document.querySelectorAll('.dn-item')].find(function(e){ return e.textContent.includes('Çalışma Planım'); });
    if(item)item.click();
    setTimeout(function(){
      const el=document.getElementById('crash-plan-modul');
      if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
    },300);
  };

  (window.__dilavcisiLazyRenders=window.__dilavcisiLazyRenders||[]).push(cpRender);
  cpHedefRender(1);
})();



(function(){
  const TG_ORNEKLER = [
    {phrase:'despite _____', answer:'N', aciklama:'despite + isim veya V-ing → N (Noun-type blank)'},
    {phrase:'_____ he studied', answer:'C', aciklama:'Özne + fiil (SVO) → tam cümle (Clause)'},
    {phrase:'because of _____', answer:'N', aciklama:'because of + isim → N'},
    {phrase:'; however, _____', answer:'C', aciklama:'Noktalı virgül + however sonrası tam cümle gelir → C'},
    {phrase:'with a view to _____', answer:'N', aciklama:'with a view to + V-ing → N (V-ing, isim yerine geçer)'},
    {phrase:'now that _____', answer:'C', aciklama:'now that + SVO → C'},
    {phrase:'regardless of _____', answer:'N', aciklama:'regardless of + isim → N'},
    {phrase:'given that _____', answer:'C', aciklama:'given that + SVO → C'},
    {phrase:'in addition to _____', answer:'N', aciklama:'in addition to + isim/V-ing → N'},
    {phrase:'unless + not', answer:'OZEL', aciklama:'unless zaten olumsuzluk içerir, yanında "not" kullanılmaz → hata (Özel tuzak)'},
  ];
  const tgAnswered = {};
  const TG_ETIKET = {C:'C', N:'N', OZEL:'Özel'};

  function tgRender(){
    const grid = document.getElementById('tg-grid');
    if(!grid)return;
    grid.innerHTML = TG_ORNEKLER.map(function(o,i){
      return '<div class="tg-ornek-item" id="tg-item-'+i+'">'+
        '<span class="tg-ornek-phrase">'+o.phrase+'</span>'+
        '<div class="tg-ornek-btns">'+
          '<button class="tg-cno-btn" data-tg-action="answer" data-tg-idx="'+i+'" data-tg-choice="C">C</button>'+
          '<button class="tg-cno-btn" data-tg-action="answer" data-tg-idx="'+i+'" data-tg-choice="N">N</button>'+
          '<button class="tg-cno-btn" data-tg-action="answer" data-tg-idx="'+i+'" data-tg-choice="OZEL">Özel</button>'+
        '</div>'+
        '<div class="tg-ornek-feedback" id="tg-fb-'+i+'"></div>'+
      '</div>';
    }).join('');
  }

  function tgUpdateProgress(){
    const n = Object.keys(tgAnswered).length;
    const note = document.getElementById('tg-progressNote');
    if(note)note.textContent = n+' / '+TG_ORNEKLER.length+' cevaplandı';
    if(n===TG_ORNEKLER.length){
      if(typeof xpKazan==='function')xpKazan('teknik',0);
      if(typeof klodMotionDersKaydet==='function')klodMotionDersKaydet('trigger-sistemi');
    }
  }

  function tgAnswer(idx, choice){
    if(tgAnswered[idx])return;
    tgAnswered[idx]=true;
    const o = TG_ORNEKLER[idx];
    const dogruMu = choice===o.answer;
    const item = document.getElementById('tg-item-'+idx);
    item.querySelectorAll('.tg-cno-btn').forEach(function(b){
      b.disabled=true;
      if(b.dataset.tgChoice===o.answer)b.classList.add('tg-correct');
      else if(b.dataset.tgChoice===choice)b.classList.add('tg-wrong');
    });
    const fb = document.getElementById('tg-fb-'+idx);
    fb.classList.add('tg-show');
    fb.textContent = (dogruMu?'✅ ':'❌ Doğru cevap: '+TG_ETIKET[o.answer]+'. ')+o.aciklama;
    tgUpdateProgress();
  }

  const tgKok = document.getElementById('trigger-sistemi-modul');
  if (tgKok) {
    tgKok.addEventListener('click', function(e){
      const el = e.target.closest('[data-tg-action="answer"]');
      if(!el)return;
      tgAnswer(parseInt(el.dataset.tgIdx,10), el.dataset.tgChoice);
    });
  }

  window.tgGit = function(){
    const item=[...document.querySelectorAll('.dn-item')].find(function(e){ return e.textContent.includes('DİL AVCISI'); });
    if(item)item.click();
    setTimeout(function(){
      const el=document.getElementById('trigger-sistemi-modul');
      if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
    },300);
  };

  (window.__dilavcisiLazyRenders=window.__dilavcisiLazyRenders||[]).push(tgRender);
})();



(function(){
  const PSY_TOTAL = 7;
  let psyCurrent = 0;
  const PSY_CORRECT = { 1:'c', 2:'c', 3:'c' };
  const psyQuizAnswered = { 1:false, 2:false, 3:false };

  function psyUpdateUI(){
    document.querySelectorAll('#psikoloji-terim-modul .psy-slide').forEach(function(s,i){ s.classList.toggle('psy-active', i===psyCurrent); });
    document.getElementById('psy-prevBtn').disabled = psyCurrent===0;
    document.getElementById('psy-nextBtn').disabled = psyCurrent===PSY_TOTAL-1;
    document.getElementById('psy-slideCounter').textContent = (psyCurrent+1)+' / '+PSY_TOTAL;
    const pct = Math.round((psyCurrent/(PSY_TOTAL-1))*100);
    document.getElementById('psy-progressFill').style.width = pct+'%';
    document.getElementById('psy-progressLabel').textContent = psyCurrent+' / '+(PSY_TOTAL-1)+' tamamlandı';
  }

  function psyChangeSlide(dir){
    const next = psyCurrent+dir;
    if(next<0||next>=PSY_TOTAL)return;
    psyCurrent=next;
    psyUpdateUI();
  }

  function psyCheckAnswer(btn){
    const qNum = parseInt(btn.dataset.psyq,10);
    const val = btn.dataset.psyval;
    if(psyQuizAnswered[qNum])return;
    psyQuizAnswered[qNum]=true;
    const correct = PSY_CORRECT[qNum];
    document.querySelectorAll('#psikoloji-terim-modul [data-psyq="'+qNum+'"]').forEach(function(b){
      b.disabled=true;
      if(b.dataset.psyval===correct)b.classList.add('psy-correct-ans');
    });
    if(val!==correct)btn.classList.add('psy-wrong-ans');
    const fb = document.getElementById('psy-q'+qNum+'-feedback');
    fb.classList.add('psy-show');
    const aciklamalar = {
      1: 'Cognitive Psychology = düşünme, dil, hafıza, problem çözme.',
      2: 'Jack Kuralı: metinde ne yazıyorsa o doğru — "every summer" = düzenli olarak geldi, orada yaşadığı anlamına gelmez.',
      3: 'conduct + experiments → sabit collocation.'
    };
    if(val===correct){
      fb.className='psy-quiz-feedback psy-show psy-ok';
      fb.textContent = '✅ Doğru! '+aciklamalar[qNum];
    } else {
      fb.className='psy-quiz-feedback psy-show psy-no';
      fb.textContent = '❌ '+aciklamalar[qNum];
    }
    if(psyQuizAnswered[1] && psyQuizAnswered[2] && psyQuizAnswered[3]){
      document.getElementById('psy-finishBox').style.display='flex';
      if(typeof xpKazan==='function')xpKazan('teknik',0);
      if(typeof klodMotionDersKaydet==='function')klodMotionDersKaydet('psikoloji-terminolojisi');
    }
  }

  const psyKok = document.getElementById('psikoloji-terim-modul');
  if (psyKok) {
    psyKok.addEventListener('click', function(e){
      const el = e.target.closest('[data-psy-action]');
      if(!el)return;
      const action = el.dataset.psyAction;
      if(action==='slide-next')psyChangeSlide(1);
      else if(action==='slide-prev')psyChangeSlide(-1);
      else if(action==='quiz-answer')psyCheckAnswer(el);
    });
  }

  window.psyGit = function(){
    const item=[...document.querySelectorAll('.dn-item')].find(function(e){ return e.textContent.includes('DİL AVCISI'); });
    if(item)item.click();
    setTimeout(function(){
      const el=document.getElementById('psikoloji-terim-modul');
      if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
    },300);
  };

  (window.__dilavcisiLazyRenders=window.__dilavcisiLazyRenders||[]).push(psyUpdateUI);
})();



(function(){
  const BS_ORNEKLER = [
    {cumle:'"The findings were significant in that they _____ existing theories."', opts:['challenged','supported','confirmed','ignored'], answer:'challenged', aciklama:'Fiil konumu → fiil. Bağlam zıtlık ima ediyor (significant + existing theories\'i sarsan bir sonuç) → challenged.'},
    {cumle:'"The policy had an _____ effect on economic growth."', opts:['beneficial','harmful','negative','negligible'], answer:'beneficial', aciklama:'Sıfat konumu → sıfat. Bağlam: "economic growth" pozitif → beneficial.'},
    {cumle:'"Despite the _____ evidence, the committee approved the plan."', opts:['inconclusive','conclusive','overwhelming','sufficient'], answer:'inconclusive', aciklama:'Sıfat konumu → sıfat. "Despite" zıtlık sinyali → evidence olumsuz olmalı ki onay beklenmedik olsun → inconclusive.'},
  ];
  const bsAnswered = {};

  function bsRender(){
    const grid = document.getElementById('bs-grid');
    if(!grid)return;
    grid.innerHTML = BS_ORNEKLER.map(function(o,i){
      return '<div class="bs-ornek-item" id="bs-item-'+i+'">'+
        '<span class="bs-ornek-cumle">'+o.cumle+'</span>'+
        '<div class="bs-ornek-opts">'+
          o.opts.map(function(op){ return '<button class="bs-opt-btn" data-bs-action="answer" data-bs-idx="'+i+'" data-bs-opt="'+op+'">'+op+'</button>'; }).join('')+
        '</div>'+
        '<div class="bs-ornek-feedback" id="bs-fb-'+i+'"></div>'+
      '</div>';
    }).join('');
  }

  function bsUpdateProgress(){
    const n = Object.keys(bsAnswered).length;
    const note = document.getElementById('bs-progressNote');
    if(note)note.textContent = n+' / '+BS_ORNEKLER.length+' cevaplandı';
    if(n===BS_ORNEKLER.length){
      if(typeof xpKazan==='function')xpKazan('kelime',0);
      if(typeof klodMotionDersKaydet==='function')klodMotionDersKaydet('baglam-stratejisi');
    }
  }

  function bsAnswer(idx, secilen){
    if(bsAnswered[idx])return;
    bsAnswered[idx]=true;
    const o = BS_ORNEKLER[idx];
    const dogruMu = secilen===o.answer;
    const item = document.getElementById('bs-item-'+idx);
    item.querySelectorAll('.bs-opt-btn').forEach(function(b){
      b.disabled=true;
      if(b.dataset.bsOpt===o.answer)b.classList.add('bs-correct');
      else if(b.dataset.bsOpt===secilen)b.classList.add('bs-wrong');
    });
    const fb = document.getElementById('bs-fb-'+idx);
    fb.classList.add('bs-show');
    fb.textContent = (dogruMu?'✅ ':'❌ Doğru cevap: '+o.answer+'. ')+o.aciklama;
    bsUpdateProgress();
  }

  const bsKok = document.getElementById('baglam-strateji-modul');
  if (bsKok) {
    bsKok.addEventListener('click', function(e){
      const el = e.target.closest('[data-bs-action="answer"]');
      if(!el)return;
      bsAnswer(parseInt(el.dataset.bsIdx,10), el.dataset.bsOpt);
    });
  }

  window.bsGit = function(){
    const item=[...document.querySelectorAll('.dn-item')].find(function(e){ return e.textContent.includes('DİL AVCISI'); });
    if(item)item.click();
    setTimeout(function(){
      const el=document.getElementById('baglam-strateji-modul');
      if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
    },300);
  };

  (window.__dilavcisiLazyRenders=window.__dilavcisiLazyRenders||[]).push(bsRender);
})();
