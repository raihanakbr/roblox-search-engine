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

// Update the function signature to include genre_l1 and genre_l2 in filters
export async function searchGames(
  query: string,
  pageSize = 21,
  page = 1,
  maxPages = 10,
  useLLM = false,
  filters?: { 
    creators?: string[]; 
    playerRange?: string;
    genre_l1?: string[];
    genre_l2?: string[];
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
    if (!query.trim()) {
      return { results: [], total: 0, currentPage: 1, totalPages: 0 }
    }

    // Ensure page is within bounds
    const validPage = Math.min(Math.max(1, page), maxPages)

    // Set up timeout for LLM-enhanced searches
    const controller = new AbortController();
    const timeoutId = useLLM ? 
      setTimeout(() => controller.abort(), 15000) : 
      null;

    console.log(`Searching with LLM enhancement: ${useLLM ? 'YES' : 'NO'}`);
    console.log(`Strategy: Fetch all data first, then paginate locally with pageSize=${pageSize}`);
    console.log(`Applying filters:`, filters);

    // Always fetch 110 items first to get all available data
    const requestBody: any = {
      query: query,
      page_size: 110, // Always fetch maximum available data
      page: 1, // Always start from page 1
      use_llm: useLLM,
    };
    
    // Add filters if they exist
    if (filters) {
      requestBody.filters = {};
      
      if (filters.creators && filters.creators.length > 0) {
        requestBody.filters.creators = filters.creators;
      }
      
      if (filters.genre_l1 && filters.genre_l1.length > 0) {
        requestBody.filters.genre_l1 = filters.genre_l1;
      }
      
      if (filters.genre_l2 && filters.genre_l2.length > 0) {
        requestBody.filters.genre_l2 = filters.genre_l2;
      }
      
      if (filters.playerRange) {
        requestBody.filters.max_players = filters.playerRange;
      }
    }

    // Make API request to backend
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const response = await fetch(`${apiUrl}/api/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      cache: "no-store",
      signal: useLLM ? controller.signal : undefined
    })

    // Clear timeout if it exists
    if (timeoutId) clearTimeout(timeoutId);

    if (!response.ok) {
      console.error("API error:", response.status, response.statusText)
      return { results: [], total: 0, currentPage: validPage, totalPages: 0 }
    }

    const data: SearchResponse = await response.json()
    
    console.log("Search response received, total from API:", data.hits.total.value);
    console.log("Actual results returned:", data.hits.hits.length);
    
    // Extract LLM enhancements if available
    const suggestions = data.llm_enhancements?.alternative_queries || []
    const llmAnalysis = data.llm_enhancements?.analysis

    // Transform ALL results to our Game type
    const allResults = data.hits.hits.map((hit) => {
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
    const totalResults = allResults.length; // Use actual results count
    const itemsPerPage = 11; // Fixed items per page for display
    const actualTotalPages = Math.ceil(totalResults / itemsPerPage);
    const clampedCurrentPage = Math.min(validPage, actualTotalPages || 1);
    
    // Calculate pagination slice
    const startIndex = (clampedCurrentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedResults = allResults.slice(startIndex, endIndex);

    console.log(`Pagination calculation:`);
    console.log(`- Total results available: ${totalResults}`);
    console.log(`- Items per page: ${itemsPerPage}`);
    console.log(`- Total pages needed: ${actualTotalPages}`);
    console.log(`- Current page: ${clampedCurrentPage}`);
    console.log(`- Showing results ${startIndex + 1}-${Math.min(endIndex, totalResults)} of ${totalResults}`);

    return {
      results: paginatedResults,
      total: totalResults, // Use actual available results
      currentPage: clampedCurrentPage,
      totalPages: actualTotalPages, // Use calculated pages based on actual data
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
