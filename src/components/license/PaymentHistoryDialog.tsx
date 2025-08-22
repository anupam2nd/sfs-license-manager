import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, History, Plus, IndianRupee } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface PaymentHistory {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  transaction_id: string | null;
  notes: string | null;
}

interface PaymentHistoryDialogProps {
  licenseId: string;
  licenseName: string;
}

export const PaymentHistoryDialog = ({ licenseId, licenseName }: PaymentHistoryDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [newPayment, setNewPayment] = useState({
    amount: '',
    payment_date: undefined as Date | undefined,
    payment_method: '',
    transaction_id: '',
    notes: '',
  });

  const fetchPaymentHistory = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payment_history')
        .select('*')
        .eq('license_id', licenseId)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setPaymentHistory(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch payment history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addPayment = async () => {
    if (!user || !newPayment.amount || !newPayment.payment_date) return;

    try {
      const { error } = await supabase
        .from('payment_history')
        .insert({
          license_id: licenseId,
          amount: parseFloat(newPayment.amount),
          payment_date: newPayment.payment_date.toISOString().split('T')[0],
          payment_method: newPayment.payment_method || null,
          transaction_id: newPayment.transaction_id || null,
          notes: newPayment.notes || null,
          created_by: user.id,
        });

      if (error) throw error;

      // Update license payment_status to true after adding payment
      await supabase
        .from('licenses')
        .update({ payment_status: true, status: 'Paid' })
        .eq('id', licenseId);

      toast({
        title: "Success",
        description: "Payment record added successfully!",
      });

      setNewPayment({
        amount: '',
        payment_date: undefined,
        payment_method: '',
        transaction_id: '',
        notes: '',
      });
      setAddPaymentOpen(false);
      fetchPaymentHistory();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (open) {
      fetchPaymentHistory();
    }
  }, [open]);

  const totalPaid = paymentHistory.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="h-4 w-4 mr-2" />
          Payment History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payment History - {licenseName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <IndianRupee className="h-4 w-4" />
              <span className="font-semibold">Total Paid: ₹{totalPaid.toFixed(2)}</span>
            </div>
            <Dialog open={addPaymentOpen} onOpenChange={setAddPaymentOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Payment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Payment Record</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (INR) *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={newPayment.amount}
                      onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Payment Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !newPayment.payment_date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newPayment.payment_date ? format(newPayment.payment_date, "PPP") : "Pick payment date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={newPayment.payment_date}
                          onSelect={(date) => setNewPayment({ ...newPayment, payment_date: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payment_method">Payment Method</Label>
                    <Select value={newPayment.payment_method} onValueChange={(value) => setNewPayment({ ...newPayment, payment_method: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Credit Card">Credit Card</SelectItem>
                        <SelectItem value="Debit Card">Debit Card</SelectItem>
                        <SelectItem value="Net Banking">Net Banking</SelectItem>
                        <SelectItem value="UPI">UPI</SelectItem>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transaction_id">Transaction ID</Label>
                    <Input
                      id="transaction_id"
                      value={newPayment.transaction_id}
                      onChange={(e) => setNewPayment({ ...newPayment, transaction_id: e.target.value })}
                      placeholder="Transaction reference number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={newPayment.notes}
                      onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                      placeholder="Additional notes about this payment..."
                      rows={3}
                    />
                  </div>

                  <div className="flex space-x-2">
                    <Button 
                      onClick={addPayment}
                      disabled={!newPayment.amount || !newPayment.payment_date}
                    >
                      Add Payment
                    </Button>
                    <Button variant="outline" onClick={() => setAddPaymentOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="text-center py-4">Loading payment history...</div>
          ) : paymentHistory.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <CardTitle className="mb-2">No Payment History</CardTitle>
                <CardDescription>
                  No payments have been recorded for this license yet.
                </CardDescription>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {paymentHistory.map((payment) => (
                <Card key={payment.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <IndianRupee className="h-4 w-4" />
                          <span className="font-semibold">₹{payment.amount.toFixed(2)}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Paid on {format(new Date(payment.payment_date), "PPP")}
                        </p>
                        {payment.payment_method && (
                          <p className="text-sm">Method: {payment.payment_method}</p>
                        )}
                        {payment.transaction_id && (
                          <p className="text-sm">Transaction ID: {payment.transaction_id}</p>
                        )}
                      </div>
                    </div>
                    {payment.notes && (
                      <p className="text-sm text-muted-foreground mt-2">{payment.notes}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};