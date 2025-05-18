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
    genre_l1?: string[]; // Changed from genres to genre_l1
    genre_l2?: string[]; // Added genre_l2
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
      setTimeout(() => controller.abort(), 15000) : // 15 second timeout for LLM
      null;

    console.log(`Searching with LLM enhancement: ${useLLM ? 'YES' : 'NO'}`);
    console.log(`Applying filters:`, filters);

    // Create the request body with filters
    const requestBody: any = {
      query: query,
      page_size: pageSize,
      page: validPage,
      use_llm: useLLM,
    };
    
    // Add filters if they exist - make sure to format them correctly for your API
    if (filters) {
      requestBody.filters = {};
      
      // Add creator filters if any are selected
      if (filters.creators && filters.creators.length > 0) {
        requestBody.filters.creators = filters.creators;
      }
      
      // Add genre_l1 filters if any are selected
      if (filters.genre_l1 && filters.genre_l1.length > 0) {
        requestBody.filters.genre_l1 = filters.genre_l1;
      }
      
      // Add genre_l2 filters if any are selected
      if (filters.genre_l2 && filters.genre_l2.length > 0) {
        requestBody.filters.genre_l2 = filters.genre_l2;
      }
      
      // Add player range filter if selected
      if (filters.playerRange) {
        requestBody.filters.max_players = filters.playerRange;
      }
    }

    // Make API request to backend with the structured request body
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
    
    console.log("Search response received, has filters:", !!requestBody.filters);
    
    // Extract LLM enhancements if available
    const suggestions = data.llm_enhancements?.alternative_queries || []
    const llmAnalysis = data.llm_enhancements?.analysis

    // Transform API response to our Game type
    const results = data.hits.hits.map((hit) => {
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
        formattedName: formattedName, // Store the highlighted name
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
        // Fallback thumbnail if imageUrl is not available
        thumbnail: source.imageUrl || `/placeholder.svg?height=200&width=400&text=${encodeURIComponent(source.name)}`,
      }
    })

    // Calculate total pages, but cap at maxPages
    const total = data.hits.total.value
    const totalPages = Math.min(Math.ceil(total / pageSize), maxPages)

    return {
      results,
      total,
      currentPage: validPage,
      totalPages,
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
