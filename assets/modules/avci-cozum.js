// ============================================================
// AVCI ÇÖZÜM EKRANI — Sinyal Lab'a bağlı arayüz (2026-10-26)
// ============================================================
// Motor: assets/modules/avci-motor.js (window.AvciMotor, saf).
// Bu dosya Sinyal Lab'ın MEVCUT akışına bağlanır; ayrı bir soru sistemi
// kurmaz. index.html'deki bağlantı noktaları (hepsi typeof ile korumalı,
// bu dosya yüklenmezse Sinyal Lab eskisi gibi çalışır):
//   slRender()  → avciMotorSoruAcildi(soru)      yeni soru, ipucu sıfırlanır
//   slRender()  → avciTurFiltresi(liste)          "Sadece ÖSYM boşluk soruları"
//   dAns()      → avciMotorCevaplandi(soru, i, dogruMu, sureMs)
//   slSonraki() → avciKuyrukSonraki()             mini antrenman sırası
//
// Üç mod: Hızlı Avcı · Hoca Anlatımı · Sınav Modu ('sa_avci_mod').
// İlerleme: localStorage 'sa_avci_motor' (cevap kaydı ayrıca mevcut
// cevapKaydet → answer_history akışıyla sunucuya gider; ona dokunulmaz).
//
// COST GUARD: Yapay zekâ yalnızca kural motorunun güveni DÜŞÜK olduğunda,
// öğrenci butona bastığında çağrılır. Önce bu tarayıcının önbelleğine,
// sonra sunucu önbelleğine (klod_aciklama) bakılır; aynı soru için aynı
// anda tek istek gider. Dönen açıklamanın doğru harfi cevap anahtarıyla
// tutmazsa gösterilmez. API hatasında yerel çözüm ekranı aynen kalır.
// ============================================================
(function(){
'use strict';
var M=window.AvciMotor;
if(!M)return;

var LS='sa_avci_motor',LS_MOD='sa_avci_mod',LS_FILTRE='sa_avci_filtre',LS_AI='sa_avci_ai_v1';
var MODLAR={hizli:{ad:'Hızlı Avcı',ozet:'Güçlü sinyal, şık eleme ve kısa doğrulama.'},hoca:{ad:'Hoca Anlatımı',ozet:'Soruyu adım adım, çok basit Türkçeyle anlatır.'},sinav:{ad:'Sınav Modu',ozet:'Çözerken ipucu yok. Cevaptan sonra kaçırdığın sinyali ve süreni gösterir.'}};
var HEDEF_SN={bosluk:60,anlam:75};// öneri: dilbilgisi sorusunu 1 dakikada bitirmek okumaya zaman bırakır

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function lsOku(k,v){try{var x=localStorage.getItem(k);return x==null?v:JSON.parse(x);}catch(e){return v;}}
function lsYaz(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
function bugun(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function $(id){return document.getElementById(id);}
function simdi(){return (window.performance&&performance.now)?performance.now():Date.now();}

var D={soru:null,c:null,ipucu:0,ilk:null,secim:null,degisim:0,bas:0,cevap:null,adim:1,tumu:false};
function mod(){var m=lsOku(LS_MOD,'hizli');return MODLAR[m]?m:'hizli';}
function cozumAl(soru){
  if(!soru)return null;
  var c=null;try{c=M.coz(soru);}catch(e){c=null;}
  return c;
}
function sorununTipi(soru){return soru&&soru.tip==='bosluk'?'bosluk':'anlam';}

// ---------------- stil ----------------
function stilEkle(){
  if($('avm-stil'))return;
  var css=[
  '.avm-bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:4px 0 10px}',
  '.avm-grup{display:flex;flex-wrap:wrap;gap:6px}',
  '.avm-btn{min-height:44px;padding:8px 14px;border-radius:10px;border:1px solid var(--border);background:transparent;color:var(--ink);font:600 15px/1.2 "IBM Plex Sans",sans-serif;cursor:pointer}',
  '.avm-btn:hover{border-color:var(--signal);color:var(--signal-hover,#7dd3fc)}',
  '.avm-btn:focus-visible,.avm-mod:focus-visible{outline:3px solid var(--signal);outline-offset:2px}',
  '.avm-mod{min-height:44px;padding:8px 14px;border-radius:999px;border:1px solid var(--border);background:transparent;color:var(--muted);font:600 15px/1.2 "IBM Plex Sans",sans-serif;cursor:pointer}',
  '.avm-mod[aria-pressed="true"]{background:rgba(56,189,248,.16);border-color:var(--signal);color:#e0f2fe}',
  '.avm-btn[aria-pressed="true"]{background:rgba(74,222,128,.12);border-color:#4ade80;color:#bbf7d0}',
  '.avm-btn.avm-ana{background:var(--signal);border-color:var(--signal);color:#04121f}',
  '.avm-btn.avm-ana:hover{color:#04121f;background:#7dd3fc}',
  '.avm-btn:disabled{opacity:.5;cursor:not-allowed}',
  '.avm-ozet{font-size:14px;color:var(--muted);margin:-4px 0 10px;line-height:1.5}',
  '.avm-kuyruk{display:flex;align-items:center;gap:8px;flex-wrap:wrap;background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.35);border-radius:10px;padding:8px 12px;margin-bottom:10px;color:#bbf7d0;font-size:15px}',
  '.avm-ipucu{display:flex;flex-direction:column;gap:8px;margin:0 0 10px}',
  '.avm-ipucu-metin{background:rgba(56,189,248,.08);border:1px solid rgba(56,189,248,.35);border-left:4px solid var(--signal);border-radius:10px;padding:10px 12px;font-size:16px;line-height:1.55;color:var(--ink)}',
  '.avm-sinav-not{font-size:14px;color:var(--muted)}',
  '#dm-opts .dmo.avm-elendi{text-decoration:line-through;text-decoration-thickness:2px;opacity:.55}',
  '#dm-opts .dmo.avm-secili{border-color:var(--signal);background:rgba(56,189,248,.14);color:#e0f2fe}',
  '#mod-sinyal.avm-sinav:not(.avm-cevaplandi) #sl-sent .s-sig,#mod-sinyal.avm-sinav:not(.avm-cevaplandi) #sl-sent .s-trap,#mod-sinyal.avm-sinav:not(.avm-cevaplandi) #sl-sent .s-key{background:none!important;color:inherit!important;box-shadow:none!important;transform:none!important;font-weight:inherit!important;border:0!important;padding:0!important}',
  '#mod-sinyal.avm-sinav:not(.avm-cevaplandi) #sl-sent [data-tip]::after,#mod-sinyal.avm-sinav:not(.avm-cevaplandi) #sl-sent [data-tip]::before{display:none!important}',
  '#mod-sinyal.avm-sinav:not(.avm-cevaplandi) #sl-ceviri{display:none!important}',
  '.avci-bosluk{display:inline-block;min-width:3.2em;border-bottom:2px solid var(--signal);color:var(--signal);text-align:center;letter-spacing:.08em}',
  '.avm-panel{margin-top:12px;display:flex;flex-direction:column;gap:10px}',
  '.avm-ust{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px}',
  '.avm-baslik{font:700 13px/1.2 "IBM Plex Mono",monospace;letter-spacing:.12em;color:var(--signal)}',
  '.avm-guven{font-size:13px;font-weight:700;padding:4px 10px;border-radius:999px;border:1px solid}',
  '.avm-guven.yuksek{color:#86efac;border-color:rgba(134,239,172,.5)}.avm-guven.orta{color:#bae6fd;border-color:rgba(186,230,253,.5)}.avm-guven.dusuk{color:#fca5a5;border-color:rgba(252,165,165,.5)}',
  '.avm-b{background:var(--surface);border:1px solid var(--border);border-left:4px solid var(--border);border-radius:12px;padding:12px 14px}',
  '.avm-b h4{margin:0 0 6px;font:700 13px/1.3 "IBM Plex Mono",monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}',
  '.avm-b p{margin:4px 0;font-size:16px;line-height:1.6;color:var(--ink)}',
  '.avm-b.beceri{border-left-color:#94a3b8}.avm-b.sinyal{border-left-color:var(--signal)}.avm-b.sinyal h4{color:var(--signal)}',
  '.avm-b.dogrulama{border-left-color:#4ade80}.avm-b.dogrulama h4{color:#86efac}',
  '.avm-b.tuzak{border-left-color:#f87171}.avm-b.tuzak h4{color:#fca5a5}',
  '.avm-b.refleks{border-left-color:#c4b5fd;background:rgba(196,181,253,.07)}.avm-b.refleks h4{color:#ddd6fe}',
  '.avm-b.geri{border-left-color:#e2e8f0}',
  '.avm-cip{display:inline-block;margin:2px 6px 2px 0;padding:5px 10px;border-radius:999px;background:rgba(148,163,184,.14);color:var(--ink);font-size:14px;font-weight:600}',
  '.avm-cumle{font-size:17px;line-height:1.75;color:var(--ink);word-wrap:break-word;overflow-wrap:anywhere}',
  '.avm-cumle mark.avm-isaret{background:rgba(56,189,248,.22);color:#e0f2fe;border-radius:4px;padding:0 3px;font-weight:700}',
  '.avm-cumle mark.avm-dolgu{background:rgba(74,222,128,.18);color:#bbf7d0;border-radius:4px;padding:0 3px;font-weight:800;letter-spacing:.02em}',
  '.avm-cumle mark.avm-dolgu.ana{text-transform:uppercase;background:rgba(56,189,248,.26);color:#e0f2fe}',
  '.avm-liste{list-style:none;margin:6px 0 0;padding:0;display:flex;flex-direction:column;gap:8px}',
  '.avm-liste li{font-size:16px;line-height:1.55;color:var(--ink)}',
  '.avm-ok{color:#86efac;font-weight:800;margin-right:6px}',
  '.avm-tz{border:1px solid rgba(248,113,113,.25);border-radius:10px;padding:10px 12px;background:rgba(248,113,113,.05)}',
  '.avm-tz.secilen{border-color:#f87171;background:rgba(248,113,113,.10)}',
  '.avm-tz .avm-sik{font-weight:700;color:#fecaca;font-size:16px}',
  '.avm-tz dl{margin:6px 0 0;display:grid;grid-template-columns:auto 1fr;gap:4px 10px;font-size:15px;line-height:1.5}',
  '.avm-tz dt{color:var(--muted);font-weight:600}.avm-tz dd{margin:0;color:var(--ink)}',
  '.avm-tz.belirsiz{border-style:dashed;opacity:.85}',
  '.avm-rozet{display:inline-block;margin-left:6px;font-size:12px;font-weight:700;padding:2px 8px;border-radius:999px;background:#f87171;color:#1f0a0a}',
  '.avm-dogru-satir{border:1px solid rgba(74,222,128,.4);border-radius:10px;padding:10px 12px;background:rgba(74,222,128,.07);font-size:16px;color:#dcfce7}',
  '.avm-refleks{font-size:18px;font-weight:700;line-height:1.5;color:#ede9fe}',
  '.avm-gb{display:grid;grid-template-columns:auto 1fr;gap:6px 12px;font-size:16px;line-height:1.5}',
  '.avm-gb dt{color:var(--muted);font-weight:600}.avm-gb dd{margin:0;color:var(--ink)}',
  '.avm-gb .y{color:#fca5a5;font-weight:700}.avm-gb .d{color:#86efac;font-weight:700}',
  '.avm-adimlar{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}',
  '.avm-adim{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px 14px;animation:avmGir .18s ease-out}',
  '.avm-adim .no{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:rgba(56,189,248,.16);color:var(--signal);font-weight:800;margin-right:8px;font-size:14px}',
  '.avm-adim b{font-size:16px;color:var(--ink)}.avm-adim p{margin:6px 0 0;font-size:16px;line-height:1.6;color:var(--ink)}',
  '.avm-adim.soru{border-color:rgba(56,189,248,.45)}',
  '.avm-adim.son{border-color:rgba(196,181,253,.6);background:rgba(196,181,253,.07)}',
  '.avm-dugmeler{display:flex;flex-wrap:wrap;gap:8px}',
  '.avm-not{font-size:14px;color:var(--muted);line-height:1.5}',
  '.avm-uyari{border:1px solid rgba(248,113,113,.45);background:rgba(248,113,113,.07);border-radius:10px;padding:10px 12px;font-size:15px;line-height:1.55;color:#fee2e2}',
  '.avm-rapor{background:var(--surface);border:1px solid rgba(56,189,248,.35);border-radius:14px;padding:14px;margin-top:12px}',
  '.avm-rapor h3{margin:0 0 10px;font:700 15px/1.3 "IBM Plex Sans",sans-serif;color:#e0f2fe}',
  '.avm-rapor-izgara{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px}',
  '.avm-kutu{border:1px solid var(--border);border-radius:10px;padding:10px 12px}',
  '.avm-kutu .e{font-size:13px;color:var(--muted);font-weight:600}.avm-kutu .v{font-size:16px;color:var(--ink);font-weight:700;margin-top:4px;line-height:1.45}',
  '.avm-gizli{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}',
  '@keyframes avmGir{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}',
  '@media (prefers-reduced-motion:reduce){.avm-adim{animation:none}}',
  '@media (max-width:600px){.avm-b{padding:10px 12px}.avm-tz dl,.avm-gb{grid-template-columns:1fr}.avm-tz dt,.avm-gb dt{margin-top:4px}.avm-btn,.avm-mod{flex:1 1 auto}}'
  ].join('\n');
  var st=document.createElement('style');st.id='avm-stil';st.textContent=css;document.head.appendChild(st);
}

// ---------------- ilerleme kaydı ----------------
function veriOku(){var v=lsOku(LS,null);if(!v||typeof v!=='object'||!Array.isArray(v.kayitlar))v={v:1,kayitlar:[],sinyaller:{},tuzaklar:{},hatalar:{ozne_fiil:0,zaman_cati:0,baglac:0,diger:0}};return v;}
function kayitEkle(k){
  var v=veriOku();
  v.kayitlar.unshift(k);
  if(v.kayitlar.length>400)v.kayitlar=v.kayitlar.slice(0,400);
  if(k.sinyalId){var s=v.sinyaller[k.sinyalId]=v.sinyaller[k.sinyalId]||{d:0,y:0,son:null,metin:k.sinyalMetin};if(k.dogru)s.d++;else s.y++;s.son=k.tarih;s.metin=k.sinyalMetin;}
  if(!k.dogru&&k.tuzak){v.tuzaklar[k.tuzak]=(v.tuzaklar[k.tuzak]||0)+1;var hk=M.hataKategorisi(k.tuzak);v.hatalar[hk]=(v.hatalar[hk]||0)+1;}
  lsYaz(LS,v);
}

// ---------------- mod çubuğu ----------------
function modCubugu(){
  var el=$('avci-mod-bar');if(!el)return;
  var m=mod(),filtre=!!lsOku(LS_FILTRE,false),kuyruk=window.__avciKuyruk;
  var h='<div class="avm-bar"><div class="avm-grup" role="group" aria-label="Çözüm modu">';
  Object.keys(MODLAR).forEach(function(k){h+='<button type="button" class="avm-mod" data-avm-mod="'+k+'" aria-pressed="'+(k===m)+'">'+MODLAR[k].ad+'</button>';});
  h+='</div><div class="avm-grup"><button type="button" class="avm-btn" data-avm-filtre aria-pressed="'+filtre+'">Sadece ÖSYM boşluk soruları</button><button type="button" class="avm-btn" data-avm-rapor aria-expanded="'+(!!($('avci-rapor')&&$('avci-rapor').innerHTML))+'" aria-controls="avci-rapor">Bugünkü AVCI Raporu</button></div></div>';
  h+='<div class="avm-ozet">'+esc(MODLAR[m].ozet)+'</div>';
  if(kuyruk&&kuyruk.ids&&kuyruk.ids.length)h+='<div class="avm-kuyruk" role="status"><span>'+esc(kuyruk.ad||'Mini antrenman')+': soru '+Math.min(kuyruk.i+1,kuyruk.ids.length)+' / '+kuyruk.ids.length+'</span><button type="button" class="avm-btn" data-avm-kuyruk-bitir>Antrenmanı bitir</button></div>';
  el.innerHTML=h;
  var ms=$('mod-sinyal');if(ms)ms.classList.toggle('avm-sinav',m==='sinav');
}
function ipucuAlani(){
  var el=$('avci-ipucu');if(!el)return;
  if(D.cevap){el.innerHTML='';return;}
  var m=mod();
  if(m==='sinav'){
    el.innerHTML='<div class="avm-ipucu"><div class="avm-sinav-not">Sınav modu: ipucu ve renkli işaret yok. Şıkkı seç, sonra onayla; istersen seçimini değiştirebilirsin.</div><div class="avm-dugmeler"><button type="button" class="avm-btn avm-ana" data-avm-onayla '+(D.secim==null?'disabled':'')+'>Cevabı onayla'+(D.secim!=null?' ('+M.harf(D.secim)+')':'')+'</button></div></div>';
    return;
  }
  var h='<div class="avm-ipucu"><div class="avm-dugmeler"><button type="button" class="avm-btn" data-avm-ipucu '+(D.ipucu>=3?'disabled':'')+' aria-controls="avm-ipucu-metin">'+(D.ipucu>=3?'İpucu bitti':'İpucu al ('+D.ipucu+'/3)')+'</button></div>';
  if(D.ipucu>0)h+='<div class="avm-ipucu-metin" id="avm-ipucu-metin" aria-live="polite">'+ipucuMetni()+'</div>';
  h+='</div>';
  el.innerHTML=h;
}
function ipucuMetni(){
  var c=D.c;if(!c)return 'Bu soru için ipucu hazırlanamadı. Şıkları tek tek cümleye yerleştir.';
  var a=c.adimlar,p=[];
  p.push('<b>1.</b> '+esc(a[0].baslik)+' '+esc(a[0].metin));
  if(D.ipucu>=2)p.push('<b>2.</b> '+(c.sinyal&&c.guven!=='dusuk'?'Sinyal: <b>'+esc(c.sinyal.metin)+'</b>. '+esc(c.sinyal.aciklama):'Bu soruda güçlü bir yapısal sinyal yok; şıkları tek tek cümleye yerleştirip anlamı kontrol et.'));
  if(D.ipucu>=3){var e=guvenliEleme(c,1);p.push('<b>3.</b> '+(e.length?'Bu sinyalle elenen şıklar: '+e.map(M.harf).join(', ')+'. Üzerlerini çizdik.':'Bu sinyal tek başına şık elemiyor; kalanları özne, zaman ve anlamla kontrol et.'));}
  return p.join('<br>');
}
// Düşük güvende kesin olmayan eleme gösterilmez (öğrenciye kesin bilgi gibi sunulmaz)
function guvenliEleme(c,asama){
  if(!c||c.celiski.length&&c.guven==='dusuk')return [];
  return Object.keys(c.elenenler).map(Number).filter(function(i){var e=c.elenenler[i];return e.kesin!==false&&(asama===1?e.asama===1:true);});
}
function butonlar(){return Array.prototype.slice.call(document.querySelectorAll('#dm-opts .dmo'));}
function eleUygula(liste){
  var b=butonlar();
  liste.forEach(function(i){var x=b[i];if(!x||x.classList.contains('avm-elendi'))return;x.classList.add('avm-elendi');var s=document.createElement('span');s.className='avm-gizli';s.textContent=' (elendi)';x.appendChild(s);});
}

// ---------------- çözüm paneli ----------------
function cumleHtml(c,tumDolu){
  var tk=c.tokenlar,vurgu={},sb=c.sinyal&&c.sinyal.bosluk;
  if(c.sinyal&&c.sinyal.vurgu&&c.sinyal.vurgu.length){
    var hedef=-1;tk.forEach(function(t,i){if(t.b===sb)hedef=i;});
    if(c.boslukSayisi>0){
      c.sinyal.vurgu.forEach(function(w){w=String(w).toLowerCase();var en=-1,mes=1e9;tk.forEach(function(t,i){if(t.l===w&&!vurgu[i]&&Math.abs(i-hedef)<mes&&Math.abs(i-hedef)<=8){mes=Math.abs(i-hedef);en=i;}});if(en>=0)vurgu[en]=1;});
    } else {
      var kel=String(c.sinyal.vurgu[0]||'').toLowerCase().split(/\s+/);
      for(var i=0;i<tk.length;i++){var ok=true;for(var j=0;j<kel.length;j++){if(!tk[i+j]||tk[i+j].l!==kel[j]){ok=false;break;}}if(ok&&kel[0]){for(var k=0;k<kel.length;k++)vurgu[i+k]=1;break;}}
    }
  }
  var out='';
  tk.forEach(function(t,i){
    var w;
    if(t.b!==null){var dol=c.dogruParca[t.b]||'----';w=tumDolu?'<mark class="avm-dolgu'+(t.b===sb?' ana':'')+'">'+esc(dol)+'</mark>':'<span class="avci-bosluk">----</span>';}
    else w=vurgu[i]?'<mark class="avm-isaret">'+esc(t.w)+'</mark>':esc(t.w);
    out+=(i===0||t.p&&/^[,;:.!?)]$/.test(t.w)||tk[i-1]&&tk[i-1].w==='('?'':' ')+w;
  });
  return out;
}
function guvenEtiketi(c){var ad={yuksek:'Güven: yüksek',orta:'Güven: orta',dusuk:'Güven: düşük'}[c.guven];return '<span class="avm-guven '+c.guven+'" title="'+esc(c.guvenNeden)+'">'+ad+'</span>';}
function bBeceri(c){return '<section class="avm-b beceri" aria-label="Ölçülen beceri"><h4>1 · Ölçülen beceri</h4><div>'+c.beceriler.map(function(b){return '<span class="avm-cip">'+esc(b)+'</span>';}).join('')+'</div><p class="avm-not">Soru türü: '+esc(c.tipAdi||'')+'</p></section>';}
function bSinyal(c){
  var h='<section class="avm-b sinyal" aria-label="Yapısal sinyal"><h4>2 · Yapısal sinyal</h4>';
  h+='<p class="avm-cumle">'+cumleHtml(c,true)+'</p>';
  if(c.sinyal)h+='<p><b>'+esc(c.sinyal.metin)+'</b> — '+esc(c.sinyal.aciklama)+'</p>';
  else h+='<p>Bu soruda güçlü bir yapısal sinyal bulunamadı.</p>';
  return h+'</section>';
}
function bDogrulama(c){
  if(!c.dogrulama.length)return '';
  return '<section class="avm-b dogrulama" aria-label="Doğrulama"><h4>Doğrulama · ikinci kontrol</h4><ul class="avm-liste">'+c.dogrulama.map(function(d){return '<li><span class="avm-ok" aria-hidden="true">✓</span><b>'+esc(d.kontrol)+':</b> '+esc(d.metin)+'</li>';}).join('')+'</ul></section>';
}
function bTuzak(c,secilen,detayli){
  var h='<section class="avm-b tuzak" aria-label="Tuzak şıklar"><h4>3 · Tuzak şıklar</h4><ul class="avm-liste">';
  h+='<li class="avm-dogru-satir"><b>'+esc(c.dogruHarf)+') '+esc(c.dogruMetin)+'</b> — doğru cevap. '+(c.sinyal&&c.guven!=='dusuk'?'Sinyale ve ikinci kontrole uyan tek şık.':'Cevap anahtarındaki şık.')+'</li>';
  c.tuzaklar.forEach(function(t){
    var sec=t.i===secilen;
    var gizle=c.guven==='dusuk'&&c.celiski.length;
    h+='<li class="avm-tz'+(sec?' secilen':'')+(t.kesin?'':' belirsiz')+'"><div class="avm-sik">'+esc(t.harf)+') '+esc(t.sik)+(sec?'<span class="avm-rozet">Senin seçimin</span>':'')+'</div>';
    if(gizle){h+='<dl><dt>Durum</dt><dd>Bu şık için kural açıklaması incelemede.</dd></dl></li>';return;}
    if(detayli||sec)h+='<dl><dt>Kural</dt><dd>'+esc(t.kural)+'</dd><dt>Neden çekici</dt><dd>'+esc(t.cekicilik)+'</dd><dt>Eleyen sinyal</dt><dd>'+esc(t.eleyen?t.eleyen+(t.asama===1?' (1. aşama)':t.asama===2?' (ikinci kontrol)':' (anlam kontrolü)'):'Kesin sinyal yok')+'</dd></dl>';
    else h+='<dl><dt>Kural</dt><dd>'+esc(t.kural)+'</dd></dl><details><summary class="avm-not">Neden çekici, onu eleyen sinyal</summary><dl><dt>Neden çekici</dt><dd>'+esc(t.cekicilik)+'</dd><dt>Eleyen sinyal</dt><dd>'+esc(t.eleyen||'Kesin sinyal yok')+'</dd></dl></details>';
    h+='</li>';
  });
  return h+'</ul></section>';
}
function bRefleks(c){
  var kayit=c.sinyal&&c.sinyal.kayit;
  return '<section class="avm-b refleks" aria-label="Çözüm refleksi"><h4>4 · Çözüm refleksi</h4><p class="avm-refleks">'+esc(c.refleks)+'</p>'+(kayit&&kayit.hunterReflex&&kayit.hunterReflex!==c.refleks?'<p><b>AVCI REFLEKSİ:</b> '+esc(kayit.hunterReflex)+'</p>':'')+'</section>';
}
function bGeri(c){
  var s=D.cevap,gb=M.geriBildirim(c,s.secilen);
  var h='<section class="avm-b geri" aria-label="Geri bildirim"><h4>5 · Geri bildirim</h4><dl class="avm-gb">';
  h+='<dt>Seçtiğin</dt><dd class="'+(gb.dogruMu?'d':'y')+'">'+esc(gb.secilenHarf)+') '+esc(D.soru.opts[s.secilen])+(gb.dogruMu?' — doğru':' — yanlış')+'</dd>';
  if(s.ilk!=null&&s.ilk!==s.secilen)h+='<dt>İlk seçimin</dt><dd>'+esc(M.harf(s.ilk))+') — sonra '+s.degisim+' kez değiştirdin.</dd>';
  h+='<dt>Doğru cevap</dt><dd class="d">'+esc(c.dogruHarf)+') '+esc(c.dogruMetin)+'</dd>';
  h+='<dt>Yakalanacak sinyal</dt><dd>'+esc(gb.sinyal||'Güçlü bir yapısal sinyal yok')+'</dd>';
  if(!gb.dogruMu)h+='<dt>Muhtemel hata</dt><dd>'+esc(gb.hata.metin)+(gb.hata.ad?' <span class="avm-not">('+esc(gb.hata.ad)+')</span>':'')+'</dd>';
  if(s.sure!=null){var hedef=HEDEF_SN[sorununTipi(D.soru)],sn=Math.round(s.sure/1000);h+='<dt>Süre</dt><dd>'+sn+' sn'+(sn>hedef?' — önerilen '+hedef+' sn, '+(sn-hedef)+' sn kayıp':' — önerilen süre içinde')+'</dd>';}
  if(s.ipucu)h+='<dt>Kullandığın ipucu</dt><dd>'+s.ipucu+'</dd>';
  h+='<dt>Sonraki soruda</dt><dd>'+esc(gb.refleks)+'</dd>';
  h+='</dl>';
  var p=pekistirmeBul(D.soru,c);
  if(p)h+='<div style="margin-top:10px"><p class="avm-not">Aynı beceriyi ölçen mini pekiştirme sorusu:</p><p class="avm-cumle" style="font-size:15px">'+esc(M.duzMetin(p.sent).slice(0,140))+(M.duzMetin(p.sent).length>140?'…':'')+'</p><button type="button" class="avm-btn avm-ana" data-avm-pekistir="'+esc(p.id)+'">Pekiştirme sorusunu çöz</button></div>';
  return h+'</section>';
}
function bDusukGuven(c){
  if(c.guven!=='dusuk')return '';
  var h='<div class="avm-uyari" role="note"><b>Bu açıklama kesin değil.</b> '+esc(c.guvenNeden)+' Doğru cevap ekrandaki anahtardır ('+esc(c.dogruHarf)+'). Kesin kurala bağlanamayan şıklar kesikli çerçeveyle gösterildi; soru incelemeye alındı.';
  if(D.soru&&/^q\d{3,4}$/.test(D.soru.id||''))h+='<div class="avm-dugmeler" style="margin-top:8px"><button type="button" class="avm-btn" data-avm-yz>Yapay zekâdan ayrıntılı açıklama iste</button></div><div id="avm-yz-kutu" aria-live="polite"></div>';
  return h+'</div>';
}
function adimlarHtml(c){
  var son=Math.min(D.adim,c.adimlar.length);
  var h='<ol class="avm-adimlar" aria-label="Adım adım çözüm">';
  c.adimlar.slice(0,son).forEach(function(a){
    var metin=a.metin;
    var ek='';
    if(a.no===3)ek='<p class="avm-cumle">'+cumleHtml(c,false)+'</p>';
    if(a.no===7&&a.liste&&a.liste.length){metin='';ek='<ul class="avm-liste">'+a.liste.map(function(d){return '<li><span class="avm-ok" aria-hidden="true">✓</span><b>'+esc(d.kontrol)+':</b> '+esc(d.metin)+'</li>';}).join('')+'</ul>';}
    if(a.no===8)ek='<p class="avm-cumle">'+cumleHtml(c,true)+'</p>';
    if((a.no===4||a.no===5)&&c.guven==='dusuk'&&c.celiski.length)metin='Bu soruda kural elemesi incelemede; şıkları doğru cevapla karşılaştır.';
    h+='<li class="avm-adim'+(a.soru?' soru':'')+(a.no===10?' son':'')+'"><span class="no" aria-hidden="true">'+a.no+'</span><b>'+esc(a.baslik)+'</b>'+(metin?'<p>'+esc(metin)+'</p>':'')+ek+'</li>';
  });
  h+='</ol>';
  if(son<c.adimlar.length)h+='<div class="avm-dugmeler"><button type="button" class="avm-btn avm-ana" data-avm-adim>Sonraki adım ('+(son+1)+'/'+c.adimlar.length+')</button><button type="button" class="avm-btn" data-avm-tumu>Çözümü tek seferde göster</button></div>';
  return h;
}
function adimEtkisi(c){
  if(D.adim>=5)eleUygula(guvenliEleme(c,1));
  if(D.adim>=6)eleUygula(guvenliEleme(c,2));
}
function panelCiz(odak){
  var el=$('avci-cozum-panel');if(!el)return;
  if(!D.cevap||!D.soru){el.innerHTML='';return;}
  var c=D.c,m=mod();
  if(!c){el.innerHTML='<div class="avm-panel"><div class="avm-uyari">Bu soru için otomatik çözüm hazırlanamadı. Yukarıdaki açıklamaya bak.</div></div>';return;}
  var h='<div class="avm-panel" role="region" aria-label="Avcı çözümü"><div class="avm-ust"><span class="avm-baslik">AVCI ÇÖZÜMÜ · '+esc(MODLAR[m].ad.toUpperCase())+'</span>'+guvenEtiketi(c)+'</div>';
  h+=bDusukGuven(c);
  var adimModu=m==='hoca'&&!D.tumu||m!=='hoca'&&D.adimAcik&&!D.tumu;
  if(m==='sinav'){
    h+=bGeri(c);
    h+='<details'+(D.tumu?' open':'')+'><summary class="avm-btn" style="display:inline-flex;align-items:center">Çözümün tamamını gör</summary><div class="avm-panel">'+bBeceri(c)+bSinyal(c)+bDogrulama(c)+bTuzak(c,D.cevap.secilen,true)+bRefleks(c)+'</div></details>';
  } else if(adimModu){
    h+=adimlarHtml(c);
    if(D.adim>=c.adimlar.length)h+=bBeceri(c)+bTuzak(c,D.cevap.secilen,true)+bRefleks(c)+bGeri(c);
  } else {
    h+=bBeceri(c)+bSinyal(c)+bDogrulama(c)+bTuzak(c,D.cevap.secilen,m==='hoca')+bRefleks(c)+bGeri(c);
    if(m==='hizli')h+='<div class="avm-dugmeler"><button type="button" class="avm-btn" data-avm-adimla>Adım adım anlat</button></div>';
  }
  h+='</div>';
  el.innerHTML=h;
  if(adimModu)adimEtkisi(c);else eleUygula(guvenliEleme(c,2));
  if(odak){var f=el.querySelector(odak);if(f&&f.focus)f.focus();}
}

// ---------------- pekiştirme ve mini antrenman ----------------
var _metaOnbellek=null;
function havuzMeta(){
  if(_metaOnbellek)return _metaOnbellek;
  if(typeof SL_HAVUZ==='undefined')return [];
  _metaOnbellek=SL_HAVUZ.map(function(s){var c=cozumAl(s);return {id:s.id,tip:s.tip==='bosluk'?'bosluk':'anlam',sinyalId:c&&c.sinyal?c.sinyal.id:null,beceri:c?c.beceriler[0]:null,beceriler:c?c.beceriler:[],s:s};});
  return _metaOnbellek;
}
function pekistirmeBul(soru,c){
  var meta=havuzMeta();if(!meta.length||!c)return null;
  var cozulen={};veriOku().kayitlar.forEach(function(k){if(k.dogru)cozulen[k.qid]=1;});
  var sid=c.sinyal&&c.sinyal.id,bec=c.beceriler[0];
  function sec(f){var a=meta.filter(function(x){return x.id!==soru.id&&f(x);});var b=a.filter(function(x){return !cozulen[x.id];});return (b[0]||a[0]||null);}
  var tip=sorununTipi(soru);
  var x=sid&&sec(function(x){return x.sinyalId===sid;})||bec&&sec(function(x){return x.beceri===bec;})
    ||sec(function(x){return x.tip===tip&&x.beceriler&&x.beceriler.some(function(b){return c.beceriler.indexOf(b)>=0;});});
  return x?x.s:null;
}
function soruGoster(id){
  if(typeof SL_HAVUZ==='undefined'||typeof slRender!=='function')return false;
  var s=SL_HAVUZ.find(function(x){return x.id===id;});if(!s)return false;
  window.__slDeepLinkSoru=s;slRender();
  var b=$('mod-sinyal');if(b&&b.scrollIntoView)b.scrollIntoView({behavior:'smooth',block:'start'});
  return true;
}
function kuyrukBaslat(ids,ad){
  ids=(ids||[]).filter(Boolean);if(!ids.length)return;
  window.__avciKuyruk={ids:ids,i:0,ad:ad||'Mini antrenman'};
  soruGoster(ids[0]);
}
window.avciKuyrukSonraki=function(){
  var k=window.__avciKuyruk;if(!k||!k.ids)return false;
  k.i++;
  if(k.i>=k.ids.length){window.__avciKuyruk=null;raporGoster(true);modCubugu();return false;}
  return soruGoster(k.ids[k.i]);
};

// ---------------- Bugünkü AVCI Raporu ----------------
function raporGoster(ac){
  var el=$('avci-rapor');if(!el)return;
  if(!ac){el.innerHTML='';modCubugu();return;}
  var v=veriOku(),meta=havuzMeta();
  var r=M.raporHesapla(v,bugun(),meta);
  var sin=Object.keys(v.sinyaller).map(function(k){var s=v.sinyaller[k];return {id:k,metin:s.metin,d:s.d,y:s.y,n:s.d+s.y};});
  var taniyor=sin.filter(function(s){return s.n>=2&&s.d/s.n>=0.75;}).map(function(s){return s.metin;});
  var kaciriyor=sin.filter(function(s){return s.y>=2&&s.y>=s.d;}).map(function(s){return s.metin;});
  var bugunK=v.kayitlar.filter(function(k){return k.tarih===bugun();});
  var ortSure=bugunK.filter(function(k){return k.sure!=null;});
  ortSure=ortSure.length?Math.round(ortSure.reduce(function(a,k){return a+k.sure;},0)/ortSure.length/1000):null;
  var h='<section class="avm-rapor" aria-label="Bugünkü AVCI Raporu"><h3>Bugünkü AVCI Raporu</h3>';
  if(!v.kayitlar.length){h+='<p class="avm-not" style="font-size:16px">Henüz kayıt yok. Sinyal Lab’da birkaç soru çöz; rapor çözdüğün sorulardan oluşur.</p>';}
  h+='<div class="avm-rapor-izgara">';
  h+=kutu('Bugün','%s soru, %d doğru'.replace('%s',r.bugunSoru).replace('%d',r.bugunDogru)+(ortSure!=null?' · ortalama '+ortSure+' sn':''));
  h+=kutu('En güçlü olduğun sinyal',r.enGuclu?r.enGuclu.metin+' (%'+r.enGuclu.oran+', '+r.enGuclu.n+' soru)':'En az 2 soru çözülen bir sinyal yok.');
  h+=kutu('Bugün kaçırdığın sinyal',r.kacirilan?r.kacirilan.metin+' ('+r.kacirilan.sayi+' kez)':'Bugün kaçırdığın sinyal yok.');
  h+=kutu('En çok düştüğün tuzak',r.tuzak?r.tuzak.ad+' ('+r.tuzak.sayi+' kez)':'Henüz tuzak kaydı yok.');
  h+=kutu('Hata türleri','Özne–fiil: '+(v.hatalar.ozne_fiil||0)+' · Zaman/çatı: '+(v.hatalar.zaman_cati||0)+' · Bağlaç: '+(v.hatalar.baglac||0));
  if(taniyor.length)h+=kutu('Tanıdığın sinyaller',taniyor.slice(0,4).join(', '));
  if(kaciriyor.length)h+=kutu('Sık kaçırdığın sinyaller',kaciriyor.slice(0,4).join(', '));
  h+='</div>';
  h+='<div class="avm-kutu" style="margin-top:8px"><div class="e">Yarın tekrar edilecek kurallar</div>'+(r.yarinKurallar.length?'<ol style="margin:6px 0 0;padding-left:20px;font-size:16px;line-height:1.55;color:var(--ink)">'+r.yarinKurallar.map(function(k){return '<li>'+esc(k)+'</li>';}).join('')+'</ol>':'<div class="v">Yanlış yaptığın sinyal olunca burada kurallar çıkar.</div>')+'</div>';
  h+='<div class="avm-dugmeler" style="margin-top:10px"><button type="button" class="avm-btn avm-ana" data-avm-antrenman '+(r.antrenman.length?'':'disabled')+'>Önerilen '+r.antrenman.length+' soruluk mini antrenmanı başlat</button><button type="button" class="avm-btn" data-avm-rapor-kapat>Raporu kapat</button></div>';
  h+='</section>';
  el.innerHTML=h;el.dataset.antrenman=JSON.stringify(r.antrenman);
  modCubugu();
  function kutu(e,v){return '<div class="avm-kutu"><div class="e">'+esc(e)+'</div><div class="v">'+esc(v)+'</div></div>';}
}

// ---------------- yapay zekâ (yalnızca düşük güven) ----------------
var _yzBekleyen={};
function yzIste(){
  var s=D.soru,c=D.c,kutu=$('avm-yz-kutu');if(!s||!c||!kutu)return;
  if(c.guven!=='dusuk'){kutu.textContent='Bu soru için yerel çözüm yeterli; yapay zekâ çağrılmadı.';return;}
  var btn=document.querySelector('[data-avm-yz]');
  var onb=lsOku(LS_AI,{});
  if(onb[s.id]){yzGoster(onb[s.id],kutu,btn);return;}
  if(_yzBekleyen[s.id])return;
  if(btn)btn.disabled=true;
  kutu.innerHTML='<p class="avm-not">Açıklama hazırlanıyor…</p>';
  var id=s.id;
  _yzBekleyen[id]=fetch('/api/klod',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'aciklama',soru_id:id})})
    .then(function(r){return r.json().catch(function(){return null;}).then(function(j){return {ok:r.ok,j:j};});})
    .then(function(x){
      var hala=D.soru&&D.soru.id===id&&$('avm-yz-kutu');
      var j=x.j;
      if(x.ok&&j&&j.aciklama){
        // Yapay zekâ çıktısı doğru kabul edilmez: harfi cevap anahtarıyla karşılaştır
        if(String(j.aciklama.dogru||'').toUpperCase()!==M.harf(s.ans)){if(hala){kutu.innerHTML='<p class="avm-not">Gelen açıklama doğru cevapla uyuşmadı; gösterilmedi ve incelemeye alındı.</p>';}return;}
        var o=lsOku(LS_AI,{});o[id]=j.aciklama;lsYaz(LS_AI,o);
        if(hala)yzGoster(j.aciklama,$('avm-yz-kutu'),btn);
      } else if(hala){
        kutu.innerHTML='<p class="avm-not">'+esc((j&&(j.error||j.message))||'Yapay zekâ açıklaması şu an alınamadı. Yerel çözüm adımları geçerli.')+'</p>';
        if(btn&&!(j&&j.inceleme))btn.disabled=false;
      }
    })
    .catch(function(){if(D.soru&&D.soru.id===id&&$('avm-yz-kutu')){$('avm-yz-kutu').innerHTML='<p class="avm-not">Bağlantı kurulamadı. Yerel çözüm adımları geçerli; internetini kontrol edip tekrar deneyebilirsin.</p>';if(btn)btn.disabled=false;}})
    .then(function(){delete _yzBekleyen[id];});
}
function yzGoster(a,kutu,btn){
  if(btn)btn.remove();
  if(typeof window.klodAciklamaKartHtml==='function'){kutu.innerHTML='<div class="yc-klod-kart">'+window.klodAciklamaKartHtml(a,D.cevap?D.cevap.secilen:0)+'</div>';return;}
  kutu.innerHTML='<p><b>Yapı:</b> '+esc(a.yapi)+'</p><p><b>Sinyal:</b> '+esc(a.sinyal)+'</p>';
}

