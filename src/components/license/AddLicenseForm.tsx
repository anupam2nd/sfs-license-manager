import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useLicenseData } from '@/hooks/useLicenseData';
import { LicenseFormFields } from './LicenseFormFields';
import { LicenseFormData } from '@/types/license';

const initialFormData: LicenseFormData = {
  productName: '',
  vendorName: '',
  categoryId: '',
  locationId: '',
  amount: '',
  billingCycle: '',
  status: '',
  startDate: undefined,
  lastRenewalDate: undefined,
  expiryDate: undefined,
  loginLink: '',
  password: '',
  notes: '',
  notificationEmail: '',
  notificationPhone: '',
};

export const AddLicenseForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { categories, locations, loading: dataLoading } = useLicenseData();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<LicenseFormData>(initialFormData);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      // Get the category name for the old category field
      const selectedCategory = categories.find(cat => cat.id === formData.categoryId);
      
      const { error } = await supabase
        .from('licenses')
        .insert({
          product_name: formData.productName,
          vendor_name: formData.vendorName,
          category: selectedCategory?.name || '',
          category_id: formData.categoryId,
          location_id: formData.locationId,
          amount: parseFloat(formData.amount),
          billing_cycle: formData.billingCycle,
          status: 'Pending',
          start_date: formData.startDate?.toISOString().split('T')[0] || '',
          last_renewal_date: formData.lastRenewalDate?.toISOString().split('T')[0] || null,
          expiry_date: formData.expiryDate?.toISOString().split('T')[0] || '',
          login_link: formData.loginLink || null,
          password: formData.password || null,
          notes: formData.notes || null,
          notification_email: formData.notificationEmail || null,
          notification_phone: formData.notificationPhone || null,
          created_by: user.id,
          user_id: user.id,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "License added successfully!",
      });

      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = 
    formData.productName && 
    formData.vendorName && 
    formData.categoryId && 
    formData.locationId && 
    formData.amount && 
    formData.billingCycle && 
    formData.startDate && 
    formData.expiryDate;

  if (dataLoading) {
    return (
      <Card className="max-w-2xl">
        <CardContent className="p-6">
          <div className="text-center">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>License Information</CardTitle>
        <CardDescription>
          Add details for your new license or subscription
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <LicenseFormFields
            formData={formData}
            setFormData={setFormData}
            categories={categories}
            locations={locations}
          />

          <div className="flex space-x-4">
            <Button 
              type="submit" 
              disabled={loading || !isFormValid}
            >
              {loading ? 'Adding...' : 'Add License'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate('/dashboard')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};