import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setScoreBadge, clearBadge } from './badge';

describe('badge module', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', {
      action: {
        setBadgeText: vi.fn(async () => {}),
        setBadgeBackgroundColor: vi.fn(async () => {}),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('setScoreBadge', () => {
    it('sets badge text to score value', async () => {
      await setScoreBadge(85);
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '85' });
    });

    it('uses green color for score >= 70', async () => {
      await setScoreBadge(70);
      expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#16a34a' });
    });

    it('uses green color for high score', async () => {
      await setScoreBadge(95);
      expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#16a34a' });
    });

    it('uses yellow color for score between 40 and 69', async () => {
      await setScoreBadge(55);
      expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#ca8a04' });
    });

    it('uses yellow color for score exactly 40', async () => {
      await setScoreBadge(40);
      expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#ca8a04' });
    });

    it('uses red color for score < 40', async () => {
      await setScoreBadge(25);
      expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#dc2626' });
    });

    it('uses red color for score 0', async () => {
      await setScoreBadge(0);
      expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#dc2626' });
    });
  });

  describe('clearBadge', () => {
    it('clears badge text to empty string', async () => {
      await clearBadge();
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
    });
  });
});
