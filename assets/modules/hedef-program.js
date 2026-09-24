// ============================================================
// 🎯 HEDEF PROGRAMI — "son puan → hedef puan, sınav tarihine kadar"
// ============================================================
// Öğrencinin tek çalışma merkezi: kurulum (son puan, hedef, tarih, günlük
// süre) → doğru puan hesabı → soru tipine göre hedef haritası → sınav
// gününe kadar gün gün program (her görev ilgili modülü açar) → deneme
// takibi + grafik → materyal kütüphanesi → sınav günü stratejisi.
//
// PUAN HESABI: YDS/YÖKDİL'de 80 soru, her doğru 1.25 puan; YANLIŞ DOĞRUYU
// GÖTÜRMEZ. Bu yüzden boş bırakmak hiçbir zaman avantaj değildir.
//
// Tüm veri localStorage'da ('sa_hedef_program'); kayıt gerekmez.
(function(){
'use strict';

const ANAHTAR='sa_hedef_program';
const PUAN_BASI=1.25, SORU_SAYISI=80;

// ---------- yardımcılar ----------
function lsOku(){try{return JSON.parse(localStorage.getItem(ANAHTAR))||null;}catch(e){return null;}}
function lsYaz(v){try{localStorage.setItem(ANAHTAR,JSON.stringify(v));}catch(e){}}
function gunStr(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function strGun(s){const p=String(s).split('-').map(Number);return new Date(p[0],p[1]-1,p[2]);}
function bugunStr(){return gunStr(new Date());}
function gunFarki(a,b){return Math.round((strGun(b)-strGun(a))/864e5);}
function gunEkle(s,n){const d=strGun(s);d.setDate(d.getDate()+n);return gunStr(d);}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
const AYLAR=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const GUNLER=['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
function tarihYaz(s,gunAdi){const d=strGun(s);return d.getDate()+' '+AYLAR[d.getMonth()]+(gunAdi?' '+GUNLER[d.getDay()]:'');}
function varsayilanTarih(){
  const now=new Date();let h=new Date(now.getFullYear(),10,26);
  if(h<new Date(now.getFullYear(),now.getMonth(),now.getDate()))h=new Date(now.getFullYear()+1,10,26);
  return gunStr(h);
}
function puanDogru(p){return Math.round(p/PUAN_BASI);}
function dogruPuan(d){return Math.round(d*PUAN_BASI*100)/100;}

// ---------- materyaller (her biri sitedeki gerçek bir modülü açar) ----------
// tip: dn = dashboard menüsü (metin eşleşmesi), git = ders modülü (window[fn]),
//      alt = Dil Avcısı alt modülü (scroll id), sim = 80 soruluk simülatör, git2 = sayfa bölümü
const M={
  kelimeKart:{ad:'Kelime Kartları',ikon:'🃏',tip:'dn',h:'Kelime Kartları'},
  kelimeBanka:{ad:'500 Akademik Kelime Bankası',ikon:'📚',tip:'git',h:'kbGit'},
  kelimeStrateji:{ad:'Kelime Stratejisi',ikon:'🧩',tip:'git',h:'vocGit'},
  kelimeHafiza:{ad:'Kelime Hafızası',ikon:'🧠',tip:'alt',h:'kelime-hafiza-modul'},
  psikoloji:{ad:'Psikoloji Terimleri (Sosyal)',ikon:'🧠',tip:'git',h:'psyGit'},
  aha:{ad:'AHA Kartları',ikon:'🃏',tip:'git',h:'ahkGit'},
  fiilAvi:{ad:'Fiil Avı — Cümlenin İskeleti',ikon:'🧬',tip:'git',h:'dnaGit'},
  trigger:{ad:'Trigger Sistemi — Bağlaç/Edat İpuçları',ikon:'⚡',tip:'git',h:'tgGit'},
  modal:{ad:'Modal Perfect (must/should/could have)',ikon:'🔮',tip:'git',h:'mpGit'},
  passive:{ad:'Passive Voice',ikon:'🔄',tip:'git',h:'pvmGit'},
  gerund:{ad:'Gerund / Infinitive',ikon:'🔀',tip:'git',h:'giGit'},
  srt:{ad:'Stop / Remember / Try',ikon:'🛑',tip:'git',h:'srtGit'},
  bebek:{ad:'BEBEK — Boşluk Doldurma Sistemi',ikon:'🍼',tip:'git',h:'bbkGit'},
  tuzak:{ad:'Günlük Tuzak',ikon:'🎯',tip:'dn',h:'Günlük Tuzak'},
  canliDers:{ad:'Canlı Ders (bağlaçlar, sesli)',ikon:'🎓',tip:'dn',h:'Canlı Ders'},
  baglam:{ad:'Bağlam Stratejisi (Cloze)',ikon:'🧭',tip:'git',h:'bsGit'},
  sinyalLab:{ad:'Sinyal Lab',ikon:'🔬',tip:'dn',h:'Sinyal Lab'},
  sat:{ad:'SAT Metodu (Cümle Tamamlama)',ikon:'⚡',tip:'dn',h:'SAT Metodu'},
  osym:{ad:'ÖSYM Soru Şablonları',ikon:'📋',tip:'git',h:'osmGit'},
  cumleAnaliz:{ad:'Cümle Analizi (Çeviri)',ikon:'🔍',tip:'git',h:'kfGit'},
  svo:{ad:'S+V+O Cümle Haritası',ikon:'📐',tip:'dn',h:'S+V+O'},
  paragraf:{ad:'Paragraf Soruları',ikon:'📖',tip:'dn',h:'Paragraf'},
  reading:{ad:'Reading Stratejisi',ikon:'📰',tip:'git',h:'rdGit'},
  skim:{ad:'Skimming & Scanning',ikon:'👀',tip:'git',h:'ssGit'},
  diseksiyon:{ad:'Paragraf Diseksiyonu',ikon:'✂️',tip:'alt',h:'paragraf-diseksiyon-modul'},
  soruTipi:{ad:'Soru Tipi Tespiti',ikon:'🧭',tip:'alt',h:'soru-tipi-modul'},
  anlama:{ad:'Anlama Modülü',ikon:'🧩',tip:'alt',h:'anlama-modul'},
  simTam:{ad:'Tam Deneme — 80 soru / 180 dk',ikon:'📝',tip:'sim',h:''},
  simOkuma:{ad:'Okuma Denemesi — 3 paragraf / 15 soru',ikon:'📝',tip:'alt',h:'sinav-simulator-modul'},
  hata:{ad:'Hata Defteri',ikon:'📝',tip:'dn',h:'Hata Defteri'},
  radar:{ad:'Zayıf Alan Radarı',ikon:'🎯',tip:'dn',h:'Zayıf Alan Radarı'},
  istatistik:{ad:'İstatistiklerim',ikon:'📊',tip:'dn',h:'İstatistiklerim'},
  klod:{ad:'KLOD\'a Sor (AI öğretmen)',ikon:'🤖',tip:'dn',h:'KLOD\'a Sor'},
  sesKurs:{ad:'Ses Kurs (19 konu, sesli)',ikon:'🎧',tip:'dn',h:'Ses Kurs'},
  ekitap:{ad:'Ücretsiz E-Kitap (30 günlük kılavuz)',ikon:'📘',tip:'git2',h:'ekitap'}
};

// ---------- YDS soru dağılımı + 60 puan için hedef (48 doğru + 1 pay) ----------
// hedef60: 60 puan hedefinde her bölümden alınması önerilen doğru sayısı.
const BOLUMLER=[
  {ad:'Kelime',no:'1–6',adet:6,hedef60:4,mat:['kelimeKart','kelimeBanka','kelimeStrateji']},
  {ad:'Dilbilgisi',no:'7–16',adet:10,hedef60:7,mat:['trigger','modal','gerund','passive','tuzak']},
  {ad:'Cloze test',no:'17–26',adet:10,hedef60:6,mat:['baglam','bebek','tuzak']},
  {ad:'Cümle tamamlama',no:'27–36',adet:10,hedef60:7,mat:['sinyalLab','sat','trigger']},
  {ad:'Çeviri (İng↔Tr)',no:'37–42',adet:6,hedef60:5,mat:['cumleAnaliz','svo','fiilAvi']},
  {ad:'Okuma parçaları',no:'43–62',adet:20,hedef60:10,mat:['paragraf','reading','skim','simOkuma']},
  {ad:'Diyalog tamamlama',no:'63–67',adet:5,hedef60:3,mat:['osym','paragraf']},
  {ad:'Anlamca en yakın cümle',no:'68–71',adet:4,hedef60:2,mat:['cumleAnaliz','sinyalLab']},
  {ad:'Paragraf tamamlama',no:'72–75',adet:4,hedef60:2,mat:['diseksiyon','soruTipi']},
  {ad:'Anlam bütünlüğünü bozan cümle',no:'76–80',adet:5,hedef60:3,mat:['diseksiyon','osym']}
];

function hedefDagilimi(hedefDogru){
  const taban=BOLUMLER.reduce((t,b)=>t+b.hedef60,0); // 49
  const oran=hedefDogru/taban;
  return BOLUMLER.map(b=>Object.assign({},b,{hedef:Math.min(b.adet,Math.max(1,Math.round(b.hedef60*oran)))}));
}

// ---------- 🧭 TEK YOL: 22 AHA kartı, 4 aşama ----------
// Kartların İÇERİĞİ index.html'deki #aha-karti-modul'de durur; burada sadece
// SIRA tutulur (kart no = kartın üzerindeki numara). En hızlı puan getirenler önde.
const ASAMALAR=[
  {no:1,ad:'Sinyaller, çeviri, temel gramer',kartlar:[1,2,3,4,22,9,10,11,12,6]},
  {no:2,ad:'Cümle tamamlama + paragraf',kartlar:[13,15,8,7,5,16,20,17]},
  {no:3,ad:'Okuma',kartlar:[14,19,21]},
  {no:4,ad:'Deneme + tekrar',kartlar:[18],ekler:[['simTam','📝 Tam deneme'],['hata','📝 Hata Defteri tekrarı']]}
];
const KART_SIRASI=ASAMALAR.reduce((a,s)=>a.concat(s.kartlar),[]);
// "O konudan 5 soru": SL_HAVUZ'daki sinyal alanıyla eşleşen sorular (küçük harf).
// Eşleşme 5'ten azsa havuzun geri kalanından tamamlanır.
const KART_SINYAL={
  1:['although','despite','even though','notwithstanding'],
  2:['as a consequence of','as a result','consequently','since'],
  3:['yet','nonetheless','on the contrary','whereas'],
  4:['consequently','as a result','so that','so as to','in order to'],
  6:['since','prior to','no sooner had','had'],
  7:['by the time','prior to','no sooner had','once','after'],
  8:['must have','should have','could have'],
  13:['nonetheless','yet','even though'],
  14:['yet'],
  15:['despite','notwithstanding','although','even though'],
  19:['while','whereas'],
  20:['so as to','in order to','so that','rather than','instead of'],
  21:['by no means','far from','anything but','hardly','contrary to','contrary to popular belief'],
  22:['unless','provided that','as long as','on condition that']
};
const HAFTA_HEDEF=5; // haftada 5 gün
const BUGUN_ADIMLARI=[
  {id:'aha',ikon:'🃏',baslik:'Sıradaki AHA kartı',detay:'Kartı çevir, formülü ve örneği oku.',dk:5,ic:'aha'},
  {id:'soru',ikon:'✍️',baslik:'O konudan 5 soru',detay:'Her sorudan sonra açıklamayı oku.',dk:10,ic:'soru'},
  {id:'tekrar',ikon:'🔁',baslik:'5 dk tekrar',detay:'Bugünkü ve önceki kartların üzerinden geç.',dk:5,ic:'tekrar'}
];
function bitenKartlar(p){return KART_SIRASI.filter(n=>p.ahaBiten&&p.ahaBiten[n]);}
function siradakiKart(p){return KART_SIRASI.find(n=>!(p.ahaBiten&&p.ahaBiten[n]))||null;}
function bugunKarti(p){const k=p.gunKart&&p.gunKart[bugunStr()];return k||siradakiKart(p);}
// Kartın metnini sayfadaki orijinal karttan olduğu gibi okur (içeriğe dokunmaz).
function kartOku(no){
  const kok=document.getElementById('aha-karti-modul');
  const kart=kok&&[...kok.querySelectorAll('.ahk-card')].find(k=>{const n=k.querySelector('.ahk-card-num');return n&&n.textContent.trim()===String(no);});
  if(!kart)return{no,baslik:'AHA Kartı '+no,formul:'',ornek:''};
  const q=s=>{const e=kart.querySelector(s);return e?e.innerHTML:'';};
  return{no,baslik:kart.querySelector('.ahk-card-title').textContent,formul:q('.ahk-card-formula'),ornek:q('.ahk-card-example')};
}
function kartAsamasi(no){return ASAMALAR.find(a=>a.kartlar.includes(no))||ASAMALAR[3];}

function gorev(id,mat,baslik,detay,dk){const m=M[mat];return{id,mat,ikon:m?m.ikon:'✅',baslik,detay:detay||'',dk};}

function gunGorevleri(p,d){
  const N=p.toplamGun;
  const uzun=p.gunlukDk>=120;
  const t=gunEkle(p.baslangic,d-1);
  const denemeGunu=(d%7===0)&&d<N;
  const sonGun=d===N;
  if(sonGun){
    return{tip:'son',gorevler:[
      gorev('hata','hata','Hata Defteri\'ne son kez göz at','Sadece tekrar — yeni konu çalışma.',20),
      gorev('kelime','kelimeKart','20 kelime kartı (hafif tekrar)','',15),
      {id:'strateji',mat:null,ikon:'🧭',baslik:'Sınav günü stratejisini oku','detay':'Bu programın "Sınav Günü" sekmesi. Sonra erken uyu.',dk:10,ic:'strateji'}
    ]};
  }
  if(denemeGunu){
    const g=[
      gorev('deneme','simTam','Haftalık deneme: Sınav Simülatörü',p.gunlukDk<120?'Vaktin azsa ilk 40 soruda bitir; sonuç yine programa kaydedilir.':'Gerçek sınav gibi: 180 dk, hiçbir soruyu boş bırakma.',p.gunlukDk<120?90:180),
      {id:'puan',mat:null,ikon:'📈',baslik:'Deneme sonucunu programa işle','detay':'Simülatör bitince otomatik kaydedilir; başka bir deneme çözdüysen "İlerleme" sekmesinden elle ekle.',dk:2,ic:'ilerleme'},
      gorev('hata','hata','Denemedeki yanlışları Hata Defteri\'nde incele','Her yanlış için: neden yanlış yaptım? Hangi sinyali kaçırdım?',20)
    ];
    return{tip:'deneme',gorevler:g};
  }
  // Normal gün: AHA kartı → 5 soru → 5 dk tekrar (o gün bir kart başlatıldıysa
  // ya da hâlâ kart varsa). 22 kart bittiyse Aşama 4: deneme + tekrar.
  if((p.gunKart&&p.gunKart[t])||siradakiKart(p))return{tip:'normal',gorevler:BUGUN_ADIMLARI};
  const g=[
    gorev('hata','hata','Hata Defteri tekrarı','En çok yanlış yaptığın 10 soruyu yeniden çöz.',25),
    gorev('radar','radar','Zayıf Alan Radarı\'ndaki 1 konuyu kapat','',20)
  ];
  if(uzun)g.push(gorev('paragraf','paragraf','2 paragraf sorusu','',15));
  return{tip:'tekrar',gorevler:g};
}

// ---------- durum ----------
function programHesapla(p){
  const bugun=bugunStr();
  const toplamGun=Math.max(1,gunFarki(p.baslangic,p.tarih));
  const gunNo=gunFarki(p.baslangic,bugun)+1;
  const kalanGun=gunFarki(bugun,p.tarih);
  const mevcutDogru=puanDogru(p.sonPuan);
  const hedefDogru=Math.min(SORU_SAYISI,Math.ceil(p.hedefPuan/PUAN_BASI));
  const denemeler=(p.denemeler||[]).slice().sort((a,b)=>a.tarih<b.tarih?-1:1);
  const sonDeneme=denemeler[denemeler.length-1]||null;
  const beklenenPuan=gunNo<=0?p.sonPuan:Math.min(p.hedefPuan,Math.round((p.sonPuan+(p.hedefPuan-p.sonPuan)*Math.min(1,(gunNo-1)/toplamGun))*100)/100);
  return Object.assign({},p,{toplamGun,gunNo,kalanGun,mevcutDogru,hedefDogru,fark:Math.max(0,hedefDogru-mevcutDogru),denemeler,sonDeneme,beklenenPuan});
}
function tamamOku(p,tarih){return (p.tamam&&p.tamam[tarih])||{};}
// Tek doğruluk kaynağı: bir günün "tamam" sayılması. Pill (Programa dön x/y),
// Bugün kartı, seri ve haftalık sayaç hepsi bunu kullanır.
function gunTamamMi(v,p,d){
  const t=gunEkle(p.baslangic,d-1);const ok=tamamOku(p,t);
  return gunGorevleri(v,d).gorevler.every(x=>ok[x.id]);
}
function tamamSayac(p){
  // tamamlanan gün (o günün tüm görevleri bitti) + güncel seri
  let tamGun=0,seri=0;const v=programHesapla(p);
  const son=Math.min(v.gunNo,v.toplamGun);
  for(let d=1;d<=son;d++)if(gunTamamMi(v,p,d))tamGun++;
  for(let d=son;d>=1;d--){
    if(gunTamamMi(v,p,d))seri++;else if(d<son)break;
  }
  return{tamGun,seri};
}
// Bu hafta (Pazartesi→bugün) tamamlanan gün sayısı
function haftaSayaci(v,p){
  const bugun=bugunStr();const gd=strGun(bugun).getDay();
  const pzt=gunEkle(bugun,-((gd+6)%7));
  let n=0;
  for(let t=pzt;t<=bugun;t=gunEkle(t,1)){
    const d=gunFarki(p.baslangic,t)+1;
    if(d>=1&&d<=v.toplamGun&&gunTamamMi(v,p,d))n++;
  }
  return n;
}
// Bugünün 3 adımı bittiyse kartı "tamamlandı" yap
function kartiKapat(p){
  const t=bugunStr();const no=p.gunKart&&p.gunKart[t];if(!no)return;
  const ok=tamamOku(p,t);
  if(BUGUN_ADIMLARI.every(x=>ok[x.id])){p.ahaBiten=p.ahaBiten||{};if(!p.ahaBiten[no])p.ahaBiten[no]=t;}
}

// ---------- modül açma ----------
function materyalAc(key){
  const m=M[key];if(!m)return;
  hpKapat(true);
  setTimeout(()=>{
    if(m.tip==='dn'){
      const it=[...document.querySelectorAll('.dn-item')].find(e=>e.textContent.includes(m.h));
      if(it)it.click();
      document.getElementById('dashboard')?.scrollIntoView({behavior:'smooth'});
    }else if(m.tip==='git'){
      if(typeof window[m.h]==='function')window[m.h]();
    }else if(m.tip==='alt'){
      const it=[...document.querySelectorAll('.dn-item')].find(e=>e.textContent.includes('DİL AVCISI'));
      if(it)it.click();
      setTimeout(()=>{document.getElementById(m.h)?.scrollIntoView({behavior:'smooth',block:'start'});},350);
    }else if(m.tip==='sim'){
      if(typeof sinavSimulatoruAc==='function')sinavSimulatoruAc();
    }else if(m.tip==='git2'){
      document.getElementById(m.h)?.scrollIntoView({behavior:'smooth'});
    }
    pillGuncelle();
  },60);
}

// ---------- UI ----------
let aktifSekme='bugun';
// z-index 10000: kurtarma kodu kutusu (#ap-banner, 9999) ve diğer sayfa pop-up'larının
// ÜSTÜNDE kalır; program kapanınca onlar yine görünür. Üstünde kalması gereken tek
// bildirim: hata banner'ı (#sa-err-banner, 10001).
const CSS=`
#hp-overlay{position:fixed;inset:0;z-index:10000;background:var(--paper,#0c0e14);color:var(--ink,#ece7da);overflow-y:auto;font-family:'IBM Plex Sans',sans-serif;display:none}
#hp-overlay.acik{display:block}
.hp-ust{position:sticky;top:0;z-index:2;background:linear-gradient(180deg,#0c0e14 85%,rgba(12,14,20,0));padding:14px 16px 10px}
.hp-ust-ic{max-width:760px;margin:0 auto;display:flex;align-items:center;gap:10px}
.hp-baslik{font-weight:800;font-size:17px;flex:1}
.hp-kapat{background:none;border:1px solid rgba(255,255,255,.2);color:inherit;border-radius:10px;padding:7px 12px;cursor:pointer;font-size:14px;font-family:inherit}
.hp-sekmeler{max-width:760px;margin:10px auto 0;display:flex;gap:6px;overflow-x:auto;scrollbar-width:none}
.hp-sekmeler::-webkit-scrollbar{display:none}
.hp-sekme{flex-shrink:0;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);color:inherit;border-radius:20px;padding:7px 14px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit}
.hp-sekme.aktif{background:rgba(245,166,35,.18);border-color:#f5a623;color:#fbbf24}
.hp-govde{max-width:760px;margin:0 auto;padding:6px 16px 90px}
.hp-kart{background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:16px;margin-bottom:12px}
.hp-eyebrow{font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:700;letter-spacing:.1em;color:#f5a623;text-transform:uppercase;margin-bottom:6px}
.hp-h{font-size:19px;font-weight:800;margin:0 0 6px;line-height:1.35}
.hp-muted{color:#a8b0bf;font-size:13.5px;line-height:1.6}
.hp-statlar{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
@media(max-width:560px){.hp-statlar{grid-template-columns:repeat(2,1fr)}}
.hp-stat{background:rgba(255,255,255,.04);border-radius:12px;padding:10px;text-align:center}
.hp-stat b{display:block;font-size:22px;font-family:'IBM Plex Mono',monospace;color:#fbbf24}
.hp-stat span{font-size:11.5px;color:#a8b0bf}
.hp-bar{height:8px;background:rgba(255,255,255,.08);border-radius:6px;overflow:hidden}
.hp-bar div{height:100%;background:linear-gradient(90deg,#f5a623,#34d399);border-radius:6px;transition:width .3s}
.hp-gorev{display:flex;align-items:center;gap:10px;padding:12px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);margin-top:8px}
.hp-gorev.bitti{opacity:.55}
.hp-gorev.bitti .hp-g-baslik{text-decoration:line-through}
.hp-check{width:26px;height:26px;border-radius:8px;border:2px solid rgba(255,255,255,.3);background:none;color:#fff;cursor:pointer;flex-shrink:0;font-size:15px;display:flex;align-items:center;justify-content:center;padding:0}
.hp-gorev.bitti .hp-check{background:#10b981;border-color:#10b981}
.hp-g-ic{flex:1;min-width:0}
.hp-g-baslik{font-weight:700;font-size:14.5px;line-height:1.35}
.hp-g-detay{font-size:12.5px;color:#a8b0bf;margin-top:2px;line-height:1.45}
.hp-basla{flex-shrink:0;background:#f5a623;color:#1a1205;border:none;border-radius:10px;padding:9px 12px;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit}
.hp-btn{background:linear-gradient(135deg,#f5a623,#e08a00);color:#1a1205;border:none;border-radius:12px;padding:14px;font-weight:800;font-size:15px;cursor:pointer;width:100%;font-family:inherit}
.hp-btn2{background:none;border:1px solid rgba(255,255,255,.25);color:inherit;border-radius:10px;padding:9px 14px;font-weight:600;font-size:13px;cursor:pointer;font-family:inherit}
.hp-alan{display:flex;flex-direction:column;gap:5px;margin-bottom:12px}
.hp-alan label{font-size:13px;font-weight:700}
.hp-alan input,.hp-alan select{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.18);border-radius:10px;padding:11px 12px;color:inherit;font-size:16px;font-family:inherit;color-scheme:dark}
.hp-secim{display:flex;gap:6px;flex-wrap:wrap}
.hp-secim button{flex:1;min-width:90px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.15);color:inherit;border-radius:10px;padding:10px;font-size:13.5px;cursor:pointer;font-family:inherit}
.hp-secim button.sec{border-color:#f5a623;background:rgba(245,166,35,.15);color:#fbbf24;font-weight:700}
.hp-tablo{width:100%;border-collapse:collapse;font-size:13px}
.hp-tablo th{text-align:left;font-size:11px;color:#a8b0bf;font-weight:600;padding:6px 4px;border-bottom:1px solid rgba(255,255,255,.1)}
.hp-tablo td{padding:8px 4px;border-bottom:1px solid rgba(255,255,255,.06);vertical-align:top}
.hp-tablo td.s{text-align:center;font-family:'IBM Plex Mono',monospace}
.hp-chip{display:inline-block;background:rgba(56,189,248,.1);border:1px solid rgba(56,189,248,.3);color:#7dd3fc;border-radius:8px;padding:2px 7px;font-size:11.5px;margin:2px 3px 0 0;cursor:pointer}
.hp-gun{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;font-size:13px;cursor:pointer}
.hp-gun:hover{background:rgba(255,255,255,.04)}
.hp-gun.bugun{background:rgba(245,166,35,.12);border:1px solid rgba(245,166,35,.4)}
.hp-gun-no{width:34px;font-family:'IBM Plex Mono',monospace;color:#a8b0bf;font-size:12px}
.hp-gun-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0}
.hp-mat-grup{margin-bottom:14px}
.hp-mat-grup h4{margin:0 0 6px;font-size:14px}
.hp-mat{display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);color:inherit;border-radius:10px;padding:11px 12px;margin-top:6px;cursor:pointer;font-size:14px;font-family:inherit}
.hp-mat:hover{border-color:rgba(245,166,35,.5)}
.hp-uyari{background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.35);border-radius:12px;padding:12px 14px;font-size:13.5px;line-height:1.6}
.hp-adim{display:flex;gap:10px;margin-top:10px;font-size:13.5px;line-height:1.55}
.hp-adim b.n{flex-shrink:0;width:24px;height:24px;border-radius:50%;background:rgba(245,166,35,.15);color:#fbbf24;display:flex;align-items:center;justify-content:center;font-size:12px}
#hp-pill{position:fixed;left:50%;transform:translateX(-50%);bottom:18px;z-index:840;background:linear-gradient(135deg,#f5a623,#7c3aed);color:#fff;border:none;border-radius:24px;padding:10px 18px;font-weight:800;font-size:13.5px;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.4);display:none;font-family:'IBM Plex Sans',sans-serif;white-space:nowrap}
@media(max-width:900px){#hp-pill{bottom:76px}}
.hp-bolum{font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:700;letter-spacing:.1em;color:#a8b0bf;text-transform:uppercase;margin:22px 2px 8px}
.hp-hedef-cumle{font-size:20px;font-weight:800;line-height:1.4}
.hp-hedef-cumle b{color:#fbbf24;font-family:'IBM Plex Mono',monospace}
.hp-gorev-kart{border:1.5px solid rgba(245,166,35,.55);background:linear-gradient(160deg,rgba(245,166,35,.1),rgba(255,255,255,.02))}
.hp-adimlar{list-style:none;margin:12px 0 14px;padding:0}
.hp-adim2{display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid rgba(255,255,255,.07)}
.hp-adim2:first-child{border-top:none}
.hp-ekadim{display:flex;align-items:center;gap:12px;width:100%;margin:-4px 0 14px;padding:10px 12px;border:1px dashed rgba(255,255,255,.22);border-radius:12px;background:none;color:inherit;text-align:left;cursor:pointer;font-family:inherit;font-size:14px}
.hp-ekadim .hp-ek-ad{flex:1;font-weight:700}
.hp-ekadim small{display:block;font-weight:400;font-size:12px;color:#a8b0bf}
.hp-ekadim.bitti{opacity:.6}
.hp-adim2 .hp-no{width:28px;height:28px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;border:2px solid rgba(255,255,255,.25);color:#a8b0bf;background:none;padding:0;font-family:inherit}
.hp-adim2.sira .hp-no{border-color:#f5a623;color:#fbbf24}
.hp-adim2.bitti .hp-no{background:#10b981;border-color:#10b981;color:#fff}
.hp-adim2.bitti .hp-g-baslik{text-decoration:line-through;opacity:.6}
button.hp-no{cursor:pointer}
.hp-geri{background:none;border:none;color:#a8b0bf;font-size:14px;font-weight:600;cursor:pointer;padding:6px 0 12px;font-family:inherit}
.hp-cizgi-bar{display:flex;align-items:baseline;justify-content:space-between;gap:8px;font-size:14px;font-weight:700;margin-bottom:8px}
.hp-cizgi-bar span{font-size:12.5px;color:#a8b0bf;font-weight:600}
.hp-yol{position:relative;padding-left:4px}
.hp-asama{position:relative;padding-left:30px;padding-bottom:6px}
.hp-asama::before{content:'';position:absolute;left:13px;top:30px;bottom:-6px;width:2px;background:rgba(255,255,255,.12)}
.hp-asama:last-child::before{display:none}
.hp-asama.bitti::before{background:#10b981}
.hp-asama-bas{display:flex;align-items:center;gap:10px;width:100%;background:none;border:none;color:inherit;text-align:left;padding:6px 0;cursor:pointer;font-family:inherit;font-size:15px;font-weight:800}
.hp-asama-bas .hp-asama-no{position:absolute;left:0;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;background:#1b1f2a;border:2px solid rgba(255,255,255,.25);color:#a8b0bf}
.hp-asama.aktif .hp-asama-no{border-color:#f5a623;color:#fbbf24}
.hp-asama.bitti .hp-asama-no{background:#10b981;border-color:#10b981;color:#fff}
.hp-asama.kilit .hp-asama-bas{color:#8b93a3}
.hp-asama-bas .hp-say{margin-left:auto;font-size:12px;font-weight:600;color:#a8b0bf;font-family:'IBM Plex Mono',monospace}
.hp-asama-ic{display:none;padding:2px 0 8px}
.hp-asama.acik .hp-asama-ic{display:block}
.hp-dugum{display:flex;align-items:center;gap:10px;padding:9px 10px;margin-top:6px;border-radius:10px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);font-size:14px}
.hp-dugum .hp-d-ad{flex:1;min-width:0;line-height:1.35}
.hp-dugum .hp-d-ad small{display:block;font-size:11px;color:#a8b0bf;font-family:'IBM Plex Mono',monospace}
.hp-dugum .hp-d-ik{width:22px;text-align:center;flex-shrink:0}
.hp-dugum.bitti .hp-d-ik{color:#34d399;font-weight:800}
.hp-dugum.sira{border-color:#f5a623;background:rgba(245,166,35,.1);box-shadow:0 0 0 3px rgba(245,166,35,.12)}
.hp-dugum.gelecek{opacity:.5}
.hp-link{background:none;border:none;color:#7dd3fc;font-size:12.5px;cursor:pointer;padding:4px 2px;font-family:inherit;text-decoration:underline;flex-shrink:0}
.hp-ekler{border:1px solid rgba(255,255,255,.1);border-radius:14px;background:rgba(255,255,255,.02);margin-top:22px}
.hp-ekler summary{cursor:pointer;padding:14px 16px;font-weight:700;font-size:14.5px;list-style:none;display:flex;align-items:center;gap:8px}
.hp-ekler summary::-webkit-details-marker{display:none}
.hp-ekler summary::after{content:'▾';margin-left:auto;color:#a8b0bf;transition:transform .2s}
.hp-ekler[open] summary::after{transform:rotate(180deg)}
.hp-ekler-ic{padding:0 12px 12px}
.hp-ekler-ic h4{margin:10px 4px 2px;font-size:11px;color:#a8b0bf;font-family:'IBM Plex Mono',monospace;letter-spacing:.08em;text-transform:uppercase}
.hp-aha{border-radius:16px;min-height:190px;padding:22px 18px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:10px;cursor:pointer;width:100%;font-family:inherit;color:inherit;border:1.5px solid #5b8fff;background:rgba(91,143,255,.08)}
.hp-aha.cevrik{border-color:#34d399;background:rgba(52,211,153,.07)}
.hp-aha .hp-aha-no{font-family:'IBM Plex Mono',monospace;font-size:11px;color:#a8b0bf;letter-spacing:.08em}
.hp-aha .hp-aha-baslik{font-size:20px;font-weight:800;line-height:1.3}
.hp-aha .hp-aha-formul{font-family:'IBM Plex Mono',monospace;font-size:15px;font-weight:700;color:#34d399;line-height:1.6}
.hp-aha .hp-aha-ornek{font-size:13.5px;color:#cbd2dd;line-height:1.6}
.hp-aha .hp-on{display:contents}
.hp-aha .hp-arka{display:none}
.hp-aha.cevrik .hp-on{display:none}
.hp-aha.cevrik .hp-arka{display:flex;flex-direction:column;gap:10px}
.hp-soru-cumle{font-size:15px;line-height:1.8;margin:6px 0 10px}
.hp-sik{display:block;width:100%;text-align:left;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.14);color:inherit;border-radius:10px;padding:12px;margin-top:8px;font-size:14.5px;line-height:1.45;cursor:pointer;font-family:inherit}
.hp-sik.dogru{border-color:#10b981;background:rgba(16,185,129,.15)}
.hp-sik.yanlis{border-color:#f87171;background:rgba(248,113,113,.12)}
.hp-sik:disabled{cursor:default;color:inherit;opacity:1}
.hp-sure{font-family:'IBM Plex Mono',monospace;font-size:28px;font-weight:700;color:#fbbf24;text-align:center;margin:4px 0 10px}
.hp-tekrar-liste .hp-aha{min-height:130px;margin-top:10px}
`;
function cssEkle(){if(document.getElementById('hp-css'))return;const s=document.createElement('style');s.id='hp-css';s.textContent=CSS;document.head.appendChild(s);}
function overlayKur(){
  cssEkle();
  let o=document.getElementById('hp-overlay');
  if(o)return o;
  o=document.createElement('div');o.id='hp-overlay';o.setAttribute('role','dialog');o.setAttribute('aria-label','Hedef Programı');
  o.innerHTML=`<div class="hp-ust"><div class="hp-ust-ic"><div class="hp-baslik">🎯 Hedef Programım</div><button class="hp-kapat" onclick="hpKapat()">✕ Kapat</button></div></div><div class="hp-govde" id="hp-govde"></div>`;
  document.body.appendChild(o);
  olayBagla(o);
  return o;
}
// Sekme çubuğu yok: ana ekran tek yol (bugun). Diğer ekranlar "Ek araçlar"dan
// açılır ve en üstte "← Yoluma dön" taşır.
function ciz(scrollKoru){
  overlayKur();sureDurdur();
  const g=document.getElementById('hp-govde');const p=lsOku();
  if(!p){g.innerHTML=kurulumHTML(null);kurulumBagla();return;}
  const v=programHesapla(p);
  const r={bugun:yolHTML,aha:ahaAdimHTML,soru:soruAdimHTML,tekrar:tekrarAdimHTML,harita:haritaHTML,plan:planHTML,ilerleme:ilerlemeHTML,materyal:materyalHTML,strateji:stratejiHTML,ayar:()=>kurulumHTML(p)}[aktifSekme]||yolHTML;
  g.innerHTML=(aktifSekme==='bugun'?'':'<button class="hp-geri" data-hp-action="geri">← Yoluma dön</button>')+r(v,p);
  if(aktifSekme==='ayar')kurulumBagla();
  if(aktifSekme==='tekrar')sureBaslat();
  const o=document.getElementById('hp-overlay');if(o&&!scrollKoru)o.scrollTop=0;
}

// ----- kurulum -----
let kurTaslak=null;
function kurulumHTML(p){
  kurTaslak=Object.assign({sonPuan:'',hedefPuan:60,tarih:varsayilanTarih(),sinav:'YDS',gunlukDk:120},p||{});
  const secim=(ad,deger,liste)=>`<div class="hp-secim" data-ad="${ad}">${liste.map(([v,l])=>`<button type="button" data-v="${v}" class="${String(kurTaslak[ad])===String(v)?'sec':''}">${l}</button>`).join('')}</div>`;
  return `
  <div class="hp-kart">
    <div class="hp-eyebrow">${p?'Programı güncelle':'2 dakikada programını kur'}</div>
    <div class="hp-h">${p?'Bilgilerini düzenle':'Hedefine gün gün yürüyeceğin program'}</div>
    <p class="hp-muted" style="margin:0 0 14px">Son puanını, hedefini ve sınav tarihini yaz. Sınav gününe kadar her gün ne çalışacağını, hangi soru tipinden kaç doğru toplaman gerektiğini hesaplayalım.</p>
    <div class="hp-alan"><label for="hp-son">Son sınav puanın</label><input id="hp-son" type="number" inputmode="decimal" min="0" max="100" step="0.25" placeholder="örn. 21" value="${esc(kurTaslak.sonPuan)}"></div>
    <div class="hp-alan"><label for="hp-hedef">Hedef puanın</label><input id="hp-hedef" type="number" inputmode="decimal" min="1" max="100" step="0.25" value="${esc(kurTaslak.hedefPuan)}"></div>
    <div class="hp-alan"><label for="hp-tarih">Sınav tarihin</label><input id="hp-tarih" type="date" value="${esc(kurTaslak.tarih)}"></div>
    <div class="hp-alan"><label>Sınav</label>${secim('sinav',kurTaslak.sinav,[['YDS','YDS'],['YOKDIL','YÖKDİL']])}</div>
    <div class="hp-alan"><label>Günde ne kadar çalışabilirsin?</label>${secim('gunlukDk',kurTaslak.gunlukDk,[[60,'~1 saat'],[120,'~2 saat'],[180,'3+ saat']])}</div>
    <div id="hp-kur-hata" style="color:#f87171;font-size:13px;margin-bottom:8px"></div>
    <button class="hp-btn" onclick="hpKaydet()">${p?'💾 Kaydet':'🚀 Programımı Oluştur'}</button>
    ${p?'<button class="hp-btn2" style="margin-top:12px;width:100%;color:#f87171;border-color:rgba(248,113,113,.4)" onclick="hpSifirla()">Programı sil ve baştan kur</button>':''}
  </div>`;
}
function kurulumBagla(){
  document.querySelectorAll('#hp-govde .hp-secim').forEach(k=>{
    k.addEventListener('click',e=>{
      const b=e.target.closest('button');if(!b)return;
      k.querySelectorAll('button').forEach(x=>x.classList.remove('sec'));b.classList.add('sec');
      const ad=k.dataset.ad;kurTaslak[ad]=ad==='gunlukDk'?Number(b.dataset.v):b.dataset.v;
    });
  });
}
window.hpKaydet=function(){
  const son=parseFloat(document.getElementById('hp-son').value);
  const hedef=parseFloat(document.getElementById('hp-hedef').value);
  const tarih=document.getElementById('hp-tarih').value;
  const hata=document.getElementById('hp-kur-hata');
  if(isNaN(son)||son<0||son>100){hata.textContent='Son puanını 0–100 arasında yaz (hiç girmediysen 0 yaz).';return;}
  if(isNaN(hedef)||hedef<=0||hedef>100){hata.textContent='Hedef puanını 1–100 arasında yaz.';return;}
  if(!tarih||gunFarki(bugunStr(),tarih)<1){hata.textContent='Sınav tarihi bugünden sonra olmalı.';return;}
  const eski=lsOku();
  const p=Object.assign({baslangic:bugunStr(),denemeler:[],tamam:{}},eski||{},{sonPuan:son,hedefPuan:hedef,tarih,sinav:kurTaslak.sinav,gunlukDk:kurTaslak.gunlukDk});
  if(!eski)p.baslangic=bugunStr();
  // tarih değiştiyse program bugünden yeniden başlar (tamamlanan kayıtlar korunur)
  if(eski&&eski.tarih!==tarih)p.baslangic=bugunStr();
  lsYaz(p);
  aktifSekme='bugun';
  ciz();pillGuncelle();heroGuncelle();
  if(typeof bugunKartiRender==='function')bugunKartiRender();
};
window.hpSifirla=function(){
  if(!confirm('Programın, işaretlediğin görevler ve deneme sonuçların silinecek. Emin misin?'))return;
  try{localStorage.removeItem(ANAHTAR);}catch(e){}
  aktifSekme='bugun';ciz();pillGuncelle();heroGuncelle();
};

// ----- bugün -----
function durumMesaji(v){
  if(!v.sonDeneme)return{r:'#a8b0bf',m:'İlk deneme gününde puanını gir; programın yolunda olup olmadığını göstereceğim.'};
  const f=v.sonDeneme.puan-v.beklenenPuan;
  if(v.sonDeneme.puan>=v.hedefPuan)return{r:'#34d399',m:'🏆 Son denemende hedefini yakaladın! Şimdi bu seviyeyi sabitle.'};
  if(f>=0)return{r:'#34d399',m:`✅ Plan üstündesin: son deneme ${v.sonDeneme.puan} puan, bugün beklenen ${v.beklenenPuan}.`};
  if(f>-7)return{r:'#fbbf24',m:`🟡 Plana çok yakınsın (${v.sonDeneme.puan} / beklenen ${v.beklenenPuan}). Görevleri aksatmazsan kapanır.`};
  return{r:'#f87171',m:`🔴 Planın ${Math.round(-f)} puan gerisindesin. Paniğe gerek yok: "Hedef Haritası"ndaki en kolay bölümlere (kelime, dilbilgisi, çeviri) ağırlık ver.`};
}
// ===== TEK YOL — ana ekran =====
// 1 Hedef kutusu · 2 Bugünün görevi (sayfadaki TEK turuncu buton) · 3 Yol haritası
// · 4 İlerleme çubuğu · 5 Ek araçlar (kapalı akordeon)
let acikAsama=null; // kullanıcı başka bir aşamayı açtıysa (bellekte)
function hedefCumlesi(v){
  const hafta=Math.max(1,v.kalanGun/7);
  const haftalik=Math.ceil(v.fark/hafta);
  const son=v.fark<=0?'Hedef puanı zaten yakalıyorsun, bu seviyeyi koru.':v.kalanGun<7?`Bu hafta ~${v.fark} yeni doğru gerek.`:`Haftada ~${haftalik} yeni doğru yeter.`;
  return `<b>${v.sonPuan}</b> → <b>${v.hedefPuan}</b> · ${v.kalanGun} gün · ${son}`;
}
function yolHTML(v,p){
  if(v.kalanGun<=0){
    return `<div class="hp-kart"><div class="hp-eyebrow">${v.kalanGun===0?'Bugün sınav günü':'Sınav geçti'}</div><div class="hp-h">${v.kalanGun===0?'Başarılar! Hiçbir soruyu boş bırakma. 🍀':'Sınavın nasıl geçti?'}</div><p class="hp-muted">${v.kalanGun===0?'Sınav günü zaman planını bir kez daha oku.':'Yeni sınav tarihin varsa programını güncelle.'}</p><button class="hp-btn" data-hp-action="sekme" data-k="${v.kalanGun===0?'strateji':'ayar'}">${v.kalanGun===0?'🧭 Sınav Günü Stratejisi':'⚙️ Yeni tarih gir'}</button></div>`;
  }
  const dm=v.sonDeneme?durumMesaji(v):null;
  return `
  <div class="hp-kart">
    <div class="hp-eyebrow">Hedefin</div>
    <div class="hp-hedef-cumle">${hedefCumlesi(v)}</div>
    <div class="hp-muted" style="font-size:12.5px;margin-top:6px">80 soru, her doğru 1,25 puan: ${v.mevcutDogru} → ${v.hedefDogru} doğru (+${v.fark}).</div>
    ${dm?`<div class="hp-muted" style="font-size:12.5px;margin-top:6px;color:${dm.r}">${dm.m}</div>`:''}
  </div>
  ${gorevKartiHTML(v,p)}
  <div class="hp-bolum">Yol haritası</div>
  ${yolHaritasiHTML(p)}
  ${ilerlemeCubuguHTML(v,p)}
  ${eklerHTML()}`;
}
function gorevKartiHTML(v,p){
  const d=Math.max(1,Math.min(v.gunNo,v.toplamGun));
  const gg=gunGorevleri(v,d);
  const t=bugunStr();const ok=tamamOku(p,t);
  const sira=gg.gorevler.find(x=>!ok[x.id]);
  const kart=gg.tip==='normal'?kartOku(bugunKarti(p)):null;
  const baslik=kart?`AHA ${kart.no} · ${esc(kart.baslik)}`:gg.tip==='deneme'?'📝 Deneme günü':gg.tip==='son'?'🌙 Sınavdan önceki son gün':'🔁 Deneme + tekrar';
  const adimlar=gg.gorevler.map((x,i)=>{
    const bitti=!!ok[x.id];const dis=!x.ic||!['aha','soru','tekrar'].includes(x.ic);
    const no=dis?`<button class="hp-no" data-hp-action="isaretle" data-t="${t}" data-id="${x.id}" aria-label="${bitti?'İşareti kaldır':'Tamamlandı olarak işaretle'}">${bitti?'✓':i+1}</button>`:`<span class="hp-no">${bitti?'✓':i+1}</span>`;
    return `<li class="hp-adim2${bitti?' bitti':x===sira?' sira':''}">${no}<div class="hp-g-ic"><div class="hp-g-baslik">${x.ikon} ${esc(x.baslik)}</div><div class="hp-g-detay">${esc(x.detay||'')}${x.dk?(x.detay?' · ':'')+'~'+x.dk+' dk':''}</div></div></li>`;
  }).join('');
  const dk=gg.gorevler.reduce((a,x)=>a+(x.dk||0),0);
  return `
  <div class="hp-bolum">Bugünün görevi</div>
  <div class="hp-kart hp-gorev-kart">
    <div class="hp-eyebrow">Gün ${d} / ${v.toplamGun} · ≈ ${dk} dk</div>
    <div class="hp-h">${baslik}</div>
    <ol class="hp-adimlar">${adimlar}</ol>
    ${ekKelimeHTML(ok)}
    ${sira?`<button class="hp-btn" data-hp-action="basla">Başla</button>`:`<div class="hp-uyari">🎉 Bugünü bitirdin. ${gg.tip==='normal'&&siradakiKart(p)?`Yarın: <b>AHA ${siradakiKart(p)} · ${esc(kartOku(siradakiKart(p)).baslik)}</b>`:'Yarın görüşürüz.'}</div>`}
  </div>`;
}
// İsteğe bağlı ek adım: sayaca (pill / x/3 / haftalık gün) DAHİL DEĞİL —
// gunGorevleri listesinde yok, sadece tamam[t].kelime10 ile ✓ gösterilir.
function ekKelimeHTML(ok){
  const bitti=!!ok.kelime10;
  return `<button class="hp-ekadim${bitti?' bitti':''}" data-hp-action="kelime10"><span style="font-size:18px">${bitti?'✓':'🃏'}</span><span class="hp-ek-ad">+ 10 kelime (5 dk)<small>İsteğe bağlı · Kelime Kartları açılır</small></span><span style="color:#a8b0bf">→</span></button>`;
}
function yolHaritasiHTML(p){
  const bugunNo=bugunKarti(p);
  const bugunBitti=!!(bugunNo&&p.ahaBiten&&p.ahaBiten[bugunNo]);
  const hedefNo=bugunBitti?siradakiKart(p):bugunNo;
  const aktif=hedefNo?kartAsamasi(hedefNo).no:4;
  const acik=acikAsama||aktif;
  return `<div class="hp-yol">${ASAMALAR.map(a=>{
    const biten=a.kartlar.filter(n=>p.ahaBiten&&p.ahaBiten[n]).length;
    const tamam=biten===a.kartlar.length&&a.no<aktif;
    const kilit=a.no>aktif;
    const dugumler=a.kartlar.map(n=>{
      const k=kartOku(n);const bitti=!!(p.ahaBiten&&p.ahaBiten[n]);const sira=n===hedefNo&&!bitti;
      const cls=bitti?'bitti':sira?'sira':'gelecek';
      const ik=bitti?'✓':sira?'●':'🔒';
      const aks=bitti?'tekrar et':sira?'':'yine de aç';
      return `<div class="hp-dugum ${cls}"><span class="hp-d-ik">${ik}</span><span class="hp-d-ad"><small>AHA ${n}</small>${esc(k.baslik)}${sira?` <span style="color:#fbbf24;font-size:12px;font-weight:700">· ${bugunBitti?'yarın':'bugün'}</span>`:''}</span>${aks?`<button class="hp-link" data-hp-action="kart" data-no="${n}">${aks}</button>`:''}</div>`;
    }).join('')+(a.ekler||[]).map(([k,ad])=>`<div class="hp-dugum${kilit?' gelecek':''}"><span class="hp-d-ik">${kilit?'🔒':'○'}</span><span class="hp-d-ad">${ad}</span><button class="hp-link" data-hp-action="materyal" data-k="${k}">${kilit?'yine de aç':'aç'}</button></div>`).join('');
    return `<div class="hp-asama${a.no===acik?' acik':''}${tamam?' bitti':''}${a.no===aktif?' aktif':''}${kilit?' kilit':''}">
      <button class="hp-asama-bas" data-hp-action="asama" data-no="${a.no}" aria-expanded="${a.no===acik}"><span class="hp-asama-no">${tamam?'✓':kilit?'🔒':a.no}</span>Aşama ${a.no} · ${a.ad}<span class="hp-say">${biten}/${a.kartlar.length}</span></button>
      <div class="hp-asama-ic">${dugumler}</div>
    </div>`;
  }).join('')}</div>`;
}
function ilerlemeCubuguHTML(v,p){
  const kart=bitenKartlar(p).length,hafta=haftaSayaci(v,p);
  return `<div class="hp-kart" style="margin-top:14px">
    <div class="hp-cizgi-bar">${kart}/${KART_SIRASI.length} kart<span>bu hafta ${hafta}/${HAFTA_HEDEF} gün</span></div>
    <div class="hp-bar"><div style="width:${Math.round(kart/KART_SIRASI.length*100)}%"></div></div>
  </div>`;
}
function eklerHTML(){
  const mat=(k,ad)=>`<button class="hp-mat" data-hp-action="materyal" data-k="${k}"><span style="font-size:18px">${M[k].ikon}</span><span style="flex:1">${ad||M[k].ad}</span><span style="color:#a8b0bf">→</span></button>`;
  const sek=(k,ik,ad)=>`<button class="hp-mat" data-hp-action="sekme" data-k="${k}"><span style="font-size:18px">${ik}</span><span style="flex:1">${ad}</span><span style="color:#a8b0bf">→</span></button>`;
  return `<details class="hp-ekler"><summary>🧰 Ek araçlar</summary><div class="hp-ekler-ic">
    <h4>Serbest çalışma</h4>
    ${mat('fiilAvi','DNA Testi — Fiil Avı')}${mat('sinyalLab','Serbest soru pratiği (Sinyal Lab)')}${mat('aha','Tüm AHA kartları (ızgara)')}${mat('kelimeKart','Kelime kartları')}
    <h4>Program</h4>
    ${sek('plan','📅','Gün gün program')}${sek('harita','🗺️','Hangi bölümden kaç doğru?')}${sek('ilerleme','📈','Deneme sonucu ekle + grafik')}${sek('materyal','📚','Tüm materyaller')}${sek('strateji','🧭','Sınav günü stratejisi')}${sek('ayar','⚙️','Puan / tarih ayarları')}
  </div></details>`;
}

// ===== Adım ekranları (kart → 5 soru → 5 dk tekrar) =====
let onizleme=null; // "yine de aç"/"tekrar et" ile açılan kart no
function ahaKutuHTML(k,cevrik){
  return `<button class="hp-aha${cevrik?' cevrik':''}" data-hp-action="cevir" aria-label="Kartı çevir">
    <span class="hp-on"><span class="hp-aha-no">AHA ${k.no}</span><span class="hp-aha-baslik">${esc(k.baslik)}</span><span class="hp-muted" style="font-size:12px">Çevirmek için dokun ↻</span></span>
    <span class="hp-arka"><span class="hp-aha-no">AHA ${k.no} · ${esc(k.baslik)}</span><span class="hp-aha-formul">${k.formul}</span><span class="hp-aha-ornek">${k.ornek}</span></span>
  </button>`;
}
function ahaAdimHTML(v,p){
  if(onizleme){
    const k=kartOku(onizleme);
    return `<div class="hp-eyebrow">Önizleme · ${esc(kartAsamasi(onizleme).ad)}</div>${ahaKutuHTML(k,false)}<p class="hp-muted" style="font-size:12.5px">Bu kart yol haritanı değiştirmez; bugünün görevi aynı kalır.</p>`;
  }
  const k=kartOku(bugunKarti(p));
  return `<div class="hp-eyebrow">Adım 1 / 3 · AHA kartı</div>${ahaKutuHTML(k,false)}
  <p class="hp-muted" style="font-size:12.5px">Formülü ve örneği okuduktan sonra devam et.</p>
  <button class="hp-btn" data-hp-action="adim-bitti" data-id="aha">Anladım → 5 soruya geç</button>`;
}
let quiz=null; // {no,sorular:[havuz idx],i,dogru,secim}
function havuzGetir(){try{return (typeof SL_HAVUZ!=='undefined'&&Array.isArray(SL_HAVUZ))?SL_HAVUZ:[];}catch(e){return [];}}
function kartSorulari(no){
  const havuz=havuzGetir();const anahtar=KART_SINYAL[no]||[];
  const eslesen=[],diger=[];
  havuz.forEach((s,i)=>{(anahtar.includes(String(s.sinyal||'').toLowerCase())?eslesen:diger).push(i);});
  const kay=diger.length?(no*7)%diger.length:0; // dolgu her kartta farklı yerden başlasın
  return eslesen.concat(diger.slice(kay),diger.slice(0,kay)).slice(0,5);
}
function soruAdimHTML(v,p){
  const no=bugunKarti(p);
  if(!quiz||quiz.no!==no)quiz={no,sorular:kartSorulari(no),i:0,dogru:0,secim:null};
  const havuz=havuzGetir();
  if(!quiz.sorular.length){
    return `<div class="hp-eyebrow">Adım 2 / 3 · 5 soru</div><div class="hp-kart"><p class="hp-muted" style="margin:0 0 10px">Sorular şu an yüklenemedi. Sinyal Lab'da bu konudan 5 soru çöz, sonra buraya dönüp işaretle.</p><button class="hp-btn2" data-hp-action="materyal" data-k="sinyalLab">🔬 Sinyal Lab'ı aç</button></div><button class="hp-btn" data-hp-action="adim-bitti" data-id="soru">5 soruyu çözdüm ✓</button>`;
  }
  if(quiz.i>=quiz.sorular.length){
    return `<div class="hp-eyebrow">Adım 2 / 3 · Sonuç</div><div class="hp-kart" style="text-align:center"><div class="hp-h">${quiz.sorular.length} soruda ${quiz.dogru} doğru</div><p class="hp-muted" style="margin:0">${quiz.dogru>=4?'Harika, bu kural oturmuş.':'Tekrarda bu kartın üzerinden bir kez daha geç.'}</p></div><button class="hp-btn" data-hp-action="adim-bitti" data-id="soru">5 dk tekrara geç</button>`;
  }
  const s=havuz[quiz.sorular[quiz.i]];const cev=quiz.secim!==null;
  return `<div class="hp-eyebrow">Adım 2 / 3 · Soru ${quiz.i+1} / ${quiz.sorular.length} · AHA ${no}</div>
  <div class="hp-kart">
    <div class="hp-soru-cumle">${s.sent}</div>
    <div style="font-weight:700;font-size:14.5px">${esc(s.q)}</div>
    ${s.opts.map((o,j)=>`<button class="hp-sik${cev&&j===s.ans?' dogru':''}${cev&&j===quiz.secim&&j!==s.ans?' yanlis':''}" data-hp-action="cevap" data-j="${j}"${cev?' disabled':''}>${String.fromCharCode(65+j)}) ${esc(o)}</button>`).join('')}
    ${cev?`<div class="hp-uyari" style="margin-top:12px">${quiz.secim===s.ans?'✅ Doğru.':'❌ Doğrusu '+String.fromCharCode(65+s.ans)+'.'} ${esc(s.fb||'')}</div>`:''}
  </div>
  ${cev?`<button class="hp-btn" data-hp-action="sonraki-soru">${quiz.i+1<quiz.sorular.length?'Sonraki soru →':'Sonucu gör'}</button>`:''}`;
}
let sureId=null,sureBitis=0;
function sureDurdur(){if(sureId){clearInterval(sureId);sureId=null;}}
function sureBaslat(){
  sureDurdur();sureBitis=Date.now()+5*60*1000;
  const yaz=()=>{const el=document.getElementById('hp-sure');if(!el){sureDurdur();return;}
    const k=Math.max(0,Math.round((sureBitis-Date.now())/1000));
    el.textContent=k>0?`${Math.floor(k/60)}:${String(k%60).padStart(2,'0')}`:'Süre doldu ✓';if(!k)sureDurdur();};
  yaz();sureId=setInterval(yaz,1000);
}
function tekrarAdimHTML(v,p){
  const no=bugunKarti(p);
  const onceki=bitenKartlar(p).filter(n=>n!==no).slice(-4).reverse();
  const liste=[no].concat(onceki);
  return `<div class="hp-eyebrow">Adım 3 / 3 · 5 dk tekrar</div>
  <div class="hp-sure" id="hp-sure">5:00</div>
  <p class="hp-muted" style="font-size:12.5px;margin:0">Her kartın önce başlığına bak, formülü hatırlamaya çalış, sonra çevirip kontrol et.</p>
  <div class="hp-tekrar-liste">${liste.map(n=>ahaKutuHTML(kartOku(n),false)).join('')}</div>
  <button class="hp-btn" style="margin-top:14px" data-hp-action="adim-bitti" data-id="tekrar">Tekrarı bitirdim ✓</button>`;
}
function adimBitir(id){
  const p=lsOku();if(!p)return;const t=bugunStr();
  p.tamam=p.tamam||{};p.tamam[t]=p.tamam[t]||{};p.tamam[t][id]=true;
  kartiKapat(p);lsYaz(p);
  if(id==='aha')aktifSekme='soru';else if(id==='soru'){aktifSekme='tekrar';quiz=null;}else aktifSekme='bugun';
  ciz();pillGuncelle();
  if(typeof bugunKartiRender==='function')bugunKartiRender();
}
function basla(){
  const p=lsOku();if(!p)return;const v=programHesapla(p);
  const d=Math.max(1,Math.min(v.gunNo,v.toplamGun));
  const gg=gunGorevleri(v,d);const ok=tamamOku(p,bugunStr());
  const x=gg.gorevler.find(g=>!ok[g.id]);if(!x)return;
  if(x.ic==='aha'||x.ic==='soru'||x.ic==='tekrar'){
    // Bugünün kartını sabitle: tamamlandıktan sonra da gün aynı kartı göstersin
    const t=bugunStr();p.gunKart=p.gunKart||{};
    if(!p.gunKart[t]){const n=siradakiKart(p);if(n){p.gunKart[t]=n;lsYaz(p);}}
    onizleme=null;aktifSekme=x.ic;ciz();return;
  }
  if(x.ic){aktifSekme=x.ic;ciz();return;}
  materyalAc(x.mat);
}
// Tek olay dinleyicisi (data-hp-action) — iOS Safari'de inline onclick yerine
// delegasyon; butonlar gerçek <button> olduğu için dokunma güvenilir.
function olayBagla(o){
  o.addEventListener('click',function(e){
    const el=e.target.closest('[data-hp-action]');if(!el||!o.contains(el))return;
    const a=el.dataset.hpAction;
    if(a==='basla')basla();
    else if(a==='geri'){onizleme=null;aktifSekme='bugun';ciz();}
    else if(a==='sekme'){aktifSekme=el.dataset.k;ciz();}
    else if(a==='materyal')materyalAc(el.dataset.k);
    else if(a==='asama'){const n=Number(el.dataset.no);const kutu=el.parentElement;const ac=!kutu.classList.contains('acik');
      o.querySelectorAll('.hp-asama.acik').forEach(x=>{x.classList.remove('acik');x.firstElementChild.setAttribute('aria-expanded','false');});
      if(ac){kutu.classList.add('acik');el.setAttribute('aria-expanded','true');}acikAsama=ac?n:-1;}
    else if(a==='kart'){onizleme=Number(el.dataset.no);aktifSekme='aha';ciz();}
    else if(a==='cevir')el.classList.toggle('cevrik');
    else if(a==='adim-bitti')adimBitir(el.dataset.id);
    else if(a==='cevap'){if(quiz&&quiz.secim===null){quiz.secim=Number(el.dataset.j);const s=havuzGetir()[quiz.sorular[quiz.i]];if(s&&quiz.secim===s.ans)quiz.dogru++;ciz(true);}}
    else if(a==='sonraki-soru'){if(quiz){quiz.i++;quiz.secim=null;ciz();}}
    else if(a==='isaretle')hpIsaretle(el.dataset.t,el.dataset.id);
    else if(a==='kelime10'){const p=lsOku();if(p){const t=bugunStr();p.tamam=p.tamam||{};p.tamam[t]=p.tamam[t]||{};p.tamam[t].kelime10=true;lsYaz(p);}materyalAc('kelimeKart');}
  });
}
function gorevHTML(x,bitti,tarih){
  const basla=['aha','soru','tekrar'].includes(x.ic)?`hpSekme('bugun')`:x.ic?`hpSekme('${x.ic}')`:`hpMateryal('${x.mat}')`;
  return `<div class="hp-gorev${bitti?' bitti':''}">
    <button class="hp-check" aria-label="Tamamlandı olarak işaretle" onclick="hpIsaretle('${tarih}','${x.id}')">${bitti?'✓':''}</button>
    <div class="hp-g-ic"><div class="hp-g-baslik">${x.ikon} ${esc(x.baslik)}</div>${x.detay?`<div class="hp-g-detay">${esc(x.detay)}${x.dk?' · ~'+x.dk+' dk':''}</div>`:(x.dk?`<div class="hp-g-detay">~${x.dk} dk</div>`:'')}</div>
    ${bitti?'':`<button class="hp-basla" onclick="${basla}">Başla →</button>`}
  </div>`;
}
window.hpIsaretle=function(tarih,id){
  const p=lsOku();if(!p)return;
  p.tamam=p.tamam||{};p.tamam[tarih]=p.tamam[tarih]||{};
  p.tamam[tarih][id]=!p.tamam[tarih][id];
  kartiKapat(p);lsYaz(p);ciz();pillGuncelle();
  if(typeof bugunKartiRender==='function')bugunKartiRender();
};
window.hpMateryal=function(k){materyalAc(k);};

// ----- hedef haritası -----
function haritaHTML(v){
  const dag=hedefDagilimi(v.hedefDogru);
  const topHedef=dag.reduce((a,b)=>a+b.hedef,0);
  const kalan=SORU_SAYISI-topHedef;
  const tahmin=Math.round(kalan*0.2);
  return `
  <div class="hp-kart">
    <div class="hp-eyebrow">Puan hesabın</div>
    <div class="hp-h">${v.sonPuan} puan ≈ ${v.mevcutDogru} doğru → ${v.hedefPuan} puan = ${v.hedefDogru} doğru</div>
    <p class="hp-muted" style="margin:0">80 soru var, her doğru <b>1,25 puan</b>. Hedefine ulaşmak için şu an yaptığından <b style="color:#fbbf24">${v.fark} soru daha fazla</b> doğru yapman yeterli. ${v.kalanGun>0?`${v.kalanGun} günün var; bu, <b>${Math.max(1,Math.round(v.kalanGun/Math.max(1,v.fark)*10)/10)} günde 1 yeni doğru</b> demek.`:''}</p>
  </div>
  <div class="hp-kart">
    <div class="hp-eyebrow">Hangi bölümden kaç doğru?</div>
    <p class="hp-muted" style="margin:0 0 8px">Önerilen dağılım: öğrenmesi en hızlı olan bölümlere (kelime, dilbilgisi, cümle tamamlama, çeviri) ağırlık veriyor. Materyale tıklayınca ilgili ders açılır.</p>
    <table class="hp-tablo"><thead><tr><th>Bölüm (${v.sinav==='YOKDIL'?'YDS numaralarıyla':'soru no'})</th><th style="text-align:center">Soru</th><th style="text-align:center">Hedef</th></tr></thead><tbody>
    ${dag.map(b=>`<tr><td><b>${b.ad}</b> <span class="hp-muted" style="font-size:11.5px">${b.no}</span><div>${b.mat.map(k=>M[k]?`<span class="hp-chip" onclick="hpMateryal('${k}')">${M[k].ikon} ${M[k].ad}</span>`:'').join('')}</div></td><td class="s">${b.adet}</td><td class="s" style="color:#fbbf24;font-weight:700">${b.hedef}</td></tr>`).join('')}
    <tr><td><b>Toplam</b></td><td class="s">80</td><td class="s" style="color:#fbbf24;font-weight:800">${topHedef}</td></tr>
    </tbody></table>
    ${v.sinav==='YOKDIL'?'<p class="hp-muted" style="font-size:12px;margin:8px 0 0">YÖKDİL\'de diyalog sorusu yoktur ve bölüm sıraları farklıdır; o hedefleri okuma ve cümle tamamlamaya ekle. Soru tipleri ve çalışma yöntemi aynıdır.</p>':''}
  </div>
  <div class="hp-uyari">🎲 <b>Güvenlik payın:</b> Hedeflediğin ${topHedef} doğrunun dışında kalan ${kalan} soruyu da boş bırakmazsan, şansla ortalama <b>~${tahmin} doğru daha</b> gelir (≈ +${dogruPuan(tahmin)} puan). Yanlış doğruyu götürmediği için bu tamamen bedava.</div>
  <button class="hp-btn" style="margin-top:12px" onclick="hpSekme('bugun')">☀️ Bugünkü görevlerime geç</button>`;
}

// ----- program (takvim) -----
const GUN_RENK={normal:'#38bdf8',deneme:'#f5a623',tekrar:'#34d399',son:'#a78bfa'};
function planHTML(v,p){
  const bugunNo=Math.min(v.gunNo,v.toplamGun);
  let html=`<div class="hp-kart"><div class="hp-eyebrow">${v.toplamGun} günlük program</div><div class="hp-h">${tarihYaz(p.baslangic)} → ${tarihYaz(p.tarih)} (sınav)</div>
  <div class="hp-muted" style="font-size:12.5px"><span style="color:${GUN_RENK.normal}">●</span> Normal gün: 1 AHA kartı → 5 soru → 5 dk tekrar · <span style="color:${GUN_RENK.deneme}">●</span> Her 7. gün deneme · <span style="color:${GUN_RENK.tekrar}">●</span> 22 kart bitince deneme + tekrar</div></div><div class="hp-kart" style="padding:8px">`;
  for(let d=1;d<=v.toplamGun;d++){
    const t=gunEkle(p.baslangic,d-1);const gg=gunGorevleri(v,d);const ok=tamamOku(p,t);
    const biten=gg.gorevler.filter(x=>ok[x.id]).length,tum=gg.gorevler.length;
    const durum=biten===tum?'✅':(d<bugunNo?(biten?`${biten}/${tum}`:'—'):(d===bugunNo?`${biten}/${tum}`:''));
    const gk=p.gunKart&&p.gunKart[t];
    const ozet=gg.tip==='deneme'?'📝 Deneme günü':gg.tip==='son'?'🌙 Hafif tekrar':gg.tip==='tekrar'?'🔁 Deneme + tekrar':gk?`🃏 AHA ${gk} · ${kartOku(gk).baslik}`:'🃏 AHA kartı + 5 soru + tekrar';
    html+=`<div class="hp-gun${d===bugunNo?' bugun':''}" onclick="${d===bugunNo?"hpSekme('bugun')":`hpGunGoster(${d})`}"><span class="hp-gun-no">G${d}</span><span class="hp-gun-dot" style="background:${GUN_RENK[gg.tip]}"></span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${tarihYaz(t)} · ${esc(ozet)}</span><span style="font-size:12px;color:#a8b0bf">${durum}</span></div>`;
  }
  html+=`<div class="hp-gun" style="cursor:default"><span class="hp-gun-no">🎯</span><span class="hp-gun-dot" style="background:#f87171"></span><span style="flex:1"><b>${tarihYaz(p.tarih,true)} · SINAV</b></span></div></div>`;
  return html;
}
window.hpGunGoster=function(d){
  const p=lsOku();if(!p)return;const v=programHesapla(p);
  const t=gunEkle(p.baslangic,d-1);const gg=gunGorevleri(v,d);const ok=tamamOku(p,t);
  document.getElementById('hp-govde').innerHTML=`<button class="hp-geri" data-hp-action="sekme" data-k="plan">← Programa dön</button><div class="hp-kart"><div class="hp-eyebrow">Gün ${d} · ${tarihYaz(t,true)}</div><div class="hp-h">${gg.tip==='deneme'?'📝 Deneme günü':'Görevler'}</div>${gg.gorevler.map(x=>gorevHTML(x,ok[x.id],t)).join('')}</div>`;
};

// ----- ilerleme -----
function grafikSVG(v){
  const W=400,H=230,pl=30,pr=10,pt=18,pb=24; // dar viewBox: telefonda yazılar okunur kalsın
  const N=v.toplamGun;const maxY=Math.max(100,v.hedefPuan);
  const x=d=>pl+(W-pl-pr)*(Math.max(0,Math.min(N,d))/N);
  const y=pu=>pt+(H-pt-pb)*(1-pu/maxY);
  const noktalar=v.denemeler.map(dn=>({d:gunFarki(v.baslangic,dn.tarih)+1,pu:dn.puan}));
  const izgara=[0,20,40,60,80,100].map(g=>`<line x1="${pl}" x2="${W-pr}" y1="${y(g)}" y2="${y(g)}" stroke="rgba(255,255,255,.07)"/><text x="${pl-6}" y="${y(g)+4}" fill="#8b93a3" font-size="13" text-anchor="end">${g}</text>`).join('');
  const hedefCizgi=`<line x1="${x(0)}" y1="${y(v.sonPuan)}" x2="${x(N)}" y2="${y(v.hedefPuan)}" stroke="#f5a623" stroke-width="2" stroke-dasharray="6 5"/>`;
  const hedefEt=`<text x="${x(N)-4}" y="${y(v.hedefPuan)-7}" fill="#fbbf24" font-size="13" text-anchor="end">hedef ${v.hedefPuan}</text>`;
  const cizgi=noktalar.length>1?`<polyline fill="none" stroke="#34d399" stroke-width="2.5" points="${noktalar.map(n=>x(n.d)+','+y(n.pu)).join(' ')}"/>`:'';
  const nokta=noktalar.map(n=>`<circle cx="${x(n.d)}" cy="${y(n.pu)}" r="4.5" fill="#34d399"/><text x="${x(n.d)}" y="${y(n.pu)-9}" fill="#d1fae5" font-size="13" text-anchor="middle">${n.pu}</text>`).join('');
  const bugunX=x(Math.min(v.gunNo,N));
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Deneme puanları ve hedef çizgisi" style="display:block">${izgara}<line x1="${bugunX}" x2="${bugunX}" y1="${pt}" y2="${H-pb}" stroke="rgba(255,255,255,.18)"/><text x="${bugunX}" y="${H-8}" fill="#8b93a3" font-size="13" text-anchor="middle">bugün</text>${hedefCizgi}${hedefEt}${cizgi}${nokta}</svg>`;
}
function ilerlemeHTML(v,p){
  const sayac=tamamSayac(p);const dm=durumMesaji(v);
  return `
  <div class="hp-kart">
    <div class="hp-eyebrow">Deneme puanların</div>
    ${grafikSVG(v)}
    <div class="hp-muted" style="font-size:12px;margin-top:6px"><span style="color:#fbbf24">– – –</span> olması gereken yol · <span style="color:#34d399">●</span> senin denemelerin</div>
    <div class="hp-muted" style="margin-top:8px;color:${dm.r}">${dm.m}</div>
  </div>
  <div class="hp-kart">
    <div class="hp-eyebrow">Deneme sonucu ekle</div>
    <p class="hp-muted" style="margin:0 0 10px">Sınav Simülatörü'nü bitirince sonuç otomatik eklenir. Başka bir deneme çözdüysen doğru sayını gir (80 üzerinden).</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <input id="hp-dn-dogru" type="number" inputmode="numeric" min="0" max="80" placeholder="Doğru sayısı" style="flex:1;min-width:120px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.18);border-radius:10px;padding:11px;color:inherit;font-size:16px;font-family:inherit">
      <button class="hp-basla" onclick="hpDenemeElle()">Ekle</button>
    </div>
    <div id="hp-dn-hata" style="color:#f87171;font-size:12.5px;margin-top:6px"></div>
    ${v.denemeler.length?`<div style="margin-top:10px">${v.denemeler.slice().reverse().map((dn,i)=>`<div style="display:flex;justify-content:space-between;font-size:13px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.06)"><span>${tarihYaz(dn.tarih)} · ${dn.dogru} doğru${dn.kaynak==='simulator'?' <span class="hp-muted" style="font-size:11px">(simülatör)</span>':''}</span><span><b style="color:#fbbf24">${dn.puan}</b> <button class="hp-btn2" style="padding:2px 8px;font-size:11px;margin-left:6px" onclick="hpDenemeSil(${v.denemeler.length-1-i})">sil</button></span></div>`).join('')}</div>`:''}
  </div>
  <div class="hp-statlar">
    <div class="hp-stat"><b>${sayac.tamGun}</b><span>gün tamamlandı</span></div>
    <div class="hp-stat"><b>${sayac.seri}</b><span>gün seri 🔥</span></div>
    <div class="hp-stat"><b>${v.sonDeneme?v.sonDeneme.puan:'—'}</b><span>son deneme</span></div>
    <div class="hp-stat"><b>${v.beklenenPuan}</b><span>bugün beklenen</span></div>
  </div>`;
}
function denemeEkle(dogru,kaynak){
  const p=lsOku();if(!p)return false;
  const d=Math.max(0,Math.min(SORU_SAYISI,Math.round(dogru)));
  p.denemeler=p.denemeler||[];
  p.denemeler.push({tarih:bugunStr(),dogru:d,puan:dogruPuan(d),kaynak:kaynak||'elle'});
  // deneme günündeysek "puanı işle" görevini de tamamla
  const t=bugunStr();p.tamam=p.tamam||{};p.tamam[t]=p.tamam[t]||{};p.tamam[t].puan=true;
  lsYaz(p);return true;
}
window.hpDenemeElle=function(){
  const el=document.getElementById('hp-dn-dogru');const n=parseInt(el.value,10);
  if(isNaN(n)||n<0||n>80){document.getElementById('hp-dn-hata').textContent='0 ile 80 arasında bir doğru sayısı gir.';return;}
  denemeEkle(n,'elle');ciz();
};
window.hpDenemeSil=function(i){
  const p=lsOku();if(!p||!p.denemeler)return;
  const sirali=p.denemeler.slice().sort((a,b)=>a.tarih<b.tarih?-1:1);
  const hedef=sirali[i];const idx=p.denemeler.indexOf(hedef);
  if(idx>=0)p.denemeler.splice(idx,1);
  lsYaz(p);ciz();
};
// Sınav Simülatörü bittiğinde çağrılır: 80'e ölçeklenmiş doğru sayısı kaydedilir.
window.hpDenemeKaydet=function(dogru,toplam){
  if(!lsOku()||!toplam)return false;
  return denemeEkle(dogru*SORU_SAYISI/toplam,'simulator');
};

// ----- materyaller -----
function materyalHTML(){
  const gruplar=[
    ['🔤 Kelime',['kelimeKart','kelimeBanka','kelimeStrateji','kelimeHafiza','aha','psikoloji']],
    ['📐 Dilbilgisi',['fiilAvi','trigger','modal','passive','gerund','srt','bebek','tuzak','canliDers']],
    ['🧩 Cloze & Cümle Tamamlama',['baglam','sinyalLab','sat','osym']],
    ['🔁 Çeviri & Yakın Anlam',['cumleAnaliz','svo']],
    ['📖 Okuma & Paragraf',['paragraf','reading','skim','diseksiyon','soruTipi','anlama']],
    ['📝 Deneme & Analiz',['simTam','simOkuma','hata','radar','istatistik']],
    ['🤝 Yardım',['klod','sesKurs','ekitap']]
  ];
  return `<div class="hp-kart"><div class="hp-eyebrow">Materyal kütüphanesi</div><div class="hp-h">Sitedeki her şey, soru tipine göre</div><p class="hp-muted" style="margin:0">Tıkla, ilgili ders ya da alıştırma açılır. Programa dönmek için alttaki "🎯 Programa dön" butonunu kullan.</p></div>
  ${gruplar.map(([b,l])=>`<div class="hp-mat-grup"><h4>${b}</h4>${l.map(k=>`<button class="hp-mat" onclick="hpMateryal('${k}')"><span style="font-size:18px">${M[k].ikon}</span><span style="flex:1">${M[k].ad}</span><span style="color:#f5a623">→</span></button>`).join('')}</div>`).join('')}`;
}

// ----- sınav günü -----
function stratejiHTML(v){
  const adimlar=[
    ['Kelime + Dilbilgisi (1–16)','~15 dk','Hızlı puan. Takıldığın soruda 1 dakikadan fazla durma, işaretle geç.'],
    ['Cloze (17–26)','~15 dk','Boşluğun öncesine ve sonrasına bak: bağlaç mı, edat mı, zaman mı?'],
    ['Cümle Tamamlama (27–36)','~20 dk','Önce verilen yarıdaki sinyal kelimeyi bul (although, because, so that…).'],
    ['Çeviri (37–42)','~12 dk','Önce özne ve fiili bul; şıklardan iskeleti uymayanları ele.'],
    ['Diyalog, yakın anlam, paragraf tamamlama, anlam bütünlüğü (63–80)','~35 dk','Kısa sorular, okumadan daha hızlı puan getirir; okumadan ÖNCE çöz.'],
    ['Okuma parçaları (43–62)','~70 dk','Önce soruyu oku, sonra parçada ara. Bir parçaya 15 dakikadan fazla harcama.'],
    ['Son 10 dakika','10 dk','Boş kalan HER soruyu işaretle. Yanlış doğruyu götürmez; boş = kesin 0.']
  ];
  return `
  <div class="hp-kart"><div class="hp-eyebrow">180 dakikalık plan</div><div class="hp-h">Sınav günü zaman stratejisi</div>
  ${adimlar.map((a,i)=>`<div class="hp-adim"><b class="n">${i+1}</b><div><b>${a[0]}</b> <span class="hp-muted" style="font-size:12px">· ${a[1]}</span><div class="hp-muted" style="font-size:12.5px">${a[2]}</div></div></div>`).join('')}
  ${v.sinav==='YOKDIL'?'<p class="hp-muted" style="font-size:12px;margin:10px 0 0">YÖKDİL\'de bölüm numaraları farklıdır; sıra mantığı aynı: önce kısa sorular, en son uzun okuma parçaları.</p>':''}
  </div>
  <div class="hp-kart"><div class="hp-eyebrow">Altın kurallar</div>
    <div class="hp-adim"><b class="n">✓</b><div><b>Hiçbir soruyu boş bırakma.</b> YDS/YÖKDİL'de yanlış doğruyu götürmez.</div></div>
    <div class="hp-adim"><b class="n">✓</b><div><b>4 dakika kuralı:</b> Bir soruda 4 dakikayı geçtiysen en mantıklı şıkkı işaretle ve geç.</div></div>
    <div class="hp-adim"><b class="n">✓</b><div><b>Cevapları optiğe hemen aktar</b>, sona bırakma.</div></div>
    <div class="hp-adim"><b class="n">✓</b><div><b>Sınavdan önceki gün</b> yeni konu çalışma; hafif tekrar yap ve erken uyu.</div></div>
    <div class="hp-adim"><b class="n">✓</b><div><b>Sabah:</b> kimlik, sınav giriş belgesi, kurşun kalem ve silgi. Salona erken git.</div></div>
  </div>`;
}

// ---------- aç/kapat + dış bağlantılar ----------
window.hpAc=function(sekme){
  overlayKur();
  if(sekme)aktifSekme=sekme;else aktifSekme=lsOku()?'bugun':'bugun';
  ciz();
  document.getElementById('hp-overlay').classList.add('acik');
  document.documentElement.classList.remove('yeni-ziyaretci');
  pillGuncelle();
};
window.hpKapat=function(sessiz){
  const o=document.getElementById('hp-overlay');if(o)o.classList.remove('acik');
  sureDurdur();pillGuncelle();
};
window.hpSekme=function(k){aktifSekme=k;ciz();};
window.hpVarMi=function(){return !!lsOku();};
// Dashboard "Bugün" kartı ve hero için özet
window.hpBugunOzet=function(){
  const p=lsOku();if(!p)return null;const v=programHesapla(p);
  if(v.kalanGun<=0)return{v,d:null,biten:0,toplam:0};
  const d=Math.max(1,Math.min(v.gunNo,v.toplamGun));
  const gg=gunGorevleri(v,d);const ok=tamamOku(p,bugunStr());
  return{v,d,tip:gg.tip,biten:gg.gorevler.filter(x=>ok[x.id]).length,toplam:gg.gorevler.length};
};
function pillGuncelle(){
  cssEkle();
  let b=document.getElementById('hp-pill');
  const oz=window.hpBugunOzet();
  const acik=document.getElementById('hp-overlay')?.classList.contains('acik');
  if(!oz||acik||oz.d===null){if(b)b.style.display='none';return;}
  if(!b){b=document.createElement('button');b.id='hp-pill';b.onclick=()=>hpAc('bugun');document.body.appendChild(b);}
  b.textContent=oz.biten===oz.toplam?'🎯 Bugün tamam ✓ · Programım':`🎯 Programa dön · ${oz.biten}/${oz.toplam}`;
  b.style.display='block';
}
function heroGuncelle(){
  // Program kuruluysa hero'daki geri sayım öğrencinin kendi sınav tarihini gösterir.
  const p=lsOku();const el=document.getElementById('hero-geri-sayim');
  const btn=document.getElementById('hero-basla-btn');
  if(p&&btn)btn.innerHTML='📡 Bugünkü Görevime Git <span style="display:inline-block;animation:arrowBounce 1s ease infinite">→</span>';
  if(p&&el){const k=gunFarki(bugunStr(),p.tarih);if(k>=0){el.textContent=k;const ust=el.parentElement;if(ust&&ust.firstChild&&ust.firstChild.nodeType===3)ust.firstChild.textContent='🎯 Sınavına ';if(ust&&ust.lastChild&&ust.lastChild.nodeType===3)ust.lastChild.textContent=' gün kaldı';}}
}
// Overlay DIŞINDAKİ yönlendirmeler (örn. Dil Avcısı'ndaki "Yoluma git" kutusu).
// hpAc: program varsa tek yolu, yoksa hedef kurma ekranını açar.
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-hp-action="yola-git"]');
  if(el){e.preventDefault();hpAc('bugun');}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){const o=document.getElementById('hp-overlay');if(o&&o.classList.contains('acik'))hpKapat();}});
function baslat(){pillGuncelle();heroGuncelle();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',baslat);else baslat();
})();
