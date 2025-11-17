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
  userId?: number;
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
  userId?: number;
  createdAt: string;
  updatedAt: string;
  // Поля, добавляемые в API response для отображения статуса подключений
  hasGoogleConsoleConnection?: boolean;
  // Детальная информация о статусе Google Console
  googleConsoleStatus?: {
    connected: boolean;
    hasOAuth: boolean;
    hasUrl: boolean;
  };
  // Теги сайта
  tags?: Tag[];
}

// Типы для тегов
export interface Tag {
  id: number;
  name: string;
  color: string;
  userId?: number;
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
  userId?: number;
  googleServiceAccountEmail?: string;
  googlePrivateKey?: string;
  googleAccessToken?: string;
  googleRefreshToken?: string;
  googleTokenExpiry?: string;
  googleSearchConsoleUrl?: string;
  updatedAt: string;
}

// Типы для Google аккаунтов
export interface GoogleAccount {
  id: number;
  email: string;
  userId?: number;
  googleAccessToken?: string;
  googleRefreshToken?: string;
  googleTokenExpiry?: string;
  createdAt: string;
  updatedAt: string;
}

// Типы для задач сайтов
export interface SiteTask {
  id: number;
  siteId: number;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  deadline?: string;
  comments?: string;
  priority?: number; // 1-10
  assigneeId?: number;
  assignee?: {
    id: number;
    email: string;
    name?: string;
  };
  tags?: string[];
  estimatedTime?: number; // в минутах
  actualTime?: number; // в минутах
  parentTaskId?: number;
  subtasks?: SiteTask[];
  createdAt: string;
  updatedAt: string;
}

// Типы для сообщений задач
export interface TaskMessage {
  id: number;
  taskId: number;
  userId?: number;
  user?: {
    id: number;
    email: string;
    name?: string;
  };
  message: string;
  createdAt: string;
  updatedAt: string;
}

// Типы для активности задач
export interface TaskActivity {
  id: number;
  taskId: number;
  userId?: number;
  user?: {
    id: number;
    email: string;
    name?: string;
  };
  action: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  createdAt: string;
}
