export interface AffiliateOffer {
  id?: number;
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

export const loadDataFromDB = async (): Promise<AffiliateOffer[]> => {
  try {
    // Используем переменную окружения или window.location.origin
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
      (typeof window !== 'undefined' ? window.location.origin : '');
    
    const response = await fetch(`${baseUrl}/api/data`, {
      cache: 'no-store',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.success && result.offers) {
      return result.offers;
    }
    
    return [];
  } catch (error) {
    console.error('Error loading data from DB:', error);
    return [];
  }
};
