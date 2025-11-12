-- Enable RLS on attendance table
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- RLS policies for attendance
CREATE POLICY "Admins can do everything on attendance"
  ON public.attendance
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Leaders can view attendance for their groups"
  ON public.attendance
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings m
      JOIN public.cell_groups cg ON m.group_id = cg.id
      WHERE m.id = attendance.meeting_id
        AND cg.leader_id IN (
          SELECT id FROM public.members WHERE email = (
            SELECT email FROM auth.users WHERE id = auth.uid()
          )
        )
    )
  );

-- Enable RLS on meetings table
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- RLS policies for meetings
CREATE POLICY "Admins can do everything on meetings"
  ON public.meetings
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Leaders can view meetings for their groups"
  ON public.meetings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cell_groups cg
      WHERE cg.id = meetings.group_id
        AND cg.leader_id IN (
          SELECT id FROM public.members WHERE email = (
            SELECT email FROM auth.users WHERE id = auth.uid()
          )
        )
    )
  );

-- Enable RLS on meeting_reports table
ALTER TABLE public.meeting_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies for meeting_reports
CREATE POLICY "Admins can do everything on meeting_reports"
  ON public.meeting_reports
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Leaders can view reports for their groups"
  ON public.meeting_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings m
      JOIN public.cell_groups cg ON m.group_id = cg.id
      WHERE m.id = meeting_reports.meeting_id
        AND cg.leader_id IN (
          SELECT id FROM public.members WHERE email = (
            SELECT email FROM auth.users WHERE id = auth.uid()
          )
        )
    )
  );