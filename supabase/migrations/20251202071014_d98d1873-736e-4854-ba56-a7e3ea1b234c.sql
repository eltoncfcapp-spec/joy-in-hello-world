-- Add notes column to event_attendees table to store absence reasons and other attendance notes
ALTER TABLE public.event_attendees 
ADD COLUMN IF NOT EXISTS notes TEXT;