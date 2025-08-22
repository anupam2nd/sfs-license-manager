import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MoreHorizontal, Edit, Trash2, Download } from 'lucide-react';
import { LicenseEditDialog } from './LicenseEditDialog';
import { PaymentHistoryDialog } from './PaymentHistoryDialog';
import { PaymentStatusBadge } from './PaymentStatusBadge';

type License = Database['public']['Tables']['licenses']['Row'] & {
  locations?: {
    id: string;
    name: string;
  } | null;
};

interface LicenseTableProps {
  licenses: License[];
  onLicenseUpdate: () => void;
}

export const LicenseTable = ({ licenses, onLicenseUpdate }: LicenseTableProps) => {
  const [editingLicense, setEditingLicense] = useState<License | null>(null);
  const [deletingLicense, setDeletingLicense] = useState<License | null>(null);
  const { toast } = useToast();

  const getExpiryStatus = (expiryDate: string) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return { status: 'expired', variant: 'destructive' as const, text: 'Expired' };
    } else if (daysUntilExpiry <= 7) {
      return { status: 'critical', variant: 'destructive' as const, text: `${daysUntilExpiry} days` };
    } else if (daysUntilExpiry <= 30) {
      return { status: 'warning', variant: 'default' as const, text: `${daysUntilExpiry} days` };
    } else {
      return { status: 'active', variant: 'secondary' as const, text: `${daysUntilExpiry} days` };
    }
  };

  const handleDelete = async () => {
    if (!deletingLicense) return;

    try {
      const { error } = await supabase
        .from('licenses')
        .delete()
        .eq('id', deletingLicense.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "License deleted successfully",
      });

      onLicenseUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeletingLicense(null);
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Product Name',
      'Vendor',
      'Category',
      'Branch Name',
      'Amount',
      'Billing Cycle',
      'Start Date',
      'Expiry Date',
      'Last Renewal Date',
      'Status',
      'Payment Status',
      'Notes'
    ];

    const csvData = licenses.map(license => [
      license.product_name,
      license.vendor_name,
      license.category,
      license.locations?.name || '',
      license.amount,
      license.billing_cycle,
      license.start_date,
      license.expiry_date,
      license.last_renewal_date || '',
      license.status || '',
      license.payment_status ? 'Paid' : 'Unpaid',
      license.notes || ''
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `licenses_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Success",
      description: "Licenses exported successfully",
    });
  };

  if (licenses.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No licenses found. <a href="/add-license" className="text-blue-600 hover:underline">Add your first license</a>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Licenses ({licenses.length})</h3>
        <Button onClick={exportToCSV} variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Branch Name</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Billing Cycle</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Payment History</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {licenses.map((license) => {
              const expiryStatus = getExpiryStatus(license.expiry_date);
              return (
                <TableRow key={license.id}>
                  <TableCell className="font-medium">{license.product_name}</TableCell>
                  <TableCell>{license.vendor_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{license.category}</Badge>
                  </TableCell>
                  <TableCell>{license.locations?.name || 'N/A'}</TableCell>
                  <TableCell>₹{Number(license.amount).toFixed(2)}</TableCell>
                  <TableCell>{license.billing_cycle}</TableCell>
                  <TableCell>{new Date(license.start_date).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(license.expiry_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={expiryStatus.variant}>{expiryStatus.text}</Badge>
                  </TableCell>
                  <TableCell>
                    <PaymentStatusBadge
                      licenseId={license.id}
                      currentStatus={license.status}
                      paymentStatus={license.payment_status}
                      onStatusUpdate={onLicenseUpdate}
                    />
                  </TableCell>
                  <TableCell>
                    <PaymentHistoryDialog
                      licenseId={license.id}
                      licenseName={license.product_name}
                    />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingLicense(license)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setDeletingLicense(license)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {editingLicense && (
        <LicenseEditDialog
          license={editingLicense}
          open={!!editingLicense}
          onOpenChange={() => setEditingLicense(null)}
          onSuccess={() => {
            setEditingLicense(null);
            onLicenseUpdate();
          }}
        />
      )}

      <AlertDialog open={!!deletingLicense} onOpenChange={() => setDeletingLicense(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete License</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingLicense?.product_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};