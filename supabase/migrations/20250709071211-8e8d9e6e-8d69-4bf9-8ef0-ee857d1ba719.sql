-- Update the billing_cycle check constraint to match the form options
ALTER TABLE public.licenses DROP CONSTRAINT IF EXISTS licenses_billing_cycle_check;

-- Add the updated constraint with all billing cycle options
ALTER TABLE public.licenses ADD CONSTRAINT licenses_billing_cycle_check 
CHECK (billing_cycle IN ('Monthly', 'Quarterly', 'Semi-Annual', 'Annual', 'Biennial', 'One-time'));