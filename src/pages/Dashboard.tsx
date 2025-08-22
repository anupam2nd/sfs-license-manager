
import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LicenseTable } from '@/components/license/LicenseTable';
import { ImportLicenseDialog } from '@/components/license/ImportLicenseDialog';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { Calendar, DollarSign, FileText, AlertTriangle, Plus, Search, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type License = Database['public']['Tables']['licenses']['Row'] & {
  locations?: {
    id: string;
    name: string;
  } | null;
};

export const Dashboard = () => {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [filteredLicenses, setFilteredLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [renewalFilter, setRenewalFilter] = useState('all'); // 'all', 'upcoming', 'expired'
  const [stats, setStats] = useState({
    total: 0,
    upcoming: 0,
    expired: 0,
    totalValue: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchLicenses();
  }, []);

  useEffect(() => {
    filterLicenses();
    calculateStats();
  }, [licenses, searchTerm, categoryFilter, branchFilter, renewalFilter]);

  const fetchLicenses = async () => {
    try {
      const { data, error } = await supabase
        .from('licenses')
        .select(`
          *,
          locations (
            id,
            name
          )
        `)
        .order('expiry_date', { ascending: true });

      if (error) throw error;
      setLicenses(data || []);
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

  const filterLicenses = () => {
    let filtered = licenses;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (license) =>
          license.product_name.toLowerCase().includes(searchLower) ||
          license.vendor_name.toLowerCase().includes(searchLower) ||
          license.category.toLowerCase().includes(searchLower) ||
          license.locations?.name?.toLowerCase().includes(searchLower) ||
          license.billing_cycle?.toLowerCase().includes(searchLower) ||
          license.amount.toString().includes(searchLower) ||
          license.expiry_date.includes(searchTerm) ||
          license.start_date?.includes(searchTerm) ||
          (license.payment_status ? 'paid' : 'unpaid').includes(searchLower) ||
          license.notes?.toLowerCase().includes(searchLower)
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((license) => license.category === categoryFilter);
    }

    if (branchFilter !== 'all') {
      filtered = filtered.filter((license) => license.locations?.name === branchFilter);
    }

    // Filter by renewal status
    if (renewalFilter === 'upcoming') {
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(
        (license) => 
          new Date(license.expiry_date) <= thirtyDaysFromNow && 
          new Date(license.expiry_date) >= now &&
          !license.payment_status
      );
    } else if (renewalFilter === 'expired') {
      const now = new Date();
      filtered = filtered.filter(
        (license) => new Date(license.expiry_date) < now
      );
    }

    setFilteredLicenses(filtered);
  };

  const calculateStats = () => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const total = licenses.length;
    const upcoming = licenses.filter(
      (license) => 
        new Date(license.expiry_date) <= thirtyDaysFromNow && 
        new Date(license.expiry_date) >= now &&
        !license.payment_status
    ).length;
    const expired = licenses.filter(
      (license) => new Date(license.expiry_date) < now
    ).length;
    const totalValue = licenses.reduce((sum, license) => sum + Number(license.amount), 0);

    setStats({ total, upcoming, expired, totalValue });
  };


  const uniqueCategories = [...new Set(licenses.map((license) => license.category))];
  const uniqueBranches = [...new Set(licenses.map((license) => license.locations?.name).filter(Boolean))];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex space-x-2">
            <ImportLicenseDialog onImportComplete={fetchLicenses} />
            <Button asChild>
              <a href="/add-license">
                <Plus className="w-4 h-4 mr-2" />
                Add License
              </a>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Licenses</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Active licenses</p>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${
              renewalFilter === 'upcoming' ? 'ring-2 ring-primary bg-primary/5' : ''
            }`}
            onClick={() => {
              setRenewalFilter(renewalFilter === 'upcoming' ? 'all' : 'upcoming');
              setCategoryFilter('all');
            }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Renewals</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upcoming}</div>
              <p className="text-xs text-muted-foreground">Next 30 days (unpaid)</p>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${
              renewalFilter === 'expired' ? 'ring-2 ring-destructive bg-destructive/5' : ''
            }`}
            onClick={() => {
              setRenewalFilter(renewalFilter === 'expired' ? 'all' : 'expired');
              setCategoryFilter('all');
            }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expired</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.expired}</div>
              <p className="text-xs text-muted-foreground">Needs attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.totalValue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Annual cost</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>License Management</CardTitle>
            <CardDescription>View and manage all your licenses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search licenses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {uniqueCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {uniqueBranches.map((branch) => (
                    <SelectItem key={branch} value={branch}>
                      {branch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <LicenseTable 
              licenses={filteredLicenses} 
              onLicenseUpdate={fetchLicenses} 
            />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;
