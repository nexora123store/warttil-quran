import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  BookOpen, Mic, Pause, Play, Square, History, ChevronLeft, ShieldCheck, AlertTriangle, RefreshCw, Cloud, Trash2,
} from 'lucide-react';
import { getSurahs, getSurah, validateAyahs } from './services/quran';
import { saveSession, listSessions, clearSessions } from './services/storage';
import { createArabicRecognition, isSpeechSupported, type ArabicRecognition } from './services/speech';
import { cloudEnabled, pushSession, syncAll, clearRemote } from './services/cloud';
import { matchWords } from './utils/arabic';
import { newId } from './utils/id';
import type { Surah, Ayah, RecitationMode, ReviewLevel, SessionRecord } from './types';

const CLOUD_KEY = 'warttil-cloud';
const readCloudPref = () => {
  try { return localStorage.getItem(CLOUD_KEY) === '1'; } catch { return false; }
};
const writeCloudPref = (v: boolean) => {
  try { localStorage.setItem(CLOUD_KEY, v ? '1' : '0'); } catch { /* تجاهل */ }
};
const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'حدث خطأ غير متوقع.');
const fmtDuration = (sec: number) => {
  const m = Math.floor(sec / 60), s = sec % 60;
  return m > 0 ? `${m} د ${s} ث` : `${s} ث`;
};