// ---------------- olaylar ----------------
function tikla(e){
  var t=e.target.closest?e.target.closest('[data-avm-mod],[data-avm-filtre],[data-avm-rapor],[data-avm-ipucu],[data-avm-onayla],[data-avm-adim],[data-avm-tumu],[data-avm-adimla],[data-avm-pekistir],[data-avm-antrenman],[data-avm-rapor-kapat],[data-avm-kuyruk-bitir],[data-avm-yz]'):null;
  if(!t)return;
  if(t.hasAttribute('data-avm-mod')){lsYaz(LS_MOD,t.getAttribute('data-avm-mod'));D.adim=1;D.tumu=false;D.adimAcik=false;modCubugu();ipucuAlani();if(D.cevap)panelCiz();else sinavSecimiSifirla();var b=document.querySelector('[data-avm-mod="'+mod()+'"]');if(b)b.focus();return;}
  if(t.hasAttribute('data-avm-filtre')){var f=!lsOku(LS_FILTRE,false);lsYaz(LS_FILTRE,f);try{slIdx=0;}catch(x){}window.__avciKuyruk=null;if(typeof slRender==='function')slRender();var fb=document.querySelector('[data-avm-filtre]');if(fb)fb.focus();return;}
  if(t.hasAttribute('data-avm-rapor')){var r=$('avci-rapor');raporGoster(!(r&&r.innerHTML));return;}
  if(t.hasAttribute('data-avm-rapor-kapat')){raporGoster(false);return;}
  if(t.hasAttribute('data-avm-ipucu')){if(D.ipucu<3)D.ipucu++;ipucuAlani();if(D.ipucu>=3)eleUygula(guvenliEleme(D.c,1));var ib=document.querySelector('[data-avm-ipucu]');if(ib)ib.focus();return;}
  if(t.hasAttribute('data-avm-onayla')){sinavOnayla();return;}
  if(t.hasAttribute('data-avm-adim')){D.adim++;panelCiz('[data-avm-adim]');if(!document.querySelector('[data-avm-adim]')){var s=document.querySelector('.avm-adim.son');if(s){s.setAttribute('tabindex','-1');s.focus();}}return;}
  if(t.hasAttribute('data-avm-tumu')){D.adim=99;D.tumu=true;panelCiz();return;}
  if(t.hasAttribute('data-avm-adimla')){D.adimAcik=true;D.adim=1;panelCiz('[data-avm-adim]');return;}
  if(t.hasAttribute('data-avm-pekistir')){kuyrukBaslat([t.getAttribute('data-avm-pekistir')],'Pekiştirme');return;}
  if(t.hasAttribute('data-avm-antrenman')){var ids=[];try{ids=JSON.parse($('avci-rapor').dataset.antrenman||'[]');}catch(x){}kuyrukBaslat(ids,'Mini antrenman');return;}
  if(t.hasAttribute('data-avm-kuyruk-bitir')){window.__avciKuyruk=null;modCubugu();return;}
  if(t.hasAttribute('data-avm-yz')){yzIste();return;}
}
// Sınav modu: ilk dokunuş seçer, "Cevabı onayla" kesinleştirir (seçim değiştirilebilir)
function sikYakala(e){
  if(mod()!=='sinav'||D.cevap)return;
  var b=e.target.closest?e.target.closest('#dm-opts .dmo'):null;
  if(!b||b.disabled)return;
  e.stopPropagation();e.preventDefault();
  var i=butonlar().indexOf(b);if(i<0)return;
  if(D.ilk==null)D.ilk=i;
  if(D.secim!=null&&D.secim!==i)D.degisim++;
  D.secim=i;
  butonlar().forEach(function(x,j){x.classList.toggle('avm-secili',j===i);x.setAttribute('aria-pressed',String(j===i));});
  ipucuAlani();
  var o=document.querySelector('[data-avm-onayla]');if(o)o.focus();
}
function sinavSecimiSifirla(){D.secim=null;butonlar().forEach(function(x){x.classList.remove('avm-secili');x.removeAttribute('aria-pressed');});ipucuAlani();}
function sinavOnayla(){
  if(D.secim==null||D.cevap||typeof dAns!=='function'||!D.soru)return;
  var b=butonlar()[D.secim];if(!b)return;
  b.classList.remove('avm-secili');
  dAns(b,D.secim===D.soru.ans);
}

