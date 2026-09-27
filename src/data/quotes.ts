/**
 * Predefined collection of Codeyoung-style inspiration quotes
 * for dynamic display on the public website.
 */
export interface BrandQuote {
  id: string;
  quote: string;
  author?: string;
  category: 'curiosity' | 'learning' | 'creation' | 'future';
}

export const BRAND_QUOTES: BrandQuote[] = [
  {
    id: 'quote-1',
    quote: 'Every great idea starts with a curious mind.',
    category: 'curiosity',
  },
  {
    id: 'quote-2',
    quote: 'Learning today. Building tomorrow.',
    category: 'learning',
  },
  {
    id: 'quote-3',
    quote: 'Curiosity is where great learning begins.',
    category: 'curiosity',
  },
  {
    id: 'quote-4',
    quote: 'Give your ideas a place to grow.',
    category: 'creation',
  },
  {
    id: 'quote-5',
    quote: 'The next great creator could be your child.',
    category: 'future',
  },
  {
    id: 'quote-6',
    quote: 'From playing games to coding worlds.',
    category: 'creation',
  },
  {
    id: 'quote-7',
    quote: 'Nurturing problem solvers and digital leaders.',
    category: 'learning',
  },
  {
    id: 'quote-8',
    quote: 'Where young minds transform imagination into software.',
    category: 'future',
  },
];

/**
 * Returns a dynamically selected quote.
 * Uses sessionStorage to prevent immediate consecutive repeats during page transitions,
 * while ensuring different quotes appear across visits/reloads.
 */
export function getRandomQuote(): BrandQuote {
  if (typeof window === 'undefined') {
    return BRAND_QUOTES[0];
  }

  try {
    const lastQuoteId = window.sessionStorage.getItem('last_codeyoung_quote_id');
    const availableQuotes = BRAND_QUOTES.filter((q) => q.id !== lastQuoteId);
    const pool = availableQuotes.length > 0 ? availableQuotes : BRAND_QUOTES;
    const selected = pool[Math.floor(Math.random() * pool.length)];
    window.sessionStorage.setItem('last_codeyoung_quote_id', selected.id);
    return selected;
  } catch {
    const index = Math.floor(Math.random() * BRAND_QUOTES.length);
    return BRAND_QUOTES[index];
  }
}
