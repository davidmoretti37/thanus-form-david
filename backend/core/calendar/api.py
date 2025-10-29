from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime, date
from core.utils.auth_utils import verify_and_get_user_id_from_jwt
from core.utils.logger import logger
from core.services.supabase import DBConnection
from .calendar_service import get_calendar_service, CalendarEvent, CalendarService

router = APIRouter(prefix="/calendar", tags=["calendar"])

db: Optional[DBConnection] = None

def initialize(database: DBConnection):
    global db
    db = database


class CalendarEventResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    start_time: str
    end_time: str
    location: Optional[str] = None
    attendees: Optional[List[str]] = None
    calendar_id: Optional[str] = None
    source: str  # 'google', 'outlook', etc.


class CalendarEventsResponse(BaseModel):
    success: bool
    events: List[CalendarEventResponse]
    date: str


class CreateEventRequest(BaseModel):
    title: str
    description: Optional[str] = None
    start_time: str
    end_time: str
    location: Optional[str] = None
    attendees: Optional[List[str]] = None
    profile_id: Optional[str] = None  # Composio profile ID for calendar


@router.get("/events", summary="Get calendar events", operation_id="get_calendar_events")
async def get_calendar_events(
    start_date: str = Query(..., description="Start date in YYYY-MM-DD format"),
    end_date: Optional[str] = Query(None, description="End date in YYYY-MM-DD format"),
    profile_id: Optional[str] = Query(None, description="Composio profile ID for calendar integration"),
    account_id: str = Depends(verify_and_get_user_id_from_jwt)
):
    """
    Get calendar events for a date range.
    If profile_id is provided, fetches from that calendar integration.
    Otherwise, tries to find the user's Google Calendar integration.
    """
    try:
        if not db:
            raise HTTPException(status_code=500, detail="Database not initialized")
        
        service = get_calendar_service(db)
        
        # Parse dates
        try:
            start = datetime.fromisoformat(f"{start_date}T00:00:00").date()
            end = datetime.fromisoformat(f"{end_date}T23:59:59").date() if end_date else start
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
        events = await service.get_events(
            account_id=account_id,
            start_date=start,
            end_date=end,
            profile_id=profile_id
        )
        
        return CalendarEventsResponse(
            success=True,
            events=[
                CalendarEventResponse(
                    id=event.id,
                    title=event.title,
                    description=event.description,
                    start_time=event.start_time.isoformat(),
                    end_time=event.end_time.isoformat(),
                    location=event.location,
                    attendees=event.attendees,
                    calendar_id=event.calendar_id,
                    source=event.source
                )
                for event in events
            ],
            date=start_date
        )
        
    except Exception as e:
        logger.error(f"Error fetching calendar events: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/events", summary="Create calendar event", operation_id="create_calendar_event")
async def create_calendar_event(
    request: CreateEventRequest,
    account_id: str = Depends(verify_and_get_user_id_from_jwt)
):
    """Create a new calendar event via Composio integration."""
    try:
        if not db:
            raise HTTPException(status_code=500, detail="Database not initialized")
        
        service = get_calendar_service(db)
        
        try:
            start_time = datetime.fromisoformat(request.start_time.replace('Z', '+00:00'))
            end_time = datetime.fromisoformat(request.end_time.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid datetime format. Use ISO 8601 format")
        
        event = await service.create_event(
            account_id=account_id,
            title=request.title,
            description=request.description,
            start_time=start_time,
            end_time=end_time,
            location=request.location,
            attendees=request.attendees,
            profile_id=request.profile_id
        )
        
        return CalendarEventResponse(
            id=event.id,
            title=event.title,
            description=event.description,
            start_time=event.start_time.isoformat(),
            end_time=event.end_time.isoformat(),
            location=event.location,
            attendees=event.attendees,
            calendar_id=event.calendar_id,
            source=event.source
        )
        
    except Exception as e:
        logger.error(f"Error creating calendar event: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

