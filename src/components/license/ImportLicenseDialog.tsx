import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useLicenseData } from '@/hooks/useLicenseData';
import { Upload, Download, AlertCircle } from 'lucide-react';

interface CSVLicenseRow {
  product_name: string;
  vendor_name: string;
  category: string;
  amount: string;
  billing_cycle: string;
  status: string;
  start_date: string;
  expiry_date: string;
  last_renewal_date?: string;
  login_link?: string;
  password?: string;
  notes?: string;
  notification_email?: string;
  notification_phone?: string;
}

export const ImportLicenseDialog = ({ onImportComplete }: { onImportComplete: () => void }) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();
  const { categories, locations } = useLicenseData();

  const downloadTemplate = () => {
    const csvContent = `product_name,vendor_name,category,amount,billing_cycle,status,start_date,expiry_date,last_renewal_date,login_link,password,notes,notification_email,notification_phone
Microsoft Office,Microsoft,Software,99.00,Annual,Active,2024-01-01,2024-12-31,2024-01-01,https://office.com,password123,Office productivity suite,user@company.com,+1234567890
Adobe Creative Suite,Adobe,Design,299.00,Monthly,Active,2024-01-01,2024-02-01,,https://adobe.com,password456,Design software,design@company.com,+1234567891`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'license_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): CSVLicenseRow[] => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    return lines.slice(1).map((line, index) => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row: any = {};
      
      headers.forEach((header, i) => {
        row[header] = values[i] || '';
      });
      
      return row as CSVLicenseRow;
    });
  };

  const validateRow = (row: CSVLicenseRow, index: number): string[] => {
    const rowErrors: string[] = [];
    
    if (!row.product_name) rowErrors.push(`Row ${index + 2}: Product name is required`);
    if (!row.vendor_name) rowErrors.push(`Row ${index + 2}: Vendor name is required`);
    if (!row.category) rowErrors.push(`Row ${index + 2}: Category is required`);
    if (!row.amount || isNaN(parseFloat(row.amount))) rowErrors.push(`Row ${index + 2}: Valid amount is required`);
    if (!row.billing_cycle) rowErrors.push(`Row ${index + 2}: Billing cycle is required`);
    if (!row.status) rowErrors.push(`Row ${index + 2}: Status is required`);
    if (!row.start_date) rowErrors.push(`Row ${index + 2}: Start date is required`);
    if (!row.expiry_date) rowErrors.push(`Row ${index + 2}: Expiry date is required`);
    
    // Validate date formats
    if (row.start_date && isNaN(Date.parse(row.start_date))) {
      rowErrors.push(`Row ${index + 2}: Invalid start date format`);
    }
    if (row.expiry_date && isNaN(Date.parse(row.expiry_date))) {
      rowErrors.push(`Row ${index + 2}: Invalid expiry date format`);
    }
    if (row.last_renewal_date && row.last_renewal_date !== '' && isNaN(Date.parse(row.last_renewal_date))) {
      rowErrors.push(`Row ${index + 2}: Invalid last renewal date format`);
    }
    
    return rowErrors;
  };

  const handleImport = async () => {
    if (!file || !user) return;
    
    setLoading(true);
    setErrors([]);
    
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      
      // Validate all rows
      const allErrors: string[] = [];
      rows.forEach((row, index) => {
        const rowErrors = validateRow(row, index);
        allErrors.push(...rowErrors);
      });
      
      if (allErrors.length > 0) {
        setErrors(allErrors);
        setLoading(false);
        return;
      }
      
      // Import valid rows
      const licensesToInsert = rows.map(row => {
        // Find matching category ID
        const categoryMatch = categories.find(cat => 
          cat.name.toLowerCase() === row.category.toLowerCase()
        );
        
        // Find matching location ID (use first location if none specified)
        const locationId = locations.length > 0 ? locations[0].id : null;
        
        return {
          product_name: row.product_name,
          vendor_name: row.vendor_name,
          category: row.category,
          category_id: categoryMatch?.id || null,
          location_id: locationId,
          amount: parseFloat(row.amount),
          billing_cycle: row.billing_cycle,
          status: row.status,
          start_date: row.start_date,
          expiry_date: row.expiry_date,
          last_renewal_date: row.last_renewal_date || null,
          login_link: row.login_link || null,
          password: row.password || null,
          notes: row.notes || null,
          notification_email: row.notification_email || null,
          notification_phone: row.notification_phone || null,
          created_by: user.id,
          user_id: user.id,
        };
      });
      
      const { error } = await supabase
        .from('licenses')
        .insert(licensesToInsert);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Successfully imported ${rows.length} license(s)!`,
      });
      
      setOpen(false);
      setFile(null);
      onImportComplete();
      
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setErrors([]);
    } else {
      toast({
        title: "Error",
        description: "Please select a valid CSV file",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="w-4 h-4 mr-2" />
          Import Licenses
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Licenses</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import multiple licenses at once
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Button variant="outline" onClick={downloadTemplate} className="w-full mb-4">
              <Download className="w-4 h-4 mr-2" />
              Download CSV Template
            </Button>
          </div>
          
          <div>
            <Label htmlFor="csv-file">Select CSV File</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="mt-1"
            />
          </div>
          
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="max-h-32 overflow-y-auto">
                  {errors.map((error, index) => (
                    <div key={index} className="text-sm">{error}</div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex space-x-2">
            <Button 
              onClick={handleImport} 
              disabled={!file || loading}
              className="flex-1"
            >
              {loading ? 'Importing...' : 'Import'}
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