import {useEffect,useMemo,useRef,useState} from 'react';
import {BookOpen,Mic,Pause,Play,Square,History,Settings,ChevronLeft,Volume2,ShieldCheck,AlertTriangle,RefreshCw} from 'lucide-react';
import {getSurahs,getSurah} from './services/quran'; import {saveSession,listSessions} from './services/storage'; import {createArabicRecognition} from './services/speech';
import type {Surah,Ayah,RecitationMode,ReviewLevel,SessionRecord} from './types';

export default function App(){
 const [surahs,setSurahs]=useState<Surah[]>([]),[surah,setSurah]=useState(1),[ayahs,setAyahs]=useState<Ayah[]>([]);
 const [from,setFrom]=useState(1),[to,setTo]=useState(7),[mode,setMode]=useState<RecitationMode>('free'),[level,setLevel]=useState<ReviewLevel>('basic');
 const [page,setPage]=useState<'home'|'setup'|'session'|'history'>('home'),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const [transcript,setTranscript]=useState(''),[running,setRunning]=useState(false),[paused,setPaused]=useState(false),[started,setStarted]=useState(0),[sessions,setSessions]=useState<SessionRecord[]>([]);
 const recognition=useRef<any>(null); const [micSupported,setMicSupported]=useState(true);
 useEffect(()=>{getSurahs().then(setSurahs).catch(e=>setError(e.message)); listSessions().then(setSessions); setMicSupported(!!((window as any).SpeechRecognition||(window as any).webkitSpeechRecognition));},[]);
 useEffect(()=>{const s=surahs.find(x=>x.number===surah);if(s){setTo(s.numberOfAyahs);setFrom(1);}},[surah,surahs]);
 const selected=useMemo(()=>ayahs.filter(a=>a.numberInSurah>=from&&a.numberInSurah<=to),[ayahs,from,to]);
 async function begin(){setError('');setLoading(true);try{const a=await getSurah(surah);setAyahs(a);setPage('session');setTranscript('');setStarted(Date.now());}catch(e:any){setError(e.message)}finally{setLoading(false)}}
 function startMic(){try{const r=createArabicRecognition({onText:setTranscript,onError:setError,onEnd:()=>{}});recognition.current=r;r.start();setRunning(true);setPaused(false);if(!started)setStarted(Date.now());}catch(e:any){setError(e.message)}}
 function pauseMic(){recognition.current?.stop();setRunning(false);setPaused(true);}
 async function finish(){recognition.current?.stop();setRunning(false);const rec:SessionRecord={id:crypto.randomUUID(),surah,from,to,date:new Date().toISOString(),durationSeconds:started?Math.max(0,Math.round((Date.now()-started)/1000)):0,accuracy:null,status:'partial',notes:['لم يتم تفعيل محرك المقارنة القرآنية بعد؛ النص المستخرج من الصوت للمعاينة فقط.']};await saveSession(rec);setSessions(await listSessions());setPage('home');}
 const surahName=surahs.find(s=>s.number===surah)?.name||'الفاتحة';
 return <div className="app-shell">
  <header className="topbar"><div className="brand-mark">۞</div><div><div className="brand">وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا</div><div className="tagline">رفيقك في الحفظ والإتقان</div></div><button className="icon-btn" onClick={()=>setPage('history')} aria-label="السجل"><History/></button></header>
  {error&&<div className="notice error"><AlertTriangle size={18}/>{error}<button onClick={()=>setError('')}>×</button></div>}
  {page==='home'&&<main className="content">
   <section className="hero"><div className="eyebrow">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div><h1>واجعل القرآن<br/><span>نور قلبك</span></h1><p>تدرّب على الحفظ والتلاوة، وتابع تقدمك خطوة بخطوة.</p><button className="primary wide" onClick={()=>setPage('setup')}>ابدأ التسميع <ChevronLeft/></button><div className="hero-ornament">۞</div></section>
   <div className="section-head"><h2>رحلتك مع القرآن</h2><span>ابدأ من حيث وصلت</span></div>
   <div className="quick-grid"><button className="quick-card" onClick={()=>setPage('setup')}><BookOpen/><b>مكتبة السور</b><small>اختر سورة وابدأ المراجعة</small></button><button className="quick-card" onClick={()=>setPage('history')}><History/><b>سجل التسميع</b><small>{sessions.length} جلسة محفوظة</small></button></div>
   <div className="disclaimer"><ShieldCheck/><span>خصوصيتك أولويتنا. يُحفظ سجل الجلسات على جهازك.</span></div>
  </main>}
  {page==='setup'&&<main className="content">
   <button className="back" onClick={()=>setPage('home')}>→ الرئيسية</button><h1 className="page-title">إعداد جلسة التسميع</h1>
   <label>اختر السورة</label><select value={surah} onChange={e=>setSurah(Number(e.target.value))}>{surahs.map(s=><option key={s.number} value={s.number}>{s.number}. {s.name}</option>)}</select>
   <div className="two-fields"><div><label>من الآية</label><input type="number" min="1" max={surahs.find(s=>s.number===surah)?.numberOfAyahs||286} value={from} onChange={e=>setFrom(Number(e.target.value))}/></div><div><label>إلى الآية</label><input type="number" min={from} max={surahs.find(s=>s.number===surah)?.numberOfAyahs||286} value={to} onChange={e=>setTo(Number(e.target.value))}/></div></div>
   <label>وضع التدريب</label><div className="choice-grid">{([['free','التسميع الحر','اختبر حفظك دون عرض النص'],['highlight','تظليل الكلمات','تابع ظهور الكلمات تدريجيًا'],['review','المراجعة','اعرض الآيات كاملة']] as const).map(([v,t,d])=><button key={v} className={mode===v?'choice active':'choice'} onClick={()=>setMode(v)}><b>{t}</b><small>{d}</small></button>)}</div>
   <label>مستوى التدقيق</label><select value={level} onChange={e=>setLevel(e.target.value as ReviewLevel)}><option value="basic">أساسي — صحة الكلمات والحفظ</option><option value="advanced">متقدم — الحفظ والنطق</option><option value="full">شامل — التجويد أيضًا (عند توفر نموذج متخصص)</option></select>
   <div className="notice"><AlertTriangle size={18}/> النسخة الحالية توفر التسجيل والتفريغ الصوتي الأولي. المقارنة القرآنية الآلية وتحليل التجويد يحتاجان ربط محرك صوتي متخصص قبل اعتماد أي تقييم.</div>
   <button className="primary wide" disabled={loading||from<1||to<from} onClick={begin}>{loading?'جارٍ التحميل…':'ابدأ الجلسة'} <ChevronLeft/></button>
  </main>}
  {page==='session'&&<main className="content">
   <button className="back" onClick={()=>{pauseMic();setPage('setup')}}>→ إعداد الجلسة</button><div className="session-head"><div><small>سورة {surahName}</small><h1>التسميع الآن</h1></div><span className="live-dot">{running?'● مباشر':'● متوقف'}</span></div>
   <div className="mushaf"><div className="mushaf-label">نص الآيات المحددة</div>{mode==='free'?<div className="hidden-text">النص مخفي لاختبار الحفظ</div>:selected.map(a=><span key={a.number} className="ayah">{a.text} <small>۞{a.numberInSurah}</small> </span>)}</div>
   {mode==='free'&&<p className="muted center">سيظل النص مخفيًا في وضع التسميع الحر.</p>}
   <div className="record-panel"><div className="mic-orb"><Mic size={30}/></div><b>{running?'يتم الاستماع إلى تلاوتك':'اضغط بدء التسميع لتفعيل الميكروفون'}</b><small>تأكد من السماح باستخدام الميكروفون</small>
    <div className="controls">{!running?<button className="primary" onClick={startMic}><Play size={18}/> {paused?'استكمال':'بدء التسميع'}</button>:<button className="secondary" onClick={pauseMic}><Pause size={18}/> إيقاف مؤقت</button>}<button className="finish" onClick={finish}><Square size={16}/> إنهاء</button></div>
   </div>
   <label>النص الذي التقطه التعرف الصوتي (للمعاينة فقط)</label><div className="transcript">{transcript||'سيظهر النص هنا إذا كان المتصفح يدعم التعرف على الكلام العربي.'}</div>
   <button className="secondary wide" onClick={()=>setTranscript('')}><RefreshCw size={16}/> مسح المعاينة</button>
   {!micSupported&&<div className="notice error">متصفحك لا يدعم واجهة التعرف على الكلام. جرّب Chrome على Android.</div>}
  </main>}
  {page==='history'&&<main className="content"><button className="back" onClick={()=>setPage('home')}>→ الرئيسية</button><h1 className="page-title">سجل التسميع</h1>{sessions.length===0?<div className="empty"><History size={38}/><b>لا توجد جلسات بعد</b><span>ابدأ أول جلسة وسيظهر تقدمك هنا.</span></div>:sessions.map(s=><div className="history-card" key={s.id}><div><b>سورة رقم {s.surah}</b><small>الآيات {s.from} – {s.to}</small></div><div><b>{s.accuracy===null?'غير مقيّم':s.accuracy+'%'}</b><small>{new Date(s.date).toLocaleDateString('ar-EG')}</small></div></div>)}</main>}
  <footer>وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا <span>نسخة تأسيسية قابلة للتطوير</span></footer>
 </div>
}