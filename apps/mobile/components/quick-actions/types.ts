import { FunctionComponent } from 'react';
import { IconProps } from 'lucide-react-native';

export type QuickAction = {
  id: 'image' | 'slides' | 'data' | 'docs' | 'people' | 'research';
  label: string;
  icon: FunctionComponent<IconProps>;
};

export type QuickActionOption = {
  id: string;
  label: string;
};


