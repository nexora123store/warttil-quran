import type {Surah,Ayah} from '../types';
// مصدر البيانات: AlQuran Cloud API. النص يُعرض كما يصل من المصدر ولا يُعاد توليده أو تعديله.
// للإطلاق التجاري: راجع شروط المصدر وثبّت نسخة موثقة محلياً بعد مراجعة النص والرسم.
const BASE='https://api.alquran.cloud/v1';
export async function getSurahs():Promise<Surah[]>{
 const r=await fetch(`${BASE}/surah`); if(!r.ok) throw new Error('تعذر تحميل قائمة السور. تحقق من الاتصال.');
 const j=await r.json(); return j.data as Surah[];
}
export async function getSurah(number:number):Promise<Ayah[]>{
 const r=await fetch(`${BASE}/surah/${number}/quran-uthmani`); if(!r.ok) throw new Error('تعذر تحميل آيات السورة.');
 const j=await r.json(); return j.data.ayahs as Ayah[];
}