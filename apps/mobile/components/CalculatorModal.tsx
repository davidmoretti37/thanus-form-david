import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput } from 'react-native';
import { useTheme } from '@/hooks/useThemeColor';
import { X } from 'lucide-react-native';

interface CalculatorModalProps {
  visible: boolean;
  onClose: () => void;
}

export const CalculatorModal: React.FC<CalculatorModalProps> = ({ visible, onClose }) => {
  const theme = useTheme();
  const [expr, setExpr] = useState('');
  const [result, setResult] = useState<string>('');

  const input = (v: string) => setExpr((e) => (e + v).slice(0, 64));
  const clear = () => {
    setExpr('');
    setResult('');
  };
  const back = () => setExpr((e) => e.slice(0, -1));

  const evaluateExpr = () => {
    try {
      // Simple expression evaluator (for basic calculator use only)
      // eslint-disable-next-line no-new-func
      const val = Function(`"use strict"; return (${expr || 0})`)();
      setResult(String(val));
    } catch {
      setResult('Erro');
    }
  };

  const keys = [
    '7', '8', '9', '/',
    '4', '5', '6', '*',
    '1', '2', '3', '-',
    '0', '.', '(', ')', '+',
  ];

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 80,
      paddingBottom: 80,
    },
    modalContent: {
      backgroundColor: theme.background,
      borderRadius: 16,
      width: '90%',
      maxWidth: 400,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 20,
      marginTop: 50,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 20,
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
    inputSection: {
      marginBottom: 40,
    },
    inputLabel: {
      fontSize: 12,
      color: theme.mutedForeground,
      marginBottom: 8,
    },
    expressionInput: {
      backgroundColor: theme.mutedWithOpacity(0.1),
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: theme.foreground,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 12,
    },
    resultContainer: {
      backgroundColor: theme.mutedWithOpacity(0.1),
      borderRadius: 8,
      padding: 12,
      minHeight: 40,
      borderWidth: 1,
      borderColor: theme.border,
      justifyContent: 'center',
    },
    resultText: {
      fontSize: 16,
      color: theme.foreground,
    },
    resultPlaceholder: {
      fontSize: 16,
      color: theme.mutedForeground,
    },
    keypad: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 40,
      marginBottom: 20,
    },
    keyButton: {
      flex: 1,
      minWidth: '20%',
      aspectRatio: 1,
      backgroundColor: theme.mutedWithOpacity(0.15),
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    keyButtonText: {
      fontSize: 18,
      fontWeight: '500',
      color: theme.foreground,
    },
    backspaceButton: {
      flex: 1,
      minWidth: '20%',
      aspectRatio: 1,
      backgroundColor: theme.mutedWithOpacity(0.15),
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    clearButton: {
      flex: 1,
      minWidth: '20%',
      aspectRatio: 1,
      backgroundColor: theme.mutedWithOpacity(0.15),
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    equalsButton: {
      flex: 2,
      minWidth: '40%',
      aspectRatio: 3,
      backgroundColor: theme.mutedWithOpacity(0.2),
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    equalsButtonText: {
      fontSize: 18,
      fontWeight: '600',
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
            <Text style={styles.title}>Calculadora</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={20} color={theme.foreground} />
            </TouchableOpacity>
          </View>

          {/* Input Section */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Expressão</Text>
            <TextInput
              style={styles.expressionInput}
              value={expr}
              onChangeText={setExpr}
              placeholder="Ex.: (12+3.5)*2"
              placeholderTextColor={theme.mutedForeground}
              keyboardType="numeric"
            />
            <Text style={styles.inputLabel}>Resultado</Text>
            <View style={styles.resultContainer}>
              <Text style={result ? styles.resultText : styles.resultPlaceholder}>
                {result || '-'}
              </Text>
            </View>
          </View>

          {/* Keypad */}
          <View style={styles.keypad}>
            {keys.map((key) => (
              <TouchableOpacity
                key={key}
                style={styles.keyButton}
                onPress={() => input(key)}
              >
                <Text style={styles.keyButtonText}>{key}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.backspaceButton} onPress={back}>
              <Text style={styles.keyButtonText}>⌫</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.clearButton} onPress={clear}>
              <Text style={styles.keyButtonText}>C</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.equalsButton} onPress={evaluateExpr}>
              <Text style={styles.equalsButtonText}>=</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
