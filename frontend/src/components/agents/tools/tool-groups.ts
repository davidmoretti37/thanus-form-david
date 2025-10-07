export interface ToolMethodSettingField {
  type: 'text' | 'number' | 'select' | 'boolean';
  label: string;
  placeholder?: string;
  description?: string;
  options?: { value: string; label: string }[];
  defaultValue?: any;
}

export interface ToolMethod {
  name: string;
  displayName: string;
  description: string;
  enabled: boolean;
  isCore?: boolean;
  settings?: Record<string, ToolMethodSettingField>;
}

export interface ToolGroup {
  name: string;
  displayName: string;
  description: string;
  icon: string;
  color: string;
  toolClass: string;
  methods: ToolMethod[];
  enabled: boolean;
  isCore?: boolean;
}

import { TOOL_GROUPS as COMPREHENSIVE_TOOL_GROUPS } from './tool-groups-comprehensive';

export const TOOL_GROUPS: Record<string, ToolGroup> = COMPREHENSIVE_TOOL_GROUPS;

export { 
  getToolGroup, 
  getAllToolGroups, 
  hasGranularControl, 
  getEnabledMethodsForTool, 
  validateToolConfig, 
  convertLegacyToolConfig 
} from './tool-groups-comprehensive';
