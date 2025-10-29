import { SERVER_URL } from '@/constants/Server';
import { getSupabaseSession } from '@/constants/SupabaseConfig';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  attendees?: string[];
  calendar_id?: string;
  source: string;
}

export interface CalendarEventsResponse {
  success: boolean;
  events: CalendarEvent[];
  date: string;
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  attendees?: string[];
  profile_id?: string;
}

class CalendarService {
  private baseUrl = `${SERVER_URL}/calendar`;

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const session = await getSupabaseSession();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    
    return headers;
  }

  /**
   * Get calendar events for a date range
   */
  async getEvents(
    startDate: string, // YYYY-MM-DD
    endDate?: string,  // YYYY-MM-DD
    profileId?: string
  ): Promise<CalendarEvent[]> {
    try {
      const headers = await this.getAuthHeaders();
      const params = new URLSearchParams({
        start_date: startDate,
        ...(endDate && { end_date: endDate }),
        ...(profileId && { profile_id: profileId }),
      });

      const response = await fetch(`${this.baseUrl}/events?${params}`, {
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error fetching calendar events:', errorText);
        // Return empty array if calendar is not connected
        if (response.status === 404 || response.status === 400) {
          return [];
        }
        throw new Error(`Failed to fetch calendar events: ${response.statusText}`);
      }

      const data: CalendarEventsResponse = await response.json();
      
      if (!data.success) {
        return [];
      }

      return data.events;
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      // Return empty array on error to allow UI to still function
      return [];
    }
  }

  /**
   * Get events for a specific date
   */
  async getEventsForDate(date: Date, profileId?: string): Promise<CalendarEvent[]> {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    return this.getEvents(dateStr, dateStr, profileId);
  }

  /**
   * Get events for a month
   */
  async getEventsForMonth(year: number, month: number, profileId?: string): Promise<CalendarEvent[]> {
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return this.getEvents(startDate, endDate, profileId);
  }

  /**
   * Create a new calendar event
   */
  async createEvent(request: CreateEventRequest): Promise<CalendarEvent> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(`${this.baseUrl}/events`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create calendar event: ${errorText}`);
      }

      const event: CalendarEvent = await response.json();
      return event;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  }
}

export const calendarService = new CalendarService();


