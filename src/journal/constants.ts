import type { Family, Palette } from './types';

export const STORAGE_KEY = 'scrapbook_entries_v2';

export const FAMILY_LABELS: Record<Family, string> = {
  scatter: 'Cozy & scattered',
  grid: 'Calm & orderly',
  filmstrip: 'Adventure filmstrip',
  circles: 'Playful & bright',
};

export const FAMILIES: Family[] = ['scatter', 'grid', 'filmstrip', 'circles'];

export const PALETTES: Palette[] = [
  { bg: '#f6f0e4', ink: '#3a3226', accent: '#c97b4a', tapes: ['#e8c4c4', '#c9dbe0', '#e6d9a8'] },
  { bg: '#eef1e6', ink: '#33421f', accent: '#7a8c4a', tapes: ['#d9e4c0', '#c4d8c9', '#f0e2a8'] },
  { bg: '#f3e8ea', ink: '#5c2b3a', accent: '#c46b8a', tapes: ['#f3c6d6', '#e8d6ea', '#f6e0c8'] },
  { bg: '#e7eef2', ink: '#233647', accent: '#4f7ea8', tapes: ['#c9dbe6', '#dce6c9', '#e8d8b8'] },
  { bg: '#f5ecd9', ink: '#4a3a20', accent: '#b8862f', tapes: ['#e8d5a0', '#d8c2a0', '#c9dbb8'] },
];

export const FONTS = ['Caveat', 'Kalam', 'Shadows Into Light', 'Homemade Apple'];
export const TEXTURES = ['cream', 'grid-paper', 'dot-paper', 'kraft', 'watercolor'];

export const TORN_CLIPS = [
  'polygon(2% 4%, 15% 0%, 30% 3%, 48% 0%, 65% 4%, 82% 1%, 98% 5%, 100% 20%, 97% 38%, 100% 55%, 96% 72%, 100% 88%, 94% 100%, 78% 97%, 60% 100%, 42% 96%, 25% 100%, 8% 95%, 0% 80%, 4% 62%, 0% 45%, 3% 28%, 0% 12%)',
  'polygon(0% 6%, 12% 2%, 28% 5%, 44% 1%, 60% 5%, 76% 2%, 92% 6%, 100% 15%, 98% 32%, 100% 50%, 96% 68%, 100% 85%, 90% 98%, 74% 95%, 58% 99%, 40% 95%, 22% 99%, 6% 94%, 2% 78%, 0% 60%, 2% 42%, 0% 25%)',
];

export const DOODLES = {
  star: '<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M12 2l2.9 6.6L22 9.3l-5 4.9 1.2 7.1L12 17.8l-6.2 3.5L7 14.2 2 9.3l7.1-.7L12 2z" fill="currentColor"/></svg>',
  heart: '<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M12 21s-7.5-4.6-10-9.1C.5 8.6 2 5 5.6 5 8 5 9.6 6.6 12 9c2.4-2.4 4-4 6.4-4 3.6 0 5.1 3.6 3.6 6.9C19.5 16.4 12 21 12 21z" fill="currentColor"/></svg>',
  squiggle:
    '<svg viewBox="0 0 40 12" width="100%" height="100%"><path d="M1 6 Q6 1 11 6 T21 6 T31 6 T39 6" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>',
  sparkle: '<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M12 2l1.8 7.2L21 11l-7.2 1.8L12 20l-1.8-7.2L3 11l7.2-1.8z" fill="currentColor"/></svg>',
  'circle-outline':
    '<svg viewBox="0 0 24 24" width="100%" height="100%"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>',
} as const;
