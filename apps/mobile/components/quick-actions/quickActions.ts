import { Image, Presentation, Table2, FileText, Users, Search } from 'lucide-react-native';
import type { QuickAction } from './types';

export const QUICK_ACTIONS: QuickAction[] = [
  { id: 'image', label: 'Image', icon: Image },
  { id: 'slides', label: 'Slides', icon: Presentation },
  { id: 'data', label: 'Data', icon: Table2 },
  { id: 'docs', label: 'Docs', icon: FileText },
  { id: 'people', label: 'People', icon: Users },
  { id: 'research', label: 'Research', icon: Search },
];


