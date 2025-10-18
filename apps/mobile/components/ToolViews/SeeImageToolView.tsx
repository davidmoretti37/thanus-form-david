import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import { PinchGestureHandler, PinchGestureHandlerGestureEvent } from 'react-native-gesture-handler';
