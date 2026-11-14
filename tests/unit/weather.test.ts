import { describe, expect, it } from 'vitest';
import { skyWord, weatherLine } from '../../src/app/weather.ts';

describe('weather words', () => {
  it('turns weather codes into a scoreboard’s few words', () => {
    expect(skyWord(0)).toBe('Clear');
    expect(skyWord(2)).toBe('Partly Cloudy');
    expect(skyWord(3)).toBe('Cloudy');
    expect(skyWord(61)).toBe('Rain');
    expect(skyWord(81)).toBe('Rain');
    expect(skyWord(95)).toBe('Storms');
    expect(skyWord(42)).toBe('');
  });
  it('writes the Book’s line', () => {
    expect(weatherLine({ tempF: 74, sky: 'Clear', windMph: 6, at: 0 })).toBe('74° · Clear · Wind 6 mph');
    expect(weatherLine({ tempF: 51, sky: '', at: 0 })).toBe('51°');
  });
});
