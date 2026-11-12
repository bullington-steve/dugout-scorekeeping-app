/*
 * The rules editor (SPEC §3): a Rule Set menu at the top that fills every
 * rule, every rule editable, "Custom" the moment one changes, Save as Rule
 * Set, and League Notes for the rules the app doesn't score.
 */
import type { App } from '../app/app.ts';
import { allRuleSets, cloneRules, matchRuleSet, ruleSetById, saveRuleSet, type HrRule, type Rules } from '../engine/rules.ts';
import { newId } from '../store/model.ts';
import { selectField, switchRow, textField } from './controls.ts';
import { h, setText } from './dom.ts';

const TIME_LIMITS = [0, 45, 50, 55, 60, 65, 70, 75, 80, 90];
const HR_OPTIONS: { value: string; label: string; rule: HrRule }[] = [
  { value: 'none', label: 'No Limit', rule: { kind: 'unlimited' } },
  { value: 'diff1', label: '+1 Differential', rule: { kind: 'differential', gap: 1 } },
  { value: 'diff2', label: '+2 Differential', rule: { kind: 'differential', gap: 2 } },
  { value: 'diff3', label: '+3 Differential', rule: { kind: 'differential', gap: 3 } },
  { value: 'per1', label: '1 Per Team', rule: { kind: 'perGame', max: 1 } },
  { value: 'per2', label: '2 Per Team', rule: { kind: 'perGame', max: 2 } },
  { value: 'per3', label: '3 Per Team', rule: { kind: 'perGame', max: 3 } },
];

function hrValue(r: HrRule): string {
  if (r.kind === 'unlimited') return 'none';
  return r.kind === 'differential' ? `diff${r.gap}` : `per${r.max}`;
}

const LEAGUE_NOTES = [
  'Commit line (Mixed and Senior): past the line between third and home, the runner can’t go back; touch the safety base to score.',
  'Courtesy runners: one per inning per gender (unlimited in Senior). The runner must be in the lineup and not due up.',
  'Bunting is an out. Stepping out of the box is an out.',
  'Mixed lineups: men may not outnumber women and non-male players by more than one in the batting order, and may not outnumber them on defense.',
  'Weather line: 970-416-2887. Lightning delays up to 20 minutes; games not reaching the end of the 4th or 40 minutes are replayed in full.',
];

export interface RulesEditorOptions {
  rules: Rules;
  ruleSetId: string;
  onChange: (rules: Rules, ruleSetId: string) => void;
}

