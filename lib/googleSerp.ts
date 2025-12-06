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
      const url = `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${googleEngineId}&q=${encodeURIComponent(query)}&hl=${language || 'en'}&gl=${country || 'us'}&num=10`;
      console.log(`[GOOGLE_SERP] Fetching from Google Custom Search API: query="${query}", language=${language || 'en'}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[GOOGLE_SERP] Google Custom Search API HTTP error: ${response.status} ${response.statusText}`);
        console.error(`[GOOGLE_SERP] Error response body:`, errorText);
        // Don't throw here, try fallback APIs instead
        console.warn(`[GOOGLE_SERP] Google Custom Search API failed, trying fallback APIs...`);
      } else {
        const data = await response.json();
        
        // Handle API errors in response body
        if (data.error) {
          console.error(`[GOOGLE_SERP] Google Custom Search API error response:`, JSON.stringify(data.error, null, 2));
          console.warn(`[GOOGLE_SERP] Google Custom Search API returned error, trying fallback APIs...`);
        } else {
          const items = data.items || [];
          console.log(`[GOOGLE_SERP] Google Custom Search API returned ${items.length} items`);
          
          const results = items.slice(0, 10).map((item: any) => ({
            url: item.link || '',
            title: item.title || '',
            snippet: item.snippet || '',
          }));
          
          // Filter out results without URLs
          const validResults = results.filter(r => r.url && r.url.trim().length > 0);
          
          // Log results for debugging
          if (validResults.length === 0) {
            console.warn(`[GOOGLE_SERP] No valid results returned for query: "${query}" (${items.length} items but none have valid URLs)`);
            console.warn(`[GOOGLE_SERP] Sample items:`, JSON.stringify(items.slice(0, 2), null, 2));
            // Try fallback APIs if no valid results
            console.warn(`[GOOGLE_SERP] Trying fallback APIs...`);
          } else {
            console.log(`[GOOGLE_SERP] Mapped ${validResults.length} valid results with URLs out of ${results.length} total`);
            return validResults;
          }
        }
      }
    } catch (error: any) {
      console.error('[GOOGLE_SERP] Google Custom Search API failed:', error.message);
      console.warn(`[GOOGLE_SERP] Trying fallback APIs...`);
      // Don't throw here, try fallback APIs instead
    }
  }

  // Fallback to SerpAPI if configured
  const serpApiKey = process.env.SERP_API_KEY;
  if (serpApiKey) {
    try {
      const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${serpApiKey}&hl=${language || 'en'}&gl=${country || 'us'}&num=10`;
      console.log(`[GOOGLE_SERP] Fetching from SerpAPI: query="${query}", language=${language || 'en'}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[GOOGLE_SERP] SerpAPI HTTP error: ${response.status} ${response.statusText}`);
        console.error(`[GOOGLE_SERP] Error response body:`, errorText);
        console.warn(`[GOOGLE_SERP] SerpAPI failed, trying next fallback...`);
      } else {
        const data = await response.json();
        
        // Handle API errors in response body
        if (data.error) {
          console.error(`[GOOGLE_SERP] SerpAPI error response:`, JSON.stringify(data.error, null, 2));
          console.warn(`[GOOGLE_SERP] SerpAPI returned error, trying next fallback...`);
        } else {
          const organicResults = data.organic_results || [];
          console.log(`[GOOGLE_SERP] SerpAPI returned ${organicResults.length} organic results`);
          
          const results = organicResults.slice(0, 10).map((result: any) => ({
            url: result.link || '',
            title: result.title || '',
            snippet: result.snippet || '',
          }));
          
          // Filter out results without URLs
          const validResults = results.filter(r => r.url && r.url.trim().length > 0);
          
          if (validResults.length === 0) {
            console.warn(`[GOOGLE_SERP] No valid results returned from SerpAPI for query: "${query}"`);
            console.warn(`[GOOGLE_SERP] Trying next fallback...`);
          } else {
            console.log(`[GOOGLE_SERP] SerpAPI returned ${validResults.length} valid results`);
            return validResults;
          }
        }
      }
    } catch (error: any) {
      console.error('[GOOGLE_SERP] SerpAPI failed:', error.message);
      console.warn(`[GOOGLE_SERP] Trying next fallback...`);
      // Don't throw here, try next fallback
    }
  }

  // Fallback to Zenserp if configured
  const zenserpApiKey = process.env.ZENSERP_API_KEY;
  if (zenserpApiKey) {
    try {
      const url = `https://app.zenserp.com/api/v2/search?q=${encodeURIComponent(query)}&apikey=${zenserpApiKey}&hl=${language || 'en'}&gl=${country || 'us'}&num=10`;
      console.log(`[GOOGLE_SERP] Fetching from Zenserp: query="${query}", language=${language || 'en'}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[GOOGLE_SERP] Zenserp HTTP error: ${response.status} ${response.statusText}`);
        console.error(`[GOOGLE_SERP] Error response body:`, errorText);
        // This is the last fallback, so we'll throw if it fails
      } else {
        const data = await response.json();
        
        // Handle API errors in response body
        if (data.error) {
          console.error(`[GOOGLE_SERP] Zenserp error response:`, JSON.stringify(data.error, null, 2));
        } else {
          const organicResults = data.organic || [];
          console.log(`[GOOGLE_SERP] Zenserp returned ${organicResults.length} organic results`);
          
          const results = organicResults.slice(0, 10).map((result: any) => ({
            url: result.url || '',
            title: result.title || '',
            snippet: result.description || '',
          }));
          
          // Filter out results without URLs
          const validResults = results.filter(r => r.url && r.url.trim().length > 0);
          
          if (validResults.length === 0) {
            console.warn(`[GOOGLE_SERP] No valid results returned from Zenserp for query: "${query}"`);
          } else {
            console.log(`[GOOGLE_SERP] Zenserp returned ${validResults.length} valid results`);
            return validResults;
          }
        }
      }
    } catch (error: any) {
      console.error('[GOOGLE_SERP] Zenserp failed:', error.message);
      // This is the last fallback, continue to error handling below
    }
  }

  // Check if any API was configured but all failed/returned no results
  const hasGoogleApi = process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID;
  const hasSerpApi = process.env.SERP_API_KEY;
  const hasZenserpApi = process.env.ZENSERP_API_KEY;
  
  if (hasGoogleApi || hasSerpApi || hasZenserpApi) {
    const configuredApis = [];
    if (hasGoogleApi) configuredApis.push('Google Custom Search');
    if (hasSerpApi) configuredApis.push('SerpAPI');
    if (hasZenserpApi) configuredApis.push('Zenserp');
    
    throw new Error(
      `All configured SERP APIs (${configuredApis.join(', ')}) returned no results for query: "${query}". ` +
      `Possible reasons: 1) Query is too specific or unusual, 2) API quotas exceeded, 3) Invalid API keys, ` +
      `4) Search Engine ID is restricted (for Google Custom Search). Try: a different query, check API quotas, ` +
      `or verify API configuration.`
    );
  }
  
  // No SERP provider configured
  throw new Error(
    'No SERP API configured. Please set one of: GOOGLE_SEARCH_API_KEY + GOOGLE_SEARCH_ENGINE_ID, SERP_API_KEY, or ZENSERP_API_KEY. ' +
    'See GOOGLE_SERP_SETUP.md for setup instructions.'
  );
}
