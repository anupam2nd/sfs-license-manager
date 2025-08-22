-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create locations table
CREATE TABLE public.locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Create policies for categories (read-only for authenticated users)
CREATE POLICY "Categories are viewable by authenticated users" 
  ON public.categories 
  FOR SELECT 
  TO authenticated
  USING (true);

-- Create policies for locations (read-only for authenticated users)
CREATE POLICY "Locations are viewable by authenticated users" 
  ON public.locations 
  FOR SELECT 
  TO authenticated
  USING (true);

-- Add new columns to licenses table (only the ones that don't exist)
ALTER TABLE public.licenses 
ADD COLUMN location_id UUID REFERENCES public.locations(id),
ADD COLUMN status TEXT DEFAULT 'Pending',
ADD COLUMN category_id UUID REFERENCES public.categories(id);

-- Create triggers for updated_at
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON public.locations
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- Insert default categories
INSERT INTO public.categories (name) VALUES 
('Software'),
('Security'),
('Design'),
('Development'),
('Marketing'),
('Analytics'),
('Communication'),
('Productivity'),
('Other');

-- Insert default locations
INSERT INTO public.locations (name) VALUES 
('India'),
('USA'),
('UK'),
('Singapore'),
('Australia'),
('Canada'),
('Germany'),
('Other');