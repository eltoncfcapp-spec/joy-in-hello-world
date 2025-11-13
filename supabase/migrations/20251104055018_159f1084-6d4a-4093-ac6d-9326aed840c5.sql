-- Enable Row Level Security on ministry_groups table
ALTER TABLE public.ministry_groups ENABLE ROW LEVEL SECURITY;

-- Create policies for ministry_groups (allow all for now, adjust as needed)
CREATE POLICY "Allow all on ministry_groups"
ON public.ministry_groups
FOR ALL
USING (true)
WITH CHECK (true);