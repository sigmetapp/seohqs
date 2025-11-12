// Временное хранилище в памяти
// В продакшене заменить на реальную БД

export const storage = {
  projects: [] as any[],
  links: [] as any[],
  sites: [] as any[],
  googleData: [] as any[],
  ahrefsData: [] as any[],
  postbacks: [] as any[],
  
  counters: {
    projectId: 1,
    linkId: 1,
    siteId: 1,
    postbackId: 1,
  },
};
