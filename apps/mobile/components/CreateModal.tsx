import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions, PanResponder, TextInput } from 'react-native';
import { useTheme } from '@/hooks/useThemeColor';
import { X, Trash2, Download, Save, Undo, Redo, Palette, Square, Circle, Type, Pen } from 'lucide-react-native';
import Svg, { Path, Circle as SvgCircle, Rect, Text as SvgText } from 'react-native-svg';

interface CreateModalProps {
  visible: boolean;
  onClose: () => void;
}

interface Point {
  x: number;
  y: number;
}

interface DrawingElement {
  id: string;
  type: 'path' | 'circle' | 'rect' | 'text';
  points: Point[];
  color: string;
  strokeWidth: number;
  text?: string;
  x?: number;
  y?: number;
  fontSize?: number;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const CreateModal: React.FC<CreateModalProps> = ({ visible, onClose }) => {
  const theme = useTheme();
  const [elements, setElements] = useState<DrawingElement[]>([]);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedTool, setSelectedTool] = useState<'pen' | 'circle' | 'rect' | 'text'>('pen');
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [history, setHistory] = useState<DrawingElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isTyping, setIsTyping] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [textPosition, setTextPosition] = useState<Point | null>(null);

  const colors = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500'];

  const addToHistory = (newElements: DrawingElement[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...newElements]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setElements(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setElements(history[historyIndex + 1]);
    }
  };

  const clearCanvas = () => {
    setElements([]);
    setCurrentPath([]);
    addToHistory([]);
  };

  const handleTextSubmit = () => {
    if (currentText.trim() && textPosition) {
      const newElement: DrawingElement = {
        id: Date.now().toString(),
        type: 'text',
        text: currentText,
        color: selectedColor,
        strokeWidth: 0,
        x: textPosition.x,
        y: textPosition.y,
        fontSize: 20,
        points: [],
      };
      const newElements = [...elements, newElement];
      setElements(newElements);
      addToHistory(newElements);
      setCurrentText('');
      setTextPosition(null);
      setIsTyping(false);
    } else {
      setIsTyping(false);
    }
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      const x = locationX;
      const y = locationY;
      
      if (selectedTool === 'pen') {
        setIsDrawing(true);
        setCurrentPath([{ x, y }]);
      } else if (selectedTool === 'circle' || selectedTool === 'rect') {
        setCurrentPath([{ x, y }]);
      } else if (selectedTool === 'text') {
        setIsTyping(true);
        setTextPosition({ x, y });
        setCurrentText('');
      }
    },
    onPanResponderMove: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      const x = locationX;
      const y = locationY;
      
      if (selectedTool === 'pen' && isDrawing) {
        setCurrentPath(prev => [...prev, { x, y }]);
      }
    },
    onPanResponderRelease: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      const x = locationX;
      const y = locationY;
      
      if (selectedTool === 'pen' && isDrawing && currentPath.length > 0) {
        const newElement: DrawingElement = {
          id: Date.now().toString(),
          type: 'path',
          points: [...currentPath, { x, y }],
          color: selectedColor,
          strokeWidth,
        };
        const newElements = [...elements, newElement];
        setElements(newElements);
        addToHistory(newElements);
        setCurrentPath([]);
        setIsDrawing(false);
      } else if (selectedTool === 'circle') {
        const startPoint = currentPath[0];
        if (startPoint) {
          const radius = Math.sqrt(Math.pow(x - startPoint.x, 2) + Math.pow(y - startPoint.y, 2));
          const newElement: DrawingElement = {
            id: Date.now().toString(),
            type: 'circle',
            points: [{ x: startPoint.x, y: startPoint.y }],
            color: selectedColor,
            strokeWidth,
            text: radius.toString(),
          };
          const newElements = [...elements, newElement];
          setElements(newElements);
          addToHistory(newElements);
          setCurrentPath([]);
        }
      } else if (selectedTool === 'rect') {
        const startPoint = currentPath[0];
        if (startPoint) {
          const newElement: DrawingElement = {
            id: Date.now().toString(),
            type: 'rect',
            points: [
              { x: Math.min(startPoint.x, x), y: Math.min(startPoint.y, y) },
              { x: Math.max(startPoint.x, x), y: Math.max(startPoint.y, y) }
            ],
            color: selectedColor,
            strokeWidth,
          };
          const newElements = [...elements, newElement];
          setElements(newElements);
          addToHistory(newElements);
          setCurrentPath([]);
        }
      }
    },
  });

  const renderElement = (element: DrawingElement) => {
    switch (element.type) {
      case 'path':
        if (element.points.length < 2) return null;
        const pathData = element.points.reduce((acc, point, index) => {
          if (index === 0) return `M${point.x},${point.y}`;
          return `${acc} L${point.x},${point.y}`;
        }, '');
        return (
          <Path
            key={element.id}
            d={pathData}
            stroke={element.color}
            strokeWidth={element.strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      case 'circle':
        const center = element.points[0];
        const radius = element.text ? parseFloat(element.text) : 20;
        return (
          <SvgCircle
            key={element.id}
            cx={center.x}
            cy={center.y}
            r={radius}
            stroke={element.color}
            strokeWidth={element.strokeWidth}
            fill="none"
          />
        );
      case 'rect':
        const [start, end] = element.points;
        return (
          <Rect
            key={element.id}
            x={start.x}
            y={start.y}
            width={end.x - start.x}
            height={end.y - start.y}
            stroke={element.color}
            strokeWidth={element.strokeWidth}
            fill="none"
          />
        );
      case 'text':
        return (
          <SvgText
            key={element.id}
            x={element.x || 0}
            y={element.y || 0}
            fontSize={element.fontSize || 20}
            fill={element.color}
            fontWeight="bold"
          >
            {element.text}
          </SvgText>
        );
      default:
        return null;
    }
  };

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: theme.background,
      borderRadius: 16,
      width: '95%',
      height: '90%',
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.foreground,
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.mutedWithOpacity(0.1),
      alignItems: 'center',
      justifyContent: 'center',
    },
    toolbar: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      gap: 8,
    },
    toolButton: {
      width: 40,
      height: 40,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.mutedWithOpacity(0.1),
    },
    toolButtonActive: {
      backgroundColor: theme.primary,
    },
    colorPalette: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
    },
    colorButton: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.border,
    },
    colorButtonActive: {
      borderColor: theme.foreground,
    },
    canvasContainer: {
      flex: 1,
      backgroundColor: '#ffffff',
    },
    canvas: {
      flex: 1,
    },
    textInputOverlay: {
      position: 'absolute',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: theme.primary,
      minWidth: 100,
    },
    textInput: {
      color: theme.foreground,
      fontSize: 16,
      padding: 0,
      margin: 0,
    },
    bottomToolbar: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: theme.mutedWithOpacity(0.1),
    },
    actionButtonText: {
      marginLeft: 6,
      fontSize: 14,
      color: theme.foreground,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Criar</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={20} color={theme.foreground} />
            </TouchableOpacity>
          </View>

          {/* Toolbar */}
          <View style={styles.toolbar}>
            <TouchableOpacity
              style={[styles.toolButton, selectedTool === 'pen' && styles.toolButtonActive]}
              onPress={() => setSelectedTool('pen')}
            >
              <Pen size={20} color={selectedTool === 'pen' ? theme.primaryForeground : theme.foreground} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toolButton, selectedTool === 'circle' && styles.toolButtonActive]}
              onPress={() => setSelectedTool('circle')}
            >
              <Circle size={20} color={selectedTool === 'circle' ? theme.primaryForeground : theme.foreground} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toolButton, selectedTool === 'rect' && styles.toolButtonActive]}
              onPress={() => setSelectedTool('rect')}
            >
              <Square size={20} color={selectedTool === 'rect' ? theme.primaryForeground : theme.foreground} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toolButton, selectedTool === 'text' && styles.toolButtonActive]}
              onPress={() => setSelectedTool('text')}
            >
              <Type size={20} color={selectedTool === 'text' ? theme.primaryForeground : theme.foreground} />
            </TouchableOpacity>
            
            {/* Color Palette */}
            <View style={styles.colorPalette}>
              {colors.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorButton,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorButtonActive,
                  ]}
                  onPress={() => setSelectedColor(color)}
                />
              ))}
            </View>
          </View>

          {/* Canvas */}
          <View style={styles.canvasContainer}>
            <View style={styles.canvas} {...panResponder.panHandlers}>
              <Svg width="100%" height="100%">
                {elements.map(renderElement)}
                {isDrawing && currentPath.length > 1 && (
                  <Path
                    d={currentPath.reduce((acc, point, index) => {
                      if (index === 0) return `M${point.x},${point.y}`;
                      return `${acc} L${point.x},${point.y}`;
                    }, '')}
                    stroke={selectedColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </Svg>
              {isTyping && textPosition && (
                <View style={[styles.textInputOverlay, { left: textPosition.x, top: textPosition.y }]}>
                  <TextInput
                    style={styles.textInput}
                    value={currentText}
                    onChangeText={setCurrentText}
                    onBlur={handleTextSubmit}
                    autoFocus
                    multiline
                    placeholder="Type text..."
                    placeholderTextColor={theme.mutedForeground}
                  />
                </View>
              )}
            </View>
          </View>

          {/* Bottom Toolbar */}
          <View style={styles.bottomToolbar}>
            <TouchableOpacity style={styles.actionButton} onPress={undo}>
              <Undo size={16} color={theme.foreground} />
              <Text style={styles.actionButtonText}>Desfazer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={redo}>
              <Redo size={16} color={theme.foreground} />
              <Text style={styles.actionButtonText}>Refazer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={clearCanvas}>
              <Trash2 size={16} color={theme.foreground} />
              <Text style={styles.actionButtonText}>Limpar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