// ---------------- index.html bağlantı noktaları ----------------
window.avciMotorSoruAcildi=function(soru){
  stilEkle();
  D={soru:soru,c:cozumAl(soru),ipucu:0,ilk:null,secim:null,degisim:0,bas:simdi(),cevap:null,adim:1,tumu:false,adimAcik:false};
  var ms=$('mod-sinyal');if(ms)ms.classList.remove('avm-cevaplandi');
  modCubugu();ipucuAlani();panelCiz();
  var k=window.__avciKuyruk;if(k&&k.ids&&k.ids[k.i]!==soru.id&&k.ids.indexOf(soru.id)<0){window.__avciKuyruk=null;modCubugu();}
};
window.avciMotorCevaplandi=function(soru,secilen,dogruMu,sureMs){
  try{
    if(!D.soru||D.soru.id!==soru.id)D={soru:soru,c:cozumAl(soru),ipucu:0,ilk:null,secim:null,degisim:0,bas:simdi(),cevap:null,adim:1,tumu:false};
    var c=D.c;
    var sure=typeof sureMs==='number'&&isFinite(sureMs)&&sureMs>=0?sureMs:Math.round(simdi()-D.bas);
    D.cevap={secilen:secilen,dogruMu:dogruMu,sure:sure,ilk:D.ilk!=null?D.ilk:secilen,degisim:D.degisim,ipucu:D.ipucu};
    var ms=$('mod-sinyal');if(ms)ms.classList.add('avm-cevaplandi');
    butonlar().forEach(function(x){x.classList.remove('avm-secili');x.removeAttribute('aria-pressed');});
    var t=c&&!dogruMu&&c.elenenler[secilen]?c.elenenler[secilen].tur:(dogruMu?null:'belirsiz');
    kayitEkle({qid:soru.id,tarih:bugun(),zaman:new Date().toISOString(),tip:sorununTipi(soru),mod:mod(),
      sinyalId:c&&c.sinyal?c.sinyal.id:null,sinyalMetin:c&&c.sinyal?c.sinyal.metin:null,refleks:c?c.refleks:null,guven:c?c.guven:null,
      dogru:!!dogruMu,ilk:D.cevap.ilk,secilen:secilen,degisti:D.cevap.ilk!==secilen,degisim:D.degisim,dogruIdx:soru.ans,
      sure:sure,ipucu:D.ipucu,tuzak:t,hataKat:t?M.hataKategorisi(t):null});
    ipucuAlani();panelCiz();
    var r=$('avci-rapor');if(r&&r.innerHTML)raporGoster(true);
  }catch(e){/* çözüm ekranı hiçbir durumda Sinyal Lab'ı bozmamalı */}
};
window.avciTurFiltresi=function(liste){
  if(!lsOku(LS_FILTRE,false))return liste;
  var b=(liste||[]).filter(function(s){return s&&s.tip==='bosluk';});
  return b.length?b:liste;
};

document.addEventListener('click',tikla);
document.addEventListener('click',sikYakala,true);
stilEkle();
function ilkAcilis(){
  // Sinyal Lab'ın ilk soruyu bu dosyadan önce çizmiş olabileceği durum
  try{if(typeof slCurrentSoru!=='undefined'&&slCurrentSoru&&!D.soru){if(!slAnswered)window.avciMotorSoruAcildi(slCurrentSoru);else D.soru=slCurrentSoru;}}catch(e){}
  modCubugu();
}
if(document.readyState!=='loading')ilkAcilis();else document.addEventListener('DOMContentLoaded',ilkAcilis);
// test/kontrol için
window.__avciCozum={durum:function(){return D;},veri:veriOku,rapor:raporGoster};
})();
