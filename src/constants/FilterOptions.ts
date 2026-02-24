export type AccountFilterType = 'all' | 'customers' | 'suppliers' | 'safes' | 'banks' | 'personnel';

export interface AccountFilterOption {
  id: AccountFilterType;
  label: string;
  icon: string;
  color: string;
}

export const ACCOUNT_FILTER_OPTIONS: AccountFilterOption[] = [
  { id: 'all', label: 'Tümü', icon: 'grid-outline', color: '#6B7280' },
  { id: 'customers', label: 'Müşteriler', icon: 'person-outline', color: '#3B82F6' },
  { id: 'suppliers', label: 'Tedarikçiler', icon: 'business-outline', color: '#8B5CF6' },
  { id: 'safes', label: 'Kasalar', icon: 'wallet-outline', color: '#10B981' },
  { id: 'banks', label: 'Bankalar', icon: 'card-outline', color: '#F59E0B' },
  { id: 'personnel', label: 'Personeller', icon: 'people-outline', color: '#EF4444' },
];
