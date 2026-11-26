// واجهة أولية للتعرف على الكلام عبر Web Speech API.
// ملاحظة: دعم العربية وجودة التفريغ تختلف حسب المتصفح والجهاز؛ لا تستخدم النتيجة وحدها للحكم على التجويد.
export type SpeechCallbacks={onText:(text:string)=>void;onError:(message:string)=>void;onEnd:()=>void};
type SpeechRecognitionLike={lang:string;continuous:boolean;interimResults:boolean;onresult:((e:any)=>void)|null;onerror:((e:any)=>void)|null;onend:(()=>void)|null;start:()=>void;stop:()=>void};
export function createArabicRecognition(cb:SpeechCallbacks){
 const w=window as any; const C=w.SpeechRecognition||w.webkitSpeechRecognition;
 if(!C) throw new Error('التعرف الصوتي غير مدعوم في هذا المتصفح. جرّب Chrome على Android.');
 const rec:SpeechRecognitionLike=new C(); rec.lang='ar-EG'; rec.continuous=true; rec.interimResults=true;
 rec.onresult=e=>{let t=''; for(let i=e.resultIndex;i<e.results.length;i++) t+=e.results[i][0].transcript+' '; cb.onText(t.trim());};
 rec.onerror=e=>cb.onError(e.error||'حدث خطأ في الميكروفون'); rec.onend=cb.onEnd; return rec;
}