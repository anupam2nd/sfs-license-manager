import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface NotificationSettings {
  email_enabled: boolean;
  days_before_expiry: number[];
}

export const Settings = () => {
  const [settings, setSettings] = useState<NotificationSettings>({
    email_enabled: true,
    days_before_expiry: [15, 7, 1],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings({
          email_enabled: data.email_enabled,
          days_before_expiry: data.days_before_expiry,
        });
      }
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

  const saveSettings = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: user.id,
          email_enabled: settings.email_enabled,
          days_before_expiry: settings.days_before_expiry,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Settings saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

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
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">Manage your notification preferences and account settings</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Notification Settings</CardTitle>
            <CardDescription>
              Configure when and how you want to receive license expiry notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="email-notifications"
                checked={settings.email_enabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, email_enabled: checked })
                }
              />
              <Label htmlFor="email-notifications">Enable email notifications</Label>
            </div>

            <div className="space-y-3">
              <Label>Days before expiry to send notifications</Label>
              <div className="grid grid-cols-3 gap-4">
                {[30, 15, 7, 3, 1].map((days) => (
                  <div key={days} className="flex items-center space-x-2">
                    <Switch
                      id={`days-${days}`}
                      checked={settings.days_before_expiry.includes(days)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSettings({
                            ...settings,
                            days_before_expiry: [...settings.days_before_expiry, days].sort((a, b) => b - a),
                          });
                        } else {
                          setSettings({
                            ...settings,
                            days_before_expiry: settings.days_before_expiry.filter((d) => d !== days),
                          });
                        }
                      }}
                    />
                    <Label htmlFor={`days-${days}`}>{days} day{days !== 1 ? 's' : ''}</Label>
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={saveSettings} disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Settings;