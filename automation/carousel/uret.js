const { chromium } = require('playwright');
const F = 'file:///usr/share/fonts/opentype/inter/';
const css = `
@font-face{font-family:I;src:url(${F}Inter-Regular.otf);font-weight:400}
@font-face{font-family:I;src:url(${F}Inter-SemiBold.otf);font-weight:600}
@font-face{font-family:I;src:url(${F}InterDisplay-ExtraBold.otf);font-weight:800}
@font-face{font-family:E;src:url(file:///usr/share/fonts/truetype/noto/NotoColorEmoji.ttf)}
*{margin:0;box-sizing:border-box}
html,body{width:1080px;height:1350px}
body{background:#0B1B3A;color:#fff;font-family:I,E;position:relative;overflow:hidden}
.w{position:absolute;inset:96px 96px 190px 96px;display:flex;flex-direction:column;justify-content:center}
.bar{width:120px;height:14px;background:#FFD84D;border-radius:7px;margin-bottom:48px}
h1{font-weight:800;font-size:104px;line-height:1.08;letter-spacing:-1px}
h1.m{font-size:88px}
h1 .y{color:#FFD84D}
.alt{font-weight:600;font-size:46px;line-height:1.3;margin-top:56px;color:#FFD84D}
.p{font-weight:400;font-size:48px;line-height:1.4;margin-top:52px}
ul{list-style:none;margin-top:56px}
li{font-weight:600;font-size:50px;line-height:1.25;padding:26px 0 26px 64px;position:relative;border-bottom:2px solid rgba(255,255,255,.12)}
li:before{content:"";position:absolute;left:0;top:44px;width:26px;height:26px;background:#FFD84D;border-radius:50%}
.not{font-weight:400;font-size:40px;line-height:1.4;margin-top:52px;color:rgba(255,255,255,.85)}
.q{font-weight:600;font-size:46px;line-height:1.35;margin-top:44px;padding:36px 40px;border-left:10px solid #FFD84D;background:rgba(255,255,255,.06);border-radius:0 20px 20px 0}
.ops{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:36px}
.op{font-weight:600;font-size:42px;padding:20px 28px;border:2px solid rgba(255,255,255,.25);border-radius:16px}
.op.ok{background:#FFD84D;color:#0B1B3A;border-color:#FFD84D}
.f{position:absolute;right:96px;bottom:88px;font-weight:600;font-size:30px;display:flex;gap:22px;align-items:center}
.f b{color:#FFD84D;font-weight:600}
`;
const N=6, foot=n=>`<div class="f"><span>Sinyal Avcısı</span><b>${n}/${N}</b></div>`;
const S = {
1:`<div class="bar"></div><h1>YDS'de cevap <span class="y">sorunun içinde</span> <span style="white-space:nowrap">saklı 🎯</span></h1><div class="alt">Kasım YDS'ye hazırlanıyorsan kaydet.</div>`,
2:`<div class="bar"></div><h1 class="m">Metinler nereden geliyor?</h1><ul><li>Ansiklopedi maddeleri</li><li>Bilim dergileri ve haber siteleri</li><li>Akademik makaleler</li></ul><div class="not">Bu üç türde okumak, sınav metnine alışmanı sağlar.</div>`,
3:`<div class="bar"></div><h1 class="m">Boşluk doldurmada ilk kural</h1><div class="p">Cevap çoğu zaman cümlenin içindeki ipucuyla gelir (zıtlık, sebep, örnek). Önce boşluğa değil, <span style="color:#FFD84D;font-weight:600">bağlaca ve ipucu kelimeye</span> bak.</div>`,
4:`<div class="bar"></div><h1 class="m">Örnek</h1><div class="q">"The medicine was effective; ----, it caused side effects."</div><div class="ops"><div class="op">A) therefore</div><div class="op ok">B) however</div><div class="op">C) because</div><div class="op">D) moreover</div><div class="op">E) similarly</div></div><div class="not">";" sonrasında ters yönde bilgi geliyor → however.</div>`,
5:`<div class="bar"></div><h1 class="m">En sık hata</h1><div class="p">Bilmediğin kelime yüzünden soruyu bırakma. <span style="color:#FFD84D;font-weight:600">Bağlaç ve cümle mantığıyla</span> çoğu soru çözülür.</div>`,
6:`<div class="bar"></div><h1 class="m">Kasım'a hazırlanan bir arkadaşına <span style="white-space:nowrap">gönder 📩</span></h1><ul><li>Gönder</li><li>Kaydet (devam serisi için)</li><li>Yorumla: hangi konuyu istersin?</li></ul><div class="not">Sinyal Avcısı: ücretsiz YDS/YÖKDİL platformu. Link bio'da.</div>`,
};
(async()=>{
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1080,height:1350}});
  for (const n of process.argv.slice(2).map(Number)){
    const fp=__dirname+`/s${n}.html`;
    require('fs').writeFileSync(fp,`<!doctype html><meta charset=utf-8><style>${css}</style><body><div class="w">${S[n]}</div>${foot(n)}</body>`);
    await p.goto('file://'+fp);
    await p.evaluate(()=>document.fonts.ready);
    const o=await p.evaluate(()=>{const w=document.querySelector('.w');return w.scrollHeight>w.clientHeight});
    if(o) console.log('TASMA',n);
    await p.screenshot({path:`/mnt/project-files/carousel/slide-${n}.png`});
  }
  await b.close();
})();
