// ============================================================
// AVCI ÇÖZÜM MOTORU — ÖSYM DNA ve sinyal tabanlı çözüm (2026-10-26)
// ============================================================
// Öğrenciye cevabı değil refleksi öğretir:
//   GÜÇLÜ SİNYAL → ŞIK ELEME → SOL/SAĞ KONTROL → DOĞRULAMA → CEVAP
//
// Bu dosya SAF bir motordur: DOM'a, localStorage'a ve ağa dokunmaz.
// Arayüz (Sinyal Lab çözüm ekranı, modlar, rapor) assets/modules/avci-cozum.js
// içindedir. Node testleri bu dosyayı vm ile yükleyip doğrudan çalıştırır.
//
// İKİ AŞAMALI GÜVENLİK: Tek bir kelimeye bakıp cevap işaretlenmez.
//   1. En güçlü sinyal yalnızca şıkları azaltmak için kullanılır.
//   2. Kalan şık(lar) ikinci bir dilbilgisi kontrolünden geçer (özne–fiil,
//      zaman, çatı, anlam). Bir kural sorunun DOĞRU cevabını elerse bu bir
//      çelişkidir: o kuralın sonucu öğrenciye gösterilmez, güven "düşük"
//      olur ve soru incelemeye düşer. Doğru cevap her zaman soru verisindeki
//      cevap anahtarıdır; motor onu değiştirmez, yalnızca açıklar.
//
// Sinyal kütüphanesi (AVCI_SINYAL_KUTUPHANESI) tek yerde durur. Yeni bir
// sinyal eklemek için kütüphaneye bir kayıt eklemek yeterlidir.
// ============================================================
(function(root){
'use strict';

// ---------------- sözlükler ----------------
var DUZENSIZ='be was were been|become became become|begin began begun|break broke broken|bring brought brought|build built built|buy bought bought|catch caught caught|choose chose chosen|come came come|cost cost cost|cut cut cut|do did done|draw drew drawn|drink drank drunk|drive drove driven|eat ate eaten|fall fell fallen|feel felt felt|fight fought fought|find found found|fly flew flown|forget forgot forgotten|get got got|give gave given|go went gone|grow grew grown|hang hung hung|have had had|hear heard heard|hide hid hidden|hit hit hit|hold held held|hurt hurt hurt|keep kept kept|know knew known|lead led led|leave left left|lend lent lent|let let let|lose lost lost|make made made|mean meant meant|meet met met|pay paid paid|put put put|read read read|ride rode ridden|rise rose risen|run ran run|say said said|see saw seen|seek sought sought|sell sold sold|send sent sent|set set set|shake shook shaken|show showed shown|shut shut shut|sing sang sung|sit sat sat|sleep slept slept|speak spoke spoken|spend spent spent|spread spread spread|stand stood stood|steal stole stolen|strike struck struck|swim swam swum|take took taken|teach taught taught|tell told told|think thought thought|throw threw thrown|understand understood understood|wake woke woken|wear wore worn|win won won|write wrote written|undergo underwent undergone|withdraw withdrew withdrawn|overcome overcame overcome|arise arose arisen|bear bore borne|beat beat beaten|bind bound bound|deal dealt dealt|feed fed fed|forgive forgave forgiven|prove proved proven|forbid forbade forbidden|shine shone shone|sink sank sunk|tear tore torn|freeze froze frozen|drive drove driven';
var V2={},V3={},LEMMA={};
DUZENSIZ.split('|').forEach(function(s){var p=s.split(' ');V2[p[1]]=p[0];V3[p[2]]=p[0];LEMMA[p[0]]=p[0];LEMMA[p[1]]=p[0];LEMMA[p[2]]=p[0];});

var GECISLI=kume('discover design remove build develop produce publish destroy show reduce invest find make take give write use study protect replace conduct test store improve understand offer think consider create prepare provide describe analyze analyse examine observe report complete close change cause affect lock open sign present collect support confirm reject accept prevent control damage measure explain identify introduce launch organize organise review solve treat visit choose deliver establish raise lower cut increase decrease limit'.split(' '));
var GECISSIZ=kume('remain arrive happen belong occur exist rise emerge appear disappear die sleep go come seem wait lie sit collapse arise survive fall depend consist matter respond react proceed'.split(' '));
var FIIL_TABANI=kume(Object.keys(GECISLI).concat(Object.keys(GECISSIZ)).concat(Object.keys(LEMMA)).concat('work live help apply enjoy drive recover try decide notice pass want need like agree hope plan learn start stop continue allow ask call move play turn hear speak travel register'.split(' ')));
var YARDIMCI_SONLU=kume('is are am was were has have had will would can could may might must should shall does do did'.split(' '));
var MODAL=kume('will would can could may might must should shall'.split(' '));
var BE=kume('am is are was were be been being'.split(' '));
var BELIRLEYICI=kume('a an the this that these those my your his her its our their some many much several any each every no new most all both'.split(' '));
var ZAMIR_OZNE={i:'tekil',you:'cogul',we:'cogul',they:'cogul',he:'tekil',she:'tekil',it:'tekil'};
var EDAT=kume('at on in with for of to from by about into upon over under between among through against without during across after before since until like'.split(' '));
var KISI=kume('patient patients people person persons student students scientist scientists researcher researchers doctor doctors teacher teachers child children man men woman women employee employees manager managers volunteer volunteers engineer engineers archaeologist archaeologists visitor visitors author authors artist artists member members citizen citizens worker workers friend friends parent parents someone anyone everyone those professor professors nurse nurses farmer farmers lawyer lawyers judge judges politician politicians player players'.split(' '));
var COGUL_DUZENSIZ=kume('people children men women data media criteria phenomena police feet teeth mice'.split(' '));
var TEKIL_S=kume('news physics mathematics economics series species analysis crisis basis thesis this is has was does its'.split(' '));
var BILDIRME=kume('concluded conclude concludes found find finds shown show shows suggest suggests suggested believe believes believed think thinks thought indicate indicates indicated argue argues argued claim claims claimed report reports reported say says said known clear true evident revealed reveal reveals noted note notes demonstrate demonstrated'.split(' '));
var OLUMLU=kume('encouraging effective successful success improve improved improves promising benefit benefits progress satisfied positive efficient good well grown grew grow growing appointed praised popular rapidly'.split(' '));
var OLUMSUZ=kume('problem problems fail failed fails failure cautious risk risks decline declined poor difficult unfortunately crisis damage worse lack unable cannot not never no hardly concern concerns doubt doubts criticism side slow slowly'.split(' '));

// bağlaç ve geçiş sözlüğü: ilişki + yapı
// yapi: 'cumle' (özne+fiil ister), 'isim' (isim/V-ing ister), 'gecis' (; X, yeni cümle), 'ikili' (cümle de isim de alabilir)
var BAGLAC={
  'although':{iliski:'zitlik',yapi:'cumle'},'even though':{iliski:'zitlik',yapi:'cumle'},'though':{iliski:'zitlik',yapi:'cumle'},
  'whereas':{iliski:'zitlik',yapi:'cumle'},'while':{iliski:'zitlik',yapi:'cumle'},'even if':{iliski:'kosul',yapi:'cumle'},
  'because':{iliski:'sebep',yapi:'cumle'},'since':{iliski:'sebep',yapi:'ikili'},'as':{iliski:'sebep',yapi:'cumle'},
  'if':{iliski:'kosul',yapi:'cumle'},'unless':{iliski:'kosul',yapi:'cumle'},'provided that':{iliski:'kosul',yapi:'cumle'},'as long as':{iliski:'kosul',yapi:'cumle'},
  'so that':{iliski:'amac',yapi:'cumle'},'when':{iliski:'zaman',yapi:'cumle'},'whenever':{iliski:'zaman',yapi:'cumle'},'once':{iliski:'zaman',yapi:'cumle'},
  'after':{iliski:'zaman',yapi:'ikili'},'before':{iliski:'zaman',yapi:'ikili'},'until':{iliski:'zaman',yapi:'ikili'},
  'despite':{iliski:'zitlik',yapi:'isim'},'in spite of':{iliski:'zitlik',yapi:'isim'},'notwithstanding':{iliski:'zitlik',yapi:'isim'},
  'because of':{iliski:'sebep',yapi:'isim'},'due to':{iliski:'sebep',yapi:'isim'},'owing to':{iliski:'sebep',yapi:'isim'},'thanks to':{iliski:'sebep',yapi:'isim'},
  'as a result of':{iliski:'sebep',yapi:'isim'},'instead of':{iliski:'tercih',yapi:'isim'},'prior to':{iliski:'zaman',yapi:'isim'},'under':{iliski:'durum',yapi:'isim'},
  'however':{iliski:'zitlik',yapi:'gecis'},'nevertheless':{iliski:'zitlik',yapi:'gecis'},'nonetheless':{iliski:'zitlik',yapi:'gecis'},'on the other hand':{iliski:'zitlik',yapi:'gecis'},
  'therefore':{iliski:'sonuc',yapi:'gecis'},'consequently':{iliski:'sonuc',yapi:'gecis'},'thus':{iliski:'sonuc',yapi:'gecis'},'as a result':{iliski:'sonuc',yapi:'gecis'},
  'moreover':{iliski:'ekleme',yapi:'gecis'},'furthermore':{iliski:'ekleme',yapi:'gecis'},'in addition':{iliski:'ekleme',yapi:'gecis'},
  'for example':{iliski:'ornek',yapi:'gecis'},'for instance':{iliski:'ornek',yapi:'gecis'},'otherwise':{iliski:'kosul',yapi:'gecis'}
};
var ILISKI_ADI={zitlik:'zıtlık',sebep:'sebep',sonuc:'sonuç',kosul:'koşul',amac:'amaç',zaman:'zaman',ekleme:'ekleme',ornek:'örnekleme',tercih:'tercih',durum:'durum',olumsuzluk:'olumsuz anlam',paralellik:'paralellik',cikarim:'geçmişe çıkarım',kapsam:'kapsam'};
var RELATIVE=kume('who whom whose which that what where'.split(' '));
var DERECE=kume('so such too very enough quite'.split(' '));
// fiil + edat eşdizimleri (lemma → edat)
var ESDIZIM={depend:'on',rely:'on',consist:'of',focus:'on',insist:'on',succeed:'in',participate:'in',contribute:'to',refer:'to',belong:'to',result:'in',interested:'in',responsible:'for',aware:'of',capable:'of',dependent:'on',similar:'to',different:'from',famous:'for',proud:'of',afraid:'of',good:'at',concentrate:'on',deal:'with',cope:'with',comply:'with',suffer:'from',benefit:'from',recover:'from',prevent:'from',protect:'from',apologize:'for',search:'for',wait:'for',account:'for'};

function kume(a){var o={};a.forEach(function(x){o[x]=1;});return o;}
function var_(o,k){return Object.prototype.hasOwnProperty.call(o,k);}

// ---------------- kelime biçimi ----------------
function lemma(w){
  w=String(w||'').toLowerCase();
  if(var_(LEMMA,w))return LEMMA[w];
  if(/ies$/.test(w))return w.slice(0,-3)+'y';
  if(/(ss|sh|ch|x|o)es$/.test(w))return w.slice(0,-2);
  if(/ing$/.test(w)&&w.length>5){var b=w.slice(0,-3);if(var_(FIIL_TABANI,b))return b;if(var_(FIIL_TABANI,b+'e'))return b+'e';if(/(.)\1$/.test(b)&&var_(FIIL_TABANI,b.slice(0,-1)))return b.slice(0,-1);return b;}
  if(/ied$/.test(w))return w.slice(0,-3)+'y';
  if(/ed$/.test(w)&&w.length>4){var c=w.slice(0,-2);if(var_(FIIL_TABANI,c))return c;if(var_(FIIL_TABANI,c+'e')||var_(FIIL_TABANI,w.slice(0,-1)))return w.slice(0,-1);if(/(.)\1$/.test(c)&&var_(FIIL_TABANI,c.slice(0,-1)))return c.slice(0,-1);return c;}
  if(/s$/.test(w)&&!/ss$/.test(w)&&w.length>3){var d=w.slice(0,-1);return d;}
  return w;
}
function v3mu(w){return var_(V3,w)||(/ed$/.test(w)&&w.length>3&&!/eed$/.test(w));}
function v2mu(w){return var_(V2,w)||(/ed$/.test(w)&&w.length>3&&!/eed$/.test(w));}
function vingmi(w){return /ing$/.test(w)&&w.length>4&&!/^(thing|during|morning|evening|nothing|something|anything|everything|spring|string|ceiling)$/.test(w);}
function fiilmi(w){return var_(FIIL_TABANI,lemma(w))||var_(YARDIMCI_SONLU,w);}
function sonluFiilmi(w,onceki){
  if(var_(YARDIMCI_SONLU,w))return true;
  if(var_(V2,w)&&V2[w]!==w)return true;
  if(onceki&&!var_(BELIRLEYICI,onceki)&&!var_(EDAT,onceki)&&/ed$/.test(w)&&w.length>4)return true;
  if(onceki&&!var_(BELIRLEYICI,onceki)&&/s$/.test(w)&&!/ss$/.test(w)&&var_(FIIL_TABANI,lemma(w))&&!var_(KISI,w))return true;
  return false;
}
function isimSayisi(w){
  w=String(w||'').toLowerCase();
  if(var_(ZAMIR_OZNE,w))return ZAMIR_OZNE[w];
  if(var_(COGUL_DUZENSIZ,w))return 'cogul';
  if(var_(TEKIL_S,w))return 'tekil';
  if(/s$/.test(w)&&!/(ss|us|is)$/.test(w))return 'cogul';
  return 'tekil';
}

// ---------------- metin parçalama ----------------
var BOSLUK_RE=/-{3,}|_{3,}|…{2,}/g;
function tokenlar(cumle){
  var t=String(cumle||'').replace(/<[^>]*>/g,'').replace(/&quot;/g,'"').replace(/[“”"]/g,' ');
  var no=0;t=t.replace(BOSLUK_RE,function(){return ' __B'+(no++)+'__ ';});
  t=t.replace(/\b(Dr|Mr|Mrs|Ms|Prof|St)\./g,'$1');
  t=t.replace(/([,;:.!?()])/g,' $1 ');
  return t.split(/\s+/).filter(Boolean).map(function(w){
    var m=/^__B(\d+)__$/.exec(w);
    return {w:w,l:w.toLowerCase().replace(/[’']s$/,'').replace(/[’']$/,''),p:/^[,;:.!?()]$/.test(w),b:m?Number(m[1]):null};
  });
}
function bosluklarim(tk){var r=[];tk.forEach(function(t,i){if(t.b!==null)r.push(i);});return r;}
function sagSegment(tk,i){var r=[];for(var j=i+1;j<tk.length;j++){if(tk[j].p||tk[j].b!==null)break;r.push(tk[j].l);}return r;}
function solSegment(tk,i){var r=[];for(var j=i-1;j>=0;j--){if(tk[j].p||tk[j].b!==null)break;r.unshift(tk[j].l);}return r;}
function solTumu(tk,i){var r=[];for(var j=i-1;j>=0;j--){if(tk[j].b!==null)break;r.unshift(tk[j].l);}return r;}
function oncekiKelime(tk,i){for(var j=i-1;j>=0;j--){if(tk[j].p&&tk[j].w!==',')return null;if(!tk[j].p)return tk[j].l;}return null;}
function oncekiIsaret(tk,i){return i>0?tk[i-1]:null;}
function sonrakiIsaret(tk,i){return i+1<tk.length?tk[i+1]:null;}

// sağ taraftaki yapı: 'bos' | 'ving' | 'fiil' | 'isim_fiil' | 'cumle' | 'isim'
function sagYapi(seg){
  if(!seg.length)return 'bos';
  var a=seg[0];
  if(vingmi(a)&&!var_(BELIRLEYICI,a))return 'ving';
  if(seg.length>1&&!var_(BELIRLEYICI,a)&&!var_(ZAMIR_OZNE,a)&&!var_(EDAT,a)&&!var_(YARDIMCI_SONLU,a)&&!var_(BE,a)&&sonluFiilmi(seg[1],a)&&(/ed$/.test(seg[1])||var_(V2,seg[1])||var_(YARDIMCI_SONLU,seg[1])))return 'isim_fiil';
  if(var_(YARDIMCI_SONLU,a)||(fiilmi(a)&&!var_(BELIRLEYICI,a)&&!var_(ZAMIR_OZNE,a)&&!var_(EDAT,a)&&(seg.length<2||var_(BELIRLEYICI,seg[1])||!fiilmi(seg[1]))&&!/s$/.test(a)&&var_(FIIL_TABANI,a)))return 'fiil';
  if(var_(ZAMIR_OZNE,a)&&a!=='it'||a==='it'&&seg.length>1&&sonluFiilmi(seg[1],a))return 'cumle';
  for(var i=1;i<seg.length;i++){
    if(var_(RELATIVE,seg[i])&&seg[i]!=='that')return 'isim';
    if(seg[i]==='that'&&i>0&&!var_(BILDIRME,seg[i-1]))return 'isim';
    if(sonluFiilmi(seg[i],seg[i-1]))return 'cumle';
  }
  return 'isim';
}
function nesneVar(seg){
  if(!seg.length)return false;
  var a=seg[0];
  if(var_(EDAT,a)||a==='by')return false;
  if(/^(every|yesterday|last|next|today|tomorrow|recently|ago|mostly|usually|often|always|now|again|soon|then|already|still|steadily|considerably|significantly)$/.test(a)||/ly$/.test(a))return false;
  return true;
}
// özne bul: boşluğun solunda, cümle/yan cümle sınırına kadar
function ozneBul(tk,i){
  var j=i-1,np=[];
  // ", which ... ," ara cümlesini atla
  if(j>=0&&tk[j].w===','){
    for(var k=j-1;k>0;k--){if(tk[k].w===','&&tk[k+1]&&var_(RELATIVE,tk[k+1].l)){j=k-1;break;}if(tk[k].p&&tk[k].w!==',')break;}
  }
  for(;j>=0;j--){
    var t=tk[j];
    if(t.b!==null||t.p)break;
    if(/^(when|if|although|because|while|whereas|after|before|until|unless|once|as)$/.test(t.l)&&j!==0){np.unshift({sinir:t.l});break;}
    if(/^(when|if|although|because|while|whereas|after|before|until|unless|once)$/.test(t.l)){np.unshift({sinir:t.l});break;}
    if(t.l==='that'&&j>0&&var_(BILDIRME,tk[j-1].l))break;
    np.unshift(t.l);
  }
  var sinir=null;if(np.length&&typeof np[0]==='object'){sinir=np[0].sinir;np=np.slice(1);}
  while(np.length&&/^(and|but|or|so|then|since|now|also|yet|still|thus|therefore|however|recently|today|meanwhile)$/.test(np[0]))np.shift();
  // özneden sonra gelen modal/yardımcı fiil ve zarflar özneye dahil değildir (all visitors must ----)
  while(np.length&&(var_(YARDIMCI_SONLU,np[np.length-1])||var_(BE,np[np.length-1])||/ly$/.test(np[np.length-1])||/^(not|already|also|just|never|still|to)$/.test(np[np.length-1])))np.pop();
  var metin=np.join(' ');
  if(!np.length)return {np:'',bas:null,sayi:null,sinir:sinir};
  var sayi=null,bas=null,neden=null;
  var nor=Math.max(np.lastIndexOf('nor'),np.indexOf('neither')>=0||np.indexOf('either')>=0?np.lastIndexOf('or'):-1);
  if((np.indexOf('neither')>=0||np.indexOf('either')>=0)&&nor>0){
    var yakin=np.slice(nor+1);bas=yakin[yakin.length-1];sayi=isimSayisi(bas);neden='yakin';
    return {np:metin,bas:bas,sayi:sayi,neden:neden,yakin:yakin.join(' '),sinir:sinir};
  }
  if(/^the number of\b/.test(metin))return {np:metin,bas:'number',sayi:'tekil',neden:'the_number',sinir:sinir};
  if(/^a number of\b/.test(metin))return {np:metin,bas:'number',sayi:'cogul',neden:'a_number',sinir:sinir};
  var kes=np.length;
  for(var r=1;r<np.length;r++){if(var_(RELATIVE,np[r])){kes=r;break;}}
  var parca=np.slice(0,kes);
  var ofI=parca.indexOf('of');
  if(ofI>0&&/^(one)$/.test(parca[ofI-1])){return {np:metin,bas:'one',sayi:'tekil',sinir:sinir};}
  if(ofI>0&&/^(most|some|all|many|several|both|lot|lots|half|none|thousands|millions|hundreds)$/.test(parca[ofI-1])){var sonra=parca.slice(ofI+1);var kes2=sonra.length;for(var q=0;q<sonra.length;q++){if(var_(EDAT,sonra[q])){kes2=q;break;}}bas=sonra[kes2-1]||sonra[0];return {np:metin,bas:bas,sayi:/^(thousands|millions|hundreds|many|several|both)$/.test(parca[ofI-1])?'cogul':isimSayisi(bas),sinir:sinir};}
  for(var p=1;p<parca.length;p++){if(var_(EDAT,parca[p])){parca=parca.slice(0,p);break;}}
  bas=parca[parca.length-1];
  return {np:metin,bas:bas,sayi:isimSayisi(bas),sinir:sinir};
}
// boşluğun bulunduğu yan cümle (virgül/noktalı virgül sınırları)
function yanCumle(tk,i){
  var bas=i,son=i;
  for(var j=i-1;j>=0;j--){if(tk[j].p&&tk[j].w!==','||tk[j].w===','&&!araCumleVirgulu(tk,j)){break;}bas=j;}
  for(var k=i+1;k<tk.length;k++){if(tk[k].p)break;son=k;}
  return tk.slice(bas,son+1);
}
function araCumleVirgulu(tk,j){
  // "The bridge, which connects ..., ----" ara cümle virgülleri yan cümleyi bölmez
  if(tk[j+1]&&var_(RELATIVE,tk[j+1].l))return true;
  for(var k=j-1;k>0;k--){if(tk[k].w===','&&tk[k+1]&&var_(RELATIVE,tk[k+1].l))return true;if(tk[k].p&&tk[k].w!==',')return false;}
  return false;
}
function metinDizi(dz){return dz.filter(function(t){return !t.p;}).map(function(t){return t.b!==null?'----':t.l;}).join(' ');}

// zaman belirteçleri (yan cümle içinde)
function zamanIsaretleri(dz){
  var m=' '+metinDizi(dz)+' ',r={};
  var sinceI=m.search(/ since /);
  var oncesi=sinceI>=0?m.slice(0,sinceI):m;
  if(/ since /.test(m))r.since=(m.match(/ since ([a-z0-9 ]{0,30})/)||[])[0].trim();
  if(/ for (more than |over |about |nearly |almost )?(two|three|four|five|six|seven|eight|nine|ten|twenty|thirty|many|several|a few|\d+) (years|months|weeks|days|decades|hours)/.test(m)||/ for a long time /.test(m))r.for=(m.match(/ for [a-z0-9 ]{0,40}?(years|months|weeks|days|decades|hours|time)/)||[''])[0].trim();
  if(/ (over|in|during) the (past|last) (few |two |three |ten |\w+ )?(years?|decades?|months?)/.test(m)||/ so far | up to now | until now /.test(m))r.yakin=(m.match(/ (over|in|during) the (past|last) [a-z ]*?(years?|decades?|months?)| so far | up to now | until now /)||[''])[0].trim();
  if(/ (yesterday|ago|last (week|month|year|night|summer|century))/.test(oncesi)||/ in (1[0-9]{3}|20[01][0-9]|202[0-5]) /.test(oncesi)||/ in the \d+(st|nd|rd|th) century /.test(oncesi))r.gecmis=(oncesi.match(/ (yesterday|[a-z0-9]+ ago|last (week|month|year|night|summer|century)|in (1[0-9]{3}|20[01][0-9]|202[0-5])|in the \d+(st|nd|rd|th) century)/)||[''])[0].trim();
  if(/ (tomorrow|next (week|month|year|summer)|soon|in the future) /.test(m))r.gelecek=(m.match(/ (tomorrow|next (week|month|year|summer)|soon|in the future) /)||[''])[0].trim();
  if(/ (at the moment|right now|currently|now) /.test(m))r.simdi=(m.match(/ (at the moment|right now|currently|now) /)||[''])[0].trim();
  if(/ (every (day|year|week|month)|usually|always|often|generally) /.test(m))r.genis=(m.match(/ (every (day|year|week|month)|usually|always|often|generally) /)||[''])[0].trim();
  if(/ still /.test(m))r.hala=true;
  return r;
}

// ---------------- şık parçası analizi ----------------
// Bir şıkkın bir boşluğa düşen parçasını (ör. "has been producing") sınıflar.
function parcaAnaliz(metin){
  var ham=String(metin||'').trim();
  var l=ham.toLowerCase().replace(/[.,;]$/,'');
  var k=l.split(/\s+/).filter(Boolean);
  var r={metin:ham,k:k,tur:'belirsiz',bicim:null,sayi:null,zaman:null,cati:null,sonlu:false,lemma:null,iliski:null,yapi:null};
  if(var_(BAGLAC,l)){r.tur='baglac';r.iliski=BAGLAC[l].iliski;r.yapi=BAGLAC[l].yapi;return r;}
  if(var_(RELATIVE,l)){r.tur='relative';return r;}
  if(var_(DERECE,l)){r.tur='derece';return r;}
  if(/^(but also|and also|as well as|or else|but|and|or|nor)$/.test(l)){r.tur='baglayici';return r;}
  if(k.length===1&&var_(EDAT,l)){r.tur='edat';return r;}
  var a=k[0],b=k[1],c=k[2],d=k[3];
  function son(x){return x;}
  r.tur='fiil';
  if(var_(MODAL,a)){
    r.sonlu=true;r.sayi='notr';r.zaman=a==='will'?'gelecek':a==='would'?'kosul':'modal';
    if(b==='not')k.splice(1,1),b=k[1],c=k[2],d=k[3];
    if(b==='have'&&c==='been'&&d&&v3mu(d)){r.bicim='modal_perf_edilgen';r.cati='edilgen';r.lemma=lemma(d);}
    else if(b==='have'&&c&&v3mu(c)){r.bicim='modal_perf';r.cati='etken';r.lemma=lemma(c);r.zaman=a==='would'?'kosul_gecmis':'modal_perf';}
    else if(b==='be'&&c&&v3mu(c)){r.bicim='modal_edilgen';r.cati='edilgen';r.lemma=lemma(c);}
    else if(b==='be'&&c&&vingmi(c)){r.bicim='modal_surekli';r.cati='etken';r.lemma=lemma(c);}
    else {r.bicim='modal_v1';r.cati='etken';r.lemma=lemma(b||'');}
    return r;
  }
  if(a==='to'){r.bicim=b==='be'&&c&&v3mu(c)?'to_edilgen':'to_v1';r.cati=b==='be'?'edilgen':'etken';r.lemma=lemma(b==='be'?c:b);return r;}
  if(a==='having'){r.bicim=b==='been'?'having_edilgen':'having_v3';r.cati=b==='been'?'edilgen':'etken';r.lemma=lemma(b==='been'?c:b);return r;}
  if(a==='being'&&b&&v3mu(b)){r.bicim='being_v3';r.cati='edilgen';r.lemma=lemma(b);return r;}
  if(a==='be'&&b&&v3mu(b)){r.bicim='be_v3';r.cati='edilgen';r.lemma=lemma(b);return r;}
  if(/^(has|have|had)$/.test(a)&&b){
    r.sonlu=true;r.sayi=a==='has'?'tekil':a==='have'?'cogul':'notr';r.zaman=a==='had'?'gecmis_perf':'yakin_gecmis';
    if(b==='been'&&c&&vingmi(c)){r.bicim='perf_surekli';r.cati='etken';r.lemma=lemma(c);}
    else if(b==='been'&&c&&v3mu(c)){r.bicim='perf_edilgen';r.cati='edilgen';r.lemma=lemma(c);}
    else if(b==='been'){r.bicim='perf_be';r.cati='etken';r.lemma='be';}
    else {r.bicim='perf';r.cati='etken';r.lemma=lemma(b);}
    return r;
  }
  if(var_(BE,a)&&a!=='be'&&a!=='been'&&a!=='being'){
    r.sonlu=true;r.sayi=/^(is|was|am)$/.test(a)?'tekil':'cogul';r.zaman=/^(was|were)$/.test(a)?'gecmis':'simdi';r.lemma='be';
    if(b==='being'&&c&&v3mu(c)){r.bicim='surekli_edilgen';r.cati='edilgen';r.lemma=lemma(c);r.zaman=r.zaman==='gecmis'?'gecmis_surekli':'simdiki';}
    else if(b&&vingmi(b)){r.bicim='surekli';r.cati='etken';r.lemma=lemma(b);r.zaman=r.zaman==='gecmis'?'gecmis_surekli':'simdiki';}
    else if(b&&v3mu(b)){r.bicim='edilgen';r.cati='edilgen';r.lemma=lemma(b);r.zaman=r.zaman==='gecmis'?'gecmis':'genis';}
    else {r.bicim='be';r.cati='etken';r.zaman=r.zaman==='gecmis'?'gecmis':'genis';}
    return r;
  }
  if(k.length===1){
    r.lemma=lemma(a);
    if(vingmi(a)){r.bicim='ving';r.cati='etken';return r;}
    if(var_(V3,a)&&!var_(V2,a)){r.bicim='v3';r.cati='edilgen';return r;}
    if(var_(V2,a)&&!var_(V3,a)){r.bicim='v2';r.sonlu=true;r.sayi='notr';r.zaman='gecmis';r.cati='etken';return r;}
    if(var_(V2,a)||/ed$/.test(a)){r.bicim='v2v3';r.sonlu=true;r.sayi='notr';r.zaman='gecmis';r.cati='etken';return r;}
    if(/ly$/.test(a)){r.tur='kelime';r.bicim='zarf';return r;}
    if(/s$/.test(a)&&!/ss$/.test(a)){r.bicim='v1s';r.sonlu=true;r.sayi='tekil';r.zaman='genis';r.cati='etken';return r;}
    r.bicim='v1';r.sonlu=true;r.sayi='cogul';r.zaman='genis';r.cati='etken';return r;
  }
  r.tur='belirsiz';return r;
}
var BICIM_ADI={v1:'yalın fiil (V1)',v1s:'geniş zaman tekil (V1+s)',v2:'geçmiş zaman (V2)',v3:'V3',v2v3:'V2/V3',ving:'V-ing',to_v1:'mastar (to + V1)',to_edilgen:'edilgen mastar',having_v3:'having + V3',having_edilgen:'having been + V3',being_v3:'being + V3',be_v3:'be + V3',perf:'have/has/had + V3',perf_surekli:'have/has been + V-ing',perf_edilgen:'have/has been + V3',surekli:'be + V-ing',edilgen:'be + V3 (edilgen)',surekli_edilgen:'be being + V3',modal_v1:'modal + V1',modal_perf:'modal + have + V3',modal_edilgen:'modal + be + V3',be:'be fiili'};
var ZAMAN_ADI={genis:'geniş zaman',simdiki:'şimdiki zaman',gecmis:'geçmiş zaman',gecmis_surekli:'geçmişte süren zaman',yakin_gecmis:'present perfect',gecmis_perf:'past perfect',gelecek:'gelecek zaman (will)',kosul:'would',modal:'modal',kosul_gecmis:'would have + V3',modal_perf:'modal perfect'};

function sikParcalari(sik,boslukSayisi){
  var s=String(sik||'').replace(/^\s*[A-E]\s*[).]\s*/,'').trim();
  if(boslukSayisi<=1)return [s];
  var p=s.split(/\s+\/\s+/);
  return p.length===boslukSayisi?p:null;
}
function harf(i){return String.fromCharCode(65+i);}
function tirnak(s){return '“'+s+'”';}

// ---------------- SİNYAL KÜTÜPHANESİ ----------------
// Her kayıt: veri alanları (öğrenciye gösterilir) + eslesir(ctx) + degerlendir(parca, ctx).
// eslesir → null ya da {vurgu:[kelimeler]}; degerlendir → null (uyumlu) ya da {neden, cekicilik, tur}.
function K(o){return o;}
var KUTUPHANE=[
K({signalId:'than_previously_v3',signalText:'than previously + V3',questionType:['dilbilgisi','cift_bosluk','tek_bosluk'],measuredSkill:'Kısaltılmış edilgen yapı',
  leftPattern:'than (previously|originally|initially|once|commonly|widely|generally)? ----$',rightPattern:'^(\\.|,|$)',expectedStructure:'V3 (than was previously thought)',
  eliminationRules:'V3 olmayan her biçim (to V1, V-ing, having V3, being V3, çekimli fiil) elenir.',verificationRules:'Diğer boşlukta özne–fiil ve zaman uyumunu kontrol et.',
  commonTraps:['having thought: içinde V3 var ama etken','being thought: edilgen ama bu kalıpta doğal değil','thinking: süreç anlamı cazip'],
  shortExplanation:'“than previously” sonrasında “daha önce düşünülenden” anlamını kuran yalın V3 gelir. Bu, “than was previously thought” yapısının kısaltılmış hâlidir.',
  hunterReflex:'“than + previously” görürsen V3 ara (thought, expected, believed). Cevabı işaretlemeden önce diğer boşlukta özne–fiil ve zaman uyumunu doğrula.',
  example:'The task was easier than previously thought.',difficultyLevel:3,guc:3,
  eslesir:function(c){var s=c.solK.slice(-2);if(c.solK.length&&(s[1]==='than'||s[0]==='than'&&/^(previously|originally|initially|once|commonly|widely|generally)$/.test(s[1]))&&c.boslukFiil)return {vurgu:s[0]==='than'?['than',s[1]]:['than']};return null;},
  degerlendir:function(p){
    if(p.bicim==='v3'||p.bicim==='v2v3')return null;
    var v=p.lemma||'';
    var M={to_v1:[tirnak(p.metin)+' mastar (to + V1). Bu yapıda edilgen geçmiş anlamını (düşünülenden) vermez.','“to + fiil” kalıbı tanıdık olduğu için seçilebilir.'],
      ving:[tirnak(p.metin)+' etken V-ing yapı; “daha önce '+(v==='think'?'düşünüldüğünden':'…ildiğinden')+'” anlamını kurmaz.','-ing “süreç” anlamı verdiği için cazip görünür.'],
      having_v3:[tirnak(p.metin)+' etken bir yapı; eylemi öznenin kendisinin yaptığını düşündürür.','İçinde V3 ('+p.k[1]+') geçtiği için doğru gibi görünür.'],
      being_v3:[tirnak(p.metin)+' bu cümlede “previously” sonrasında gereken doğal kısaltılmış yapıyı oluşturmaz; yalın V3 gelir.','Edilgen olduğu için doğru gibi görünür.']};
    var x=M[p.bicim]||[tirnak(p.metin)+' çekimli bir fiil; kısaltılmış yapıda yalın V3 gelir.','Zamanı uygun göründüğü için seçilebilir.'];
    return {neden:x[0],cekicilik:x[1],tur:'yapi'};
  }}),
K({signalId:'because_cumle',signalText:'because + cümle',questionType:['baglac','tek_bosluk','cumle_tamamlama'],measuredSkill:'Bağlaç bilgisi',
  leftPattern:'----',rightPattern:'^(özne + fiil)',expectedStructure:'bağlaç + tam cümle (because, although, while…)',
  eliminationRules:'Sağda özne + fiil varsa edatlar (because of, despite, due to) elenir.',verificationRules:'Kalan bağlaçlarda iki tarafın anlam ilişkisine bak.',
  commonTraps:['because of: anlamı aynı (sebep) ama arkasından isim ister','due to / owing to: edat'],
  shortExplanation:'Boşluğun sağında özne ve çekimli fiil var: bu bir tam cümle. Tam cümleyi ancak bağlaç (because, although) bağlar; edat bağlayamaz.',
  hunterReflex:'Boşluğun sağına bak: özne + fiil görürsen edatları (because of, despite, due to) hemen ele.',
  example:'The match was cancelled because it was raining.',difficultyLevel:1,guc:3,
  eslesir:function(c){return c.boslukBaglac&&c.sagYapi==='cumle'?{vurgu:c.sagK.slice(0,Math.min(4,c.sagK.length))}:null;},
  degerlendir:function(p,c){
    if(p.tur!=='baglac')return null;
    if(p.yapi==='isim')return {neden:tirnak(p.metin)+' edattır; arkasından isim ya da V-ing gelir. Sağda ise tam cümle var ('+c.sagK.slice(0,3).join(' ')+'…).',cekicilik:'Anlamı uygun olabilir ama yapısı tutmaz.',tur:'baglac_yapi'};
    if(p.yapi==='gecis')return {neden:tirnak(p.metin)+' geçiş zarfıdır; iki cümleyi tek başına bağlamaz, önüne nokta ya da noktalı virgül ister.',cekicilik:'Anlam ilişkisi doğru görünebilir.',tur:'baglac_yapi'};
    return null;
  }}),
K({signalId:'although_cumle',signalText:'although + cümle',questionType:['baglac','tek_bosluk','cumle_tamamlama'],measuredSkill:'Bağlaç bilgisi',
  leftPattern:'----',rightPattern:'^(özne + fiil)',expectedStructure:'zıtlık bağlacı + tam cümle',
  eliminationRules:'Sağda tam cümle varsa despite / in spite of elenir; kalanlarda anlam ilişkisi zıtlık olmalı.',verificationRules:'İki tarafın yönü ters mi (olumlu ↔ olumsuz)?',
  commonTraps:['despite: anlamı aynı (zıtlık) ama isim ister','because: yapı tutar, anlam tutmaz'],
  shortExplanation:'Sağda tam cümle var, yani bağlaç gerekir. İki taraf birbirine ters düşüyorsa zıtlık bağlacı (although, even though, while) gelir.',
  hunterReflex:'Önce sağa bak: cümle mi, isim mi? Cümleyse despite’ı ele. Sonra iki tarafın yönüne bak: ters yön = although.',
  example:'Although it was raining, they went out.',difficultyLevel:2,guc:3,
  eslesir:function(c){return c.boslukBaglac&&c.sagYapi==='cumle'&&c.siklar.some(function(s){return s&&/^(although|even though|though)$/i.test(s);})?{vurgu:c.sagK.slice(0,Math.min(4,c.sagK.length))}:null;},
  degerlendir:function(p,c){return KUTUPHANE[1].degerlendir(p,c);}}),
K({signalId:'because_of_isim',signalText:'because of + isim / V-ing',questionType:['baglac','preposition','tek_bosluk'],measuredSkill:'Bağlaç ve edat ayrımı',
  leftPattern:'----',rightPattern:'^(isim öbeği|V-ing)',expectedStructure:'edat + isim/V-ing (because of, due to, despite)',
  eliminationRules:'Sağda yalnızca isim öbeği ya da V-ing varsa bağlaçlar (because, although, even though) elenir.',verificationRules:'Kalan edatlarda anlam ilişkisine bak.',
  commonTraps:['because: anlamı aynı ama cümle ister','since: isimle yalnızca zaman başlangıcı bildirir'],
  shortExplanation:'Boşluğun sağında çekimli fiil yok; yalnızca bir isim öbeği var. İsim öbeğini bağlaç değil edat bağlar.',
  hunterReflex:'Sağda fiil yoksa bağlaçları (because, although) ele; edatlara (because of, despite, due to) bak.',
  example:'The flight was delayed because of the storm.',difficultyLevel:1,guc:3,
  eslesir:function(c){return c.boslukBaglac&&(c.sagYapi==='isim'||c.sagYapi==='ving')?{vurgu:c.sagK.slice(0,Math.min(3,c.sagK.length))}:null;},
  degerlendir:function(p,c){
    if(p.tur!=='baglac')return null;
    var sagMetin=c.sagK.slice(0,3).join(' ');
    if(p.yapi==='cumle')return {neden:tirnak(p.metin)+' bağlaçtır; arkasından özne + fiil ister. Sağda ise yalnızca isim öbeği var ('+sagMetin+'…).',cekicilik:'Anlamı yakın olduğu için cazip görünür.',tur:'baglac_yapi'};
    if(p.yapi==='ikili'&&p.metin.toLowerCase()==='since'&&!/^(\d|the (beginning|start|end)|then|last|early|childhood)/.test(c.sagK.join(' ')))return {neden:'“since” isimle kullanıldığında yalnızca başlangıç zamanı bildirir (since 2010). “'+sagMetin+'” bir zaman değil.',cekicilik:'“since” sebep de bildirdiği için doğru gibi görünür.',tur:'baglac_yapi'};
    if(p.yapi==='gecis')return {neden:tirnak(p.metin)+' geçiş zarfıdır; isim öbeğine bağlanmaz.',cekicilik:'Anlam ilişkisi uygun görünebilir.',tur:'baglac_yapi'};
    return null;
  }}),
K({signalId:'despite_isim',signalText:'despite / in spite of + isim veya V-ing',questionType:['baglac','preposition','tek_bosluk'],measuredSkill:'Bağlaç ve edat ayrımı',
  leftPattern:'----',rightPattern:'^(isim öbeği|V-ing)',expectedStructure:'zıtlık edatı + isim/V-ing',
  eliminationRules:'Sağda isim/V-ing varsa although, even though, while gibi bağlaçlar elenir.',verificationRules:'İki taraf birbirine ters mi?',
  commonTraps:['although: anlamı aynı (zıtlık) ama cümle ister','despite of: böyle bir kalıp yok'],
  shortExplanation:'Sağda çekimli fiil yok; isim öbeği ya da V-ing var. Zıtlığı isimle kuran edat “despite / in spite of”tur.',
  hunterReflex:'Sağda isim/V-ing + iki taraf ters yönde → despite / in spite of. Sağda cümle varsa although.',
  example:'Despite the rain, they went out.',difficultyLevel:1,guc:3,
  eslesir:function(c){return c.boslukBaglac&&(c.sagYapi==='isim'||c.sagYapi==='ving')&&c.siklar.some(function(s){return s&&/^(despite|in spite of)$/i.test(s);})?{vurgu:c.sagK.slice(0,Math.min(3,c.sagK.length))}:null;},
  degerlendir:function(p,c){return KUTUPHANE[3].degerlendir(p,c);}}),
K({signalId:'however_yeni_cumle',signalText:'however + yeni cümle',questionType:['baglac','tek_bosluk','paragraf'],measuredSkill:'Geçiş ifadeleri',
  leftPattern:'[;.] ----$',rightPattern:'^,',expectedStructure:'; geçiş zarfı, yeni cümle',
  eliminationRules:'“; ---- ,” kalıbında edatlar ve yan cümle bağlaçları elenir; geçiş zarfları kalır.',verificationRules:'Kalan geçiş zarflarında iki cümlenin yönüne bak.',
  commonTraps:['despite: zıtlık ama isim ister','although: zıtlık ama yan cümle kurar'],
  shortExplanation:'Boşluğun solunda noktalı virgül, sağında virgül var. Bu kalıba yalnızca geçiş zarfı (however, therefore, moreover) oturur.',
  hunterReflex:'“; ---- ,” görürsen yalnızca geçiş zarflarını tut; sonra iki cümlenin yönü aynı mı ters mi, ona bak.',
  example:'The plan was good; however, it failed.',difficultyLevel:2,guc:3,
  eslesir:function(c){var o=c.oncekiIsaret,s=c.sonrakiIsaret;return c.boslukBaglac&&(o===null||o.w===';'||o.w==='.')&&s&&s.w===','?{vurgu:[o?o.w:'',',']}:null;},
  degerlendir:function(p){
    if(p.tur!=='baglac'||p.yapi==='gecis')return null;
    if(p.yapi==='isim')return {neden:tirnak(p.metin)+' edattır; arkasında isim gerekir. Burada hemen virgül geliyor.',cekicilik:'Anlam ilişkisi doğru görünebilir.',tur:'baglac_yapi'};
    return {neden:tirnak(p.metin)+' yan cümle bağlacıdır; “; ---- ,” kalıbında tek başına durmaz.',cekicilik:'Anlam ilişkisi doğru görünebilir.',tur:'baglac_yapi'};
  }}),
K({signalId:'zaman_yan_cumle_will',signalText:'after / when yan cümlesinde will yok',questionType:['dilbilgisi','zaman_cati','cift_bosluk'],measuredSkill:'Zaman uyumu',
  leftPattern:'(when|after|before|until|as soon as|once|by the time) … ----',rightPattern:'',expectedStructure:'zaman yan cümlesi: geniş zaman; ana cümle: will',
  eliminationRules:'Zaman bağlacından sonraki yan cümlede will/would elenir; gelecekten söz ediliyorsa ana cümlede will aranır.',verificationRules:'Zaman belirtecini (next year, tomorrow) kontrol et.',
  commonTraps:['will open: Türkçedeki “açılacağı zaman” düşüncesi','would: koşul gibi görünür'],
  shortExplanation:'Zaman bağlacından (when, after) sonraki yan cümlede gelecek anlamı için will kullanılmaz; geniş zaman gelir. Will ana cümleye gider.',
  hunterReflex:'when/after/before/until görürsen o yan cümleden will’i sil; will ana cümlede olmalı.',
  example:'When the train arrives, we will leave.',difficultyLevel:2,guc:3,
  eslesir:function(c){
    if(!c.boslukFiil)return null;
    if(c.ozne.sinir&&/^(when|after|before|until|once)$/.test(c.ozne.sinir))return {vurgu:[c.ozne.sinir],rol:'yan'};
    if(c.digerZamanYan&&c.digerZamanYan.gelecek)return {vurgu:[c.digerZamanYan.baglac,c.digerZamanYan.gelecek],rol:'ana'};
    return null;
  },
  degerlendir:function(p,c,e){
    if(p.tur!=='fiil')return null;
    if(e.rol==='yan'){
      if(p.zaman==='gelecek'||p.zaman==='kosul')return {neden:'Zaman bağlacından ('+c.ozne.sinir+') sonra gelecek anlamı için '+tirnak(p.k[0])+' kullanılmaz; geniş zaman gelir.',cekicilik:'Türkçede “açılacağı zaman” diye düşününce will doğru gibi görünür.',tur:'zaman'};
      if(c.zaman.gelecek&&(p.zaman==='gecmis'||p.zaman==='gecmis_perf'||p.zaman==='gecmis_surekli'))return {neden:'“'+c.zaman.gelecek+'” gelecekten söz ediyor; '+tirnak(p.metin)+' geçmiş zaman.',cekicilik:'Yapısı düzgün olduğu için gözden kaçabilir.',tur:'zaman'};
      return null;
    }
    if(p.zaman==='gelecek'||p.zaman==='modal')return null;
    return {neden:'Yan cümle gelecekten söz ediyor ('+c.digerZamanYan.gelecek+'); ana cümlede gelecek (will) gerekir. '+tirnak(p.metin)+' '+(ZAMAN_ADI[p.zaman]||'farklı bir zaman')+'.',cekicilik:'Fiil doğru, yalnızca zamanı tutmuyor.',tur:'zaman'};
  }}),
K({signalId:'whose_isim',signalText:'isim + whose + isim',questionType:['relative','tek_bosluk','dilbilgisi'],measuredSkill:'Relative clause',
  leftPattern:'isim ----',rightPattern:'^isim + fiil',expectedStructure:'whose + isim',
  eliminationRules:'Boşluktan sonra önce isim sonra fiil geliyorsa who/which/that/whom elenir.',verificationRules:'İsim, soldaki ismin “sahip olduğu” bir şey mi?',
  commonTraps:['who: kişi olduğu için cazip','which/that: sonrasında fiil ister'],
  shortExplanation:'Boşluktan sonra önce bir isim, sonra fiil geliyor. İki ismin arasında sahiplik (onun araştırması) kurulur: whose.',
  hunterReflex:'İsim + ---- + isim + fiil → whose. who/which/that sonrasında doğrudan fiil gelir.',
  example:'The woman whose car was stolen called the police.',difficultyLevel:2,guc:3,
  eslesir:function(c){return c.boslukRelative&&c.sagYapi==='isim_fiil'&&c.solKelime&&!var_(EDAT,c.solKelime)?{vurgu:[c.solKelime,c.sagK[0],c.sagK[1]]}:null;},
  degerlendir:function(p,c){
    if(p.tur!=='relative'||p.metin.toLowerCase()==='whose')return null;
    var w=p.metin.toLowerCase();
    if(w==='whom')return {neden:'“whom” sonrasında özne + fiil gelir; burada “'+c.sagK[0]+'” özne değil, sahip olunan şey.',cekicilik:'Kişiden söz edildiği için cazip görünür.',tur:'yapi'};
    if(w==='what')return {neden:'“what” bir isimden sonra relative olarak kullanılmaz.',cekicilik:'“ne” anlamı akla yakın gelir.',tur:'yapi'};
    return {neden:tirnak(p.metin)+' sonrasında doğrudan fiil gelir; burada önce bir isim ('+c.sagK[0]+') var. Sahiplik için whose gerekir.',cekicilik:'Soldaki isimle uyumlu bir relative olduğu için doğru gibi görünür.',tur:'yapi'};
  }}),
K({signalId:'the_number_of',signalText:'the number of + tekil fiil',questionType:['dilbilgisi','ozne_fiil','tek_bosluk'],measuredSkill:'Özne–fiil uyumu',
  leftPattern:'^the number of …',rightPattern:'',expectedStructure:'tekil fiil (has, is, V+s)',
  eliminationRules:'Çoğul fiiller (have, are, were, V1) elenir.',verificationRules:'Zaman belirtecini kontrol et.',
  commonTraps:['have: “students” çoğul diye','are: aradaki çoğul isim yanıltır'],
  shortExplanation:'“The number of” = “…ların sayısı”. Asıl özne “number”dır ve tekildir; aradaki çoğul isim yanıltmamalı.',
  hunterReflex:'“The number of” → tekil fiil. “A number of” → çoğul fiil.',
  example:'The number of cars has increased.',difficultyLevel:2,guc:3,
  eslesir:function(c){return c.boslukFiil&&c.ozne.neden==='the_number'?{vurgu:['the','number','of']}:null;},
  degerlendir:function(p){if(p.tur!=='fiil'||p.sayi!=='cogul')return null;return {neden:'“The number of” tekil özne kurar; '+tirnak(p.metin)+' çoğul fiil.',cekicilik:'Aradaki çoğul isim fiili çoğul yapmaya iter.',tur:'ozne_fiil'};}}),
K({signalId:'a_number_of',signalText:'a number of + çoğul fiil',questionType:['dilbilgisi','ozne_fiil','tek_bosluk'],measuredSkill:'Özne–fiil uyumu',
  leftPattern:'^a number of …',rightPattern:'',expectedStructure:'çoğul fiil (have, are, V1)',
  eliminationRules:'Tekil fiiller (has, is, was, V+s) elenir.',verificationRules:'Zaman belirtecini kontrol et.',
  commonTraps:['has: “a number” tekil gibi görünür'],
  shortExplanation:'“A number of” = “birçok”. Arkasındaki çoğul isim asıl öznedir; fiil çoğul olur.',
  hunterReflex:'“A number of” → çoğul fiil. “The number of” → tekil fiil.',
  example:'A number of students have applied.',difficultyLevel:2,guc:3,
  eslesir:function(c){return c.boslukFiil&&c.ozne.neden==='a_number'?{vurgu:['a','number','of']}:null;},
  degerlendir:function(p){if(p.tur!=='fiil'||p.sayi!=='tekil')return null;return {neden:'“A number of” çoğul özne kurar (= birçok); '+tirnak(p.metin)+' tekil fiil.',cekicilik:'“a number” tek bir şey gibi göründüğü için cazip.',tur:'ozne_fiil'};}}),
K({signalId:'by_edilgen',signalText:'by + işi yapan → edilgen',questionType:['dilbilgisi','zaman_cati'],measuredSkill:'Etken–edilgen (çatı)',
  leftPattern:'----',rightPattern:'^by (the|a|an)? …',expectedStructure:'be + V3',
  eliminationRules:'Sağda “by + işi yapan” varsa etken fiiller elenir.',verificationRules:'Zaman belirtecine göre be’nin zamanını seç.',
  commonTraps:['designed: tek başına V2 (etken geçmiş)','has designed: etken'],
  shortExplanation:'Boşluktan hemen sonra “by + işi yapan” geliyor. İşi özne değil, “by” sonrasındaki yapmış: fiil edilgen (be + V3) olmalı.',
  hunterReflex:'Boşluğun sağında by + kişi/kurum → edilgen. Sonra zaman belirtecine bak.',
  example:'The bridge was built by engineers.',difficultyLevel:2,guc:3,
  eslesir:function(c){return c.boslukFiil&&c.sagK[0]==='by'?{vurgu:c.sagK.slice(0,Math.min(3,c.sagK.length))}:null;},
  degerlendir:function(p,c){if(p.tur!=='fiil'||p.cati==='edilgen')return null;if(p.lemma&&var_(GECISSIZ,p.lemma))return null;return {neden:'Sağda “'+c.sagK.slice(0,3).join(' ')+'” var: işi yapan sonradan söylenmiş. '+tirnak(p.metin)+' etken; edilgen (be + V3) gerekir.',cekicilik:'Fiilin anlamı ve zamanı doğru görünebilir.',tur:'cati'};}}),
K({signalId:'since_for_zaman',signalText:'since / for → zaman kontrolü',questionType:['dilbilgisi','zaman_cati'],measuredSkill:'Zaman uyumu',
  leftPattern:'',rightPattern:'since + başlangıç | for + süre',expectedStructure:'have/has (been) + V3 / V-ing',
  eliminationRules:'Geçmişte başlayıp süren iş için geniş, şimdiki ve geçmiş zaman elenir.',verificationRules:'Cümlede geçmiş bir referans yoksa past perfect de elenir.',
  commonTraps:['worked: süre var diye geçmiş zaman','is working: “hâlâ” anlamı'],
  shortExplanation:'“since” (…den beri) ve “for + süre” geçmişte başlayıp bugüne uzanan işi gösterir. Bu anlamı present perfect (have/has + V3) verir.',
  hunterReflex:'since / for + süre / over the past görürsen have/has + V3 ara.',
  example:'She has lived here for ten years.',difficultyLevel:2,guc:3,
  eslesir:function(c){if(!c.boslukFiil)return null;var z=c.zaman;if(z.since)return {vurgu:z.since.split(' ').slice(0,3),tur:'since'};if(z.for&&(z.hala||c.cumleSimdi))return {vurgu:z.for.split(' ').slice(0,4),tur:'for'};if(z.yakin)return {vurgu:z.yakin.split(' '),tur:'yakin'};return null;},
  degerlendir:function(p,c,e){
    if(p.tur!=='fiil')return null;
    if(p.zaman==='yakin_gecmis')return null;
    var isaret=e.vurgu.join(' ');
    if(p.zaman==='gecmis_perf')return {neden:tirnak(p.metin)+' past perfect; geçmişteki bir ana kadar olanı anlatır. Cümlede öyle bir geçmiş referans yok, iş bugüne uzanıyor.',cekicilik:'Perfect yapı olduğu için doğru gibi görünür.',tur:'zaman'};
    if(p.zaman==='gecmis')return {neden:'“'+isaret+'” işin bugüne uzandığını gösteriyor'+(c.zaman.hala?' (still)':'')+'. '+tirnak(p.metin)+' bitmiş geçmişi anlatır.',cekicilik:'Süre geçmişte başladığı için geçmiş zaman cazip görünür.',tur:'zaman'};
    return {neden:'“'+isaret+'” ile '+tirnak(p.metin)+' ('+(ZAMAN_ADI[p.zaman]||p.bicim)+') kullanılmaz; have/has + V3 gerekir.',cekicilik:'Türkçedeki “…dır çalışıyor” düşüncesi şimdiki/geniş zamanı cazip kılar.',tur:'zaman'};
  }}),
K({signalId:'if_kosul',signalText:'if / unless → koşul yapısı',questionType:['dilbilgisi','zaman_cati'],measuredSkill:'Koşul cümleleri',
  leftPattern:'if … ----',rightPattern:', … would / will',expectedStructure:'Tip 1: if + V1 / will · Tip 2: if + V2 / would · Tip 3: if + had V3 / would have V3',
  eliminationRules:'Ana cümledeki yapı (will / would / would have) koşul tipini belirler; uymayan zamanlar elenir.',verificationRules:'If’li yan cümlede will kullanılmaz.',
  commonTraps:['will invest: Türkçedeki “yatırım yapacak olursa”','had invested: would ile karıştırılır'],
  shortExplanation:'Koşul cümlesinin tipini ana cümle söyler. Ana cümlede “would + V1” varsa Tip 2’dir; if’li tarafta geçmiş zaman (V2) gelir.',
  hunterReflex:'if görünce önce diğer yarıya bak: will → V1, would → V2, would have → had V3.',
  example:'If I had more time, I would travel.',difficultyLevel:2,guc:3,
  eslesir:function(c){if(!c.boslukFiil||!(c.ozne.sinir==='if'||c.ozne.sinir==='unless'))return null;var tip=c.kosulTipi;return tip?{vurgu:[c.ozne.sinir].concat(c.kosulVurgu),tip:tip}:null;},
  degerlendir:function(p,c,e){
    if(p.tur!=='fiil')return null;
    var t=e.tip;
    if(p.zaman==='gelecek'||p.zaman==='kosul')return {neden:'If’li yan cümlede '+tirnak(p.k[0])+' kullanılmaz.',cekicilik:'Türkçede “…yapacak olursa” diye düşünülünce cazip görünür.',tur:'zaman'};
    var ok=t===1?(p.zaman==='genis'||p.zaman==='simdiki'||p.zaman==='yakin_gecmis'):t===2?(p.zaman==='gecmis'||p.zaman==='gecmis_surekli'):(p.zaman==='gecmis_perf');
    if(ok)return null;
    var tipAdi=t===1?'Tip 1 (ana cümlede will): if + geniş zaman':t===2?'Tip 2 (ana cümlede would + V1): if + geçmiş zaman (V2)':'Tip 3 (ana cümlede would have + V3): if + had V3';
    return {neden:tipAdi+' gerekir. '+tirnak(p.metin)+' bu tipe uymaz.',cekicilik:'Koşul anlamı verdiği için doğru gibi görünür.',tur:'zaman'};
  }}),
K({signalId:'so_such',signalText:'so / such → isim ve sıfat yapısı',questionType:['dilbilgisi','tek_bosluk'],measuredSkill:'Sonuç yapıları (so/such … that)',
  leftPattern:'----',rightPattern:'^(a|an)? sıfat isim that | ^sıfat that',expectedStructure:'such + a/an + sıfat + isim + that · so + sıfat + that',
  eliminationRules:'Sağda a/an + isim varsa so elenir; sağda yalnızca sıfat varsa such elenir. too / very / enough “that” sonuç cümlesi kurmaz.',verificationRules:'Sağda “that” sonuç cümlesi var mı?',
  commonTraps:['so: “çok” anlamı','very: “çok” anlamı ama that kurmaz'],
  shortExplanation:'Boşluktan sonra “a/an + sıfat + isim + that” geliyor. İsimle sonuç cümlesi kuran kalıp “such … that”tir.',
  hunterReflex:'so/such sorusunda sağa bak: a/an + isim varsa such, yalnızca sıfat varsa so.',
  example:'It was such a good film that we watched it twice.',difficultyLevel:2,guc:3,
  eslesir:function(c){if(!c.siklar.every(function(s){return s&&var_(DERECE,s.toLowerCase());}))return null;var t=c.sagTumu.indexOf('that');if(t<0)return null;return {vurgu:[c.sagK[0],'that'],isimli:/^(a|an)$/.test(c.sagK[0])};},
  degerlendir:function(p,c,e){
    var w=p.metin.toLowerCase();
    if(e.isimli&&w==='such'||!e.isimli&&w==='so')return null;
    if(w==='so')return {neden:'“so” arkasından doğrudan sıfat/zarf alır; burada önce “'+c.sagK[0]+'” + isim var. İsimle “such” kullanılır.',cekicilik:'“O kadar” anlamı uyduğu için cazip.',tur:'yapi'};
    if(w==='such')return {neden:'“such” isim ister; burada yalnızca sıfat var. Sıfatla “so … that” kullanılır.',cekicilik:'Anlamı uygun görünür.',tur:'yapi'};
    if(w==='too')return {neden:'“too” sonuç için “to V1” ile kullanılır, “that” ile değil; ayrıca a/an’dan önce gelmez.',cekicilik:'“Çok” anlamı akla gelir.',tur:'yapi'};
    if(w==='enough')return {neden:'“enough” sıfattan SONRA gelir ve “that” sonuç cümlesi kurmaz.',cekicilik:'Anlamı yakın görünür.',tur:'yapi'};
    return {neden:tirnak(p.metin)+' “that” ile sonuç cümlesi kurmaz.',cekicilik:'“Çok” anlamı uyduğu için cazip.',tur:'yapi'};
  }}),
K({signalId:'not_only_but_also',signalText:'not only … but also → paralellik',questionType:['baglac','dilbilgisi'],measuredSkill:'Paralellik',
  leftPattern:'not only … ----',rightPattern:'',expectedStructure:'but (also)',
  eliminationRules:'“not only” görülen cümlede but also dışındaki bağlayıcılar elenir.',verificationRules:'İki taraf aynı yapıda mı (reduce … improve)?',
  commonTraps:['as well as: anlamı yakın ama çift yapı kurmaz','and also: not only ile eşleşmez'],
  shortExplanation:'“not only” tek başına kalmaz; ikinci yarıyı “but also” tamamlar. İki taraf aynı yapıda olur (reduce … improve).',
  hunterReflex:'not only görürsen but also ara; iki tarafın aynı biçimde olduğunu kontrol et.',
  example:'She is not only smart but also hard-working.',difficultyLevel:2,guc:3,
  eslesir:function(c){var s=' '+c.solTumuMetin+' ';return / not only /.test(s)&&c.siklar.some(function(x){return x&&/^but( also)?$/i.test(x);})?{vurgu:['not','only']}:null;},
  degerlendir:function(p){if(/^but( also)?$/i.test(p.metin))return null;return {neden:'“not only” ile eşleşen kalıp “but also”dur; '+tirnak(p.metin)+' bu çifti kurmaz.',cekicilik:'Ekleme anlamı verdiği için doğru gibi görünür.',tur:'baglac_yapi'};}}),
K({signalId:'either_neither_yakin_ozne',signalText:'either/or · neither/nor → yakın özne uyumu',questionType:['dilbilgisi','ozne_fiil'],measuredSkill:'Özne–fiil uyumu',
  leftPattern:'(n)either A (n)or B ----',rightPattern:'',expectedStructure:'fiil, fiile yakın özneye (B) uyar',
  eliminationRules:'Yakın özne çoğulsa tekil fiiller, tekilse çoğul fiiller elenir.',verificationRules:'Zaman belirtecini / cümlenin geri kalanını kontrol et.',
  commonTraps:['was: ilk özne (the manager) tekil diye'],
  shortExplanation:'“neither A nor B” yapısında fiil, kendisine en yakın özneye (B) uyar.',
  hunterReflex:'either/or, neither/nor görürsen fiile en yakın ismin tekil mi çoğul mu olduğuna bak.',
  example:'Neither the teacher nor the students were ready.',difficultyLevel:3,guc:3,
  eslesir:function(c){return c.boslukFiil&&c.ozne.neden==='yakin'?{vurgu:c.ozne.yakin.split(' ')}:null;},
  degerlendir:function(p,c){if(p.tur!=='fiil'||p.sayi==='notr'||!p.sayi||p.sayi===c.ozne.sayi)return null;return {neden:'Fiile en yakın özne “'+c.ozne.yakin+'” '+(c.ozne.sayi==='cogul'?'çoğul':'tekil')+'; '+tirnak(p.metin)+' '+(p.sayi==='cogul'?'çoğul':'tekil')+' fiil.',cekicilik:'İlk özneye göre bakılırsa doğru görünür.',tur:'ozne_fiil'};}}),
K({signalId:'edat_ving',signalText:'preposition + isim / V-ing',questionType:['preposition','dilbilgisi','tek_bosluk'],measuredSkill:'Preposition',
  leftPattern:'(in|of|at|on|about|without|before|after|by|for|from) ----$',rightPattern:'',expectedStructure:'V-ing (gerund)',
  eliminationRules:'Edattan sonra yalın fiil, mastar ve çekimli fiil elenir.',verificationRules:'Edat, soldaki kelimeyle doğru eşdizimi kuruyor mu (interested in)?',
  commonTraps:['to understand: “to” edat değil mastar','understand: yalın fiil'],
  shortExplanation:'Boşluğun hemen solunda bir edat (in) var. Edattan sonra fiil gelecekse V-ing (gerund) olur.',
  hunterReflex:'Edat + ---- → fiil gerekiyorsa V-ing yaz.',
  example:'She is good at solving problems.',difficultyLevel:1,guc:3,
  eslesir:function(c){var w=c.solKelime;return c.boslukFiil&&w&&/^(in|of|at|on|about|without|before|after|by|for|from|despite)$/.test(w)&&c.solK.length?{vurgu:[w]}:null;},
  degerlendir:function(p,c){if(p.tur!=='fiil'||p.bicim==='ving'||p.bicim==='having_v3'||p.bicim==='being_v3')return null;return {neden:'“'+c.solKelime+'” edattır; edattan sonra fiil V-ing olur. '+tirnak(p.metin)+' '+(BICIM_ADI[p.bicim]||'uygun olmayan bir biçim')+'.',cekicilik:'Fiilin anlamı doğru olduğu için biçimi gözden kaçar.',tur:'yapi'};}}),
K({signalId:'modal_v1',signalText:'modal + V1',questionType:['dilbilgisi','tek_bosluk'],measuredSkill:'Modal yapılar',
  leftPattern:'(can|could|may|might|must|should|will|would) (not)? ----$',rightPattern:'',expectedStructure:'yalın fiil (V1)',
  eliminationRules:'Modaldan sonra V-ing, mastar, V2, V3 ve V+s elenir.',verificationRules:'Sağda nesne varsa fiil geçişli mi?',
  commonTraps:['to show: “must to” yoktur','shows: özne tekil diye -s'],
  shortExplanation:'Boşluğun solunda bir modal var. Modaldan sonra fiil yalın hâliyle (V1) gelir.',
  hunterReflex:'Modal + ---- → yalın fiil. -s, -ed, -ing, to yok.',
  example:'You must show your ticket.',difficultyLevel:1,guc:3,
  eslesir:function(c){var s=c.solK.slice(-2);var m=s[1]&&var_(MODAL,s[1])?s[1]:s[0]&&var_(MODAL,s[0])&&/^(not|also|never|only|significantly|still|easily|always|probably|soon|even)$/.test(s[1])?s[0]:null;return c.boslukFiil&&m?{vurgu:[m]}:null;},
  degerlendir:function(p,c,e){if(p.tur!=='fiil'||p.bicim==='v1'||p.bicim==='be_v3'||p.bicim==='perf'&&p.k[0]==='have')return null;if(p.k[0]==='be'||p.k[0]==='have')return null;return {neden:'“'+e.vurgu[0]+'” modalından sonra yalın fiil (V1) gelir; '+tirnak(p.metin)+' '+(BICIM_ADI[p.bicim]||'farklı bir biçim')+'.',cekicilik:'Fiil doğru, yalnızca biçimi yanlış.',tur:'yapi'};}}),
K({signalId:'have_v3',signalText:'have / has / had + V3',questionType:['dilbilgisi','zaman_cati','tek_bosluk'],measuredSkill:'Perfect yapılar',
  leftPattern:'(have|has|had) (already|just|never|not|recently|also)? ----$',rightPattern:'',expectedStructure:'V3',
  eliminationRules:'have/has/had’den sonra V1, V-ing, mastar ve V+s elenir.',verificationRules:'Zaman (by the time, since) perfect ile uyumlu mu?',
  commonTraps:['destroying: süreç anlamı','destroy: yalın fiil'],
  shortExplanation:'Boşluğun solunda “had” var. Perfect yapı have/has/had + V3 ile kurulur.',
  hunterReflex:'have/has/had + ---- → V3 (gone, done, destroyed).',
  example:'They had already left.',difficultyLevel:1,guc:3,
  eslesir:function(c){var s=c.solK.slice(-2);var m=s[1]&&/^(have|has|had)$/.test(s[1])?s[1]:s[0]&&/^(have|has|had)$/.test(s[0])&&/^(already|just|never|not|recently|also|ever|always|long)$/.test(s[1])?s[0]:null;return c.boslukFiil&&m?{vurgu:s[1]===m?[m]:[m,s[1]]}:null;},
  degerlendir:function(p,c,e){if(p.tur!=='fiil'||p.bicim==='v3'||p.bicim==='v2v3'||p.k[0]==='been')return null;return {neden:'“'+e.vurgu[0]+'” sonrasında V3 gelir; '+tirnak(p.metin)+' '+(BICIM_ADI[p.bicim]||'farklı bir biçim')+'.',cekicilik:'Fiil doğru, yalnızca biçimi yanlış.',tur:'yapi'};}}),
K({signalId:'be_v3_edilgen',signalText:'be + V3 → edilgen ihtimali',questionType:['dilbilgisi','zaman_cati','tek_bosluk'],measuredSkill:'Etken–edilgen (çatı)',
  leftPattern:'(am|is|are|was|were|be|been) ----$',rightPattern:'^(nesne yok)',expectedStructure:'V3 (edilgen)',
  eliminationRules:'be’den sonra V1, V+s ve mastar elenir; sağda nesne yoksa geçişli fiilin V-ing hâli de elenir.',verificationRules:'Özne işi yapıyor mu, yoksa iş özneye mi yapılıyor?',
  commonTraps:['discovering: “keşfediyor” ama neyi? nesne yok'],
  shortExplanation:'Boşluğun solunda “be” var ve sağda nesne yok. İş özneye yapılıyor: be + V3 (edilgen).',
  hunterReflex:'be + ---- ve sağda nesne yoksa V3 (edilgen) ara; nesne varsa V-ing.',
  example:'New species are discovered every year.',difficultyLevel:2,guc:2,
  eslesir:function(c){var w=c.solKelime;return c.boslukFiil&&w&&var_(BE,w)&&!nesneVar(c.sagK)?{vurgu:[w]}:null;},
  degerlendir:function(p){
    if(p.tur!=='fiil'||p.bicim==='v3'||p.bicim==='v2v3')return null;
    if(p.bicim==='ving'){if(p.lemma&&var_(GECISSIZ,p.lemma))return null;return {neden:tirnak(p.metin)+' etken; “neyi?” sorusunun cevabı (nesne) sağda yok. Özne işi yapmıyor, iş özneye yapılıyor: V3.',cekicilik:'be + V-ing şimdiki zaman kalıbı tanıdık olduğu için cazip.',tur:'cati'};}
    if(p.bicim==='to_v1')return {neden:'be + to V1 “yapması gereken/yapacak” anlamı verir; burada özne işi yapmıyor, iş özneye yapılıyor: V3.',cekicilik:'Mastar kalıbı tanıdık geldiği için seçilebilir.',tur:'cati'};
    return {neden:'be fiilinden sonra '+(BICIM_ADI[p.bicim]||'bu biçim')+' gelmez.',cekicilik:'Fiil doğru, yalnızca biçimi yanlış.',tur:'yapi'};
  }}),
K({signalId:'be_ving_surerlik',signalText:'be + V-ing → devam eden zaman ihtimali',questionType:['dilbilgisi','zaman_cati','tek_bosluk'],measuredSkill:'Zaman ve çatı',
  leftPattern:'(am|is|are|was|were) ----$',rightPattern:'^nesne',expectedStructure:'V-ing',
  eliminationRules:'be’den sonra V1, V+s ve mastar elenir; sağda nesne varsa edilgen V3 de elenir.',verificationRules:'Zaman belirteci (at the moment, now) süren işi destekliyor mu?',
  commonTraps:['developed: be + V3 tanıdık ama arkasında nesne var'],
  shortExplanation:'Boşluğun solunda “be” var ve sağda bir nesne (new ways) duruyor. Nesne alan etken fiil gerekir: be + V-ing.',
  hunterReflex:'be + ---- + nesne → V-ing. Edilgen fiilden sonra nesne gelmez.',
  example:'They are building a new school.',difficultyLevel:2,guc:2,
  eslesir:function(c){var w=c.solKelime;return c.boslukFiil&&w&&var_(BE,w)&&w!=='been'&&w!=='be'&&nesneVar(c.sagK)?{vurgu:[w].concat(c.sagK.slice(0,2))}:null;},
  degerlendir:function(p,c){
    if(p.tur!=='fiil'||p.bicim==='ving')return null;
    if(p.bicim==='v3'||p.bicim==='v2v3')return {neden:'be + '+tirnak(p.metin)+' edilgen olur; edilgen fiilden sonra nesne (“'+c.sagK.slice(0,2).join(' ')+'”) gelmez.',cekicilik:'be + V3 kalıbı tanıdık olduğu için cazip.',tur:'cati'};
    if(p.bicim==='to_v1')return {neden:'be + to V1 “yapması gereken” anlamı verir'+(c.zaman.simdi?'; “'+c.zaman.simdi+'” şu an süren işi gösteriyor':'')+'.',cekicilik:'Mastar kalıbı tanıdık geldiği için seçilebilir.',tur:'zaman'};
    return {neden:'be fiilinden sonra '+(BICIM_ADI[p.bicim]||'bu biçim')+' gelmez.',cekicilik:'Fiil doğru, yalnızca biçimi yanlış.',tur:'yapi'};
  }}),
K({signalId:'relative_eksik_ozne',signalText:'who / which / that → eksik özne kontrolü',questionType:['relative','tek_bosluk'],measuredSkill:'Relative clause',
  leftPattern:'isim ,? ----',rightPattern:'^fiil',expectedStructure:'özne yerine geçen relative: who (kişi) / which (şey)',
  eliminationRules:'Sağda doğrudan fiil varsa whose ve whom elenir; kişi için which, şey için who elenir; virgülden sonra that elenir.',verificationRules:'Soldaki isim kişi mi, şey mi?',
  commonTraps:['whom: kişi olduğu için cazip','that: virgülden sonra kullanılmaz'],
  shortExplanation:'Boşluktan hemen sonra fiil geliyor: relative, yan cümlenin öznesi olacak. Kişi için who, şey için which.',
  hunterReflex:'İsim + ---- + fiil → özne relative (who/which). İsim + ---- + isim → whose.',
  example:'Students who study regularly succeed.',difficultyLevel:2,guc:3,
  eslesir:function(c){return c.boslukRelative&&c.sagYapi==='fiil'&&c.solKelime?{vurgu:[c.solKelime,c.sagK[0]],kisi:var_(KISI,c.solKelime),virgul:c.oncekiIsaret&&c.oncekiIsaret.w===','}:null;},
  degerlendir:function(p,c,e){
    if(p.tur!=='relative')return null;
    var w=p.metin.toLowerCase(),ad=c.solKelime;
    if(w==='whose')return {neden:'“whose” sonrasında isim gelir; burada doğrudan fiil (“'+c.sagK[0]+'”) var.',cekicilik:'Sahiplik anlamı akla yatkın görünebilir.',tur:'yapi'};
    if(w==='whom')return {neden:'“whom” nesne yerine geçer, arkasından özne + fiil ister; burada özne eksik, doğrudan fiil var.',cekicilik:'Kişiden söz edildiği için cazip görünür.',tur:'yapi'};
    if(w==='what')return {neden:'“what” bir isimden sonra relative olarak kullanılmaz.',cekicilik:'“ne” anlamı akla gelir.',tur:'yapi'};
    if(w==='that'&&e.virgul)return {neden:'Virgülden sonra “that” kullanılmaz; ek bilgi veren relative clause “which/who” ile kurulur.',cekicilik:'“that” her yerde kullanılabilir sanılır.',tur:'yapi'};
    if(w==='which'&&e.kisi)return {neden:'“'+ad+'” kişi; kişiler için “which” değil “who” kullanılır.',cekicilik:'Yapı doğru, yalnızca kişi/şey ayrımı yanlış.',tur:'yapi'};
    if(w==='who'&&!e.kisi&&var_(KISI,ad)===false&&/^(report|book|study|paper|bridge|city|law|policy|system|report|machine|drug|method)$/.test(ad))return {neden:'“'+ad+'” bir şey; şeyler için “who” değil “which” kullanılır.',cekicilik:'Yapı doğru, yalnızca kişi/şey ayrımı yanlış.',tur:'yapi'};
    return null;
  }}),
K({signalId:'fiil_edat_esdizim',signalText:'fiil/sıfat + edat eşdizimi',questionType:['preposition','kelime','tek_bosluk'],measuredSkill:'Preposition',
  leftPattern:'(depend|rely|consist|interested|aware…) ----$',rightPattern:'',expectedStructure:'kalıba ait edat (depend on, consist of…)',
  eliminationRules:'Kalıba ait olmayan edatlar elenir.',verificationRules:'Edattan sonra isim/V-ing geliyor mu?',
  commonTraps:['Türkçedeki ek (-e, -de) göre edat seçmek'],
  shortExplanation:'Boşluğun solundaki kelime belirli bir edatla kalıp oluşturur. Edat Türkçe ekten değil, bu kalıptan seçilir.',
  hunterReflex:'Edat sorusunda boşluğun solundaki fiile/sıfata bak: depend on, consist of, interested in.',
  example:'Success depends on hard work.',difficultyLevel:2,guc:3,
  eslesir:function(c){var w=c.solKelime;if(!w)return null;var l=var_(ESDIZIM,w)?w:lemma(w);if(!var_(ESDIZIM,l))return null;if(!c.siklar.every(function(s){return s&&var_(EDAT,s.toLowerCase());}))return null;return {vurgu:[w],edat:ESDIZIM[l],lemma:l};},
  degerlendir:function(p,c,e){if(p.metin.toLowerCase()===e.edat)return null;return {neden:'“'+e.lemma+'” kalıbı “'+e.edat+'” ister ('+e.lemma+' '+e.edat+'); '+tirnak(p.metin)+' bu kalıba ait değil.',cekicilik:'Türkçedeki eke göre düşünülünce uygun görünebilir.',tur:'kelime'};}}),
K({signalId:'kelime_gecisli',signalText:'nesne var → geçişli fiil',questionType:['kelime','tek_bosluk'],measuredSkill:'Kelime bilgisi (fiil seçimi)',
  leftPattern:'----',rightPattern:'^nesne',expectedStructure:'nesne alabilen (geçişli) fiil',
  eliminationRules:'Sağda nesne varsa nesne almayan fiiller (remain, arrive, happen, belong) elenir.',verificationRules:'Kalan fiil nesneyle anlamlı bir eşdizim kuruyor mu (reduce the risk)?',
  commonTraps:['remain / happen: biçim doğru, ama nesne almaz'],
  shortExplanation:'Boşluktan sonra bir nesne (the risk) var. Nesne alamayan fiiller burada kullanılamaz.',
  hunterReflex:'Kelime sorusunda fiilden sonra nesne varsa “neyi?” sorusunu sor; nesne almayan fiilleri ele.',
  example:'Exercise can reduce stress.',difficultyLevel:2,guc:2,
  eslesir:function(c){if(!c.boslukFiil||!nesneVar(c.sagK))return null;var ps=c.parcalar;if(!ps.every(function(p){return p&&p.tur==='fiil'&&p.k.length===1;}))return null;var l=ps.map(function(p){return p.lemma;});if(new Set(l).size<ps.length)return null;return {vurgu:c.sagK.slice(0,2)};},
  degerlendir:function(p,c){if(p.lemma&&var_(GECISSIZ,p.lemma))return {neden:tirnak(p.metin)+' nesne almaz; “'+c.sagK.slice(0,2).join(' ')+'” ile kullanılamaz.',cekicilik:'Biçimi doğru olduğu için seçilebilir.',tur:'kelime'};return null;}}),
K({signalId:'kelime_turu',signalText:'kelime türü (sıfat / zarf / isim / fiil)',questionType:['kelime','tek_bosluk'],measuredSkill:'Kelime türü',
  leftPattern:'(be|so|very|too|more|most) ----',rightPattern:'',expectedStructure:'sıfat',
  eliminationRules:'be / so / very sonrasında sıfat gerekir: zarf (-ly), isim ve fiil elenir. -ed sıfatı hisseden kişi, -ing sıfatı his veren şey içindir.',verificationRules:'Özne kişi mi, şey mi?',
  commonTraps:['surprised: -ed / -ing karışıklığı','surprisingly: zarf'],
  shortExplanation:'Boşluğun solunda “so” ve öncesinde “be” var: buraya sıfat gelir. Özne bir şey olduğu için his veren -ing sıfatı seçilir.',
  hunterReflex:'Aynı kökten şıklar varsa önce boşluğun türünü bul (sıfat mı, zarf mı?), sonra -ed / -ing ayrımına bak.',
  example:'The film was so boring that I left.',difficultyLevel:2,guc:3,
  eslesir:function(c){
    var ks=c.siklar.map(function(s){return String(s||'').toLowerCase();});
    if(ks.some(function(s){return !s||/\s/.test(s);}))return null;
    var kok=ks.reduce(function(a,b){var i=0;while(i<a.length&&a[i]===b[i])i++;return a.slice(0,i);});
    if(kok.length<4)return null;
    var s=c.solK.slice(-2);
    if(!(s[1]&&/^(so|very|too|more|most|quite|extremely)$/.test(s[1])||s[1]&&var_(BE,s[1])))return null;
    return {vurgu:s.filter(Boolean),ozneKisi:c.ozne.bas?var_(KISI,c.ozne.bas):false};
  },
  degerlendir:function(p,c,e){
    var w=p.metin.toLowerCase();
    if(/ly$/.test(w))return {neden:tirnak(p.metin)+' zarftır; burada '+(e.vurgu.join(' '))+' sonrasında sıfat gerekir.',cekicilik:'Kökü aynı olduğu için doğru gibi görünür.',tur:'kelime'};
    if(/ing$/.test(w))return e.ozneKisi?{neden:tirnak(p.metin)+' his veren şey için kullanılır; özne kişi olduğu için -ed sıfatı gerekir.',cekicilik:'Kökü aynı olduğu için doğru gibi görünür.',tur:'kelime'}:null;
    if(/ed$/.test(w))return e.ozneKisi?null:{neden:tirnak(p.metin)+' hisseden kişi için kullanılır. Özne (“'+(c.ozne.bas||'')+'”) bir şey; şaşıran değil, şaşırtan: -ing sıfatı.',cekicilik:'-ed / -ing sıfatları sık karışır.',tur:'kelime'};
    if(/s$/.test(w))return {neden:tirnak(p.metin)+' fiil (ya da çoğul isim); burada sıfat gerekir.',cekicilik:'Kökü aynı olduğu için doğru gibi görünür.',tur:'kelime'};
    return {neden:tirnak(p.metin)+' isim/fiil hâli; burada sıfat gerekir.',cekicilik:'Kökü aynı olduğu için doğru gibi görünür.',tur:'kelime'};
  }})
];

// ---------------- ANLAM SİNYALLERİ (Sinyal Lab anlam soruları) ----------------
// Sinyal Lab'ın mevcut 83 anlam sorusunda (Türkçe şıklı) sinyal zaten veride
// var (soru.sinyal). Bu kayıtlar o sinyalin kurduğu ilişkiyi ve Türkçe
// şıklarda hangi işaretlerin o ilişkiyle çeliştiğini tanımlar.
var ANLAM_SINYALLERI=[
  {signalId:'anlam_zitlik',signalText:'zıtlık sinyali',iliski:'zitlik',kelimeler:['despite','in spite of','although','even though','though','yet','whereas','while','nonetheless','nevertheless','notwithstanding','on the contrary','contrary to','contrary to popular belief','however','but'],measuredSkill:'Anlam ilişkisi: zıtlık',
    shortExplanation:'Bu sinyal iki tarafı birbirine ters bağlar: biri olurken diğeri beklenenin tersine gelişir.',hunterReflex:'Zıtlık sinyali görürsen “…e rağmen / …se de” anlamını koruyan şıkkı ara; “… için / çünkü” diyen şıkları ele.',difficultyLevel:2},
  {signalId:'anlam_sonuc',signalText:'sonuç sinyali',iliski:'sonuc',kelimeler:['consequently','as a result','as a consequence of','therefore','thus','hence'],measuredSkill:'Anlam ilişkisi: sebep–sonuç',
    shortExplanation:'Bu sinyal ilk olayın ikinci olaya yol açtığını söyler. Yön önemlidir: sebep önce, sonuç sonra.',hunterReflex:'Sonuç sinyalinde “ne neye yol açtı?” sorusunu sor; yönü ters çeviren ve zıtlık kuran şıkları ele.',difficultyLevel:2},
  {signalId:'anlam_kosul',signalText:'koşul sinyali',iliski:'kosul',kelimeler:['provided that','as long as','on condition that','unless','if','as far as'],measuredSkill:'Anlam ilişkisi: koşul',
    shortExplanation:'Bu sinyal bir şartı gösterir: sonuç ancak şart yerine gelirse geçerlidir.',hunterReflex:'Koşul sinyalinde şartı bul; şartı yok sayan (“her durumda”) ya da tersine çeviren şıkları ele.',difficultyLevel:2},
  {signalId:'anlam_amac',signalText:'amaç sinyali',iliski:'amac',kelimeler:['so that','so as to','in order to'],measuredSkill:'Anlam ilişkisi: amaç',
    shortExplanation:'Bu sinyal bir eylemin hangi amaçla yapıldığını söyler.',hunterReflex:'Amaç sinyalinde “ne için?” sorusunu sor; amacı sonuçla ya da sebeple karıştıran şıkları ele.',difficultyLevel:2},
  {signalId:'anlam_olumsuzluk',signalText:'gizli olumsuzluk sinyali',iliski:'olumsuzluk',kelimeler:['hardly','scarcely','by no means','far from','anything but','nor','barely','rarely'],measuredSkill:'Anlam ilişkisi: gizli olumsuzluk',
    shortExplanation:'Bu sinyal cümleye olumsuz anlam katar (hardly = neredeyse hiç, far from = hiç de … değil).',hunterReflex:'Gizli olumsuz sinyal görürsen cümleyi olumsuz oku; olumlu anlam veren şıkları ele.',difficultyLevel:3},
  {signalId:'anlam_zaman',signalText:'zaman sırası sinyali',iliski:'zaman',kelimeler:['prior to','by the time','once','after','since','before','until','when','no sooner had','as soon as'],measuredSkill:'Anlam ilişkisi: zaman sırası',
    shortExplanation:'Bu sinyal olayların sırasını belirler: hangisi önce, hangisi sonra.',hunterReflex:'Zaman sinyalinde olayları sıraya diz; sırayı ters veren şıkları ele.',difficultyLevel:2},
  {signalId:'anlam_modal_perfect',signalText:'modal perfect sinyali',iliski:'cikarim',kelimeler:['must have','could have','should have','might have','may have','had'],measuredSkill:'Modal perfect',
    shortExplanation:'Bu yapı geçmişe dair bir çıkarım, ihtimal ya da pişmanlık bildirir (must have = …miş olmalı, should have = …meliydi).',hunterReflex:'Modal perfect görürsen kesinlik derecesine bak: must have = güçlü çıkarım, could have = ihtimal, should have = yapılmadı.',difficultyLevel:3},
  {signalId:'anlam_tercih',signalText:'tercih / yerine sinyali',iliski:'tercih',kelimeler:['rather than','instead of'],measuredSkill:'Anlam ilişkisi: tercih',
    shortExplanation:'Bu sinyal bir şeyin diğerinin yerine olduğunu söyler; ikinci kısım olmayan şeydir.',hunterReflex:'rather than / instead of görürsen “hangisi oluyor, hangisi olmuyor?” diye ayır.',difficultyLevel:2},
  {signalId:'anlam_paralellik',signalText:'paralellik sinyali',iliski:'paralellik',kelimeler:['not only','either','neither','both'],measuredSkill:'Paralellik',
    shortExplanation:'Bu sinyal iki şeyi aynı anda ve aynı yönde bağlar.',hunterReflex:'not only / either / neither görürsen iki tarafın da şıkta korunduğunu kontrol et.',difficultyLevel:2}
];
var ANLAM_HARITASI={};
ANLAM_SINYALLERI.forEach(function(s){s.kelimeler.forEach(function(k){if(!var_(ANLAM_HARITASI,k))ANLAM_HARITASI[k]=s;});});

// Türkçe şık işaretleri
var TR={
  sebep:/(çünkü|nedeniyle|yüzünden|sayesinde|dolayı|bu yüzden|bu nedenle|olduğu için|olmadığı için|verdiği için|vermediği için|buldukları için|tanıtmadığı için|zayıf olduğu için|kesin olduğu için|ikna edici olduğu için|güçlü olduğu için|[a-zçğıöşü]+(dığı|diği|duğu|düğü|tığı|tiği|tuğu|tüğü|ları|leri) için)/,
  zitlik:/(rağmen|karşın|ama |ancak|fakat|yine de|-?(se|sa) da|olsa da|olmasa da|vermese de|aksine)/,
  sonucTers:/(yol açtı|neden oldu|sonucunda)/,
  asiri:/\b(tamamen|her zaman|her durumda|her koşulda|tüm|hiçbir|kesinlikle|yalnızca|sadece|asla|herkes|bütün)\b/,
  olumsuz:/(değil|yok\b|hiç|uzak|madı|medi|mamış|memiş|maz\b|mez\b|mıyor|miyor|muyor|müyor|amadı|emedi|amaz|emez|sız\b|siz\b|suz\b|süz\b|olmasa|olmayan|olmadı|vermedi|sağlayamadı|tekrarlayamadı|edemedi)/,
  once:/(önce|öncesinde|evvel)/,sonra:/(sonra|ardından|sonrasında|geçer geçmez|[a-zçğıöşü]+r [a-zçğıöşü]+(maz|mez)\b)/
};
function trKokler(s){return String(s||'').toLocaleLowerCase('tr-TR').replace(/[^a-zçğıöşü\s]/g,' ').split(/\s+/).filter(function(w){return w.length>=4&&!/^(bunu|buna|olan|olarak|daha|kadar|için|ama|ancak|gibi|olduğu|değil|çünkü|rağmen|karşın|sonra|önce|bile|yine|hem|ise|ile|veya|ya|hiç|tüm|her|çok|bir|iki|son|olmadığı|olmasına|olsa)$/.test(w);}).map(function(w){return w.slice(0,5);});}

// ---------------- soru tipi ----------------
function soruTipi(soru){
  var en=duzMetin(soru.en||soru.sent||soru.soru_en||'');
  var q=String(soru.q||soru.soru_tr||'');
  var bs=(en.match(BOSLUK_RE)||[]).length;
  if(/\(I\)|\(II\)|\(V\)/.test(en))return /bozan/i.test(q)?'anlam_butunlugu':'paragraf';
  if(/türkçe|çeviri|en yakın anlam/i.test(q)&&!bs)return 'ceviri';
  if(bs>=2)return 'cift_bosluk';
  if(bs===1)return 'tek_bosluk';
  return 'anlam';
}
var TIP_ADI={cift_bosluk:'Çift boşluk',tek_bosluk:'Tek boşluk',anlam:'Anlam (cümle yorumu)',ceviri:'Çeviri',paragraf:'Paragraf tamamlama',anlam_butunlugu:'Anlam bütünlüğünü bozan cümle',cloze:'Cloze test'};
function duzMetin(s){return String(s||'').replace(/<[^>]*>/g,'').replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();}

// ---------------- ÇÖZÜM: boşluklu sorular ----------------
function boslukCoz(soru,tip){
  var en=duzMetin(soru.en||soru.sent);
  var tk=tokenlar(en);
  var bIdx=bosluklarim(tk);
  var n=bIdx.length;
  var opts=soru.opts||[];
  var parca=opts.map(function(o){return sikParcalari(o,n);});
  if(parca.some(function(p){return !p;}))return null;
  var analiz=parca.map(function(ps){return ps.map(parcaAnaliz);});
  var dogru=soru.ans;

  // her boşluk için bağlam
  var ctxler=bIdx.map(function(bi,k){
    var ps=analiz.map(function(a){return a[k];});
    var turler=ps.map(function(p){return p.tur;});
    var c={k:k,bi:bi,tk:tk,parcalar:ps,siklar:parca.map(function(p){return p[k];}),
      solK:solSegment(tk,bi),sagK:sagSegment(tk,bi),sagTumu:sagSegment(tk,bi).concat(tk.slice(bi+1).filter(function(t){return !t.p;}).map(function(t){return t.l;})),
      solTumuMetin:solTumu(tk,bi).join(' '),
      oncekiIsaret:oncekiIsaret(tk,bi),sonrakiIsaret:sonrakiIsaret(tk,bi),
      solKelime:oncekiKelime(tk,bi),
      boslukFiil:turler.filter(function(t){return t==='fiil';}).length>=Math.ceil(ps.length/2),
      boslukBaglac:turler.filter(function(t){return t==='baglac';}).length>=Math.ceil(ps.length/2),
      boslukRelative:turler.filter(function(t){return t==='relative';}).length>=Math.ceil(ps.length/2)};
    c.sagYapi=sagYapi(c.sagK);
    c.ozne=c.boslukFiil||c.boslukBaglac?ozneBul(tk,bi):{np:'',bas:null,sayi:null};
    if(c.boslukRelative||!c.ozne.bas)c.ozne=c.ozne.bas?c.ozne:ozneBul(tk,bi);
    c.yan=yanCumle(tk,bi);
    // boşluk çekimli fiil yuvası mı? (modal / be / have / to / edattan sonra değilse)
    var sl=c.solK.slice();while(sl.length&&(/ly$/.test(sl[sl.length-1])||/^(not|already|also|just|never|still|ever|always)$/.test(sl[sl.length-1])))sl.pop();
    var sw=sl[sl.length-1];
    c.kisaltilmis=c.solK.indexOf('than')>=0&&c.solK.lastIndexOf('than')>=c.solK.length-2;
    c.sonluYuva=!c.kisaltilmis&&!(sw&&(var_(MODAL,sw)||var_(BE,sw)||/^(has|have|had|to|do|does|did)$/.test(sw)||var_(EDAT,sw)));
    c.zaman=zamanIsaretleri(c.yan);
    return c;
  });
  // cümle düzeyinde bilgiler: zaman yan cümlesi, koşul tipi, şimdiki bağlam
  var tumMetin=' '+tk.filter(function(t){return !t.p;}).map(function(t){return t.l;}).join(' ')+' ';
  ctxler.forEach(function(c){
    c.cumleSimdi=/ (still|now) /.test(tumMetin)&&/ (still \w+s|now \w+s|is|are) /.test(tumMetin);
    ctxler.forEach(function(d){
      if(d===c)return;
      if(d.ozne.sinir&&/^(when|after|before|until|once)$/.test(d.ozne.sinir)&&!(c.ozne.sinir&&/^(when|after|before|until|once|if)$/.test(c.ozne.sinir)))c.digerZamanYan={baglac:d.ozne.sinir,gelecek:d.zaman.gelecek||null};
    });
    if(c.ozne.sinir==='if'||c.ozne.sinir==='unless'){
      var vIdx=tk.findIndex(function(t,i){return i>c.bi&&t.w===',';});
      var ana=vIdx>=0?tk.slice(vIdx+1).filter(function(t){return !t.p;}).map(function(t){return t.l;}):[];
      var wi=ana.indexOf('would'),wl=ana.indexOf('will');
      if(wi>=0&&ana[wi+1]==='have'){c.kosulTipi=3;c.kosulVurgu=['would','have'];}
      else if(wi>=0){c.kosulTipi=2;c.kosulVurgu=['would',ana[wi+1]||''];}
      else if(wl>=0||ana.some(function(w){return /^(can|may)$/.test(w);})){c.kosulTipi=1;c.kosulVurgu=[wl>=0?'will':'can'];}
    }
  });

  // tüm sinyal eşleşmeleri
  var eslesmeler=[];
  ctxler.forEach(function(c){
    KUTUPHANE.forEach(function(s){
      var e=null;try{e=s.eslesir(c);}catch(err){e=null;}
      if(!e)return;
      var sonuc=analiz.map(function(a,i){var r=null;try{r=s.degerlendir(a[c.k],c,e);}catch(err){r=null;}return r;});
      eslesmeler.push({s:s,c:c,e:e,sonuc:sonuc,elenen:sonuc.map(function(r,i){return r?i:-1;}).filter(function(i){return i>=0;})});
    });
  });
  // sayısal uyum ve zaman: kütüphane dışındaki genel doğrulama kuralları
  var genel=[];
  ctxler.forEach(function(c){
    if(!c.boslukFiil)return;
    if(c.sonluYuva&&c.ozne.sayi&&c.ozne.neden!=='yakin'&&c.ozne.neden!=='the_number'&&c.ozne.neden!=='a_number'&&c.ozne.bas&&!c.boslukRelative){
      var sonuc=analiz.map(function(a){var p=a[c.k];if(p.tur!=='fiil'||!p.sayi||p.sayi==='notr'||p.sayi===c.ozne.sayi)return null;if(c.ozne.sinir==='if'&&p.bicim==='be')return null;return {neden:'Özne “'+c.ozne.np+'”, ana kelime “'+c.ozne.bas+'” '+(c.ozne.sayi==='tekil'?'tekil':'çoğul')+'; '+tirnak(p.metin)+' '+(p.sayi==='tekil'?'tekil':'çoğul')+' fiil.',cekicilik:'Aradaki isimler özneyi saklar.',tur:'ozne_fiil'};});
      genel.push({id:'ozne_fiil',ad:'Özne–fiil uyumu',c:c,sonuc:sonuc,beceri:'Özne–fiil uyumu'});
    }
    var z=c.zaman;
    if(z.gecmis&&!z.since){
      genel.push({id:'zaman_gecmis',ad:'Zaman: belirli geçmiş',c:c,beceri:'Zaman uyumu',sonuc:analiz.map(function(a){var p=a[c.k];if(p.tur!=='fiil'||p.zaman==='gecmis'||p.zaman==='gecmis_surekli'||p.zaman==='gecmis_perf'||p.zaman==='modal_perf'||p.zaman==='kosul_gecmis'||!p.zaman)return null;return {neden:'“'+z.gecmis+'” belirli bir geçmiş zaman; '+tirnak(p.metin)+' ('+(ZAMAN_ADI[p.zaman]||p.bicim)+') bununla kullanılmaz.',cekicilik:'Fiil ve çatı doğru, yalnızca zaman tutmuyor.',tur:'zaman'};})});
    }
    if(z.simdi&&!z.since&&!z.for){
      genel.push({id:'zaman_simdi',ad:'Zaman: şu an',c:c,beceri:'Zaman uyumu',sonuc:analiz.map(function(a){var p=a[c.k];if(p.tur!=='fiil'||!p.zaman||p.zaman==='simdiki'||p.bicim==='ving')return null;if(p.zaman==='gecmis'||p.zaman==='gecmis_surekli'||p.zaman==='gecmis_perf')return {neden:'“'+z.simdi+'” şu an süren işi gösterir; '+tirnak(p.metin)+' geçmiş zaman.',cekicilik:'Fiil doğru, yalnızca zaman tutmuyor.',tur:'zaman'};return null;})});
    }
    // geçmiş bağlam: cümlenin başka yerinde geçmiş çekimli fiil (until … was published)
    if(!z.gecmis&&!z.since&&!z.for&&!z.yakin&&!z.gelecek&&!z.simdi&&!c.digerZamanYan&&!(c.ozne.sinir==='if')){
      var gecmisFiil=null;
      tk.forEach(function(t,i){if(i===c.bi||t.b!==null||t.p||gecmisFiil)return;if(/^(was|were)$/.test(t.l))gecmisFiil=t.l+' '+(tk[i+1]&&!tk[i+1].p?tk[i+1].l:'');});
      if(gecmisFiil){
        var simdikiler=analiz.map(function(a){return a[c.k];}).filter(function(p){return p.tur==='fiil'&&(p.zaman==='gecmis'||p.zaman==='gecmis_surekli');});
        if(simdikiler.length)genel.push({id:'zaman_baglam',ad:'Zaman: cümlenin geri kalanı',c:c,beceri:'Zaman uyumu',zayif:true,sonuc:analiz.map(function(a){var p=a[c.k];if(p.tur!=='fiil'||!p.zaman)return null;if(p.zaman==='genis'||p.zaman==='simdiki')return {neden:'Cümlenin geri kalanı geçmişte (“'+gecmisFiil.trim()+'”); '+tirnak(p.metin)+' şimdiki/geniş zaman.',cekicilik:'Özne ile uyumlu olduğu için doğru gibi görünür.',tur:'zaman'};return null;})});
      }
    }
  });

  // ---- AŞAMA 1: en güçlü sinyal ----
  // Bir kural doğru cevabı eliyorsa çelişkidir: o kural kullanılmaz.
  var celiski=[];
  function temizle(list){return list.filter(function(m){if(m.sonuc[dogru]){celiski.push({kural:m.s?m.s.signalId:m.id,neden:m.sonuc[dogru].neden});return false;}return true;});}
  eslesmeler=temizle(eslesmeler);genel=temizle(genel);
  var aday=eslesmeler.slice().sort(function(a,b){var ea=a.elenen.length>0?1:0,eb=b.elenen.length>0?1:0;if(ea!==eb)return eb-ea;if(a.s.guc!==b.s.guc)return b.s.guc-a.s.guc;return b.elenen.length-a.elenen.length;});
  var guclu=aday[0]||null;
  var elenenler={};// i -> {asama, kural, neden, cekicilik, tur, eleyen, bosluk}
  var asama1=[];
  if(guclu){guclu.elenen.forEach(function(i){var r=guclu.sonuc[i];elenenler[i]={asama:1,neden:r.neden,cekicilik:r.cekicilik,tur:r.tur,eleyen:guclu.s.signalText,bosluk:guclu.c.k};asama1.push(i);});}
  // ---- AŞAMA 2: kalanlar için doğrulama ----
  var dogrulama=[];var asama2=[];
  var digerleri=aday.slice(1).concat(genel);
  digerleri.forEach(function(m){
    m.elenen=(m.elenen||m.sonuc.map(function(r,i){return r?i:-1;}).filter(function(i){return i>=0;}));
    m.elenen.forEach(function(i){
      if(elenenler[i]){(elenenler[i].ek=elenenler[i].ek||[]).push(m.sonuc[i].neden);return;}
      var r=m.sonuc[i];elenenler[i]={asama:2,neden:r.neden,cekicilik:r.cekicilik,tur:r.tur,eleyen:m.s?m.s.signalText:m.ad,bosluk:m.c.k};asama2.push(i);
    });
  });
  // doğru şık için yapılan olumlu kontroller
  var dp=analiz[dogru];
  ctxler.forEach(function(c){
    var p=dp[c.k];
    var bn=n>1?(c.k+1)+'. boşluk: ':'';
    if(c.boslukFiil&&p.tur==='fiil'&&c.kisaltilmis){
      dogrulama.push({kontrol:bn+'Yapı',metin:'“'+c.solK.slice(-2).join(' ')+' '+p.metin+'” kısaltılmış edilgen yapıdır (= than was '+c.solK.slice(-1)[0]+' '+p.metin+').',tamam:true});
    } else if(c.boslukFiil&&p.tur==='fiil'){
      if(c.ozne.bas&&!c.boslukRelative&&c.sonluYuva){
        var oz=c.ozne.neden==='yakin'?'Yakın özne “'+c.ozne.yakin+'”':'Özne “'+c.ozne.np+'”'+(c.ozne.np.split(' ').length>1?' → ana kelime “'+c.ozne.bas+'”':'');
        dogrulama.push({kontrol:bn+'Özne–fiil',metin:oz+' '+(c.ozne.sayi==='tekil'?'tekil':'çoğul')+'; '+tirnak(p.metin)+(p.sayi==='notr'||!p.sayi?' her özneyle kullanılabilir.':' '+(p.sayi==='tekil'?'tekil':'çoğul')+' fiil.'),tamam:true});
      }
      var z=c.zaman,zm=[];
      ['since','for','yakin','gecmis','gelecek','simdi','genis'].forEach(function(k){if(z[k]&&typeof z[k]==='string')zm.push(z[k]);});
      if(zm.length)dogrulama.push({kontrol:bn+'Zaman',metin:'Zaman belirteci “'+zm.join('”, “')+'” → '+tirnak(p.metin)+' ('+(ZAMAN_ADI[p.zaman]||BICIM_ADI[p.bicim]||'uygun biçim')+') uyumlu.',tamam:true});
      else if(p.zaman==='genis'&&p.sonlu&&/ (concluded|found|shown|suggest|suggests|indicate|show|shows) that /.test(tumMetin))dogrulama.push({kontrol:bn+'Zaman',metin:'Zaman belirteci yok; genel bir bilimsel sonuç anlatılıyor → geniş zaman ('+tirnak(p.metin)+') uygun.',tamam:true});
      else if(c.digerZamanYan&&c.digerZamanYan.gelecek&&p.zaman==='gelecek')dogrulama.push({kontrol:bn+'Zaman',metin:'Yan cümle gelecekten söz ediyor (“'+c.digerZamanYan.gelecek+'”) → ana cümlede '+tirnak(p.metin)+'.',tamam:true});
      if(p.cati&&p.bicim!=='be'&&p.bicim!=='perf_be')dogrulama.push({kontrol:bn+'Çatı',metin:p.cati==='edilgen'?'İş özneye yapılıyor'+(c.sagK[0]==='by'?' (by + işi yapan)':'')+' → edilgen: '+tirnak(p.metin)+'.':(nesneVar(c.sagK)?'Özne işi yapıyor ve nesne var (“'+c.sagK.slice(0,2).join(' ')+'”) → etken: '+tirnak(p.metin)+'.':'Özne işi kendisi yapıyor → etken: '+tirnak(p.metin)+'.'),tamam:true});
    } else if(c.boslukBaglac&&p.tur==='baglac'){
      dogrulama.push({kontrol:bn+'Yapı',metin:tirnak(p.metin)+' '+(p.yapi==='cumle'?'bağlaçtır, sağdaki tam cümleyi bağlar.':p.yapi==='isim'?'edattır, sağdaki isim öbeğini bağlar.':p.yapi==='gecis'?'geçiş zarfıdır; “; ---- ,” kalıbına oturur.':'cümleyle de isimle de kullanılabilir.'),tamam:true});
    }
  });

  // ---- anlam aşaması: yapı birden fazla şık bıraktıysa ----
  var kalan=opts.map(function(o,i){return i;}).filter(function(i){return !elenenler[i];});
  var anlamAsamasi=null;
  if(kalan.length>1){
    var bc=ctxler.find(function(c){return c.boslukBaglac;});
    if(bc){
      var dIl=analiz[dogru][bc.k].iliski;
      var pol=kutup(tk,bc.bi);
      var polUyar=dIl==='zitlik'&&pol.zit;
      anlamAsamasi={iliski:dIl,kutup:pol,dogrulandi:polUyar};
      kalan.forEach(function(i){
        if(i===dogru)return;
        var p=analiz[i][bc.k];
        var neden=p.iliski?tirnak(p.metin)+' '+(ILISKI_ADI[p.iliski]||p.iliski)+' bildirir; burada iki taraf arasında '+(ILISKI_ADI[dIl]||dIl)+' ilişkisi var'+(polUyar?' (sol taraf '+pol.solIsaret+', sağ taraf '+pol.sagIsaret+')':'')+'.':tirnak(p.metin)+' cümlenin anlam ilişkisini kurmaz.';
        elenenler[i]={asama:'anlam',neden:neden,cekicilik:'Yapısı uygun olduğu için yalnızca anlamla elenir.',tur:'baglac_anlam',eleyen:'anlam kontrolü',bosluk:bc.k,kesin:!!p.iliski};
      });
      dogrulama.push({kontrol:'Anlam',metin:'İki taraf arasında '+(ILISKI_ADI[dIl]||dIl)+' ilişkisi var'+(polUyar?': sol taraf '+pol.solIsaret+', sağ taraf '+pol.sagIsaret+'.':'.')+' '+tirnak(analiz[dogru][bc.k].metin)+' bu ilişkiyi kurar.',tamam:true});
    } else {
      kalan.forEach(function(i){if(i===dogru)return;elenenler[i]={asama:'anlam',neden:'Kural motoru bu şık için kesin bir yapısal sinyal bulamadı; anlamı doğru şıkla karşılaştır.',cekicilik:'Dilbilgisi açısından mümkün görünür.',tur:'belirsiz',eleyen:null,bosluk:0,kesin:false};});
    }
  }

  // ---- güven ----
  var guven='yuksek',guvenNeden='Sinyal, yapı ve doğru seçenek tamamen uyumlu.';
  var belirsizSay=Object.keys(elenenler).filter(function(i){return elenenler[i].kesin===false;}).length;
  if(!guclu){guven='dusuk';guvenNeden='Güçlü bir yapısal sinyal bulunamadı.';}
  else if(!guclu.elenen.length&&!(anlamAsamasi&&anlamAsamasi.dogrulandi&&!belirsizSay)){guven='dusuk';guvenNeden='Yapısal sinyal şık elemedi.';}
  else if(!guclu.elenen.length){guven='orta';guvenNeden='Yapı bütün şıklara uyuyor; karar anlam ilişkisiyle verildi.';}
  else if(belirsizSay){guven='dusuk';guvenNeden='Bazı şıklar için kesin bir kural bulunamadı.';}
  else if(anlamAsamasi&&!anlamAsamasi.dogrulandi){guven='orta';guvenNeden='Yapı şıkları azalttı; son karar anlam ilişkisiyle verildi.';}
  if(celiski.length&&guven==='yuksek'){guven='orta';guvenNeden='Bir kural doğru cevapla çelişti ve devre dışı bırakıldı.';}
  if(celiski.length&&(!guclu||Object.keys(elenenler).length<opts.length-1)){guven='dusuk';guvenNeden='Kural sonucu doğru cevapla çelişiyor; açıklama incelemeye alındı.';}
  if(Object.keys(elenenler).length<opts.length-1&&guven!=='dusuk'){guven='dusuk';guvenNeden='Tüm yanlış şıklar açıklanamadı.';}

  // ---- sinyal vurgusu ve beceriler ----
  var sinyalKaydi=guclu?guclu.s:null;
  // çift boşlukta etiketin doğru cevabın ailesinden seçilmesi (although/because aynı yapı kuralı)
  if(guclu&&/^(because_cumle|although_cumle)$/.test(guclu.s.signalId)){var dIl2=analiz[dogru][guclu.c.k].iliski;sinyalKaydi=dIl2==='zitlik'?KUTUPHANE[2]:KUTUPHANE[1];}
  if(guclu&&/^(because_of_isim|despite_isim)$/.test(guclu.s.signalId)){var dIl3=analiz[dogru][guclu.c.k].iliski;sinyalKaydi=dIl3==='zitlik'?KUTUPHANE[4]:KUTUPHANE[3];}
  var beceriler=[];
  function bEkle(b){if(b&&beceriler.indexOf(b)<0)beceriler.push(b);}
  if(sinyalKaydi)bEkle(sinyalKaydi.measuredSkill);
  digerleri.forEach(function(m){if(m.elenen&&m.elenen.length)bEkle(m.s?m.s.measuredSkill:m.beceri);});
  dogrulama.forEach(function(d){if(/Özne/.test(d.kontrol))bEkle('Özne–fiil uyumu');if(/Zaman/.test(d.kontrol))bEkle('Zaman uyumu');if(/Çatı/.test(d.kontrol)&&dp.some(function(p){return p.cati==='edilgen';}))bEkle('Etken–edilgen (çatı)');if(/Anlam/.test(d.kontrol))bEkle('Anlam bütünlüğü');});

  var vurguBosluk=guclu?guclu.c.k:0;
  var vurguKelime=guclu?guclu.e.vurgu.filter(Boolean):[];
  var dogruParca=dp.map(function(p){return p.metin;});
  return {
    tip:tip,tipAdi:TIP_ADI[tip],
    sinyal:sinyalKaydi?{id:sinyalKaydi.signalId,metin:sinyalKaydi.signalText,aciklama:sinyalKaydi.shortExplanation,bosluk:vurguBosluk,vurgu:vurguKelime,beklenen:sinyalKaydi.expectedStructure,kayit:sinyalKaydi}:null,
    tokenlar:tk.map(function(t){return {w:t.w,l:t.l,p:t.p,b:t.b};}),
    sagMetin:guclu?guclu.c.sagK.slice(0,5).join(' '):'',solMetin:guclu?guclu.c.solK.slice(-4).join(' '):'',
    boslukSayisi:n,asama1:asama1,asama2:asama2,
    elenenler:elenenler,dogrulama:dogrulama,anlam:anlamAsamasi,celiski:celiski,
    beceriler:beceriler,guven:guven,guvenNeden:guvenNeden,
    dogruParca:dogruParca,
    refleks:refleksUret(sinyalKaydi,dogrulama,n)
  };
}
// iki yan cümlenin olumlu/olumsuz yönü (zıtlık doğrulaması için)
function kutup(tk,bi){
  var vI=-1;
  for(var i=bi+1;i<tk.length;i++){if(tk[i].w===','||tk[i].w===';'){vI=i;break;}}
  var sol,sag;
  if(bi===0||tk.slice(0,bi).every(function(t){return t.p;})){sol=tk.slice(bi+1,vI>0?vI:tk.length);sag=vI>0?tk.slice(vI+1):[];}
  else {var j=bi-1;sol=tk.slice(0,bi);sag=tk.slice(bi+1);}
  function yon(dz){var ks=dz.filter(function(t){return !t.p;}).map(function(t){return t.l;});var neg=ks.find(function(w){return var_(OLUMSUZ,w)||/n't$/.test(w);});var pos=ks.find(function(w){return var_(OLUMLU,w);});return {d:neg?-1:pos?1:0,k:neg||pos||null};}
  var a=yon(sol),b=yon(sag);
  return {zit:a.d*b.d===-1,solIsaret:a.k?(a.d>0?'olumlu ('+a.k+')':'olumsuz ('+a.k+')'):'',sagIsaret:b.k?(b.d>0?'olumlu ('+b.k+')':'olumsuz ('+b.k+')'):''};
}
function refleksUret(s,dogrulama,n){
  if(!s)return 'Önce boşluğun sağına bak → yapıyı belirle → uymayan şıkları ele → kalanı cümlenin soluyla kontrol et.';
  var ikinci=dogrulama.some(function(d){return /Özne/.test(d.kontrol);})?'özneyi kontrol et':dogrulama.some(function(d){return /Zaman/.test(d.kontrol);})?'zamanı kontrol et':dogrulama.some(function(d){return /Anlam/.test(d.kontrol);})?'anlam ilişkisini kontrol et':'kalan şıkkı cümleye yerleştirip oku';
  var yon=/^(edat_ving|modal_v1|have_v3|be_|fiil_edat|kelime_turu)/.test(s.signalId)?'Boşluğun soluna bak':'Önce sağa bak';
  return yon+' → '+s.signalText+' sinyalini yakala → şıkları ele → '+ikinci+'.';
}

// ---------------- ÇÖZÜM: anlam soruları ----------------
function anlamCoz(soru,tip){
  var sinyal=String(soru.sinyal||'').trim().toLowerCase();
  var kayit=var_(ANLAM_HARITASI,sinyal)?ANLAM_HARITASI[sinyal]:null;
  // "Hardly had … when", "No sooner had … than" devrik yapıları olumsuzluk değil zaman sırası bildirir
  if(/\b(hardly|scarcely|barely) had\b|\bno sooner had\b/i.test(duzMetin(soru.en||soru.sent)))kayit=ANLAM_SINYALLERI.filter(function(x){return x.signalId==='anlam_zaman';})[0];
  var opts=soru.opts||[];var dogru=soru.ans;
  var d=String(opts[dogru]||'').toLocaleLowerCase('tr-TR');
  var tr=String(soru.tr||soru.ceviri_tr||'').toLocaleLowerCase('tr-TR');
  var trK=trKokler(tr);
  var dK=trKokler(d);
  var ortakDogru=dK.filter(function(k){return trK.indexOf(k)>=0;}).length/Math.max(1,dK.length);
  var elenenler={},dogrulama=[];
  // "-ır …-maz" (yayımlanır yayımlanmaz, geçer geçmez) olumsuzluk değildir
  function olumsuzMu(x){return TR.olumsuz.test(String(x).replace(/[a-zçğıöşü]+(r) [a-zçğıöşü]+(maz|mez)\b/g,' '));}
  var dogruOlumsuz=olumsuzMu(d),dogruSebep=TR.sebep.test(d),dogruZit=TR.zitlik.test(d);
  opts.forEach(function(o,i){
    if(i===dogru)return;
    var s=String(o).toLocaleLowerCase('tr-TR');
    var r=null;
    if(kayit&&kayit.iliski==='zitlik'&&TR.sebep.test(s)&&!dogruSebep)r={neden:'Bu şık sebep–sonuç kuruyor (“'+(s.match(TR.sebep)||[''])[0].trim()+'”). “'+soru.sinyal+'” zıtlık sinyalidir; iki taraf birbirine ters düşer.',cekicilik:'İki olayı birbirine bağladığı için mantıklı görünür.',tur:'sebep_zitlik'};
    else if(kayit&&kayit.iliski==='sonuc'&&TR.zitlik.test(s)&&!dogruZit)r={neden:'Bu şık zıtlık kuruyor; “'+soru.sinyal+'” ise sebep–sonuç bildirir.',cekicilik:'Cümledeki iki olaydan da söz ettiği için cazip.',tur:'baglac_anlam'};
    else if(kayit&&kayit.iliski==='olumsuzluk'&&dogruOlumsuz&&!olumsuzMu(s))r={neden:'“'+soru.sinyal+'” cümleye olumsuz anlam katıyor; bu şık olumlu söylüyor.',cekicilik:'Cümledeki kelimeleri olumlu hâliyle kullandığı için doğru gibi görünür.',tur:'olumsuzluk'};
    else if(kayit&&kayit.iliski==='zaman'&&(TR.once.test(d)&&TR.sonra.test(s)&&!TR.sonra.test(d)||TR.sonra.test(d)&&TR.once.test(s)&&!TR.once.test(d)))r={neden:'Olayların sırasını ters veriyor (“'+(s.match(TR.once)||s.match(TR.sonra))[0]+'”).',cekicilik:'Aynı olayları anlatır; yalnızca sırayı ters çevirir.',tur:'zaman_sirasi'};
    else if(kayit&&(kayit.iliski==='zitlik'||kayit.iliski==='paralellik'||kayit.iliski==='kosul')&&dogruZit&&!TR.zitlik.test(s)&&!dogruOlumsuz&&!olumsuzMu(s)&&kokOrtak(s,d)>=0.5)r={neden:'Bu şık “'+soru.sinyal+'” sinyalinin kurduğu zıtlığı vermiyor; doğru şıktaki karşıtlık (“'+(d.match(TR.zitlik)||[''])[0].trim()+'”) burada yok.',cekicilik:'Cümledeki kelimeleri tekrar ettiği için tanıdık gelir.',tur:'baglac_anlam'};
    if(!r){var am=s.match(TR.asiri);if(am&&d.indexOf(am[1])<0&&tr.indexOf(am[1])<0)r={neden:'Aşırı genelleme: “'+am[1]+'” cümlede yok.',cekicilik:'Kesin bir dil kullandığı için güvenilir görünür.',tur:'asiri_genelleme'};}
    if(!r&&ortakDogru>=0.4){
      var sK=trKokler(s);var yok=sK.filter(function(k){return trK.indexOf(k)<0&&dK.indexOf(k)<0;});
      var oran=sK.length?(sK.length-yok.length)/sK.length:1;
      if(sK.length&&oran<=0.34){
        // cümlede karşılığı olmayan en uzun ardışık kelime dizisi (en fazla 3 kelime)
        var kel=String(o).replace(/[.,;]/g,'').split(/\s+/),en='',su=[];
        kel.forEach(function(w){var k=w.toLocaleLowerCase('tr-TR').replace(/[^a-zçğıöşü]/g,'');var eksik=k.length>=4&&yok.indexOf(k.slice(0,5))>=0;if(eksik||su.length&&k.length<4&&su.length<3){su.push(w);if(su.length>3)su.shift();var t=su.join(' ');if(eksik&&t.length>en.length)en=t;}else su=[];});
        r={neden:'Bu şık cümlede geçmeyen bir bilgi ekliyor'+(en?': “'+en+'”.':'.'),cekicilik:'Konuyla ilgili, mantıklı bir cümle; ama metinde geçmiyor.',tur:'olmayan_bilgi'};}
    }
    if(!r)r={neden:'Kural motoru bu şık için kesin bir sinyal bulamadı; cümlenin Türkçesiyle karşılaştır.',cekicilik:'Cümleyle aynı konudan söz ediyor.',tur:'belirsiz',kesin:false};
    r.asama=r.tur==='belirsiz'?'anlam':1;r.eleyen=r.tur==='belirsiz'?null:(kayit?kayit.signalText:'anlam kontrolü');
    elenenler[i]=r;
  });
  if(kayit){
    var kanit=kayit.iliski==='zitlik'&&dogruZit?(d.match(TR.zitlik)||[''])[0].trim():kayit.iliski==='olumsuzluk'&&dogruOlumsuz?(d.match(TR.olumsuz)||[''])[0]:'';
    dogrulama.push({kontrol:'İlişki',metin:'“'+soru.sinyal+'” '+(ILISKI_ADI[kayit.iliski]||kayit.iliski)+' kuruyor. Doğru şık bu ilişkiyi koruyor'+(kanit?' (“'+kanit+'”)':'')+'.',tamam:true});
  }
  if(tr)dogrulama.push({kontrol:'Anlam',metin:'Cümlenin Türkçesi doğru şıkla örtüşüyor.',tamam:true});
  var belirsiz=Object.keys(elenenler).filter(function(i){return elenenler[i].kesin===false;}).length;
  var toplam=opts.length-1;
  var guven,guvenNeden;
  if(!kayit){guven='dusuk';guvenNeden='Bu sinyal kütüphanede yok.';}
  else if(belirsiz===0){guven='yuksek';guvenNeden='Sinyal ilişkisi ve tüm tuzak şıklar açıklandı.';}
  else if(belirsiz<=Math.floor(toplam/2)){guven='orta';guvenNeden='Tuzak şıkların bir kısmı kesin kurala bağlanamadı.';}
  else {guven='dusuk';guvenNeden='Tuzak şıkların çoğu için kesin bir kural bulunamadı.';}
  var vurgu=sinyal?[sinyal]:[];
  return {
    tip:tip,tipAdi:TIP_ADI[tip],
    sinyal:kayit?{id:kayit.signalId,metin:soru.sinyal+' → '+kayit.signalText,aciklama:kayit.shortExplanation,vurgu:vurgu,bosluk:null,kayit:kayit}:(sinyal?{id:'anlam_bilinmeyen',metin:soru.sinyal,aciklama:'',vurgu:vurgu,bosluk:null,kayit:null}:null),
    tokenlar:tokenlar(duzMetin(soru.en||soru.sent)).map(function(t){return {w:t.w,l:t.l,p:t.p,b:t.b};}),
    boslukSayisi:0,asama1:Object.keys(elenenler).map(Number).filter(function(i){return elenenler[i].asama===1;}),asama2:[],
    elenenler:elenenler,dogrulama:dogrulama,anlam:null,celiski:[],
    beceriler:kayit?[kayit.measuredSkill,'Anlam bütünlüğü']:['Anlam bütünlüğü'],
    guven:guven,guvenNeden:guvenNeden,dogruParca:[opts[dogru]],
    refleks:kayit?kayit.hunterReflex:'Sinyal kelimeyi bul → kurduğu ilişkiyi adlandır → ilişkiyi bozan şıkları ele → kalanı cümleyle karşılaştır.'
  };
}
function kokOrtak(a,b){var ka=trKokler(a),kb=trKokler(b);if(!ka.length)return 0;return ka.filter(function(k){return kb.indexOf(k)>=0;}).length/ka.length;}

// ---------------- ana giriş ----------------
// soru: {id, sent|en, q, opts, ans, tr, sinyal, fb}
var _onbellek={};
function coz(soru){
  if(!soru||!Array.isArray(soru.opts)||typeof soru.ans!=='number')return null;
  var anahtar=soru.id?soru.id+'|'+soru.opts.length+'|'+soru.ans+'|'+duzMetin(soru.en||soru.sent).length:null;
  if(anahtar&&_onbellek[anahtar])return _onbellek[anahtar];
  var tip=soruTipi(soru),sonuc=null;
  try{
    if(tip==='tek_bosluk'||tip==='cift_bosluk')sonuc=boslukCoz(soru,tip);
    if(!sonuc)sonuc=anlamCoz(soru,tip==='tek_bosluk'||tip==='cift_bosluk'?'anlam':tip);
  }catch(e){sonuc=null;}
  if(!sonuc)return null;
  sonuc.soruId=soru.id||null;sonuc.dogru=soru.ans;sonuc.dogruHarf=harf(soru.ans);
  sonuc.dogruMetin=soru.opts[soru.ans];
  sonuc.turkce=soru.tr||'';
  sonuc.adimlar=adimlarUret(sonuc,soru);
  sonuc.tuzaklar=Object.keys(sonuc.elenenler).map(Number).sort().map(function(i){var e=sonuc.elenenler[i];return {i:i,harf:harf(i),sik:soru.opts[i],kural:e.neden,cekicilik:e.cekicilik,eleyen:e.eleyen,asama:e.asama,tur:e.tur,kesin:e.kesin!==false,ek:e.ek||[]};});
  sonuc.incelemeGerekli=sonuc.guven==='dusuk';
  if(anahtar)_onbellek[anahtar]=sonuc;
  return sonuc;
}

// 10 adımlık anlatım
function adimlarUret(c,soru){
  var A=[];
  var bos=c.boslukSayisi>0;
  var e1=c.asama1.map(harf),e2=c.asama2.map(harf);
  var anlamE=Object.keys(c.elenenler).map(Number).filter(function(i){return c.elenenler[i].asama==='anlam';}).map(harf);
  if(bos){
    var yonSol=c.sinyal&&/^(edat_ving|modal_v1|have_v3|be_|fiil_edat|kelime_turu|zaman_yan|if_kosul|the_number|a_number|either)/.test(c.sinyal.id);
    A.push({no:1,baslik:yonSol?'Boşluğun çevresine bak.':'Boşluğun sağına bak.',metin:c.sagMetin?(c.boslukSayisi>1&&c.sinyal?(c.sinyal.bosluk+1)+'. boşluktan sonra: “'+(c.sagMetin||'cümle bitiyor')+'”. Solunda: “'+c.solMetin+'”.':'Sağda: “'+c.sagMetin+'”. Solda: “'+c.solMetin+'”.'):(c.solMetin?(c.boslukSayisi>1&&c.sinyal?(c.sinyal.bosluk+1)+'. boşluktan':'Boşluktan')+' sonra cümle bitiyor. Solunda: “'+c.solMetin+'”.':'Boşluğun çevresindeki kelimelere bak.'),odak:'bosluk'});
  } else {
    A.push({no:1,baslik:'Sinyal kelimeyi bul.',metin:'Cümlede yönü belirleyen kelimeyi ara. Bütün cümleyi çevirmen gerekmez.',odak:'cumle'});
  }
  A.push({no:2,baslik:'Hangi sinyali görüyorsun?',metin:c.sinyal?'Önce kendin bul, sonra devam et.':'Bu soruda güçlü bir yapısal sinyal bulunamadı.',soru:true});
  A.push({no:3,baslik:'Sinyal: '+(c.sinyal?c.sinyal.metin:'—'),metin:c.sinyal?c.sinyal.aciklama:'Şıkları tek tek cümleye yerleştirip anlamı kontrol et.',odak:'sinyal'});
  A.push({no:4,baslik:'Bu sinyalle hangi seçenekler elenir?',metin:e1.length?e1.join(', ')+' elenir.':'Bu sinyal tek başına şık elemiyor; ikinci kontrole geç.',soru:true});
  A.push({no:5,baslik:'Elenen şıkların üzerini çiz.',metin:e1.length?c.asama1.map(function(i){return harf(i)+') '+c.elenenler[i].neden;}).join(' '):'Elenen şık yok.',ele:c.asama1.slice()});
  A.push({no:6,baslik:c.boslukSayisi>1?'Şimdi diğer boşluğu kontrol et.':bos?'Şimdi cümlenin diğer tarafını kontrol et.':'Kalan şıkları cümleyle karşılaştır.',metin:(e2.length?e2.join(', ')+' ikinci kontrolde elenir. ':'')+(anlamE.length?anlamE.join(', ')+' anlam kontrolünde elenir.':'')||'Kalan şık tek; şimdi doğrula.',ele:c.asama2.concat(Object.keys(c.elenenler).map(Number).filter(function(i){return c.elenenler[i].asama==='anlam';}))});
  A.push({no:7,baslik:bos?'Özne, fiil, zaman ve çatı kontrolü':'İlişki ve anlam kontrolü',metin:c.dogrulama.length?c.dogrulama.map(function(d){return d.kontrol+': '+d.metin;}).join(' '):'Ek kontrol gerekmiyor.',liste:c.dogrulama});
  A.push({no:8,baslik:'Doğru cevap: '+c.dogruHarf+') '+c.dogruMetin,metin:c.guven==='yuksek'?'Sinyal ve doğrulama aynı şıkkı gösteriyor.':c.guven==='orta'?'Yapı şıkları azalttı, son kararı anlam verdi.':'Cevap anahtarına göre doğru şık budur; kural motoru bu soruyu tam açıklayamadı.'});
  A.push({no:9,baslik:'Türkçe anlam',metin:c.turkce||soru.fb||''});
  A.push({no:10,baslik:'AVCI REFLEKSİ',metin:c.refleks});
  return A;
}

// Seçilen yanlış şıktan muhtemel hata (geri bildirim)
var HATA_METNI={
  yapi:'Sinyalden sonra gelen yapıyı kontrol etmedin.',ozne_fiil:'Fiili seçmeden önce asıl özneyi bulmadın.',zaman:'Zaman belirtecini (since, last year, next year) gözden kaçırdın.',
  cati:'İşi kimin yaptığına bakmadın (by + işi yapan = edilgen).',baglac_yapi:'Bağlaç ile edatı karıştırdın: sağda cümle mi isim mi, bakmadın.',baglac_anlam:'İki tarafın anlam ilişkisini kontrol etmedin.',
  sebep_zitlik:'Zıtlık sinyalini sebep–sonuç gibi okudun.',asiri_genelleme:'Cümlede olmayan kesin bir ifadeye güvendin.',olmayan_bilgi:'Cümlede geçmeyen bir bilgiyi seçtin.',
  olumsuzluk:'Olumsuz anlamlı sinyali kaçırdın.',zaman_sirasi:'Olayların sırasını ters okudun.',kelime:'Kelimenin türünü ya da eşdizimini kontrol etmedin.',belirsiz:'Bu şıkta neyin yanlış gittiğini kesin söyleyemiyoruz; doğru şıkla karşılaştır.'
};
var TUZAK_ADI={yapi:'Yapı tuzağı',ozne_fiil:'Özne–fiil tuzağı',zaman:'Zaman tuzağı',cati:'Çatı (etken–edilgen) tuzağı',baglac_yapi:'Bağlaç–edat tuzağı',baglac_anlam:'Anlam ilişkisi tuzağı',sebep_zitlik:'Sebep–zıtlık karışıklığı',asiri_genelleme:'Aşırı genelleme',olmayan_bilgi:'Cümlede olmayan bilgi',olumsuzluk:'Gizli olumsuzluk',zaman_sirasi:'Zaman sırası tuzağı',kelime:'Kelime tuzağı',belirsiz:'Belirsiz'};
// hata kategorisi (ilerleme takibi): ozne_fiil | zaman_cati | baglac | diger
function hataKategorisi(tur){if(tur==='ozne_fiil')return 'ozne_fiil';if(tur==='zaman'||tur==='cati'||tur==='zaman_sirasi')return 'zaman_cati';if(tur==='baglac_yapi'||tur==='baglac_anlam'||tur==='sebep_zitlik')return 'baglac';return 'diger';}
function geriBildirim(c,secilen){
  if(!c)return null;
  var dogruMu=secilen===c.dogru;
  var t=c.elenenler[secilen];
  return {dogruMu:dogruMu,secilenHarf:harf(secilen),dogruHarf:c.dogruHarf,sinyal:c.sinyal?c.sinyal.metin:null,
    hata:dogruMu?null:(t?{tur:t.tur,ad:TUZAK_ADI[t.tur]||'',metin:HATA_METNI[t.tur]||HATA_METNI.belirsiz,kural:t.neden,kesin:t.kesin!==false}:{tur:'belirsiz',ad:'',metin:HATA_METNI.belirsiz,kural:'',kesin:false}),
    refleks:c.refleks};
}

// ---------------- Bugünkü AVCI Raporu (saf hesap) ----------------
// veri: {kayitlar:[{qid,sinyalId,sinyalMetin,dogru,tarih:'YYYY-MM-DD',tuzak,hataKat,refleks}], ...}
function raporHesapla(veri,bugun,havuz){
  var k=(veri&&veri.kayitlar)||[];
  var bugunK=k.filter(function(x){return x.tarih===bugun;});
  var s={};
  k.forEach(function(x){if(!x.sinyalId)return;var o=s[x.sinyalId]=s[x.sinyalId]||{id:x.sinyalId,metin:x.sinyalMetin,d:0,y:0,refleks:x.refleks};if(x.dogru)o.d++;else o.y++;});
  var liste=Object.keys(s).map(function(i){var o=s[i];o.n=o.d+o.y;o.oran=o.n?o.d/o.n:0;return o;});
  var guclu=liste.filter(function(o){return o.n>=2&&o.oran>=0.6;}).sort(function(a,b){return b.oran-a.oran||b.n-a.n;})[0]||null;
  var kacan={};bugunK.forEach(function(x){if(!x.dogru&&x.sinyalId)kacan[x.sinyalId]=(kacan[x.sinyalId]||0)+1;});
  var kacanId=Object.keys(kacan).sort(function(a,b){return kacan[b]-kacan[a];})[0];
  var tz={};k.forEach(function(x){if(!x.dogru&&x.tuzak&&x.tuzak!=='belirsiz')tz[x.tuzak]=(tz[x.tuzak]||0)+1;});
  var tzId=Object.keys(tz).sort(function(a,b){return tz[b]-tz[a];})[0];
  var zayif=liste.filter(function(o){return o.y>0;}).sort(function(a,b){return a.oran-b.oran||b.y-a.y;});
  var kurallar=[];zayif.forEach(function(o){if(kurallar.length<3&&o.refleks&&kurallar.indexOf(o.refleks)<0)kurallar.push(o.refleks);});
  var oneri=[];
  var dogruBugun={};bugunK.forEach(function(x){if(x.dogru)dogruBugun[x.qid]=1;});
  var hv=havuz||[];
  zayif.forEach(function(o){hv.forEach(function(q){if(oneri.length<5&&q.sinyalId===o.id&&!dogruBugun[q.id]&&oneri.indexOf(q.id)<0)oneri.push(q.id);});});
  var cozulen={};k.forEach(function(x){cozulen[x.qid]=1;});
  hv.forEach(function(q){if(oneri.length<5&&q.tip!=='anlam'&&!cozulen[q.id]&&oneri.indexOf(q.id)<0)oneri.push(q.id);});
  hv.forEach(function(q){if(oneri.length<5&&!dogruBugun[q.id]&&oneri.indexOf(q.id)<0)oneri.push(q.id);});
  return {
    bugunSoru:bugunK.length,bugunDogru:bugunK.filter(function(x){return x.dogru;}).length,
    enGuclu:guclu?{id:guclu.id,metin:guclu.metin,oran:Math.round(guclu.oran*100),n:guclu.n}:null,
    kacirilan:kacanId?{id:kacanId,metin:(s[kacanId]||{}).metin,sayi:kacan[kacanId]}:null,
    tuzak:tzId?{id:tzId,ad:TUZAK_ADI[tzId]||tzId,sayi:tz[tzId]}:null,
    yarinKurallar:kurallar,
    antrenman:oneri
  };
}

var AvciMotor={
  coz:coz,geriBildirim:geriBildirim,raporHesapla:raporHesapla,hataKategorisi:hataKategorisi,
  soruTipi:soruTipi,parcaAnaliz:parcaAnaliz,ozneBul:function(c){var tk=tokenlar(c);var b=bosluklarim(tk);return ozneBul(tk,b[0]);},
  KUTUPHANE:KUTUPHANE,ANLAM_SINYALLERI:ANLAM_SINYALLERI,TUZAK_ADI:TUZAK_ADI,TIP_ADI:TIP_ADI,harf:harf,duzMetin:duzMetin,
  _onbellekTemizle:function(){_onbellek={};}
};
root.AvciMotor=AvciMotor;
})(typeof window!=='undefined'?window:globalThis);
