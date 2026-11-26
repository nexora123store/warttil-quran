// واجهة أولية للتعرف على الكلام عبر Web Speech API.
// ملاحظة: دعم العربية وجودة التفريغ تختلف حسب المتصفح والجهاز؛ لا تستخدم النتيجة وحدها للحكم على التجويد.
export type SpeechCallbacks = {
  onText: (text: string) => void;
  onError: (message: string) => void;
  /** يُستدعى عند التوقف الفعلي فقط (وليس عند إعادة التشغيل التلقائي الداخلية). */
  onEnd: () => void;
};

export type ArabicRecognition = {
  start: () => void;
  stop: () => void;
  reset: () => void;
};

export function isSpeechSupported(): boolean {
  const w = window as any;
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

const FATAL = new Set(['not-allowed', 'service-not-allowed', 'audio-capture', 'language-not-supported']);

function arabicError(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'تم رفض إذن الميكروفون. اسمح للموقع باستخدام الميكروفون من إعدادات المتصفح (ويلزم HTTPS).';
    case 'audio-capture':
      return 'لم يتم العثور على ميكروفون.';
    case 'network':
      return 'التعرف على الكلام يحتاج اتصالًا بالإنترنت في هذا المتصفح.';
    case 'language-not-supported':
      return 'اللغة العربية غير مدعومة للتعرف الصوتي في هذا المتصفح.';
    default:
      return 'حدث خطأ في الميكروفون.';
  }
}

export function createArabicRecognition(cb: SpeechCallbacks): ArabicRecognition {
  const w = window as any;
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) throw new Error('التعرف الصوتي غير مدعوم في هذا المتصفح. جرّب Chrome على Android.');

  let rec: any = null;
  let wantRunning = false;
  let committed = ''; // نص الدورات السابقة (قبل إعادة التشغيل التلقائي)
  let sessionText = ''; // نص الدورة الحالية

  function build() {
    const r = new Ctor();
    r.lang = 'ar-SA';
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e: any) => {
      let t = '';
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript + ' ';
      sessionText = t.trim();
      cb.onText(`${committed} ${sessionText}`.trim());
    };
    r.onerror = (e: any) => {
      const code = e?.error || '';
      if (code === 'no-speech' || code === 'aborted') return; // طبيعي: سكوت أو إيقاف يدوي
      if (FATAL.has(code)) wantRunning = false;
      cb.onError(arabicError(code));
    };
    r.onend = () => {
      committed = `${committed} ${sessionText}`.trim();
      sessionText = '';
      if (wantRunning) {
        // Chrome ينهي الجلسة تلقائيًا بعد فترة سكوت؛ نعيد التشغيل ما دام المستخدم لم يوقف
        setTimeout(() => {
          if (!wantRunning) return;
          try {
            rec = build();
            rec.start();
          } catch {
            wantRunning = false;
            cb.onEnd();
          }
        }, 250);
      } else {
        cb.onEnd();
      }
    };
    return r;
  }

  return {
    start() {
      if (wantRunning) return;
      wantRunning = true;
      rec = build();
      rec.start();
    },
    stop() {
      wantRunning = false;
      try {
        rec?.stop();
      } catch {
        /* تجاهل */
      }
    },
    reset() {
      committed = '';
      sessionText = '';
    },
  };
}
