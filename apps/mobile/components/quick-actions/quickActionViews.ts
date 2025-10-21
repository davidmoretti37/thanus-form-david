import type { QuickActionOption } from './types';

export function getQuickActionOptions(actionId: string): QuickActionOption[] {
  switch (actionId) {
    case 'image':
      return [
        { id: 'photorealistic', label: 'Photorealistic' },
        { id: 'digital-art', label: 'Digital Art' },
        { id: 'watercolor', label: 'Watercolor' },
      ];
    case 'slides':
      return [
        { id: 'business', label: 'Business' },
        { id: 'pitch-deck', label: 'Pitch Deck' },
        { id: 'report', label: 'Report' },
      ];
    case 'data':
      return [
        { id: 'chart', label: 'Charts' },
        { id: 'table', label: 'Tables' },
        { id: 'statistics', label: 'Statistics' },
      ];
    case 'docs':
      return [
        { id: 'essay', label: 'Essay' },
        { id: 'letter', label: 'Letter' },
        { id: 'report', label: 'Report' },
      ];
    case 'people':
      return [
        { id: 'expert', label: 'Expert' },
        { id: 'colleague', label: 'Colleague' },
        { id: 'team', label: 'Team' },
      ];
    case 'research':
      return [
        { id: 'academic', label: 'Academic' },
        { id: 'news', label: 'News' },
        { id: 'web', label: 'Web' },
      ];
    default:
      return [];
  }
}


