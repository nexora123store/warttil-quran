// مزامنة اختيارية مع Supabase (local-first). بدون إعدادات في config.js لا تفعل شيئًا.
(()=>{const C=window.SB_CONFIG;window.SB={};if(!C||!C.url||!C.key||!window.supabase)return;
const sb=supabase.createClient(C.url,C.key),L=k=>JSON.parse(localStorage.getItem(k)||'null'),si=Storage.prototype.setItem;let uid=null,t,st='جارٍ الاتصال…';
const ready=(async()=>{let{data:{session}}=await sb.auth.getSession();if(!session){const r=await sb.auth.signInAnonymously();if(r.error){st='فشل الدخول المجهول: '+r.error.message;return null}session=r.data.session}st='متصل ✓';return uid=session.user.id})().catch(e=>{st='خطأ اتصال: '+e.message;return null});
const btn=document.getElementById('sbBtn');if(btn)btn.style.display='';
async function push(){try{await push0()}catch(e){st='فشل الإرسال: '+(e.message||e)}}
async function push0(){if(!await ready)return;
 const er=(L('errors')||[]).map(e=>({user_id:uid,surah:e.sr,ayah:e.ay,word_index:e.k,word:e.w||'',said:e.said||'',ayah_text:e.tx||'',mistake_count:e.n||1,last_at:new Date(e.at||Date.now()).toISOString()}));
 if(er.length){const r=await sb.from('errors').upsert(er,{onConflict:'user_id,surah,ayah,word_index'});if(r.error)throw r.error}
 const{data}=await sb.from('errors').select('id,surah,ayah,word_index'),have=new Set(er.map(e=>e.surah+':'+e.ayah+':'+e.word_index)),
  del=(data||[]).filter(r=>!have.has(r.surah+':'+r.ayah+':'+r.word_index)).map(r=>r.id);
 if(del.length)await sb.from('errors').delete().in('id',del);
 const d=Object.entries(L('days')||{}).map(([day,ayahs])=>({user_id:uid,day,ayahs}));
 if(d.length)await sb.from('daily_progress').upsert(d,{onConflict:'user_id,day'});
 const h=(L('hist')||[]).filter(x=>x.id).map(x=>({id:x.id,user_id:uid,title:x.name,from_ayah:x.from,to_ayah:x.to,accuracy:x.acc,is_review:!!x.rev,created_at:new Date(x.at||Date.now()).toISOString()}));
 if(h.length)await sb.from('sessions').upsert(h,{onConflict:'id',ignoreDuplicates:true});
 await sb.from('profiles').upsert({user_id:uid,daily_goal:+localStorage.getItem('goal')||10,font_size:+localStorage.getItem('fs')||26,night_mode:localStorage.getItem('night')==='1',updated_at:new Date().toISOString()},{onConflict:'user_id'});st='آخر إرسال ناجح '+new Date().toLocaleTimeString()}
// جهاز جديد (لا بيانات محلية): استرجع من السحابة
(async()=>{if(!await ready||localStorage.getItem('errors')||localStorage.getItem('days')||localStorage.getItem('pulled'))return;si.call(localStorage,'pulled','1');
 const[a,b,c]=await Promise.all([sb.from('errors').select('*'),sb.from('daily_progress').select('*'),sb.from('profiles').select('*').maybeSingle()]);let ch=0;
 if(a.data&&a.data.length){si.call(localStorage,'errors',JSON.stringify(a.data.map(r=>({id:r.surah+':'+r.ayah+':'+r.word_index,sr:r.surah,ay:r.ayah,k:r.word_index,w:r.word,said:r.said,tx:r.ayah_text,n:r.mistake_count,at:Date.parse(r.last_at)}))));ch=1}
 if(b.data&&b.data.length){const d={};b.data.forEach(r=>d[r.day]=r.ayahs);si.call(localStorage,'days',JSON.stringify(d));ch=1}
 if(c.data){si.call(localStorage,'goal',c.data.daily_goal);si.call(localStorage,'fs',c.data.font_size);si.call(localStorage,'night',c.data.night_mode?'1':'0');ch=1}
 if(ch&&window.goalUI)goalUI()})();
Storage.prototype.setItem=function(k,v){si.call(this,k,v);if(['errors','days','hist','goal','fs','night'].includes(k)){clearTimeout(t);t=setTimeout(push,3000)}};
ready.then(()=>{if((L('errors')||[]).length)push()});
SB.login=async()=>{alert('الحالة: '+st+'\nأخطاء محلية: '+(L('errors')||[]).length);if(!confirm('تربط حسابك بالإيميل؟'))return;const email=prompt('بريدك الإلكتروني (لربط بياناتك بين الأجهزة)');if(!email)return;
 const{error}=await sb.auth.signInWithOtp({email,options:{emailRedirectTo:location.href.split('#')[0]}});alert(error?'تعذر الإرسال':'أرسلنا رابط الدخول إلى بريدك')};
})();
