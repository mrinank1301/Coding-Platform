-- Migration: Add policy for admins to delete submissions
-- This allows admins to delete submissions when deleting questions

-- Policy for admins to delete submissions
CREATE POLICY "Admins can delete submissions"
  ON public.submissions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

