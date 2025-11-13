-- Update RLS policies for cell_groups to restrict group leaders to their assigned groups
DROP POLICY IF EXISTS "Allow all on cell_groups" ON public.cell_groups;

CREATE POLICY "Admins can do everything on cell_groups"
ON public.cell_groups
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.members
    WHERE members.id = auth.uid()
    AND members.role = 'admin'
  )
);

CREATE POLICY "Group leaders can view their assigned groups"
ON public.cell_groups
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.members
    WHERE members.id = auth.uid()
    AND (
      members.role = 'admin'
      OR id::text = ANY(members.assigned_groups)
    )
  )
);

CREATE POLICY "Group leaders can update their assigned groups"
ON public.cell_groups
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.members
    WHERE members.id = auth.uid()
    AND (
      members.role = 'admin'
      OR cell_groups.id::text = ANY(members.assigned_groups)
    )
  )
);

-- Update RLS policies for meetings to restrict to assigned groups
DROP POLICY IF EXISTS "Admins can do everything on meetings" ON public.meetings;
DROP POLICY IF EXISTS "Leaders can view meetings for their groups" ON public.meetings;

CREATE POLICY "Admins can do everything on meetings"
ON public.meetings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.members
    WHERE members.id = auth.uid()
    AND members.role = 'admin'
  )
);

CREATE POLICY "Group leaders can view meetings for assigned groups"
ON public.meetings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.members
    WHERE members.id = auth.uid()
    AND (
      members.role = 'admin'
      OR meetings.group_id::text = ANY(members.assigned_groups)
    )
  )
);

CREATE POLICY "Group leaders can manage meetings for assigned groups"
ON public.meetings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.members
    WHERE members.id = auth.uid()
    AND (
      members.role = 'admin'
      OR meetings.group_id::text = ANY(members.assigned_groups)
    )
  )
);

-- Update RLS policies for attendance
DROP POLICY IF EXISTS "Admins can do everything on attendance" ON public.attendance;
DROP POLICY IF EXISTS "Leaders can view attendance for their groups" ON public.attendance;

CREATE POLICY "Admins can do everything on attendance"
ON public.attendance
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.members
    WHERE members.id = auth.uid()
    AND members.role = 'admin'
  )
);

CREATE POLICY "Group leaders can manage attendance for assigned groups"
ON public.attendance
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.members m
    JOIN public.meetings mt ON mt.id = attendance.meeting_id
    WHERE m.id = auth.uid()
    AND (
      m.role = 'admin'
      OR mt.group_id::text = ANY(m.assigned_groups)
    )
  )
);

-- Update RLS policies for meeting_reports
DROP POLICY IF EXISTS "Admins can do everything on meeting_reports" ON public.meeting_reports;
DROP POLICY IF EXISTS "Leaders can view reports for their groups" ON public.meeting_reports;

CREATE POLICY "Admins can do everything on meeting_reports"
ON public.meeting_reports
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.members
    WHERE members.id = auth.uid()
    AND members.role = 'admin'
  )
);

CREATE POLICY "Group leaders can manage reports for assigned groups"
ON public.meeting_reports
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.members m
    JOIN public.meetings mt ON mt.id = meeting_reports.meeting_id
    WHERE m.id = auth.uid()
    AND (
      m.role = 'admin'
      OR mt.group_id::text = ANY(m.assigned_groups)
    )
  )
);