export interface LicenseFormData {
  productName: string;
  vendorName: string;
  categoryId: string;
  locationId: string;
  amount: string;
  billingCycle: string;
  status: string;
  startDate: Date | undefined;
  lastRenewalDate: Date | undefined;
  expiryDate: Date | undefined;
  loginLink: string;
  password: string;
  notes: string;
  notificationEmail: string;
  notificationPhone: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Location {
  id: string;
  name: string;
}

export const BILLING_CYCLES = [
  'Monthly',
  'Quarterly',
  'Semi-Annual',
  'Annual',
  'Biennial',
  'One-time'
] as const;

export const STATUS_OPTIONS = [
  'Pending',
  'Paid',
  'Confirmed',
  'Expired',
  'Cancelled'
] as const;