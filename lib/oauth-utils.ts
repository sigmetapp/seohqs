import { IntegrationsSettings } from './types';

/**
 * Проверяет, настроена ли OAuth авторизация Google
 * @param integrations Настройки интеграций
 * @returns true, если OAuth токены присутствуют и не являются пустыми строками
 */
export function hasGoogleOAuth(integrations: IntegrationsSettings): boolean {
  const accessToken = integrations.googleAccessToken?.trim() || '';
  const refreshToken = integrations.googleRefreshToken?.trim() || '';
  return !!(accessToken && refreshToken);
}
