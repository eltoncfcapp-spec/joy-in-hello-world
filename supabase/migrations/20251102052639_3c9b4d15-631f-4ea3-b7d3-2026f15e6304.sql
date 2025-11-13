-- Create enum for member status
CREATE TYPE public.member_status AS ENUM ('newcomer', 'signed_member', 'not_attending');

-- Add status columns to members table
ALTER TABLE public.members 
  ADD COLUMN status public.member_status DEFAULT 'newcomer',
  ADD COLUMN status_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN not_attending_reason TEXT;

-- Add index for better query performance
CREATE INDEX idx_members_status ON public.members(status);