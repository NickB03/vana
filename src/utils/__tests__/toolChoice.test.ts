import { describe, it, expect } from 'vitest';
import { getToolChoice, getModeHint } from '../toolChoice';

describe('getToolChoice', () => {
  it('always returns auto when image mode enabled', () => {
    expect(getToolChoice(true, false)).toBe('auto');
  });

  it('always returns auto when both modes enabled', () => {
    expect(getToolChoice(true, true)).toBe('auto');
  });

  it('always returns auto when artifact mode enabled', () => {
    expect(getToolChoice(false, true)).toBe('auto');
  });

  it('returns auto when no modes enabled', () => {
    expect(getToolChoice(false, false)).toBe('auto');
  });
});

describe('getModeHint', () => {
  it('returns image hint when image mode enabled', () => {
    expect(getModeHint(true, false)).toBe('image');
  });

  it('prefers image hint over artifact hint when both enabled', () => {
    expect(getModeHint(true, true)).toBe('image');
  });

  it('returns artifact hint when artifact mode enabled', () => {
    expect(getModeHint(false, true)).toBe('artifact');
  });

  it('returns auto when no modes enabled', () => {
    expect(getModeHint(false, false)).toBe('auto');
  });
});
