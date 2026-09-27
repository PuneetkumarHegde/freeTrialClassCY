import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BRAND_QUOTES, getRandomQuote } from '../quotes';

describe('Codeyoung Brand Quotes System', () => {
  beforeEach(() => {
    // Setup mock sessionStorage in Node environment
    const storage: Record<string, string> = {};
    const mockSessionStorage = {
      getItem: (key: string) => storage[key] || null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
      clear: () => {
        Object.keys(storage).forEach((k) => delete storage[k]);
      },
    };

    (globalThis as any).window = {
      sessionStorage: mockSessionStorage,
    };
  });

  afterEach(() => {
    delete (globalThis as any).window;
  });

  it('contains predefined inspirational Codeyoung-style quotes', () => {
    expect(BRAND_QUOTES.length).toBeGreaterThanOrEqual(5);
    const quoteTexts = BRAND_QUOTES.map((q) => q.quote);
    expect(quoteTexts).toContain('Every great idea starts with a curious mind.');
    expect(quoteTexts).toContain('Learning today. Building tomorrow.');
    expect(quoteTexts).toContain('Curiosity is where great learning begins.');
    expect(quoteTexts).toContain('Give your ideas a place to grow.');
    expect(quoteTexts).toContain('The next great creator could be your child.');
  });

  it('dynamically selects a quote from the collection', () => {
    const quote = getRandomQuote();
    expect(quote).toBeDefined();
    expect(BRAND_QUOTES.some((q) => q.id === quote.id)).toBe(true);
  });

  it('updates session storage to prevent immediate consecutive repeats', () => {
    const q1 = getRandomQuote();
    expect(globalThis.window.sessionStorage.getItem('last_codeyoung_quote_id')).toBe(q1.id);
  });
});

