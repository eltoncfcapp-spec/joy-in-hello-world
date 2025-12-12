-- Migration: Create optimized bulk_upsert_event_attendees function
-- Date: 2025-01-01

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS bulk_upsert_event_attendees(JSON);

-- Create improved version using unnest for bulk operations
CREATE OR REPLACE FUNCTION bulk_upsert_event_attendees(attendance_records JSON)
RETURNS TABLE(
    id UUID, 
    event_id UUID, 
    members_id UUID, 
    first_time BOOLEAN, 
    invited_by_id UUID, 
    attendance_status TEXT, 
    attended_at TIMESTAMP WITH TIME ZONE, 
    notes TEXT, 
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    first_event_id UUID;
BEGIN
    -- Get the first event_id for returning results
    SELECT (attendance_records->0->>'event_id')::UUID INTO first_event_id;
    
    -- Create a temporary table with the incoming data
    CREATE TEMP TABLE IF NOT EXISTS temp_attendees (
        event_id UUID,
        members_id UUID,
        first_time BOOLEAN DEFAULT false,
        invited_by_id UUID,
        attendance_status TEXT DEFAULT 'absent',
        attended_at TIMESTAMPTZ,
        notes TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
    ) ON COMMIT DROP;
    
    -- Truncate to ensure clean state
    TRUNCATE TABLE temp_attendees;
    
    -- Insert all records at once using unnest
    INSERT INTO temp_attendees (
        event_id, 
        members_id, 
        first_time, 
        invited_by_id, 
        attendance_status, 
        attended_at, 
        notes, 
        updated_at
    )
    SELECT 
        (elem->>'event_id')::UUID,
        (elem->>'members_id')::UUID,
        COALESCE((elem->>'first_time')::BOOLEAN, false),
        NULLIF(elem->>'invited_by_id', '')::UUID,
        COALESCE(elem->>'attendance_status', 'absent'),
        CASE 
            WHEN elem->>'attended_at' IS NOT NULL AND elem->>'attended_at' != '' 
            THEN (elem->>'attended_at')::TIMESTAMPTZ 
            ELSE NULL 
        END,
        NULLIF(elem->>'notes', ''),
        COALESCE((elem->>'updated_at')::TIMESTAMPTZ, NOW())
    FROM json_array_elements(attendance_records) as elem;
    
    -- Perform bulk upsert using the temporary table
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
    SELECT 
        event_id, 
        members_id, 
        first_time, 
        invited_by_id, 
        attendance_status, 
        attended_at, 
        notes, 
        updated_at
    FROM temp_attendees
    ON CONFLICT (event_id, members_id) 
    DO UPDATE SET
        first_time = EXCLUDED.first_time,
        invited_by_id = EXCLUDED.invited_by_id,
        attendance_status = EXCLUDED.attendance_status,
        attended_at = EXCLUDED.attended_at,
        notes = EXCLUDED.notes,
        updated_at = EXCLUDED.updated_at;
    
    -- Return the affected rows
    RETURN QUERY
    SELECT 
        ea.id,
        ea.event_id,
        ea.members_id,
        ea.first_time,
        ea.invited_by_id,
        ea.attendance_status,
        ea.attended_at,
        ea.notes,
        ea.updated_at
    FROM event_attendees ea
    WHERE ea.event_id = first_event_id
    AND ea.members_id IN (
        SELECT members_id FROM temp_attendees
    )
    ORDER BY ea.updated_at DESC;
    
    -- Clean up
    DROP TABLE IF EXISTS temp_attendees;
    
    -- Log success
    RAISE NOTICE 'Successfully processed % attendance records', json_array_length(attendance_records);
EXCEPTION
    WHEN OTHERS THEN
        -- Log error
        RAISE NOTICE 'Error in bulk_upsert_event_attendees: %', SQLERRM;
        -- Re-raise the error
        RAISE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION bulk_upsert_event_attendees(JSON) TO authenticated;

-- Add comment
COMMENT ON FUNCTION bulk_upsert_event_attendees(JSON) IS 
'Bulk upsert attendance records. Takes JSON array of attendance records and performs upsert operation. Returns affected rows.';
