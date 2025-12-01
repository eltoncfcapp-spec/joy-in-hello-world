-- Add missing foreign key for invited_by_id in event_attendees table
-- This will allow the app to fetch inviter information when displaying attendees

ALTER TABLE public.event_attendees
ADD CONSTRAINT event_attendees_invited_by_id_fkey 
FOREIGN KEY (invited_by_id) 
REFERENCES public.members(id) 
ON DELETE SET NULL;