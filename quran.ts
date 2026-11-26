import type { Surah, Ayah } from '../types';

// مصدر البيانات: AlQuran Cloud API. النص يُعرض كما يصل من المصدر ولا يُعاد توليده أو تعديله.
// للإطلاق العام: راجع شروط المصدر وثبّت نسخة موثقة محليًا بعد مراجعة النص والرسم.
const BASE = 'https://api.alquran.cloud/v1';
const TIMEOUT_MS = 15000;

const surahCache = new Map<number, Ayah[]>();
let surahListCache: Surah[] | null = null;

async function fetchJson(url: string, failMessage: string): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error(failMessage);
    const j = await r.json();
    if (j?.code !== 200 || !j?.data) throw new Error(failMessage);
    return j.data;
  } catch (e: any) {
    if (e?.name === 'AbortError') throw new Error('انتهت مهلة الاتصال. تحقق من الإنترنت وحاول مرة أخرى.');
    if (e instanceof TypeError) throw new Error('تعذر الاتصال بالخادم. تحقق من الإنترنت.');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export async function getSurahs(): Promise<Surah[]> {
  if (surahListCache) return surahListCache;
  const data = await fetchJson(`${BASE}/surah`, 'تعذر تحميل قائمة السور. تحقق من الاتصال.');
  if (!Array.isArray(data) || data.length !== 114) throw new Error('قائمة السور غير مكتملة.');
  surahListCache = data as Surah[];
  return surahListCache;
}

export async function getSurah(number: number): Promise<Ayah[]> {
  const cached = surahCache.get(number);
  if (cached) return cached;
  const data = await fetchJson(`${BASE}/surah/${number}/quran-uthmani`, 'تعذر تحميل آيات السورة.');
  if (!Array.isArray(data.ayahs)) throw new Error('بيانات السورة غير صالحة.');
  const ayahs = data.ayahs as Ayah[];
  surahCache.set(number, ayahs);
  return ayahs;
}

/** فحص سلامة: عدد الآيات وترتيبها وعدم وجود نص فارغ. يرمي خطأ إذا فشل الفحص. */
export function validateAyahs(ayahs: Ayah[], expectedCount: number): void {
  if (ayahs.length !== expectedCount) {
    throw new Error('نص السورة غير مكتمل (عدد الآيات لا يطابق المتوقع). لن تبدأ الجلسة حتى لا يُعرض نص ناقص.');
  }
  ayahs.forEach((a, i) => {
    if (a.numberInSurah !== i + 1 || typeof a.text !== 'string' || a.text.trim() === '') {
      throw new Error('ترتيب الآيات أو نصها غير صالح. لن تبدأ الجلسة.');
    }
  });
}
