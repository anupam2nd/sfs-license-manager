import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { Resend } from "npm:resend@2.0.0";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface License {
  id: string;
  product_name: string;
  vendor_name: string;
  expiry_date: string;
  notification_email: string;
  notification_phone: string;
  created_by: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Checking license expiry notifications...');

    // Get current date and dates for notification checks
    const today = new Date();
    const in30Days = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
    const in15Days = new Date(today.getTime() + (15 * 24 * 60 * 60 * 1000));
    const in7Days = new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000));
    const in3Days = new Date(today.getTime() + (3 * 24 * 60 * 60 * 1000));

    // Query licenses expiring soon
    const { data: licenses, error } = await supabase
      .from('licenses')
      .select('*')
      .gte('expiry_date', today.toISOString().split('T')[0])
      .lte('expiry_date', in30Days.toISOString().split('T')[0])
      .not('notification_email', 'is', null);

    if (error) {
      throw error;
    }

    console.log(`Found ${licenses?.length || 0} licenses to check`);

    const notifications = [];

    for (const license of licenses || []) {
      const expiryDate = new Date(license.expiry_date);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      let shouldNotify = false;
      let urgencyLevel = '';

      if (daysUntilExpiry <= 3) {
        shouldNotify = true;
        urgencyLevel = 'URGENT';
      } else if (daysUntilExpiry <= 7) {
        shouldNotify = true;
        urgencyLevel = 'HIGH';
      } else if (daysUntilExpiry <= 15) {
        shouldNotify = true;
        urgencyLevel = 'MEDIUM';
      } else if (daysUntilExpiry <= 30) {
        shouldNotify = true;
        urgencyLevel = 'LOW';
      }

      if (shouldNotify && license.notification_email) {
        try {
          const emailSubject = `License Expiry Alert: ${license.product_name} - ${daysUntilExpiry} days remaining`;
          const emailHtml = `
            <h2>License Expiry Notification</h2>
            <p><strong>Urgency:</strong> ${urgencyLevel}</p>
            <p><strong>Product:</strong> ${license.product_name}</p>
            <p><strong>Vendor:</strong> ${license.vendor_name}</p>
            <p><strong>Expiry Date:</strong> ${license.expiry_date}</p>
            <p><strong>Days Until Expiry:</strong> ${daysUntilExpiry}</p>
            
            ${daysUntilExpiry <= 3 ? 
              '<p style="color: red; font-weight: bold;">⚠️ URGENT: This license expires very soon!</p>' :
              daysUntilExpiry <= 7 ?
              '<p style="color: orange; font-weight: bold;">⚠️ This license expires within a week!</p>' :
              '<p>Please plan for renewal to avoid service interruption.</p>'
            }
            
            <p>Please take necessary action to renew this license before it expires.</p>
          `;

          const emailResponse = await resend.emails.send({
            from: 'License Manager <notifications@resend.dev>',
            to: [license.notification_email],
            subject: emailSubject,
            html: emailHtml,
          });

          notifications.push({
            license_id: license.id,
            email: license.notification_email,
            days_until_expiry: daysUntilExpiry,
            urgency: urgencyLevel,
            status: 'sent',
            email_id: emailResponse.data?.id
          });

          console.log(`Email sent for license ${license.id} to ${license.notification_email}`);
        } catch (emailError) {
          console.error(`Failed to send email for license ${license.id}:`, emailError);
          notifications.push({
            license_id: license.id,
            email: license.notification_email,
            days_until_expiry: daysUntilExpiry,
            urgency: urgencyLevel,
            status: 'failed',
            error: emailError.message
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked_licenses: licenses?.length || 0,
        notifications_sent: notifications.filter(n => n.status === 'sent').length,
        notifications_failed: notifications.filter(n => n.status === 'failed').length,
        details: notifications
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in check-license-expiry function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});