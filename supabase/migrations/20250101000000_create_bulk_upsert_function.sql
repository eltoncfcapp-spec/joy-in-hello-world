-- Migration: Create bulk_upsert_event_attendees function
-- Date: 2025-01-01

CREATE OR REPLACE FUNCTION bulk_upsert_event_attendees(attendance_records JSON)
RETURNS TABLE(id UUID, event_id UUID, members_id UUID, first_time BOOLEAN, invited_by_id UUID, attendance_status TEXT, attended_at TIMESTAMP WITH TIME ZONE, notes TEXT, updated_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
AS $$
DECLARE
  record JSON;
BEGIN
  FOR record IN SELECT * FROM json_array_elements(attendance_records)
  LOOP
    INSERT INTO event_attendees (
      event_id, 
      members_id, 
      first_time, 
      invited_by_id, 
      attendance_status, 
      attended_at, 
      notes, 
      updated_at
    )
    VALUES (
      (record->>'event_id')::UUID, 
      (record->>'members_id')::UUID, 
      COALESCE((record->>'first_time')::BOOLEAN, false), 
      NULLIF(record->>'invited_by_id', '')::UUID, 
      COALESCE(record->>'attendance_status', 'absent'),
      CASE 
        WHEN record->>'attended_at' IS NOT NULL AND record->>'attended_at' != '' 
        THEN (record->>'attended_at')::TIMESTAMPTZ 
        ELSE NULL 
      END,
      NULLIF(record->>'notes', ''),
      COALESCE((record->>'updated_at')::TIMESTAMPTZ, NOW())
    )
    ON CONFLICT (event_id, members_id) 
    DO UPDATE SET
      first_time = EXCLUDED.first_time,
      invited_by_id = EXCLUDED.invited_by_id,
      attendance_status = EXCLUDED.attendance_status,
      attended_at = EXCLUDED.attended_at,
      notes = EXCLUDED.notes,
      updated_at = EXCLUDED.updated_at;
  END LOOP;
  
  RETURN QUERY
  SELECT ea.* FROM event_attendees ea
  WHERE ea.event_id = (attendance_records->0->>'event_id')::UUID;
END;
$$;
