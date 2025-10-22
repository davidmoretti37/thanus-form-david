import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { useTheme } from '@/hooks/useThemeColor';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';

interface CalendarModalProps {
  visible: boolean;
  onClose: () => void;
  value?: Date;
  onChange?: (date: Date) => void;
}

const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const CalendarModal: React.FC<CalendarModalProps> = ({
  visible,
  onClose,
  value,
  onChange,
}) => {
  const theme = useTheme();
  const [viewDate, setViewDate] = useState<Date>(value ?? new Date());

  const { monthLabel, yearLabel, firstDayOfWeek, daysInMonth } = useMemo(() => {
    const m = viewDate.getMonth();
    const y = viewDate.getFullYear();
    const firstDay = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    const monthName = viewDate.toLocaleString('default', { month: 'long' });
    return {
      monthLabel: monthName.charAt(0).toUpperCase() + monthName.slice(1),
      yearLabel: y,
      firstDayOfWeek: firstDay,
      daysInMonth: days,
    };
  }, [viewDate]);

  const goPrevMonth = () => {
    const d = new Date(viewDate);
    d.setMonth(d.getMonth() - 1);
    setViewDate(d);
  };

  const goNextMonth = () => {
    const d = new Date(viewDate);
    d.setMonth(d.getMonth() + 1);
    setViewDate(d);
  };

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const today = new Date();

  const handleSelect = (day: number) => {
    const d = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    onChange?.(d);
    onClose();
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
      padding: 16,
      margin: 20,
      maxWidth: 320,
      width: '100%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
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
    calendarHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 4,
      paddingVertical: 6,
      marginBottom: 8,
    },
    navButton: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.background,
    },
    navButtonText: {
      fontSize: 12,
      color: theme.foreground,
      fontWeight: '600',
    },
    monthYear: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.foreground,
    },
    dayNamesContainer: {
      flexDirection: 'row',
      marginBottom: 4,
    },
    dayName: {
      flex: 1,
      textAlign: 'center',
      fontSize: 10,
      color: theme.mutedForeground,
      fontWeight: '500',
    },
    daysGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 2,
    },
    dayButton: {
      width: 40,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 2,
    },
    dayButtonText: {
      fontSize: 14,
      fontWeight: '500',
    },
    dayButtonSelected: {
      backgroundColor: theme.primary,
    },
    dayButtonSelectedText: {
      color: theme.primaryForeground,
    },
    dayButtonToday: {
      borderWidth: 1,
      borderColor: theme.primary,
    },
    dayButtonTodayText: {
      color: theme.primary,
    },
    emptyDay: {
      width: 40,
      height: 32,
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
            <Text style={styles.title}>Calendar</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={16} color={theme.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Calendar */}
          <View>
            {/* Month/Year Navigation */}
            <View style={styles.calendarHeader}>
              <TouchableOpacity style={styles.navButton} onPress={goPrevMonth}>
                <ChevronLeft size={12} color={theme.foreground} />
              </TouchableOpacity>
              <Text style={styles.monthYear}>
                {monthLabel} {yearLabel}
              </Text>
              <TouchableOpacity style={styles.navButton} onPress={goNextMonth}>
                <ChevronRight size={12} color={theme.foreground} />
              </TouchableOpacity>
            </View>

            {/* Day Names */}
            <View style={styles.dayNamesContainer}>
              {dayNames.map((day) => (
                <Text key={day} style={styles.dayName}>
                  {day}
                </Text>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.daysGrid}>
              {/* Empty cells for days before the first day of the month */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <View key={`empty-${i}`} style={styles.emptyDay} />
              ))}

              {/* Days of the month */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateObj = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
                const isToday = isSameDay(dateObj, today);
                const isSelected = value ? isSameDay(dateObj, value) : false;

                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayButton,
                      isSelected && styles.dayButtonSelected,
                      !isSelected && isToday && styles.dayButtonToday,
                    ]}
                    onPress={() => handleSelect(day)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.dayButtonText,
                        isSelected && styles.dayButtonSelectedText,
                        !isSelected && isToday && styles.dayButtonTodayText,
                        !isSelected && !isToday && { color: theme.foreground },
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};
