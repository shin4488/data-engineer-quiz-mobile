/** 0以上1未満を返す乱数。テストでは固定の列に差し替える。 */
export type Rng = () => number;

/** Fisher–Yates で並べ替えた新しい配列を返す。 */
export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  return result;
}
