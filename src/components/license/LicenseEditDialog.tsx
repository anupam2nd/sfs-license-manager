import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LicenseEditFormFields } from './LicenseEditFormFields';
import { useLicenseData } from '@/hooks/useLicenseData';

type License = Database['public']['Tables']['licenses']['Row'];

const licenseSchema = z.object({
  product_name: z.string().min(1, 'Product name is required'),
  vendor_name: z.string().min(1, 'Vendor name is required'),
  category: z.string().min(1, 'Category is required'),
  amount: z.string().min(1, 'Amount is required'),
  billing_cycle: z.string().min(1, 'Billing cycle is required'),
  start_date: z.string().min(1, 'Start date is required'),
  expiry_date: z.string().min(1, 'Expiry date is required'),
  last_renewal_date: z.string().optional(),
  status: z.string().optional(),
  payment_status: z.boolean(),
  notes: z.string().optional(),
  login_link: z.string().url().optional().or(z.literal('')),
  password: z.string().optional(),
  item_type: z.string().optional(),
  location_id: z.string().optional(),
  category_id: z.string().optional(),
  notification_email: z.string().email().optional().or(z.literal('')),
  notification_phone: z.string().optional(),
});

type LicenseFormData = z.infer<typeof licenseSchema>;

interface LicenseEditDialogProps {
  license: License;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const LicenseEditDialog = ({ license, open, onOpenChange, onSuccess }: LicenseEditDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { categories, locations } = useLicenseData();

  const form = useForm<LicenseFormData>({
    resolver: zodResolver(licenseSchema),
    defaultValues: {
      product_name: license.product_name,
      vendor_name: license.vendor_name,
      category: license.category,
      amount: license.amount.toString(),
      billing_cycle: license.billing_cycle,
      start_date: license.start_date,
      expiry_date: license.expiry_date,
      last_renewal_date: license.last_renewal_date || '',
      status: license.status || '',
      payment_status: license.payment_status,
      notes: license.notes || '',
      login_link: license.login_link || '',
      password: license.password || '',
      item_type: license.item_type || '',
      location_id: license.location_id || '',
      category_id: license.category_id || '',
      notification_email: license.notification_email || '',
      notification_phone: license.notification_phone || '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        product_name: license.product_name,
        vendor_name: license.vendor_name,
        category: license.category,
        amount: license.amount.toString(),
        billing_cycle: license.billing_cycle,
        start_date: license.start_date,
        expiry_date: license.expiry_date,
        last_renewal_date: license.last_renewal_date || '',
        status: license.status || '',
        payment_status: license.payment_status,
        notes: license.notes || '',
        login_link: license.login_link || '',
        password: license.password || '',
        item_type: license.item_type || '',
        location_id: license.location_id || '',
        category_id: license.category_id || '',
        notification_email: license.notification_email || '',
        notification_phone: license.notification_phone || '',
      });
    }
  }, [license, open, form]);

  const onSubmit = async (data: LicenseFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('licenses')
        .update({
          product_name: data.product_name,
          vendor_name: data.vendor_name,
          category: data.category,
          amount: parseFloat(data.amount),
          billing_cycle: data.billing_cycle,
          start_date: data.start_date,
          expiry_date: data.expiry_date,
          last_renewal_date: data.last_renewal_date || null,
          status: data.status || null,
          payment_status: data.payment_status,
          notes: data.notes || null,
          login_link: data.login_link || null,
          password: data.password || null,
          item_type: data.item_type || null,
          location_id: data.location_id || null,
          category_id: data.category_id || null,
          notification_email: data.notification_email || null,
          notification_phone: data.notification_phone || null,
        })
        .eq('id', license.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "License updated successfully",
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit License</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <LicenseEditFormFields 
              form={form} 
              categories={categories} 
              locations={locations} 
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Update License'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};