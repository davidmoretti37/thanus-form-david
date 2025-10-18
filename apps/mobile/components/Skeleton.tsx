import { useTheme } from '@/hooks/useThemeColor';
import React from 'react';
import { DimensionValue, View, ViewStyle } from 'react-native';
// Removed react-native-reanimated due to version conflicts

interface SkeletonProps {
    width?: DimensionValue;
    height?: DimensionValue;
    borderRadius?: number;
    style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
    width = '100%',
    height = 16,
    borderRadius = 4,
    style,
}) => {
    const theme = useTheme();

    return (
        <View style={{
            width,
            height,
            borderRadius,
            backgroundColor: theme.muted,
            ...style,
        }} />
    );
};
