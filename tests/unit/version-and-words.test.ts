import { describe, expect, it } from 'vitest';
import { APP_VERSION } from '../../src/version.ts';
import { WHATS_NEW } from '../../src/content/whats-new.ts';
import { wordProblems } from '../helpers/checks.ts';

describe('APP_VERSION', () => {
  it('uses the YYYY.MM.DD-N format', () => {
    expect(APP_VERSION).toMatch(/^\d{4}\.\d{2}\.\d{2}-\d+$/);
  });

  it('has a What’s New entry at the top', () => {
    expect(WHATS_NEW[0]?.version).toBe(APP_VERSION);
  });

  it('What’s New versions are unique and newest first', () => {
    const versions = WHATS_NEW.map((e) => e.version);
    expect(new Set(versions).size).toBe(versions.length);
    const key = (v: string) => v.replace(/-(\d+)$/, (_, n: string) => `-${n.padStart(4, '0')}`);
    expect([...versions].sort((a, b) => key(b).localeCompare(key(a)))).toEqual(versions);
  });
});

describe('What’s New reads like the PA announcer, not a changelog', () => {
  const changelogWords =
    /\b(fix(e[sd])?|bugs?|refactor(ed)?|added|removed|changelog|deprecated|improved|updated|implemented|release notes?)\b/i;
  for (const entry of WHATS_NEW) {
    const text = [entry.headline, ...entry.lines].join('\n');
    it(`${entry.version}: house word rules`, () => {
      expect(wordProblems(text)).toEqual([]);
      expect(text).not.toContain('!');
      expect(text).not.toMatch(changelogWords);
    });
  }

  it('bites: the word rules catch planted mistakes', () => {
    expect(wordProblems('Fixed — it now works')).toContain('em dash');
    expect(wordProblems("It's here")).toContain('straight quote or apostrophe (use curly ones)');
    expect(wordProblems('Saved 2026-11-10')).toContain('ISO date on screen');
    expect(wordProblems('Big win ⚾')).toContain('emoji');
    expect(wordProblems('Settings ⚙️')).toEqual([]);
    expect(wordProblems('Toggle the switch')).toHaveLength(1);
  });
});
