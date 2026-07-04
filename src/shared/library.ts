import { makeId } from './storage';
import type { LibraryItem, Modification } from './types';

export const LIBRARY: LibraryItem[] = [
  {
    id: 'focus-reader',
    title: 'Reading Focus Bar',
    category: 'Reading and accessibility',
    description: 'Adds a warm horizontal guide that follows your pointer for long articles.',
    supportedSites: ['Any article page'],
    modificationTemplate: {
      name: 'Reading Focus Bar',
      description: 'Pointer-following reading guide.',
      type: 'hybrid',
      css: '#flexweb-focus-bar{position:fixed;left:0;right:0;height:44px;pointer-events:none;background:color-mix(in oklch, gold 20%, transparent);z-index:2147483646;mix-blend-mode:multiply;transition:transform .08s linear}',
      javascript:
        "if(!document.getElementById('flexweb-focus-bar')){const bar=document.createElement('div');bar.id='flexweb-focus-bar';document.documentElement.appendChild(bar);document.addEventListener('mousemove',e=>{bar.style.transform=`translateY(${e.clientY-22}px)`},{passive:true});}",
    },
    author: 'FlexWeb',
    trustLevel: 'built-in',
  },
  {
    id: 'calm-page',
    title: 'Calm Page Tone',
    category: 'Design tweaks',
    description: 'Softens harsh white backgrounds and increases text comfort.',
    supportedSites: ['Any content page'],
    modificationTemplate: {
      name: 'Calm Page Tone',
      description: 'Warmer background and more comfortable line height.',
      type: 'css',
      css: 'html{background:#f7f1e8!important}body{background:#f7f1e8!important;color:#2d2821!important;line-height:1.65!important}p,li{max-width:78ch}',
    },
    author: 'FlexWeb',
    trustLevel: 'built-in',
  },
  {
    id: 'hide-sticky',
    title: 'Hide Sticky Clutter',
    category: 'Distraction blockers',
    description: 'Hides common sticky banners, popups, and floating promo panels.',
    supportedSites: ['Many sites'],
    modificationTemplate: {
      name: 'Hide Sticky Clutter',
      description: 'Removes common fixed-position clutter.',
      type: 'css',
      css: '[class*=cookie i],[id*=cookie i],[class*=newsletter i],[class*=subscribe i],[class*=modal i]{display:none!important}body>*{scroll-margin-top:0!important}',
    },
    author: 'FlexWeb',
    trustLevel: 'built-in',
  },
];

export function libraryItemToModification(item: LibraryItem, matchPattern: string): Modification {
  const now = new Date().toISOString();
  return {
    id: makeId('lib'),
    name: item.modificationTemplate.name,
    description: item.modificationTemplate.description,
    matchPatterns: [matchPattern],
    type: item.modificationTemplate.type,
    sourcePrompt: `Installed built-in library item: ${item.title}`,
    css: item.modificationTemplate.css,
    javascript: item.modificationTemplate.javascript,
    enabled: true,
    createdAt: now,
    updatedAt: now,
    permissionsRequired: [],
    safetyStatus: 'template',
  };
}