/** Builds the editor once; edits update the Rule Set label in place (no redraw: LESSONS 15). */
export function rulesEditor(app: App, opts: RulesEditorOptions): HTMLElement {
  let rules = cloneRules(opts.rules);
  const sets = () => allRuleSets(app.data.ruleSets);
  const setSelect = h('select', { class: 'sk-input', id: `rs-${Math.random().toString(36).slice(2, 7)}` });
  const fillSets = () => {
    const current = matchRuleSet(rules, app.data.ruleSets);
    setSelect.replaceChildren(
      ...sets().map((s) => h('option', { value: s.id, selected: s.id === current }, s.name)),
      ...(current === 'custom' ? [h('option', { value: 'custom', selected: true }, 'Custom')] : []),
    );
  };
  const changed = () => {
    fillSets();
    opts.onChange(cloneRules(rules), matchRuleSet(rules, app.data.ruleSets));
  };
  fillSets();
  const fields = h('div', { class: 'sk-stack' });
  const draw = () => fields.replaceChildren(...ruleFields());
  setSelect.addEventListener('change', () => {
    const set = ruleSetById(setSelect.value, app.data.ruleSets);
    if (!set) return;
    rules = cloneRules(set.rules);
    changed();
    draw();
  });

  const ruleFields = (): Node[] => {
    const set = <K extends keyof Rules>(k: K, v: Rules[K]) => {
      rules[k] = v;
      changed();
    };
    const runRules = h('div', { class: 'sk-stack rl-runrules' });
    const drawRunRules = () => {
      runRules.replaceChildren(
        ...rules.runRule.map((rr, i) => {
          const remove = h('button', { type: 'button', class: 'sk-quiet-danger', 'aria-label': `Remove ${rr.runs} after ${rr.after}` }, 'Remove');
          remove.addEventListener('click', () => {
            rules.runRule.splice(i, 1);
            changed();
            drawRunRules();
          });
          return h(
            'div',
            { class: 'rl-runrule' },
            selectField('Runs Ahead', [5, 8, 10, 12, 15, 20, 25].map((n) => ({ value: String(n), label: String(n) })), String(rr.runs), (v) => {
              rr.runs = Number(v);
              changed();
            }),
            selectField('After Inning', [1, 2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: String(n) })), String(rr.after), (v) => {
              rr.after = Number(v);
              changed();
            }),
            remove,
          );
        }),
      );
    };
    drawRunRules();
    const addRun = h('button', { type: 'button', class: 'sk-key' }, '+ Add Run Rule');
    addRun.addEventListener('click', () => {
      rules.runRule.push({ runs: 10, after: 5 });
      changed();
      drawRunRules();
    });
    const extras = rules.extras === 'untilDecided' ? 'until' : String(rules.extras);
    return [
      selectField('Innings', [3, 4, 5, 6, 7, 8, 9].map((n) => ({ value: String(n), label: String(n) })), String(rules.innings), (v) => set('innings', Number(v))),
      selectField('Time Limit', TIME_LIMITS.map((n) => ({ value: String(n), label: n ? `${n} Minutes` : 'None' })), String(rules.timeLimit), (v) => set('timeLimit', Number(v))),
      selectField(
        'Extra Innings When Tied',
        [
          { value: '0', label: 'None' },
          { value: '1', label: '1' },
          { value: '2', label: '2' },
          { value: '3', label: '3' },
          { value: 'until', label: 'Until Decided' },
        ],
        extras,
        (v) => set('extras', v === 'until' ? 'untilDecided' : Number(v)),
      ),
      switchRow('Games Can End in a Tie', rules.allowTie, (v) => set('allowTie', v)),
      h('p', { class: 'sk-field-label' }, 'Run Rule'),
      runRules,
      addRun,
      selectField('Home Run Limit', HR_OPTIONS.map((o) => ({ value: o.value, label: o.label })), hrValue(rules.hr), (v) => set('hr', structuredClone(HR_OPTIONS.find((o) => o.value === v)!.rule))),
      selectField('Courtesy Runners per Inning', [0, 1, 2].map((n) => ({ value: String(n), label: n ? String(n) : 'None' })), String(rules.courtesyPerInning), (v) => set('courtesyPerInning', Number(v))),
      selectField('Run Limit per Inning', [0, 3, 4, 5, 6, 7, 8, 10].map((n) => ({ value: String(n), label: n ? String(n) : 'None' })), String(rules.runLimit), (v) => set('runLimit', Number(v))),
      h('p', { class: 'sk-row-note' }, 'The final inning has no run limit: the last inning, or one that begins with under 10 minutes left.'),
      switchRow('Tiebreak Runner on Second', rules.tbRunner, (v) => set('tbRunner', v), 'In extra innings, the last batter of the previous inning starts on second.'),
      switchRow('Mixed League', rules.mixed, (v) => set('mixed', v), 'Three straight balls sends the batter to second, and lineups get the ratio check.'),
      h('p', { class: 'sk-field-label' }, 'Balls and Strikes'),
      switchRow('Start at 1–1', rules.count.startBalls === 1, (v) => {
        rules.count.startBalls = v ? 1 : 0;
        rules.count.startStrikes = v ? 1 : 0;
        changed();
      }),
      selectField('Balls for a Walk', [3, 4].map((n) => ({ value: String(n), label: String(n) })), String(rules.count.walkAt), (v) => {
        rules.count.walkAt = Number(v);
        changed();
      }),
      selectField('Strikes for an Out', [2, 3].map((n) => ({ value: String(n), label: String(n) })), String(rules.count.outAt), (v) => {
        rules.count.outAt = Number(v);
        changed();
      }),
      switchRow('Foul on the Last Strike Is Out', rules.count.foulOut, (v) => {
        rules.count.foulOut = v;
        changed();
      }),
      switchRow('One Courtesy Foul', rules.count.courtesyFoul, (v) => {
        rules.count.courtesyFoul = v;
        changed();
      }),
    ];
  };
  draw();

  let saveName = '';
  const saveStatus = h('p', { class: 'sh-status', role: 'status' });
  const save = h('button', { type: 'button', class: 'sk-key' }, 'Save as Rule Set');
  save.addEventListener('click', () => {
    const result = saveRuleSet(app.data.ruleSets, saveName, rules, newId);
    if (result.error) {
      setText(saveStatus, result.error === 'blank' ? 'Give the rule set a name first.' : 'A rule set already has that name.');
      return;
    }
    app.commit((d) => (d.ruleSets = result.saved));
    setText(saveStatus, `Saved as ${saveName.trim()}.`);
    changed();
  });

  const id = setSelect.id;
  return h(
    'div',
    { class: 'sk-stack rl-editor' },
    h('div', { class: 'sk-field' }, h('label', { for: id, class: 'sk-field-label' }, 'Rule Set'), setSelect),
    h('p', { class: 'sk-row-note' }, 'Pick your league’s rules in one tap. Any rule below can still be changed for this game.'),
    fields,
    textField('New Rule Set Name', '', (v) => (saveName = v), { autocapitalize: 'words', placeholder: 'Summer League' }),
    save,
    saveStatus,
    h('details', { class: 'sk-details' }, h('summary', {}, 'League Notes'), h('p', {}, 'Rules ScoreKept doesn’t score, from the City of Fort Collins Adult Softball Rules:'), ...LEAGUE_NOTES.map((n) => h('p', {}, n))),
  );
}
