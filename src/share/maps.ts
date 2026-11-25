/*
 * Directions (Steve, Nov 25): a park's name as an Apple Maps link. On iPhone it opens the Maps app
 * (or the maps app the person picked as default, where iOS allows one) with directions from where
 * they are. Nothing is sent anywhere until they tap it, and then only the park's name.
 */

/** "Rolland Moore Park #3" → "Rolland Moore Park": the field number means nothing to a map. */
export function placeName(park: string): string {
  return park
    .replace(/\s*[,·-]?\s*(#\s*\d+|field\s*\d+|diamond\s*\d+)\s*$/i, '')
    .trim();
}

/** An Apple Maps directions link to the park. */
export function directionsUrl(park: string): string {
  return `https://maps.apple.com/?daddr=${encodeURIComponent(placeName(park))}&dirflg=d`;
}
