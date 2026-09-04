/**
 * Hand-maintained sub-continental grouping, merged into the generated output by
 * build-data.mjs. See docs/PLAN.md §10.
 *
 * The six continents are too coarse for the identify-mode distractor engine: "same
 * continent as Slovakia" is 45 countries, which is not a hard question. These 18 groups
 * are the grain at which a set of wrong answers becomes genuinely confusable -- four
 * Caribbean islands, or four Sahel states.
 *
 * Keyed by country name rather than M49, because this is a table a human reads and
 * edits. build-data.mjs asserts every name resolves to one of the 195 and that all 195
 * are covered exactly once, so a typo fails the build rather than silently dropping a
 * country out of the engine.
 *
 * Two invariants the generator also asserts, both of which caught a bug in the first
 * draft of this table:
 *
 *  1. No group name may collide with a continent name unless it holds exactly that
 *     continent's countries. "North America" as a name for Canada/US/Mexico was wrong:
 *     the continent of that name has 23 members, including Central America and the
 *     Caribbean. It is `Northern America` here.
 *  2. No group may span two continents. "Russia, Caucasus & Central Asia" did -- Russia
 *     is Europe, the other eight are Asia -- which breaks the medium difficulty tier,
 *     defined as "same continent, different sub-region".
 *
 * Note the two deliberate name matches: `Oceania` and `South America` hold exactly their
 * continent's countries, so those names are correct rather than colliding.
 */
export const REGIONS = {
  // --- Africa ---------------------------------------------------------------------
  'North Africa': ['Algeria', 'Egypt', 'Libya', 'Morocco', 'Sudan', 'Tunisia'],

  'West Africa': [
    'Benin', 'Burkina Faso', 'Cape Verde', 'Gambia', 'Ghana', 'Guinea', 'Guinea-Bissau',
    'Ivory Coast', 'Liberia', 'Mali', 'Mauritania', 'Niger', 'Nigeria', 'Senegal',
    'Sierra Leone', 'Togo',
  ],

  'Central & East Africa': [
    'Burundi', 'Cameroon', 'Central African Republic', 'Chad', 'DR Congo', 'Djibouti',
    'Equatorial Guinea', 'Eritrea', 'Ethiopia', 'Gabon', 'Kenya',
    'Republic of the Congo', 'Rwanda', 'Somalia', 'South Sudan', 'São Tomé and Príncipe',
    'Tanzania', 'Uganda',
  ],

  'Southern Africa': [
    'Angola', 'Botswana', 'Comoros', 'Eswatini', 'Lesotho', 'Madagascar', 'Malawi',
    'Mauritius', 'Mozambique', 'Namibia', 'Seychelles', 'South Africa', 'Zambia',
    'Zimbabwe',
  ],

  // --- Asia -----------------------------------------------------------------------
  'Middle East': [
    'Bahrain', 'Iran', 'Iraq', 'Israel', 'Jordan', 'Kuwait', 'Lebanon', 'Oman',
    'Palestine', 'Qatar', 'Saudi Arabia', 'Syria', 'Türkiye', 'United Arab Emirates',
    'Yemen',
  ],

  // Russia is NOT here -- its continent is Europe, and a group may not span two.
  'Caucasus & Central Asia': [
    'Armenia', 'Azerbaijan', 'Georgia', 'Kazakhstan', 'Kyrgyzstan', 'Tajikistan',
    'Turkmenistan', 'Uzbekistan',
  ],

  'South Asia': [
    'Afghanistan', 'Bangladesh', 'Bhutan', 'India', 'Maldives', 'Nepal', 'Pakistan',
    'Sri Lanka',
  ],

  // Only 5, so a six-option hard set has to fall through to the continent. Expected.
  'East Asia': ['China', 'Japan', 'Mongolia', 'North Korea', 'South Korea'],

  'Southeast Asia': [
    'Brunei', 'Cambodia', 'Indonesia', 'Laos', 'Malaysia', 'Myanmar', 'Philippines',
    'Singapore', 'Thailand', 'Timor-Leste', 'Vietnam',
  ],

  // --- Europe ---------------------------------------------------------------------
  'Northern Europe': [
    'Denmark', 'Estonia', 'Finland', 'Iceland', 'Ireland', 'Latvia', 'Lithuania',
    'Norway', 'Sweden', 'United Kingdom',
  ],

  'Western Europe': [
    'Andorra', 'Austria', 'Belgium', 'France', 'Germany', 'Liechtenstein', 'Luxembourg',
    'Monaco', 'Netherlands', 'Switzerland',
  ],

  'Southern Europe': [
    'Cyprus', 'Greece', 'Italy', 'Malta', 'Portugal', 'San Marino', 'Spain',
    'Vatican City',
  ],

  'Eastern Europe & Russia': [
    'Albania', 'Belarus', 'Bosnia and Herzegovina', 'Bulgaria', 'Croatia', 'Czechia',
    'Hungary', 'Moldova', 'Montenegro', 'North Macedonia', 'Poland', 'Romania', 'Russia',
    'Serbia', 'Slovakia', 'Slovenia', 'Ukraine',
  ],

  // --- North America --------------------------------------------------------------
  // Only 3, so this degrades to the continent like East Asia. Mexico sits here rather
  // than in Central America; UN M49 puts it the other way, and either works.
  'Northern America': ['Canada', 'Mexico', 'United States'],

  'Central America': [
    'Belize', 'Costa Rica', 'El Salvador', 'Guatemala', 'Honduras', 'Nicaragua', 'Panama',
  ],

  'Caribbean': [
    'Antigua and Barbuda', 'Bahamas', 'Barbados', 'Cuba', 'Dominica',
    'Dominican Republic', 'Grenada', 'Haiti', 'Jamaica', 'Saint Kitts and Nevis',
    'Saint Lucia', 'Saint Vincent and the Grenadines', 'Trinidad and Tobago',
  ],

  // --- Oceania / South America ------------------------------------------------------
  // Both hold exactly their continent's countries, so the shared name is correct.
  'Oceania': [
    'Australia', 'Fiji', 'Kiribati', 'Marshall Islands', 'Micronesia', 'Nauru',
    'New Zealand', 'Palau', 'Papua New Guinea', 'Samoa', 'Solomon Islands', 'Tonga',
    'Tuvalu', 'Vanuatu',
  ],

  'South America': [
    'Argentina', 'Bolivia', 'Brazil', 'Chile', 'Colombia', 'Ecuador', 'Guyana',
    'Paraguay', 'Peru', 'Suriname', 'Uruguay', 'Venezuela',
  ],
};
