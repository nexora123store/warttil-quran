// أدوات مطابقة تقريبية لنص عربي. تُستخدم فقط لتظليل الكلمات "كمعاينة" ولا تُصدر حكمًا على صحة الحفظ أو التجويد.
const MARKS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;

/** يزيل التشكيل والعلامات القرآنية ويوحّد صور الألف والياء والتاء المربوطة. */
export function normalizeArabic(input: string): string {
  return input
    .normalize('NFKD')
    .replace(MARKS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^\u0621-\u063A\u0641-\u064A\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** مفتاح مرن للمقارنة: نحذف الألف أيضًا لأن الرسم العثماني يستبدلها بألف خنجرية في كلمات كثيرة. */
export function looseKey(word: string): string {
  return normalizeArabic(word).replace(/ا/g, '').replace(/\s/g, '');
}

/**
 * يطابق كلمات النص بالتتابع مع ما التقطه التعرف الصوتي.
 * يعيد مصفوفة بنفس طول `words`: true إذا وُجدت الكلمة ضمن نافذة قريبة من موضع المتابعة الحالي.
 */
export function matchWords(words: string[], transcript: string, windowSize = 5): boolean[] {
  const t = transcript.split(/\s+/).map(looseKey).filter(Boolean);
  const out = words.map(() => false);
  let p = 0;
  words.forEach((w, i) => {
    const k = looseKey(w);
    if (!k) return;
    const end = Math.min(t.length, p + windowSize);
    for (let j = p; j < end; j++) {
      if (t[j] === k) {
        out[i] = true;
        p = j + 1;
        break;
      }
    }
  });
  return out;
}
