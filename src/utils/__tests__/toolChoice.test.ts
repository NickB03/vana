import { describe, it, expect } from 'vitest';
import { getToolChoice } from '../toolChoice';

describe('getToolChoice', () => {
  it('prefers image mode when enabled', () => {
    expect(getToolChoice(true, false)).toBe('generate_image');
  });

  it('prefers image mode over artifact mode when both enabled', () => {
    expect(getToolChoice(true, true)).toBe('generate_image');
  });

  it('returns generate_artifact when artifact mode enabled', () => {
    expect(getToolChoice(false, true)).toBe('generate_artifact');
  });

  it('returns auto when no modes enabled', () => {
    expect(getToolChoice(false, false)).toBe('auto');
  });
});
