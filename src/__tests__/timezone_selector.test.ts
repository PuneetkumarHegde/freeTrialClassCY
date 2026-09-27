import { describe, it, expect } from 'vitest';
import { POPULAR_TIMEZONES, getTimezoneDetails } from '../data/timezones';

describe('Timezone Data and Selection Logic', () => {
  it('contains predefined popular timezones including India, UK, and US regions', () => {
    const ianaList = POPULAR_TIMEZONES.map((t) => t.iana);

    // India
    expect(ianaList).toContain('Asia/Kolkata');

    // United Kingdom
    expect(ianaList).toContain('Europe/London');

    // US Regions
    expect(ianaList).toContain('America/New_York'); // Eastern
    expect(ianaList).toContain('America/Chicago');  // Central
    expect(ianaList).toContain('America/Denver');   // Mountain
    expect(ianaList).toContain('America/Los_Angeles'); // Pacific
  });

  it('correctly retrieves details for known IANA timezones', () => {
    const kolkata = getTimezoneDetails('Asia/Kolkata');
    expect(kolkata.country).toBe('India');
    expect(kolkata.flag).toBe('🇮🇳');
    expect(kolkata.shortName).toBe('IST');

    const london = getTimezoneDetails('Europe/London');
    expect(london.country).toBe('United Kingdom');
    expect(london.flag).toBe('🇬🇧');

    const newYork = getTimezoneDetails('America/New_York');
    expect(newYork.country).toBe('United States');
    expect(newYork.shortName).toBe('Eastern (ET)');
  });

  it('provides safe fallback details for custom/unlisted IANA timezones', () => {
    const custom = getTimezoneDetails('Pacific/Honolulu');
    expect(custom.iana).toBe('Pacific/Honolulu');
    expect(custom.shortName).toBe('Honolulu');
    expect(custom.label).toContain('Honolulu');
  });
});
