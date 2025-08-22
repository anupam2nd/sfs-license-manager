import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Clock, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface License {
  id: string;
  product_name: string;
  vendor_name: string;
  expiry_date: string;
  notification_email: string;
  notification_phone: string;
}

const Notifications = () => {
  const [expiringLicenses, setExpiringLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchExpiringLicenses = async () => {
      if (!user) return;

      try {
        const today = new Date();
        const sevenDaysFromNow = new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000));

        const { data, error } = await supabase
          .from('licenses')
          .select('*')
          .eq('created_by', user.id)
          .gte('expiry_date', today.toISOString().split('T')[0])
          .lte('expiry_date', sevenDaysFromNow.toISOString().split('T')[0])
          .order('expiry_date', { ascending: true });

        if (error) {
          toast({
            title: "Error",
            description: "Failed to load notifications",
            variant: "destructive",
          });
          return;
        }

        setExpiringLicenses(data || []);
      } catch (error) {
        console.error('Error fetching notifications:', error);
        toast({
          title: "Error",
          description: "Failed to load notifications",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchExpiringLicenses();
  }, [user, toast]);

  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getUrgencyBadge = (days: number) => {
    if (days <= 3) {
      return <Badge variant="destructive" className="flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" />
        Critical
      </Badge>;
    } else if (days <= 7) {
      return <Badge variant="secondary" className="flex items-center gap-1">
        <Clock className="w-3 h-3" />
        Warning
      </Badge>;
    }
    return <Badge variant="outline">Notice</Badge>;
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center">Loading notifications...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-6 h-6" />
            Notifications
          </h1>
          <p className="text-gray-600 mt-1">
            Licenses expiring within the next 7 days
          </p>
        </div>

        {expiringLicenses.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No notifications
              </h3>
              <p className="text-gray-600">
                You have no licenses expiring in the next 7 days.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {expiringLicenses.map((license) => {
              const daysUntilExpiry = getDaysUntilExpiry(license.expiry_date);
              
              return (
                <Card key={license.id} className="border-l-4 border-l-orange-500">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{license.product_name}</CardTitle>
                        <CardDescription>
                          Vendor: {license.vendor_name}
                        </CardDescription>
                      </div>
                      {getUrgencyBadge(daysUntilExpiry)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Expiry Date</p>
                        <p className="text-sm text-gray-600">{license.expiry_date}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Days Remaining</p>
                        <p className={`text-sm font-semibold ${
                          daysUntilExpiry <= 3 ? 'text-red-600' : 
                          daysUntilExpiry <= 7 ? 'text-orange-600' : 'text-green-600'
                        }`}>
                          {daysUntilExpiry} days
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Notification Contact</p>
                        <p className="text-sm text-gray-600">
                          {license.notification_email || 'No email set'}
                        </p>
                        {license.notification_phone && (
                          <p className="text-sm text-gray-600">{license.notification_phone}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Notifications;