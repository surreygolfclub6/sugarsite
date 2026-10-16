type PlaceName = { name: string; county: string | null; nation: string };

// "Colchester, Essex", but "Reading, England" rather than "Reading, Reading" when the county repeats the name.
export const placeLabel = (p: PlaceName) => `${p.name}, ${p.county && p.county !== p.name ? p.county : p.nation}`;
