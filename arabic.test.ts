import { describe, it, expect } from 'vitest';
import { normalizeArabic, looseKey, matchWords } from '../utils/arabic';

describe('normalizeArabic', () => {
  it('يزيل التشكيل والألف الخنجرية ويوحّد الألف', () => {
    expect(normalizeArabic('ٱلرَّحْمَٰنِ')).toBe('الرحمن');
  });
  it('يتجاهل الرموز غير الحرفية', () => {
    expect(normalizeArabic('۞12 الله')).toBe('الله');
  });
});

describe('looseKey', () => {
  it('يساوي بين الرسم العثماني والإملائي', () => {
    expect(looseKey('ٱلْحَمْدُ')).toBe(looseKey('الحمد'));
    expect(looseKey('ٱلصِّرَٰطَ')).toBe(looseKey('الصراط'));
  });
});

describe('matchWords', () => {
  const words = ['بِسْمِ', 'ٱللَّهِ', 'ٱلرَّحْمَٰنِ', 'ٱلرَّحِيمِ'];
  it('يظلل الكلمات الملتقطة بالتتابع فقط', () => {
    expect(matchWords(words, 'بسم الله الرحمن')).toEqual([true, true, true, false]);
  });
  it('يعيد false للجميع عند نص فارغ', () => {
    expect(matchWords(words, '')).toEqual([false, false, false, false]);
  });
});
