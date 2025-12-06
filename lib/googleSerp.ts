/**
 * Google SERP (Search Engine Results Page) integration utility
 * 
 * This module provides functionality to fetch top 10 Google search results
 * for a given query. The actual implementation should be wired to a SERP API
 * provider such as SerpAPI, Zenserp, or Google Custom Search API.
 */

export type SerpResult = {
  url: string;
  title: string;
  snippet: string;
};

export type SerpParams = {
  query: string;
  language?: string;
  country?: string;
};

/**
 * Fetches the top 10 Google search results for a given query
 * 
 * @param params - Search parameters
 * @param params.query - The search query string
 * @param params.language - Optional language code (e.g., 'ru', 'en')
 * @param params.country - Optional country code (e.g., 'ru', 'us')
 * @returns Promise resolving to an array of SERP results (max 10)
 * 
 * @example
 * ```ts
 * const results = await fetchGoogleSerpTop10({
 *   query: 'SEO best practices',
 *   language: 'en',
 *   country: 'us'
 * });
 * ```
 */
export async function fetchGoogleSerpTop10(params: SerpParams): Promise<SerpResult[]> {
  const { query, language, country } = params;

  // Try Google Custom Search API first (recommended for free tier)
  const googleApiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const googleEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
  
  if (googleApiKey && googleEngineId) {
    try {
      const response = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${googleEngineId}&q=${encodeURIComponent(query)}&hl=${language || 'en'}&gl=${country || 'us'}&num=10`
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google Custom Search API error: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const data = await response.json();
      
      // Handle API errors
      if (data.error) {
        throw new Error(`Google Custom Search API error: ${data.error.message || JSON.stringify(data.error)}`);
      }
      
      return (data.items || []).slice(0, 10).map((item: any) => ({
        url: item.link,
        title: item.title || '',
        snippet: item.snippet || '',
      }));
    } catch (error: any) {
      console.error('[GOOGLE_SERP] Google Custom Search API failed:', error.message);
      throw error;
    }
  }

  // Fallback to SerpAPI if configured
  const serpApiKey = process.env.SERP_API_KEY;
  if (serpApiKey) {
    try {
      const response = await fetch(
        `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${serpApiKey}&hl=${language || 'en'}&gl=${country || 'us'}&num=10`
      );
      
      if (!response.ok) {
        throw new Error(`SerpAPI error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return (data.organic_results || []).slice(0, 10).map((result: any) => ({
        url: result.link,
        title: result.title || '',
        snippet: result.snippet || '',
      }));
    } catch (error: any) {
      console.error('[GOOGLE_SERP] SerpAPI failed:', error.message);
      throw error;
    }
  }

  // Fallback to Zenserp if configured
  const zenserpApiKey = process.env.ZENSERP_API_KEY;
  if (zenserpApiKey) {
    try {
      const response = await fetch(
        `https://app.zenserp.com/api/v2/search?q=${encodeURIComponent(query)}&apikey=${zenserpApiKey}&hl=${language || 'en'}&gl=${country || 'us'}&num=10`
      );
      
      if (!response.ok) {
        throw new Error(`Zenserp error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return (data.organic || []).slice(0, 10).map((result: any) => ({
        url: result.url,
        title: result.title || '',
        snippet: result.description || '',
      }));
    } catch (error: any) {
      console.error('[GOOGLE_SERP] Zenserp failed:', error.message);
      throw error;
    }
  }

  // No SERP provider configured
  throw new Error(
    'No SERP API configured. Please set one of: GOOGLE_SEARCH_API_KEY + GOOGLE_SEARCH_ENGINE_ID, SERP_API_KEY, or ZENSERP_API_KEY. ' +
    'See GOOGLE_SERP_SETUP.md for setup instructions.'
  );
}
