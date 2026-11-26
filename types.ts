export type Surah = { number:number; name:string; englishName?:string; numberOfAyahs:number; revelationType?:string };
export type Ayah = { number:number; numberInSurah:number; text:string; audio?:string };
export type RecitationMode = 'free'|'highlight'|'review';
export type ReviewLevel = 'basic'|'advanced'|'full';
export type SessionRecord = { id:string; surah:number; from:number; to:number; date:string; durationSeconds:number; accuracy:number|null; status:'completed'|'partial'; notes:string[] };