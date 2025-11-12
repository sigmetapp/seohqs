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
    const response = await fetch('/api/csv');
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV data: ${response.statusText}`);
    }
    const data: AffiliateOffer[] = await response.json();
    return data;
  } catch (error) {
    console.error('Error loading CSV data:', error);
    return [];
  }
};
