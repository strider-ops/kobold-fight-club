// Fisher-Yates shuffle algorithm
// via http://bost.ocks.org/mike/shuffle/

/**
 * Shuffles an array in place using Fisher-Yates algorithm
 * @param array - Array to shuffle (will be modified)
 * @returns The same array (shuffled)
 */
export function shuffle<T>(array: T[]): T[] {
  let m = array.length;
  let t: T;
  let i: number;

  while (m) {
    i = Math.floor(Math.random() * m--);

    t = array[m];
    array[m] = array[i];
    array[i] = t;
  }

  return array;
}
