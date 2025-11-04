-- Add gender enum type
CREATE TYPE public.gender_type AS ENUM ('male', 'female');

-- Add gender column to members table
ALTER TABLE public.members 
ADD COLUMN gender public.gender_type;

-- Create a recurring Sunday service event
INSERT INTO public.events (name, topic, event_date, event_time, location)
VALUES 
  ('Sunday Service', 'Weekly Worship Service', 
   (SELECT CASE 
      WHEN EXTRACT(DOW FROM CURRENT_DATE) = 0 THEN CURRENT_DATE
      ELSE CURRENT_DATE + (7 - EXTRACT(DOW FROM CURRENT_DATE))::INTEGER
    END),
   '10:00:00',
   'Main Sanctuary');

-- Add comment for future reference
COMMENT ON COLUMN public.members.gender IS 'Member gender: male or female';