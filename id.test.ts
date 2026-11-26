import { describe, it, expect } from 'vitest';
import { newId } from '../utils/id';

describe('newId', () => {
  it('يولّد UUID v4 صالحًا', () => {
    expect(newId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
