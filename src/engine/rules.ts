/*
 * League rules and the rule sets database. Built-in sets come from
 * docs/FORT_COLLINS_RULES.md. See docs/SPEC.md §3.
 */

export type HrRule =
  | { kind: 'unlimited' }
  /** A team this many HRs ahead of the other can't hit another (+2 differential). */
  | { kind: 'differential'; gap: number }
  /** Each team gets this many HRs per game. */
  | { kind: 'perGame'; max: number };

export interface CountRules {
  /** Balls for a walk (Fort Collins 3). */
  walkAt: number;
  /** Strikes for an out (Fort Collins 2). */
  outAt: number;
  /** Start at 1–1 (1, 1) or 0–0. */
  startBalls: number;
  startStrikes: number;
  /** A foul on the last strike is an out (FBO). */
  foulOut: boolean;
  /** One courtesy foul on the last strike before a foul is an out. */
  courtesyFoul: boolean;
}

export interface RunRule {
  runs: number;
  after: number;
}

export interface Rules {
  innings: number;
  /** Minutes; 0 = no time limit. The clock starts at the coin toss. */
  timeLimit: number;
  /** Extra innings when tied after regulation: a number, or until decided. */
  extras: number | 'untilDecided';
  /** A game still tied after its extra innings ends in a tie. */
  allowTie: boolean;
  /** "N runs after inning X". The home team wins the moment it's that far ahead. */
  runRule: RunRule[];
  hr: HrRule;
  /** Courtesy runners per team per inning; 0 = none. */
  courtesyPerInning: number;
  /** Runs per half-inning; 0 = no limit. The final inning has no limit. */
  runLimit: number;
  /** An inning that begins with fewer than this many minutes left is the final inning. */
  runLimitFinalMinutes: number;
  /** In extra innings the last batter of the previous inning starts on 2nd. */
  tbRunner: boolean;
  count: CountRules;
  /** Mixed (coed) League: the walk rule and lineup ratio checks. */
  mixed: boolean;
}

export interface RuleSet {
  id: string;
  name: string;
  rules: Rules;
  builtIn?: boolean;
  /** Where the rules came from, for League Notes. */
  source?: string;
}

const FORT_COLLINS_SOURCE = 'City of Fort Collins Adult Softball Rules, updated May 2026';

const fortCollinsBase: Rules = {
  innings: 7,
  timeLimit: 55,
  extras: 1,
  allowTie: true,
  runRule: [
    { runs: 20, after: 3 },
    { runs: 15, after: 4 },
    { runs: 10, after: 5 },
  ],
  hr: { kind: 'differential', gap: 2 },
  courtesyPerInning: 1,
  runLimit: 0,
  runLimitFinalMinutes: 10,
  tbRunner: true,
  count: { walkAt: 3, outAt: 2, startBalls: 0, startStrikes: 0, foulOut: true, courtesyFoul: false },
  mixed: false,
};

export const BUILT_IN_RULE_SETS: readonly RuleSet[] = [
  {
    id: 'fc-2hr',
    name: 'Fort Collins: 2+ HR Division',
    builtIn: true,
    source: FORT_COLLINS_SOURCE,
    rules: fortCollinsBase,
  },
  {
    id: 'fc-1hr',
    name: 'Fort Collins: 1 HR Division',
    builtIn: true,
    source: FORT_COLLINS_SOURCE,
    rules: { ...fortCollinsBase, hr: { kind: 'perGame', max: 1 } },
  },
  {
    id: 'fc-rec',
    name: 'Fort Collins: Recreational',
    builtIn: true,
    source: FORT_COLLINS_SOURCE,
    rules: { ...fortCollinsBase, hr: { kind: 'perGame', max: 1 }, runLimit: 5 },
  },
  {
    id: 'basic',
    name: 'Basic Slowpitch',
    builtIn: true,
    rules: {
      innings: 7,
      timeLimit: 0,
      extras: 'untilDecided',
      allowTie: false,
      runRule: [
        { runs: 20, after: 3 },
        { runs: 15, after: 4 },
        { runs: 10, after: 5 },
      ],
      hr: { kind: 'unlimited' },
      courtesyPerInning: 1,
      runLimit: 0,
      runLimitFinalMinutes: 10,
      tbRunner: false,
      count: { walkAt: 4, outAt: 3, startBalls: 1, startStrikes: 1, foulOut: true, courtesyFoul: false },
      mixed: false,
    },
  },
];

