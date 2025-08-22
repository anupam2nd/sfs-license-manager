import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Category, Location } from '@/types/license';

export const useLicenseData = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesResult, locationsResult] = await Promise.all([
          supabase.from('categories').select('id, name').order('name'),
          supabase.from('locations').select('id, name').order('name')
        ]);

        if (categoriesResult.error) throw categoriesResult.error;
        if (locationsResult.error) throw locationsResult.error;

        setCategories(categoriesResult.data || []);
        setLocations(locationsResult.data || []);
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to load categories and locations",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  return { categories, locations, loading };
};