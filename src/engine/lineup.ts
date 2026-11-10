/*
 * Lineup checks that don't need a screen. Mixed (coed) League ratio rules:
 * batting order men ≤ women/non-male + 1; on defense men ≤ women/non-male.
 */
export type Gender = 'm' | 'f' | 'x';

export interface RatioProblem {
  where: 'batting' | 'defense';
  men: number;
  others: number;
}

export function mixedRatioProblems(
  batting: readonly string[],
  fielding: readonly string[],
  gender: (player: string) => Gender | undefined,
): RatioProblem[] {
  const tally = (list: readonly string[]) => {
    let men = 0;
    let others = 0;
    for (const p of list) {
      const g = gender(p);
      if (g === 'm') men += 1;
      else if (g) others += 1;
    }
    return { men, others };
  };
  const problems: RatioProblem[] = [];
  const b = tally(batting);
  if (b.men > b.others + 1) problems.push({ where: 'batting', ...b });
  const d = tally(fielding);
  if (d.men > d.others) problems.push({ where: 'defense', ...d });
  return problems;
}