export default function App() {
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [surah, setSurah] = useState(1);
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(7);
  const [mode, setMode] = useState<RecitationMode>('free');
  const [level, setLevel] = useState<ReviewLevel>('basic');
  const [page, setPage] = useState<'home' | 'setup' | 'session' | 'history'>('home');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [transcript, setTranscript] = useState('');
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [started, setStarted] = useState(0);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [cloud, setCloud] = useState(() => cloudEnabled && readCloudPref());
  const [syncing, setSyncing] = useState(false);
  const recognition = useRef<ArabicRecognition | null>(null);
  const micSupported = useMemo(() => isSpeechSupported(), []);

  useEffect(() => {
    getSurahs().then(setSurahs).catch((e) => setError(errMsg(e)));
    listSessions().then(setSessions).catch(() => setSessions([]));
    if (cloud) syncAll().then(() => listSessions().then(setSessions)).catch((e) => setError('تعذرت المزامنة: ' + errMsg(e)));
    return () => recognition.current?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = surahs.find((x) => x.number === surah);
  const maxAyah = current?.numberOfAyahs ?? 286;
  const surahName = current?.name ?? '';
  const nameOf = (n: number) => surahs.find((x) => x.number === n)?.name ?? `سورة رقم ${n}`;

  useEffect(() => {
    const s = surahs.find((x) => x.number === surah);
    if (s) { setTo(s.numberOfAyahs); setFrom(1); }
  }, [surah, surahs]);

  const selected = useMemo(() => ayahs.filter((a) => a.numberInSurah >= from && a.numberInSurah <= to), [ayahs, from, to]);
  const words = useMemo(
    () => selected.flatMap((a) => a.text.split(/\s+/).filter(Boolean).map((w) => ({ w, ayah: a.numberInSurah }))),
    [selected]
  );
  const hits = useMemo(
    () => (mode === 'highlight' ? matchWords(words.map((x) => x.w), transcript) : []),
    [mode, words, transcript]
  );

  function stopMic() {
    recognition.current?.stop();
    setRunning(false);
  }

  async function begin() {
    setError('');
    setLoading(true);
    try {
      const a = await getSurah(surah);
      if (current) validateAyahs(a, current.numberOfAyahs);
      stopMic();
      recognition.current = null;
      setAyahs(a);
      setTranscript('');
      setPaused(false);
      setStarted(Date.now());
      setPage('session');
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }

  function startMic() {
    try {
      if (!recognition.current) {
        recognition.current = createArabicRecognition({
          onText: setTranscript,
          onError: (m) => setError(m),
          onEnd: () => setRunning(false),
        });
      }
      recognition.current.start();
      setError('');
      setRunning(true);
      setPaused(false);
    } catch (e) {
      setError(errMsg(e));
    }
  }

  function pauseMic() {
    stopMic();
    setPaused(true);
  }

  function clearTranscript() {
    recognition.current?.reset();
    setTranscript('');
  }

  async function finish() {
    stopMic();
    recognition.current = null;
    setPaused(false);
    const rec: SessionRecord = {
      id: newId(),
      surah,
      from,
      to,
      date: new Date().toISOString(),
      durationSeconds: started ? Math.max(0, Math.round((Date.now() - started) / 1000)) : 0,
      accuracy: null,
      status: 'partial',
      notes: ['لم يتم تفعيل محرك المقارنة القرآنية بعد؛ النص المستخرج من الصوت للمعاينة فقط.'],
    };
    await saveSession(rec);
    if (cloud) {
      try { await pushSession(rec); } catch { setError('حُفظت الجلسة على جهازك لكن تعذرت المزامنة السحابية.'); }
    }
    setSessions(await listSessions());
    setPage('home');
  }

  async function toggleCloud() {
    const next = !cloud;
    setCloud(next);
    writeCloudPref(next);
    if (!next) return;
    setSyncing(true);
    try {
      await syncAll();
      setSessions(await listSessions());
    } catch (e) {
      setError('تعذرت المزامنة: ' + errMsg(e));
      setCloud(false);
      writeCloudPref(false);
    } finally {
      setSyncing(false);
    }
  }

  async function clearAll() {
    const msg = 'حذف كل سجل الجلسات من هذا الجهاز؟' + (cloud ? ' وسيُحذف من السحابة أيضًا.' : '');
    if (!window.confirm(msg)) return;
    await clearSessions();
    if (cloud) {
      try { await clearRemote(); } catch { setError('حُذف السجل من جهازك لكن تعذر حذفه من السحابة.'); }
    }
    setSessions([]);
  }

  const modes = [
    ['free', 'التسميع الحر', 'اختبر حفظك دون عرض النص'],
    ['highlight', 'تظليل الكلمات', 'تتلوّن الكلمات التي يلتقطها التعرف الصوتي (تقريبي)'],
    ['review', 'المراجعة', 'اعرض الآيات كاملة'],
  ] as const;

  function renderHighlighted() {
    const nodes: ReactNode[] = [];
    words.forEach((x, i) => {
      nodes.push(<span key={'w' + i} className={hits[i] ? 'word hit' : 'word'}>{x.w} </span>);
      if (i === words.length - 1 || words[i + 1].ayah !== x.ayah) {
        nodes.push(<small key={'n' + i} className="ayah-no">۞{x.ayah} </small>);
      }
    });
    return <span className="ayah">{nodes}</span>;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-mark">۞</div>
        <div>
          <div className="brand">وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا</div>
          <div className="tagline">رفيقك في الحفظ والإتقان</div>
        </div>
        <button className="icon-btn" onClick={() => { stopMic(); setPage('history'); }} aria-label="السجل"><History /></button>
      </header>

      {error && (
        <div className="notice error" role="alert">
          <AlertTriangle size={18} />{error}
          <button onClick={() => setError('')} aria-label="إغلاق">×</button>
        </div>
      )}

      {page === 'home' && (
        <main className="content">
          <section className="hero">
            <div className="eyebrow">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
            <h1>واجعل القرآن<br /><span>نور قلبك</span></h1>
            <p>تدرّب على الحفظ والتلاوة، وتابع تقدمك خطوة بخطوة.</p>
            <button className="primary wide" onClick={() => setPage('setup')}>ابدأ التسميع <ChevronLeft /></button>
            <div className="hero-ornament">۞</div>
          </section>
          <div className="section-head"><h2>رحلتك مع القرآن</h2><span>ابدأ من حيث وصلت</span></div>
          <div className="quick-grid">
            <button className="quick-card" onClick={() => setPage('setup')}><BookOpen /><b>مكتبة السور</b><small>اختر سورة وابدأ المراجعة</small></button>
            <button className="quick-card" onClick={() => setPage('history')}><History /><b>سجل التسميع</b><small>{sessions.length} جلسة محفوظة</small></button>
          </div>
          <div className="disclaimer"><ShieldCheck /><span>خصوصيتك أولويتنا. يُحفظ سجل الجلسات على جهازك، والمزامنة السحابية اختيارية.</span></div>
        </main>
      )}

      {page === 'setup' && (
        <main className="content">
          <button className="back" onClick={() => setPage('home')}>→ الرئيسية</button>
          <h1 className="page-title">إعداد جلسة التسميع</h1>
          <label htmlFor="surah">اختر السورة</label>
          <select id="surah" value={surah} onChange={(e) => setSurah(Number(e.target.value))}>
            {surahs.map((s) => <option key={s.number} value={s.number}>{s.number}. {s.name}</option>)}
          </select>
          <div className="two-fields">
            <div>
              <label htmlFor="from">من الآية</label>
              <input id="from" type="number" inputMode="numeric" min={1} max={maxAyah} value={from}
                onChange={(e) => {
                  const v = Math.max(1, Math.min(Number(e.target.value) || 1, maxAyah));
                  setFrom(v);
                  if (v > to) setTo(v);
                }} />
            </div>
            <div>
              <label htmlFor="to">إلى الآية</label>
              <input id="to" type="number" inputMode="numeric" min={from} max={maxAyah} value={to}
                onChange={(e) => setTo(Math.max(from, Math.min(Number(e.target.value) || from, maxAyah)))} />
            </div>
          </div>
          <label>وضع التدريب</label>
          <div className="choice-grid">
            {modes.map(([v, t, d]) => (
              <button key={v} className={mode === v ? 'choice active' : 'choice'} onClick={() => setMode(v)}>
                <b>{t}</b><small>{d}</small>
              </button>
            ))}
          </div>
          <label htmlFor="level">مستوى التدقيق</label>
          <select id="level" value={level} onChange={(e) => setLevel(e.target.value as ReviewLevel)}>
            <option value="basic">أساسي — صحة الكلمات والحفظ</option>
            <option value="advanced">متقدم — الحفظ والنطق</option>
            <option value="full">شامل — التجويد أيضًا (عند توفر نموذج متخصص)</option>
          </select>
          <div className="notice"><AlertTriangle size={18} /> النسخة الحالية توفر التسجيل والتفريغ الصوتي الأولي. المقارنة القرآنية الآلية وتحليل التجويد يحتاجان ربط محرك صوتي متخصص قبل اعتماد أي تقييم.</div>
          <button className="primary wide" disabled={loading || surahs.length === 0 || from < 1 || to < from} onClick={begin}>
            {loading ? 'جارٍ التحميل…' : 'ابدأ الجلسة'} <ChevronLeft />
          </button>
        </main>
      )}

      {page === 'session' && (
        <main className="content">
          <button className="back" onClick={() => { pauseMic(); setPage('setup'); }}>→ إعداد الجلسة</button>
          <div className="session-head">
            <div><small>{surahName}</small><h1>التسميع الآن</h1></div>
            <span className="live-dot">{running ? '● مباشر' : '● متوقف'}</span>
          </div>
          <div className="mushaf">
            <div className="mushaf-label">نص الآيات المحددة</div>
            {mode === 'free' && <div className="hidden-text">النص مخفي لاختبار الحفظ</div>}
            {mode === 'highlight' && renderHighlighted()}
            {mode === 'review' && selected.map((a) => <span key={a.number} className="ayah">{a.text} <small>۞{a.numberInSurah}</small> </span>)}
          </div>
          {mode === 'free' && <p className="muted center">سيظل النص مخفيًا في وضع التسميع الحر.</p>}
          {mode === 'highlight' && <p className="muted center">التظليل تقريبي ويعتمد على التفريغ الصوتي؛ لا يُعدّ حكمًا على صحة الحفظ.</p>}
          <div className="record-panel">
            <div className="mic-orb"><Mic size={30} /></div>
            <b>{running ? 'يتم الاستماع إلى تلاوتك' : 'اضغط بدء التسميع لتفعيل الميكروفون'}</b>
            <small>تأكد من السماح باستخدام الميكروفون</small>
            <div className="controls">
              {!running
                ? <button className="primary" onClick={startMic} disabled={!micSupported}><Play size={18} /> {paused ? 'استكمال' : 'بدء التسميع'}</button>
                : <button className="secondary" onClick={pauseMic}><Pause size={18} /> إيقاف مؤقت</button>}
              <button className="finish" onClick={finish}><Square size={16} /> إنهاء</button>
            </div>
          </div>
          <label>النص الذي التقطه التعرف الصوتي (للمعاينة فقط)</label>
          <div className="transcript" aria-live="polite">{transcript || 'سيظهر النص هنا إذا كان المتصفح يدعم التعرف على الكلام العربي.'}</div>
          <button className="secondary wide" onClick={clearTranscript}><RefreshCw size={16} /> مسح المعاينة</button>
          {!micSupported && <div className="notice error">متصفحك لا يدعم واجهة التعرف على الكلام. جرّب Chrome على Android.</div>}
        </main>
      )}

      {page === 'history' && (
        <main className="content">
          <button className="back" onClick={() => setPage('home')}>→ الرئيسية</button>
          <h1 className="page-title">سجل التسميع</h1>
          {cloudEnabled && (
            <div className="cloud-card">
              <Cloud size={20} />
              <div>
                <b>المزامنة السحابية</b>
                <small>تُرفع بيانات الجلسة فقط (السورة والآيات والمدة والتاريخ). لا يُرفع صوت ولا نص تفريغ. تعمل بحساب مجهول مرتبط بهذا المتصفح.</small>
              </div>
              <button className={cloud ? 'toggle on' : 'toggle'} onClick={toggleCloud} disabled={syncing} aria-pressed={cloud}>
                {syncing ? '…' : cloud ? 'مفعّلة' : 'تفعيل'}
              </button>
            </div>
          )}
          {sessions.length === 0 ? (
            <div className="empty"><History size={38} /><b>لا توجد جلسات بعد</b><span>ابدأ أول جلسة وسيظهر تقدمك هنا.</span></div>
          ) : (
            <>
              {sessions.map((s) => (
                <div className="history-card" key={s.id}>
                  <div><b>{nameOf(s.surah)}</b><small>الآيات {s.from} – {s.to} · {fmtDuration(s.durationSeconds)}</small></div>
                  <div><b>{s.accuracy === null ? 'غير مقيّم' : s.accuracy + '%'}</b><small>{new Date(s.date).toLocaleDateString('ar-EG')}</small></div>
                </div>
              ))}
              <button className="secondary wide danger" onClick={clearAll}><Trash2 size={16} /> حذف السجل</button>
            </>
          )}
        </main>
      )}

      <footer>وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا <span>نسخة تأسيسية قابلة للتطوير</span></footer>
    </div>
  );
}
