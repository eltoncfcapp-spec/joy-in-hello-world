-- Create members table
CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  surname TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  cell_group_id UUID,
  is_permanent_member BOOLEAN DEFAULT false,
  permanent_member_date TIMESTAMP WITH TIME ZONE,
  invited_by TEXT,
  first_time_visit_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create cell_groups table
CREATE TABLE public.cell_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  leader_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  location TEXT,
  meeting_day TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add foreign key to members for cell_group_id
ALTER TABLE public.members
  ADD CONSTRAINT fk_cell_group
  FOREIGN KEY (cell_group_id) 
  REFERENCES public.cell_groups(id) 
  ON DELETE SET NULL;

-- Create events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  topic TEXT,
  event_date DATE NOT NULL,
  event_time TIME NOT NULL,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create event_attendees table
CREATE TABLE public.event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  surname TEXT NOT NULL,
  phone TEXT,
  first_time BOOLEAN DEFAULT false,
  invited_by TEXT,
  cell_group_id UUID REFERENCES public.cell_groups(id) ON DELETE SET NULL,
  attended_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cell_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;

-- Create policies (allowing all operations for now since using mock auth)
CREATE POLICY "Allow all on members" ON public.members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on cell_groups" ON public.cell_groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on events" ON public.events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on event_attendees" ON public.event_attendees FOR ALL USING (true) WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_members_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cell_groups_updated_at
  BEFORE UPDATE ON public.cell_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();