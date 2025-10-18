import React from 'react';
import { View } from 'react-native';

interface KeyboardAvoidingContainerProps {
    children: React.ReactNode;
    style?: any;
}

export const KeyboardAvoidingContainer: React.FC<KeyboardAvoidingContainerProps> = ({
    children,
    style,
}) => {
    return (
        <View style={[{ flex: 1 }, style]}>
            {children}
        </View>
    );
};
