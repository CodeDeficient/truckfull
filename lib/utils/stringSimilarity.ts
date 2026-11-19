export function diceCoefficient(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  if (s1.length < 2 || s2.length < 2) return 0;
  if (s1 === s2) return 1;

  const bigrams1 = new Set<string>();
  for (let i = 0; i < s1.length - 1; i++) {
    bigrams1.add(s1.slice(i, i + 2));
  }

  const bigrams2 = new Set<string>();
  for (let i = 0; i < s2.length - 1; i++) {
    bigrams2.add(s2.slice(i, i + 2));
  }

  let intersectionSize = 0;
  for (const bigram of bigrams2) {
    if (bigrams1.has(bigram)) {
      intersectionSize++;
    }
  }

  const totalBigrams = bigrams1.size + bigrams2.size;
  if (totalBigrams === 0) return 0;

  return (2 * intersectionSize) / totalBigrams;
}
