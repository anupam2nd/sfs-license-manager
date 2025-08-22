import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { STATUS_OPTIONS } from '@/types/license';

interface PaymentStatusBadgeProps {
  licenseId: string;
  currentStatus: string | null;
  paymentStatus: boolean;
  onStatusUpdate?: () => void;
}

export const PaymentStatusBadge = ({ 
  licenseId, 
  currentStatus, 
  paymentStatus, 
  onStatusUpdate 
}: PaymentStatusBadgeProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [newStatus, setNewStatus] = useState(currentStatus || 'Pending');
  const [updating, setUpdating] = useState(false);

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'Paid':
      case 'Confirmed':
        return <CheckCircle className="h-3 w-3" />;
      case 'Expired':
      case 'Cancelled':
        return <XCircle className="h-3 w-3" />;
      case 'Pending':
        return <Clock className="h-3 w-3" />;
      default:
        return <AlertCircle className="h-3 w-3" />;
    }
  };

  const getStatusVariant = (status: string | null) => {
    switch (status) {
      case 'Paid':
      case 'Confirmed':
        return 'default' as const;
      case 'Expired':
      case 'Cancelled':
        return 'destructive' as const;
      case 'Pending':
        return 'secondary' as const;
      default:
        return 'outline' as const;
    }
  };

  const updateStatus = async () => {
    setUpdating(true);
    try {
      const updateData: any = { status: newStatus };
      
      // Smart status logic
      if (newStatus === 'Paid' || newStatus === 'Confirmed') {
        updateData.payment_status = true;
      } else if (newStatus === 'Expired' || newStatus === 'Cancelled') {
        updateData.payment_status = false;
      }

      // Update license status
      const { error: licenseError } = await supabase
        .from('licenses')
        .update(updateData)
        .eq('id', licenseId);

      if (licenseError) throw licenseError;

      // Auto-create payment history when status is "Paid"
      if (newStatus === 'Paid' && currentStatus !== 'Paid') {
        // Get license amount for payment history
        const { data: license } = await supabase
          .from('licenses')
          .select('amount')
          .eq('id', licenseId)
          .single();

        if (license) {
          const { error: paymentError } = await supabase
            .from('payment_history')
            .insert({
              license_id: licenseId,
              amount: license.amount,
              payment_date: new Date().toISOString().split('T')[0],
              notes: 'Payment recorded automatically when status updated to Paid',
              created_by: (await supabase.auth.getUser()).data.user?.id || ''
            });

          if (paymentError) {
            console.warn('Failed to create payment history:', paymentError);
          }
        }
      }

      toast({
        title: "Success",
        description: newStatus === 'Paid' && currentStatus !== 'Paid' 
          ? "Status updated and payment history created!" 
          : "Status updated successfully!",
      });

      setOpen(false);
      onStatusUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Badge 
          variant={getStatusVariant(currentStatus)} 
          className="cursor-pointer hover:opacity-80 flex items-center gap-1"
        >
          {getStatusIcon(currentStatus)}
          {currentStatus || 'Pending'}
        </Badge>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Payment Status</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(status)}
                      {status}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p><strong>Status Guide:</strong></p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li><strong>Pending:</strong> License created, payment not yet made</li>
              <li><strong>Paid:</strong> Payment completed</li>
              <li><strong>Confirmed:</strong> License active and confirmed</li>
              <li><strong>Expired:</strong> License has expired</li>
              <li><strong>Cancelled:</strong> License cancelled</li>
            </ul>
          </div>

          <div className="flex space-x-2">
            <Button 
              onClick={updateStatus}
              disabled={updating || newStatus === currentStatus}
            >
              {updating ? 'Updating...' : 'Update Status'}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};