export const DEFAULT_RULE_SET_ID = 'fc-2hr';

export function defaultRules(): Rules {
  return cloneRules(ruleSetById(DEFAULT_RULE_SET_ID, [])!.rules);
}

export function cloneRules(rules: Rules): Rules {
  return structuredClone(rules);
}

export function allRuleSets(saved: readonly RuleSet[]): RuleSet[] {
  return [...BUILT_IN_RULE_SETS, ...saved];
}

export function ruleSetById(id: string, saved: readonly RuleSet[]): RuleSet | undefined {
  return allRuleSets(saved).find((s) => s.id === id);
}

/** Two rule objects say the same thing (order of run-rule rows doesn't matter). */
export function sameRules(a: Rules, b: Rules): boolean {
  return canonical(a) === canonical(b);
}

function canonical(r: Rules): string {
  const runRule = [...r.runRule].sort((x, y) => x.after - y.after || x.runs - y.runs);
  const hr =
    r.hr.kind === 'unlimited'
      ? { kind: 'unlimited' }
      : r.hr.kind === 'differential'
        ? { kind: 'differential', gap: r.hr.gap }
        : { kind: 'perGame', max: r.hr.max };
  const count = {
    walkAt: r.count.walkAt,
    outAt: r.count.outAt,
    startBalls: r.count.startBalls,
    startStrikes: r.count.startStrikes,
    foulOut: r.count.foulOut,
    courtesyFoul: r.count.courtesyFoul,
  };
  return JSON.stringify([
    r.innings,
    r.timeLimit,
    r.extras,
    r.allowTie,
    runRule.map((x) => [x.runs, x.after]),
    hr,
    r.courtesyPerInning,
    r.runLimit,
    r.runLimitFinalMinutes,
    r.tbRunner,
    count,
    r.mixed,
  ]);
}

/**
 * The rule set these rules match, or 'custom' when any rule was changed.
 * Built-in sets win ties with saved sets of the same rules.
 */
export function matchRuleSet(rules: Rules, saved: readonly RuleSet[]): string {
  return allRuleSets(saved).find((s) => sameRules(s.rules, rules))?.id ?? 'custom';
}

/** Save as Rule Set: returns the new saved list. Names must be unique and not blank. */
export function saveRuleSet(
  saved: readonly RuleSet[],
  name: string,
  rules: Rules,
  makeId: () => string,
): { saved: RuleSet[]; error?: 'blank' | 'duplicate' } {
  const clean = name.trim().replace(/\s+/g, ' ');
  if (!clean) return { saved: [...saved], error: 'blank' };
  const taken = allRuleSets(saved).some((s) => s.name.toLowerCase() === clean.toLowerCase());
  if (taken) return { saved: [...saved], error: 'duplicate' };
  return { saved: [...saved, { id: makeId(), name: clean, rules: cloneRules(rules) }] };
}

/** Saved sets can be deleted; built-in sets can't. */
export function deleteRuleSet(saved: readonly RuleSet[], id: string): RuleSet[] {
  return saved.filter((s) => s.id !== id);
}

/** Runs needed to end the game after `inning` completes (Infinity = no run rule yet). */
export function runRuleLead(rules: Rules, inning: number): number {
  let need = Infinity;
  for (const r of rules.runRule) if (inning >= r.after) need = Math.min(need, r.runs);
  return need;
}
