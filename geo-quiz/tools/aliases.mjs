/**
 * Hand-maintained answer data, merged into the generated output by build-data.mjs.
 *
 * Alias policy (see docs/PLAN.md §5): an alias must be a legitimate short form of the
 * country's name. Accepted are abbreviations, established English exonyms, and former
 * official names. Colloquialisms that name something other than the country are NOT
 * accepted -- "America" is a continent, "Great Britain" excludes Northern Ireland,
 * "Holland" is two provinces of twelve.
 *
 * Keys are UN M49 codes, which is also how the map geometry is keyed.
 */

/** Extra accepted spellings for country names, on top of the canonical common name. */
export const COUNTRY_ALIASES = {
  '840': ['USA', 'US', 'United States of America'],
  '826': ['UK'],
  '784': ['UAE'],
  '140': ['CAR'],
  '643': ['Russian Federation'],
  '583': ['Federated States of Micronesia'],

  // Established English exonyms / official variants
  '384': ["Cote d'Ivoire"],
  '132': ['Cabo Verde'],
  '203': ['Czech Republic'],
  '336': ['Holy See'],
  '626': ['East Timor'],

  // Former official names. Accepted, but the list always renders the current name.
  '104': ['Burma'],
  '748': ['Swaziland'],
  '807': ['Macedonia'],
  '792': ['Turkey'],

  // The two Congos. "Congo" alone is ambiguous and handled below.
  '180': ['DRC', 'Democratic Republic of the Congo', 'Congo-Kinshasa'],
  '178': ['Congo-Brazzaville', 'Congo Republic'],
};

/**
 * Extra accepted capitals, on top of those in the source data. Covers countries with a
 * genuinely dual, contested or recently moved seat of government, plus transliterations.
 */
export const CAPITAL_ALIASES = {
  '528': ['The Hague'],                        // Netherlands
  '068': ['La Paz'],                           // Bolivia
  '144': ['Sri Jayawardenepura Kotte', 'Kotte'], // Sri Lanka
  '834': ['Dar es Salaam'],                    // Tanzania
  '384': ['Abidjan'],                          // Ivory Coast
  '104': ['Nay Pyi Taw', 'Yangon', 'Rangoon'], // Myanmar
  '840': ['Washington', 'Washington DC'],      // United States
  '804': ['Kiev'],                             // Ukraine (former transliteration)
};

/**
 * Inputs that name more than one country and are not themselves a country name.
 *
 * Checked only AFTER an exact match fails, so genuine country names that happen to be a
 * prefix of others -- Sudan, Guinea, Samoa, Niger -- never reach here and score normally.
 * Only these two qualify: neither "Congo" nor "Korea" is a country on its own.
 */
export const AMBIGUOUS = {
  congo: "Which one? Try 'DR Congo' or 'Republic of the Congo'.",
  korea: "Which one? Try 'North Korea' or 'South Korea'.",
};

/**
 * Names that are explicitly wrong for the country people mean, with an explanation.
 * Rejected, but worth saying why rather than just "not recognised".
 */
export const REJECTED = {
  america: 'That\'s a continent. Try the country\'s name.',
  britain: 'Great Britain excludes Northern Ireland. Try the full name.',
  'great britain': 'Great Britain excludes Northern Ireland. Try the full name.',
  england: 'England is one of four nations in a larger country.',
  scotland: 'Scotland is one of four nations in a larger country.',
  wales: 'Wales is one of four nations in a larger country.',
  holland: 'Holland is two provinces of twelve. Try the country\'s name.',
};
