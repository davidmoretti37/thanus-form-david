from typing import List, Optional
from dataclasses import dataclass
from datetime import datetime, date
import json
from core.services.supabase import DBConnection
from core.utils.logger import logger
from core.composio_integration.composio_profile_service import ComposioProfileService
from core.mcp_module.mcp_service import mcp_service
import os

COMPOSIO_API_KEY = os.getenv("COMPOSIO_API_KEY")


@dataclass
class CalendarEvent:
    id: str
    title: str
    description: Optional[str]
    start_time: datetime
    end_time: datetime
    location: Optional[str]
    attendees: Optional[List[str]]
    calendar_id: Optional[str]
    source: str


class CalendarService:
    def __init__(self, db_connection: DBConnection):
        self.db = db_connection
        self.profile_service = ComposioProfileService(db_connection)
    
    async def _find_google_calendar_profile(self, account_id: str) -> Optional[str]:
        """Find Google Calendar profile for user."""
        try:
            profiles = await self.profile_service.get_profiles(account_id)
            
            # Look for Google Calendar profiles
            for profile in profiles:
                if profile.toolkit_slug in ['googlecalendar', 'google_calendar', 'gcalendar']:
                    return profile.profile_id
            
            # Also check for generic 'google' toolkit (might have calendar tools)
            for profile in profiles:
                if profile.toolkit_slug == 'google':
                    # Check if it has calendar tools by inspecting MCP URL
                    return profile.profile_id
            
            return None
        except Exception as e:
            logger.error(f"Error finding Google Calendar profile: {e}")
            return None
    
    async def get_events(
        self,
        account_id: str,
        start_date: date,
        end_date: date,
        profile_id: Optional[str] = None
    ) -> List[CalendarEvent]:
        """Get calendar events for a date range."""
        try:
            # Find profile if not provided
            if not profile_id:
                profile_id = await self._find_google_calendar_profile(account_id)
            
            if not profile_id:
                logger.warning(f"No Google Calendar profile found for account {account_id}")
                return []
            
            # Get profile to access MCP URL - get from profiles list
            profiles = await self.profile_service.get_profiles(account_id)
            profile = next((p for p in profiles if p.profile_id == profile_id), None)
            if not profile:
                logger.warning(f"Profile {profile_id} not found")
                return []
            
            # Connect to MCP server using profile's MCP URL
            mcp_url = profile.mcp_url
            
            # Try to connect and call calendar tools
            # Composio Google Calendar typically has tools with names like:
            # - GOOGLECALENDAR_LIST_EVENTS
            # - composio_googlecalendar_list_events
            # - GOOGLECALENDAR_GET_EVENT
            
            mcp_config = {
                "name": f"googlecalendar_{profile_id}",
                "type": "http",  # Composio uses HTTP/SSE for MCP
                "config": {"url": mcp_url},
                "enabledTools": [],
                "qualifiedName": f"composio.googlecalendar.{profile_id}"
            }
            
            # Connect to MCP server
            connection = await mcp_service.connect_server(mcp_config)
            
            # Try common Google Calendar tool names
            tool_names = [
                "GOOGLECALENDAR_LIST_EVENTS",
                "composio_googlecalendar_list_events",
                "GOOGLECALENDARGETEVENTS",
                "list_events"
            ]
            
            tool_result = None
            for tool_name in tool_names:
                # Check if tool exists in connection
                tool_exists = any(t.name == tool_name for t in (connection.tools or []))
                if not tool_exists:
                    continue
                
                try:
                    result = await mcp_service.execute_tool(
                        tool_name=tool_name,
                        arguments={
                            "timeMin": start_date.isoformat() + "T00:00:00Z",
                            "timeMax": end_date.isoformat() + "T23:59:59Z",
                            "maxResults": 100
                        }
                    )
                    
                    if result.success:
                        tool_result = result
                        break
                except Exception as e:
                    logger.debug(f"Tool {tool_name} failed: {e}")
                    continue
            
            if not tool_result:
                logger.warning("Could not find or execute Google Calendar list events tool")
                return []
            
            events = []
            if tool_result and tool_result.success:
                # Parse result - could be JSON string or dict
                try:
                    if isinstance(tool_result.result, str):
                        result_data = json.loads(tool_result.result)
                    else:
                        result_data = tool_result.result
                    
                    # Handle different response formats
                    if isinstance(result_data, dict):
                        events_data = result_data.get("items", result_data.get("data", []))
                    elif isinstance(result_data, list):
                        events_data = result_data
                    else:
                        events_data = []
                except Exception as e:
                    logger.warning(f"Error parsing calendar events result: {e}")
                    events_data = []
                
                for item in events_data:
                    event_id = item.get("id", "")
                    summary = item.get("summary", "No Title")
                    description = item.get("description", "")
                    location = item.get("location", "")
                    
                    # Parse start/end times
                    start = item.get("start", {})
                    end = item.get("end", {})
                    
                    start_time_str = start.get("dateTime") or start.get("date", "")
                    end_time_str = end.get("dateTime") or end.get("date", "")
                    
                    try:
                        if "T" in start_time_str:
                            start_time = datetime.fromisoformat(start_time_str.replace("Z", "+00:00"))
                        else:
                            start_time = datetime.fromisoformat(start_time_str + "T00:00:00+00:00")
                        
                        if "T" in end_time_str:
                            end_time = datetime.fromisoformat(end_time_str.replace("Z", "+00:00"))
                        else:
                            end_time = datetime.fromisoformat(end_time_str + "T23:59:59+00:00")
                    except Exception as e:
                        logger.warning(f"Error parsing event time: {e}")
                        continue
                    
                    # Get attendees
                    attendees = []
                    attendees_list = item.get("attendees", [])
                    for attendee in attendees_list:
                        email = attendee.get("email", "")
                        if email:
                            attendees.append(email)
                    
                    events.append(CalendarEvent(
                        id=event_id,
                        title=summary,
                        description=description,
                        start_time=start_time,
                        end_time=end_time,
                        location=location,
                        attendees=attendees if attendees else None,
                        calendar_id=item.get("calendarId"),
                        source="google"
                    ))
            
            return events
            
        except Exception as e:
            logger.error(f"Error fetching calendar events: {e}", exc_info=True)
            # Return empty list on error to allow UI to still function
            return []
    
    async def create_event(
        self,
        account_id: str,
        title: str,
        description: Optional[str],
        start_time: datetime,
        end_time: datetime,
        location: Optional[str],
        attendees: Optional[List[str]],
        profile_id: Optional[str] = None
    ) -> CalendarEvent:
        """Create a new calendar event."""
        try:
            # Find profile if not provided
            if not profile_id:
                profile_id = await self._find_google_calendar_profile(account_id)
            
            if not profile_id:
                raise ValueError("No Google Calendar integration found. Please connect Google Calendar first.")
            
            profiles = await self.profile_service.get_profiles(account_id)
            profile = next((p for p in profiles if p.profile_id == profile_id), None)
            if not profile:
                raise ValueError(f"Profile {profile_id} not found")
            
            mcp_url = profile.mcp_url
            
            # Prepare event data for Google Calendar
            event_data = {
                "summary": title,
                "description": description or "",
                "start": {
                    "dateTime": start_time.isoformat(),
                    "timeZone": "UTC"
                },
                "end": {
                    "dateTime": end_time.isoformat(),
                    "timeZone": "UTC"
                }
            }
            
            if location:
                event_data["location"] = location
            
            if attendees:
                event_data["attendees"] = [{"email": email} for email in attendees]
            
            # Connect to MCP server
            mcp_config = {
                "name": f"googlecalendar_{profile_id}",
                "type": "http",
                "config": {"url": mcp_url},
                "enabledTools": [],
                "qualifiedName": f"composio.googlecalendar.{profile_id}"
            }
            
            connection = await mcp_service.connect_server(mcp_config)
            
            # Try common Google Calendar create event tool names
            tool_names = [
                "GOOGLECALENDAR_CREATE_EVENT",
                "composio_googlecalendar_create_event",
                "GOOGLECALENDARCREATEEVENT",
                "create_event"
            ]
            
            tool_result = None
            for tool_name in tool_names:
                tool_exists = any(t.name == tool_name for t in (connection.tools or []))
                if not tool_exists:
                    continue
                
                try:
                    result = await mcp_service.execute_tool(
                        tool_name=tool_name,
                        arguments=event_data
                    )
                    
                    if result.success:
                        tool_result = result
                        break
                except Exception as e:
                    logger.debug(f"Tool {tool_name} failed: {e}")
                    continue
            
            if not tool_result or not tool_result.success:
                raise ValueError(f"Failed to create event: {tool_result.error if tool_result else 'Unknown error'}")
            
            # Parse created event
            try:
                if isinstance(tool_result.result, str):
                    created_event = json.loads(tool_result.result)
                else:
                    created_event = tool_result.result if isinstance(tool_result.result, dict) else {}
            except:
                created_event = {}
            event_id = created_event.get("id", "")
            
            return CalendarEvent(
                id=event_id,
                title=title,
                description=description,
                start_time=start_time,
                end_time=end_time,
                location=location,
                attendees=attendees,
                calendar_id=created_event.get("calendarId"),
                source="google"
            )
            
        except Exception as e:
            logger.error(f"Error creating calendar event: {e}", exc_info=True)
            raise


_calendar_service: Optional[CalendarService] = None

def get_calendar_service(db_connection: DBConnection) -> CalendarService:
    global _calendar_service
    if _calendar_service is None:
        _calendar_service = CalendarService(db_connection)
    return _calendar_service

