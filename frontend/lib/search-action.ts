"use server"

import type { Game } from "./types"

interface SearchResponse {
  took: number
  hits: {
    total: {
      value: number
      relation: string
    }
    hits: Array<{
      _source: any
      highlight?: {
        name?: string[]
        description?: string[]
      }
    }>
  }
  llm_enhancements?: {    
    alternative_queries?: string[]
    ranking?: number[]
    analysis?: string | {
      top_game?: string
      features?: any[]
      conclusion?: string
    }
  }
}

  export async function searchGames(
  query: string,
  pageSize = 21,
  page = 1,
  maxPages = 10,
  useLLM = false,
  filters?: { 
    genres?: string[];
    minPlayingNow?: string;
    minSupportedPlayers?: string;
    maxSupportedPlayers?: string;
  }
): Promise<{ 
  results: Game[]; 
  total: number; 
  currentPage: number; 
  totalPages: number;
  suggestions?: string[];
  llmAnalysis?: string | any;
}> {
  try {
    // If no query, return empty results
    // if (!query || !query.trim()) {
    //   return { results: [], total: 0, currentPage: 1, totalPages: 0 }
    // }

    // Normalize query
    const normalizedQuery = query ? query.trim() : ""; // Ensure normalizedQuery is a string
    const validPage = Math.min(Math.max(1, page), maxPages)

    // Add timestamp to ensure fresh requests
    const timestamp = Date.now()
    console.log(`[${timestamp}] Searching with query: "${normalizedQuery}", LLM: ${useLLM ? 'YES' : 'NO'}, page: ${validPage}`);

    // Set up timeout for LLM-enhanced searches
    const controller = new AbortController();
    const timeoutId = useLLM ? 
      setTimeout(() => controller.abort(), 15000) : 
      null;

    const requestBody: any = {
      query: normalizedQuery,
      page_size: 110,
      page: 1,
      use_llm: useLLM,
      timestamp: timestamp // Add timestamp to request body
    };
    
    // Add filters if they exist
    if (filters) {
      requestBody.filters = {};
      
      if (filters.genres && filters.genres.length > 0) {
        requestBody.filters.genres = filters.genres;
      }
      
      if (filters.minPlayingNow) {
        requestBody.filters.min_playing_now = filters.minPlayingNow;
      }
      
      if (filters.minSupportedPlayers) {
        requestBody.filters.min_supported_players = filters.minSupportedPlayers;
      }

      if (filters.maxSupportedPlayers) {
        requestBody.filters.max_supported_players = filters.maxSupportedPlayers;
      }
    }

    // Make API request to backend
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const response = await fetch(`${apiUrl}/api/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache", // Prevent caching
        "Pragma": "no-cache"
      },
      body: JSON.stringify(requestBody),
      cache: "no-store", // Ensure no caching
      signal: useLLM ? controller.signal : undefined
    })

    // Clear timeout if it exists
    if (timeoutId) clearTimeout(timeoutId);

    if (!response.ok) {
      console.error("API error:", response.status, response.statusText)
      return { results: [], total: 0, currentPage: validPage, totalPages: 0 }
    }

    const data: SearchResponse = await response.json()
    
    // Handle potential API errors
    if (!data.hits) {
      console.error("Invalid API response format:", data)
      return { results: [], total: 0, currentPage: validPage, totalPages: 0 }
    }
    
    console.log(`[${timestamp}] Search response received, total from API:`, data.hits.total?.value || 0);
    console.log(`[${timestamp}] Actual results returned:`, data.hits.hits?.length || 0);
    
    // Extract LLM enhancements if available
    const suggestions = data.llm_enhancements?.alternative_queries || []
    const llmAnalysis = data.llm_enhancements?.analysis

    // Transform ALL results to our Game type
    const allResults = (data.hits.hits || []).map((hit) => {
      const source = hit._source

      // Get highlighted name if available
      const highlightedName = hit.highlight?.name?.[0] || source.name

      // Replace <em> tags with span for highlighting
      const formattedName = highlightedName.replace(
        /<em>(.*?)<\/em>/g,
        '<span class="bg-yellow-500/30 text-white font-bold">$1</span>',
      )

      return {
        id: source.id,
        rootPlaceId: source.rootPlaceId,
        name: source.name,
        formattedName: formattedName,
        description: source.description,
        creator: source.creator,
        imageUrl: source.imageUrl,
        playing: source.playing,
        visits: source.visits,
        maxPlayers: source.maxPlayers,
        created: source.created,
        updated: source.updated,
        genre: source.genre,
        genre_l1: source.genre_l1,
        genre_l2: source.genre_l2,
        favoritedCount: source.favoritedCount,
        price: source.price,
        thumbnail: source.imageUrl || `/placeholder.svg?height=200&width=400&text=${encodeURIComponent(source.name)}`,
      }
    })

    // Calculate real pagination based on actual results
    const totalResults = allResults.length;
    const itemsPerPage = 11;
    const actualTotalPages = Math.ceil(totalResults / itemsPerPage);
    const clampedCurrentPage = Math.min(validPage, actualTotalPages || 1);
    
    // Calculate pagination slice
    const startIndex = (clampedCurrentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedResults = allResults.slice(startIndex, endIndex);

    console.log(`[${timestamp}] Pagination calculation: ${totalResults} total, page ${clampedCurrentPage}/${actualTotalPages}, showing ${paginatedResults.length} results`);

    return {
      results: paginatedResults,
      total: totalResults,
      currentPage: clampedCurrentPage,
      totalPages: actualTotalPages,
      suggestions,
      llmAnalysis,
    }
  } catch (error) {
    console.error("Error searching games:", error)
    
    // If it was aborted due to timeout and LLM was enabled, retry without LLM
    if (error.name === 'AbortError' && useLLM) {
      console.log("LLM enhancement timed out, retrying without LLM");
      return searchGames(query, pageSize, page, maxPages, false, filters);
    }
    
    return { results: [], total: 0, currentPage: page, totalPages: 0 }
  }
}
