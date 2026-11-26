import { describe, it, expect } from 'vitest';
import { validateAyahs } from '../services/quran';
import type { Ayah } from '../types';

const mk = (n: number): Ayah[] => Array.from({ length: n }, (_, i) => ({ number: i + 1, numberInSurah: i + 1, text: 'نص' }));

describe('validateAyahs', () => {
  it('يقبل سورة مكتملة ومرتبة', () => {
    expect(() => validateAyahs(mk(7), 7)).not.toThrow();
  });
  it('يرفض نقص عدد الآيات', () => {
    expect(() => validateAyahs(mk(6), 7)).toThrow();
  });
  it('يرفض ترتيبًا خاطئًا', () => {
    const a = mk(3);
    a[1].numberInSurah = 5;
    expect(() => validateAyahs(a, 3)).toThrow();
  });
  it('يرفض نصًا فارغًا', () => {
    const a = mk(3);
    a[2].text = '  ';
    expect(() => validateAyahs(a, 3)).toThrow();
  });
});
