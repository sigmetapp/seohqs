// Временное хранилище в памяти
// В продакшене заменить на реальную БД

export const storage = {
  projects: [] as any[],
  links: [] as any[],
  sites: [] as any[],
  googleData: [] as any[],
  postbacks: [] as any[],
  integrations: {
    id: 1,
    googleServiceAccountEmail: '',
    googlePrivateKey: '',
    googleAccessToken: '',
    googleRefreshToken: '',
    googleTokenExpiry: '',
    googleSearchConsoleUrl: '',
    updatedAt: new Date().toISOString(),
  },
  
  counters: {
    projectId: 1,
    linkId: 1,
    siteId: 1,
    postbackId: 1,
  },
};
