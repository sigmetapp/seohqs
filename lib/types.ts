// Типы для affiliate offers (старые, для совместимости)
export interface AffiliateOffer {
  id: number;
  name: string;
  topic: string;
  country: string;
  model: string;
  cr: number;
  ecpc: number;
  epc: number;
  source?: string;
  createdAt?: string;
}

// Типы для индексатора ссылок
export interface IndexingRequest {
  url: string;
  action: 'index' | 'remove';
}

export interface IndexingResponse {
  success: boolean;
  message: string;
  data?: any;
}

// Типы для ссылочного профиля
export interface LinkProject {
  id: number;
  name: string;
  domain: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectLink {
  id: number;
  projectId: number;
  url: string;
  anchorText?: string;
  targetUrl: string;
  status: 'pending' | 'indexed' | 'not_found' | 'error';
  lastChecked?: string;
  indexedAt?: string;
  createdAt: string;
}

export interface LinkCheckResult {
  linkId: number;
  isIndexed: boolean;
  isOnPage: boolean;
  checkedAt: string;
  error?: string;
}

// Типы для панели сайтов
export interface Site {
  id: number;
  name: string;
  domain: string;
  category?: string;
  googleSearchConsoleUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GoogleSearchConsoleData {
  siteId: number;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  date: string;
}

export interface PostbackData {
  siteId: number;
  network: string;
  event: string;
  amount: number;
  currency: string;
  date: string;
  data?: Record<string, any>;
}

// Типы для настроек интеграций
export interface IntegrationsSettings {
  id: number;
  googleServiceAccountEmail?: string;
  googlePrivateKey?: string;
  googleAccessToken?: string;
  googleRefreshToken?: string;
  googleTokenExpiry?: string;
  googleSearchConsoleUrl?: string;
  updatedAt: string;
}
