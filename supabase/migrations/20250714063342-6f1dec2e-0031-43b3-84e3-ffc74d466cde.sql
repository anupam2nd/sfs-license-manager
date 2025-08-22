-- Create payment history table
CREATE TABLE public.payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL,
  payment_method TEXT,
  transaction_id TEXT,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- Create policies for payment history
CREATE POLICY "Users can view their own payment history" 
ON public.payment_history 
FOR SELECT 
USING (created_by = auth.uid());

CREATE POLICY "Users can create their own payment history" 
ON public.payment_history 
FOR INSERT 
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own payment history" 
ON public.payment_history 
FOR UPDATE 
USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own payment history" 
ON public.payment_history 
FOR DELETE 
USING (created_by = auth.uid());

-- Add trigger for updated_at
CREATE TRIGGER update_payment_history_updated_at
BEFORE UPDATE ON public.payment_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();