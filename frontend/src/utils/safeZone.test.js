import { describe, expect, it } from 'vitest';
import { safeZonePalette, slackTier } from './safeZone';
describe('slackTier', () => {
    it('treats missing slack as nominal', () => {
        expect(slackTier(undefined)).toBe('nominal');
        expect(slackTier(null)).toBe('nominal');
        expect(slackTier(NaN)).toBe('nominal');
    });
    it('returns nominal at and above the caution threshold (15 m)', () => {
        expect(slackTier(15)).toBe('nominal');
        expect(slackTier(50)).toBe('nominal');
    });
    it('returns caution between 0 and 15 m', () => {
        expect(slackTier(14.99)).toBe('caution');
        expect(slackTier(5)).toBe('caution');
        expect(slackTier(0)).toBe('caution');
    });
    it('returns danger when slack drops below zero', () => {
        expect(slackTier(-0.01)).toBe('danger');
        expect(slackTier(-25)).toBe('danger');
    });
});
describe('safeZonePalette', () => {
    it('maps tiers to distinct gradient cores', () => {
        const nominal = safeZonePalette(40).core;
        const caution = safeZonePalette(10).core;
        const danger = safeZonePalette(-5).core;
        expect(new Set([nominal, caution, danger]).size).toBe(3);
    });
});
