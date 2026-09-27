export interface TimezoneOption {
  iana: string;
  label: string;
  shortName: string;
  country: string;
  flag: string;
  continent: string;
}

export const POPULAR_TIMEZONES: TimezoneOption[] = [
  {
    iana: 'Asia/Kolkata',
    country: 'India',
    flag: '🇮🇳',
    shortName: 'IST',
    label: 'India · IST',
    continent: 'Asia',
  },
  {
    iana: 'Europe/London',
    country: 'United Kingdom',
    flag: '🇬🇧',
    shortName: 'GMT / BST',
    label: 'United Kingdom · GMT/BST',
    continent: 'Europe',
  },
  {
    iana: 'America/New_York',
    country: 'United States',
    flag: '🇺🇸',
    shortName: 'Eastern (ET)',
    label: 'United States · Eastern Time',
    continent: 'Americas',
  },
  {
    iana: 'America/Chicago',
    country: 'United States',
    flag: '🇺🇸',
    shortName: 'Central (CT)',
    label: 'United States · Central Time',
    continent: 'Americas',
  },
  {
    iana: 'America/Denver',
    country: 'United States',
    flag: '🇺🇸',
    shortName: 'Mountain (MT)',
    label: 'United States · Mountain Time',
    continent: 'Americas',
  },
  {
    iana: 'America/Los_Angeles',
    country: 'United States',
    flag: '🇺🇸',
    shortName: 'Pacific (PT)',
    label: 'United States · Pacific Time',
    continent: 'Americas',
  },
  {
    iana: 'America/Toronto',
    country: 'Canada',
    flag: '🇨🇦',
    shortName: 'Eastern (ET)',
    label: 'Canada · Eastern Time',
    continent: 'Americas',
  },
  {
    iana: 'America/Vancouver',
    country: 'Canada',
    flag: '🇨🇦',
    shortName: 'Pacific (PT)',
    label: 'Canada · Pacific Time',
    continent: 'Americas',
  },
  {
    iana: 'Australia/Sydney',
    country: 'Australia',
    flag: '🇦🇺',
    shortName: 'AEST / AEDT',
    label: 'Australia · Sydney / Melbourne',
    continent: 'Oceania',
  },
  {
    iana: 'Australia/Perth',
    country: 'Australia',
    flag: '🇦🇺',
    shortName: 'AWST',
    label: 'Australia · Perth',
    continent: 'Oceania',
  },
  {
    iana: 'Asia/Singapore',
    country: 'Singapore',
    flag: '🇸🇬',
    shortName: 'SGT',
    label: 'Singapore · SGT',
    continent: 'Asia',
  },
  {
    iana: 'Asia/Dubai',
    country: 'UAE',
    flag: '🇦🇪',
    shortName: 'GST',
    label: 'United Arab Emirates · GST',
    continent: 'Middle East',
  },
  {
    iana: 'Asia/Riyadh',
    country: 'Saudi Arabia',
    flag: '🇸🇦',
    shortName: 'AST',
    label: 'Saudi Arabia · AST',
    continent: 'Middle East',
  },
  {
    iana: 'Asia/Qatar',
    country: 'Qatar',
    flag: '🇶🇦',
    shortName: 'AST',
    label: 'Qatar · AST',
    continent: 'Middle East',
  },
  {
    iana: 'Europe/Berlin',
    country: 'Germany',
    flag: '🇩🇪',
    shortName: 'CET / CEST',
    label: 'Germany · CET',
    continent: 'Europe',
  },
  {
    iana: 'Europe/Paris',
    country: 'France',
    flag: '🇫🇷',
    shortName: 'CET / CEST',
    label: 'France · CET',
    continent: 'Europe',
  },
  {
    iana: 'Europe/Dublin',
    country: 'Ireland',
    flag: '🇮🇪',
    shortName: 'GMT / IST',
    label: 'Ireland · Dublin',
    continent: 'Europe',
  },
  {
    iana: 'Asia/Tokyo',
    country: 'Japan',
    flag: '🇯🇵',
    shortName: 'JST',
    label: 'Japan · JST',
    continent: 'Asia',
  },
  {
    iana: 'Asia/Hong_Kong',
    country: 'Hong Kong',
    flag: '🇭🇰',
    shortName: 'HKT',
    label: 'Hong Kong · HKT',
    continent: 'Asia',
  },
  {
    iana: 'Asia/Kuala_Lumpur',
    country: 'Malaysia',
    flag: '🇲🇾',
    shortName: 'MYT',
    label: 'Malaysia · MYT',
    continent: 'Asia',
  },
  {
    iana: 'Asia/Manila',
    country: 'Philippines',
    flag: '🇵🇭',
    shortName: 'PHT',
    label: 'Philippines · PHT',
    continent: 'Asia',
  },
  {
    iana: 'Asia/Jakarta',
    country: 'Indonesia',
    flag: '🇮🇩',
    shortName: 'WIB',
    label: 'Indonesia · WIB',
    continent: 'Asia',
  },
  {
    iana: 'Pacific/Auckland',
    country: 'New Zealand',
    flag: '🇳🇿',
    shortName: 'NZST / NZDT',
    label: 'New Zealand · Auckland',
    continent: 'Oceania',
  },
  {
    iana: 'Africa/Johannesburg',
    country: 'South Africa',
    flag: '🇿🇦',
    shortName: 'SAST',
    label: 'South Africa · SAST',
    continent: 'Africa',
  },
];

/**
 * Helper to match an IANA string to a user-friendly timezone descriptor
 */
export function getTimezoneDetails(iana: string): TimezoneOption {
  const match = POPULAR_TIMEZONES.find((t) => t.iana === iana);
  if (match) return match;

  // Derive readable name from IANA ID
  const parts = iana.split('/');
  const city = (parts[parts.length - 1] || iana).replace(/_/g, ' ');
  const continent = parts[0] || 'Global';

  let flag = '🌐';
  if (iana.includes('India') || iana.includes('Calcutta') || iana.includes('Kolkata')) flag = '🇮🇳';
  else if (iana.includes('London')) flag = '🇬🇧';
  else if (iana.includes('America') || iana.includes('US')) flag = '🇺🇸';
  else if (iana.includes('Australia')) flag = '🇦🇺';
  else if (iana.includes('Europe')) flag = '🇪🇺';
  else if (iana.includes('Asia')) flag = '🌏';

  return {
    iana,
    country: continent,
    flag,
    shortName: city,
    label: `${city} (${iana})`,
    continent,
  };
}
