export interface AffiliateOffer {
  name: string;
  topic: string;
  country: string;
  model: string;
  cr: number;
  ecpc: number;
  epc: number;
}

export const parseCSVFiles = async (): Promise<AffiliateOffer[]> => {
  try {
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    const response = await fetch(`${baseUrl}/api/csv`, {
      cache: 'no-store',
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to fetch CSV data: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Failed to fetch CSV data: ${response.status} ${response.statusText}`);
    }
    
    const data: AffiliateOffer[] = await response.json();
    return data;
  } catch (error) {
    console.error('Error loading CSV data:', error);
    return [];
  }
};
