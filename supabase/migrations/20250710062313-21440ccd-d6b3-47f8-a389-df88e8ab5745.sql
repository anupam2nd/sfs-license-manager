-- Add email and phone fields to licenses table for notifications
ALTER TABLE public.licenses 
ADD COLUMN notification_email TEXT,
ADD COLUMN notification_phone TEXT;