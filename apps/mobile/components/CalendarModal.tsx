import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/hooks/useThemeColor';
import { X, ChevronLeft, ChevronRight, Clock } from 'lucide-react-native';
import { calendarService, CalendarEvent } from '@/services/calendarService';

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
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [selectedDayEvents, setSelectedDayEvents] = useState<CalendarEvent[]>([]);
  const [showDayDetails, setShowDayDetails] = useState(false);

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

  // Fetch events when modal opens or month changes
  useEffect(() => {
    if (visible) {
      loadEvents();
    } else {
      setEvents([]);
      setSelectedDayEvents([]);
      setShowDayDetails(false);
    }
  }, [visible, viewDate]);

  const loadEvents = async () => {
    try {
      setLoadingEvents(true);
      const monthEvents = await calendarService.getEventsForMonth(
        viewDate.getFullYear(),
        viewDate.getMonth()
      );
      setEvents(monthEvents);
    } catch (error) {
      console.error('Error loading calendar events:', error);
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  const getEventsForDay = (day: number): CalendarEvent[] => {
    const dateObj = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const dateStr = dateObj.toISOString().split('T')[0];
    
    return events.filter(event => {
      const eventDate = new Date(event.start_time).toISOString().split('T')[0];
      return eventDate === dateStr;
    });
  };

  const handleSelect = (day: number) => {
    const d = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const dayEvents = getEventsForDay(day);
    
    if (dayEvents.length > 0) {
      // Show events for this day
      setSelectedDayEvents(dayEvents);
      setShowDayDetails(true);
    } else {
      // Just select the date if no events
      onChange?.(d);
      onClose();
    }
  };

  const formatTime = (dateTime: string): string => {
    const date = new Date(dateTime);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
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
      paddingRight: 8, // Add padding to match IntegrationsModal close button spacing
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
    eventIndicator: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.primary,
      position: 'absolute',
      bottom: 2,
    },
    dayButtonWithEvents: {
      position: 'relative',
    },
    eventsList: {
      marginTop: 16,
      maxHeight: 300,
    },
    eventItem: {
      padding: 12,
      marginBottom: 8,
      borderRadius: 8,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
    },
    eventTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.foreground,
      marginBottom: 4,
    },
    eventTime: {
      fontSize: 12,
      color: theme.mutedForeground,
      marginBottom: 2,
    },
    eventLocation: {
      fontSize: 12,
      color: theme.mutedForeground,
      fontStyle: 'italic',
    },
    backButton: {
      padding: 8,
      marginBottom: 12,
    },
    backButtonText: {
      fontSize: 14,
      color: theme.primary,
      fontWeight: '500',
    },
    noEventsText: {
      fontSize: 14,
      color: theme.mutedForeground,
      textAlign: 'center',
      marginTop: 16,
    },
    loadingContainer: {
      alignItems: 'center',
      padding: 16,
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
                const dayEvents = getEventsForDay(day);
                const hasEvents = dayEvents.length > 0;

                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayButton,
                      isSelected && styles.dayButtonSelected,
                      !isSelected && isToday && styles.dayButtonToday,
                      hasEvents && styles.dayButtonWithEvents,
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
                    {hasEvents && (
                      <View style={styles.eventIndicator} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Loading indicator */}
          {loadingEvents && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          )}

          {/* Day Events List */}
          {showDayDetails && (
            <ScrollView style={styles.eventsList}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => {
                  setShowDayDetails(false);
                  setSelectedDayEvents([]);
                }}
              >
                <Text style={styles.backButtonText}>← Back to Calendar</Text>
              </TouchableOpacity>
              
              {selectedDayEvents.length > 0 ? (
                selectedDayEvents.map((event) => (
                  <View key={event.id} style={styles.eventItem}>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <Clock size={12} color={theme.mutedForeground} />
                      <Text style={[styles.eventTime, { marginLeft: 4 }]}>
                        {formatTime(event.start_time)} - {formatTime(event.end_time)}
                      </Text>
                    </View>
                    {event.location && (
                      <Text style={styles.eventLocation}>{event.location}</Text>
                    )}
                    {event.description && (
                      <Text style={[styles.eventTime, { marginTop: 8 }]}>{event.description}</Text>
                    )}
                    {event.attendees && event.attendees.length > 0 && (
                      <Text style={[styles.eventTime, { marginTop: 4 }]}>
                        Attendees: {event.attendees.join(', ')}
                      </Text>
                    )}
                  </View>
                ))
              ) : (
                <Text style={styles.noEventsText}>No events for this day</Text>
              )}
            </ScrollView>
          )}

          {/* If no day details shown, show month events summary */}
          {!showDayDetails && !loadingEvents && events.length > 0 && (
            <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.border }}>
              <Text style={{ fontSize: 12, color: theme.mutedForeground, marginBottom: 8 }}>
                {events.length} event{events.length !== 1 ? 's' : ''} this month
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};
