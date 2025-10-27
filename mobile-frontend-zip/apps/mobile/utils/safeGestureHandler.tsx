import type {
  GestureHandlerRootViewProps,
  PinchGestureHandlerGestureEvent,
  PinchGestureHandlerProps,
} from 'react-native-gesture-handler';
import React from 'react';
import { Platform, UIManager, View } from 'react-native';

type GestureHandlerModule = typeof import('react-native-gesture-handler');

function resolveGestureHandler(): GestureHandlerModule | null {
  try {
    if (Platform.OS !== 'web') {
      if (globalThis.nativeFabricUIManager?.getViewManagerConfig?.('RNGestureHandlerButton')) {
        // Fabric build; assume available
      } else if (!UIManager.getViewManagerConfig?.('RNGestureHandlerButton')) {
        return null;
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('react-native-gesture-handler');
  } catch (error) {
    if (__DEV__) {
      console.warn('[gesture-handler] Falling back to basic views.', error);
    }
    return null;
  }
}

const gestureHandlerModule = resolveGestureHandler();

const FallbackRootView: React.FC<GestureHandlerRootViewProps> = ({ children, style }) => (
  <View style={style}>{children}</View>
);

const FallbackPinchGestureHandler: React.FC<PinchGestureHandlerProps> = ({ children }) => (
  <>{children}</>
);

export const GestureHandlerRootView =
  gestureHandlerModule?.GestureHandlerRootView ?? FallbackRootView;

export const PinchGestureHandler =
  gestureHandlerModule?.PinchGestureHandler ?? FallbackPinchGestureHandler;

export const gestureHandlerAvailable = gestureHandlerModule != null;

export type { PinchGestureHandlerGestureEvent };

