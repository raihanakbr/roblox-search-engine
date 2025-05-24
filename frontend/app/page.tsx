import { Categories } from "@/components/categories"
import { FeaturedGames } from "@/components/featured-games"
import { Filters } from "@/components/filters"
import { GameResults } from "@/components/game-results"
import { Pagination } from "@/components/pagination"
import { SearchForm } from "@/components/search-form"
import { searchGames } from "@/lib/search-action"
import { CheckCircle2, Gamepad2, Search, Sparkles, Trophy } from "lucide-react"
import { Suspense } from "react"
import Link from "next/link"

// Add a new function to fetch aggregations
async function fetchAggregations() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"; // Fallback for local dev if needed
    const response = await fetch(`${apiUrl}/api/aggregations`, {
      cache: "no-store",
    });
    
    if (!response.ok) {
      console.error("Failed to fetch aggregations");
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching aggregations:", error);
    return null;
  }
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ 
    query?: string; 
    page?: string; 
    enhance?: string; 
    genres?: string; // Combined genres
    min_playing_now?: string; // Current players minimum
    min_supported_players?: string; // Min supported players by game
    max_supported_players?: string; // Max supported players by game
  }>
}) {
  // Await searchParams before accessing its properties
  const params = await searchParams;
  
  const query = params.query || ""
  const page = Number.parseInt(params.page || "1", 10)
  const enhance = params.enhance === "true"
  const displayPageSize = 11 // Items to show per page
  const maxPages = 10 // Maximum pages to fetch from backend

  console.log(`Search with query: ${query}, page: ${page}, enhance: ${enhance}`)

  // Parse new filter parameters
  const genresParam = params.genres;
  const genres = genresParam?.split(",").filter(g => g.trim() !== "") || [];
  
  const minPlayingNow = params.min_playing_now || "";
  const minSupportedPlayers = params.min_supported_players || "";
  const maxSupportedPlayers = params.max_supported_players || "";

  console.log("Page params - Combined genres:", genres);
  console.log("Page params - Min playing now:", minPlayingNow);
  console.log("Page params - Min supported players:", minSupportedPlayers);
  console.log("Page params - Max supported players:", maxSupportedPlayers);

  // Fetch aggregations
  const aggregations = await fetchAggregations();

  // Pass the enhance parameter and filters to the searchGames function
  const { results, total, currentPage, totalPages, suggestions, llmAnalysis } = query
    ? await searchGames(
        query, 
        displayPageSize, 
        page, 
        maxPages, 
        enhance, 
        { 
          genres: genres,
          minPlayingNow: minPlayingNow,
          minSupportedPlayers: minSupportedPlayers,
          maxSupportedPlayers: maxSupportedPlayers
        }
      )
    : { results: [], total: 0, currentPage: 1, totalPages: 0, suggestions: [], llmAnalysis: null }

  // Add this helper function at the top of your renderLLMAnalysis function
  const safeRender = (content) => {
    if (content === null || content === undefined) return "";
    if (typeof content === 'object') return JSON.stringify(content);
    return content.toString();
  };

  // Handle rendering the LLM analysis properly
  const renderLLMAnalysis = () => {
    if (!llmAnalysis) return null
    
    // If llmAnalysis is a string, render it directly
    if (typeof llmAnalysis === "string") {
      return <p className="text-sm text-gray-300">{llmAnalysis}</p>
    }

    // If it's an object with structured data, render it properly
    if (typeof llmAnalysis === "object") {
      // Handle if the analysis is nested under an 'analysis' key
      const analysisData = llmAnalysis.analysis || llmAnalysis;
      
      return (
        <div className="space-y-3">
          {analysisData.top_game && (
            <div className="mb-2">
              <h4 className="text-sm font-medium text-white flex items-center">
                <Trophy className="h-3.5 w-3.5 mr-1.5 text-yellow-400" />
                Top Recommendation
              </h4>
              <p className="text-sm text-white ml-5">{safeRender(analysisData.top_game)}</p>
            </div>
          )}

          {analysisData.features && (
            <div className="mb-2">
              <h4 className="text-sm font-medium text-white flex items-center mb-1">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-green-400" />
                Key Features
              </h4>
              {Array.isArray(analysisData.features) ? (
                <ul className="list-disc pl-5 space-y-1">
                  {analysisData.features.map((feature, index) => (
                    <li key={index} className="text-sm text-white">
                      {/* Check if feature is an object with name/description */}
                      {typeof feature === 'object' && feature.name ? (
                        <div>
                          <span className="font-medium">{safeRender(feature.name)}</span>
                          {feature.description && (
                            <span className="block ml-1 text-xs text-gray-200">
                              {safeRender(feature.description)}
                            </span>
                          )}
                        </div>
                      ) : (
                        /* Otherwise render as string */
                        safeRender(feature)
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-white">{analysisData.features}</p>
              )}
            </div>
          )}

          {analysisData.conclusion && (
            <div>
              <h4 className="text-sm font-medium text-purple-300 mb-1">Summary</h4>
              <p className="text-sm text-gray-300">{safeRender(analysisData.conclusion)}</p>
            </div>
          )}
        </div>
      )
    }

    // Fallback if we don't know what format it is
    return <p className="text-sm text-gray-300">Analysis available with AI enhancement.</p>
  }

  // Extract alternative queries from llmAnalysis if available
  const extractAlternativeQueries = () => {
    if (!llmAnalysis) return [];
    
    if (typeof llmAnalysis === "object" && llmAnalysis.alternative_queries) {
      return llmAnalysis.alternative_queries;
    }
    
    return suggestions || [];
  }

  const alternativeQueries = extractAlternativeQueries();

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#1a0033] to-[#000033] text-white confetti-bg">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center py-8">
          <div className="relative mb-2">
            <Sparkles className="absolute -left-10 -top-6 h-8 w-8 text-yellow-400 animate-pulse" />
            <Gamepad2 className="absolute -right-10 -top-6 h-8 w-8 text-pink-400 animate-pulse" />
          </div>

          <div className="text-center mb-12">
            <Link href="/" className="inline-block hover:scale-105 transition-transform cursor-pointer">
              <h1 className="text-5xl md:text-7xl font-extrabold mb-6 text-center fun-heading">Rofind</h1>
            </Link>
            <p className="text-xl text-purple-800 mb-8 max-w-2xl mx-auto">
              Discover amazing Roblox games with our intelligent search engine. 
              Find your next adventure in seconds!
            </p>
          </div>

          <div className="w-full max-w-3xl mb-12 floating">
            <SearchForm 
              initialQuery={query} 
              initialPage={currentPage} 
              initialSuggestions={alternativeQueries} 
            />
          </div>

          {llmAnalysis && (
            <div className="mt-4 p-4 bg-purple-900/30 rounded-lg border border-purple-500 w-full max-w-3xl">
              <h3 className="flex items-center gap-2 text-sm font-medium mb-3">
                <Sparkles className="h-4 w-4 text-purple-400" />
                AI Analysis
              </h3>
              {renderLLMAnalysis()}
            </div>
          )}

          {alternativeQueries.length > 0 && (
            <div className="mt-4 p-4 bg-indigo-900/30 rounded-lg border border-indigo-500 w-full max-w-3xl">
              <h3 className="flex items-center gap-2 text-sm font-medium mb-3">
                <Search className="h-4 w-4 text-indigo-400" />
                Related Searches
              </h3>
              <div className="flex flex-wrap gap-2">
                {alternativeQueries.map((altQuery, index) => (
                  <a 
                    key={index}
                    href={`/?query=${encodeURIComponent(altQuery)}&enhance=${enhance}`}
                    className="px-3 py-1.5 bg-indigo-900/50 hover:bg-indigo-800 text-white rounded-full text-sm font-medium transition-colors flex items-center"
                  >
                    "{altQuery}"
                    <Search className="h-3.5 w-3.5 ml-1.5 opacity-70" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {query ? (
            // Search results view
            <div className="w-full mt-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                  <Search className="mr-2 h-6 w-6 text-pink-400" />
                  {total > 0
                    ? `${total} results for "${query}"`
                    : `No results found for "${query}"`}
                </h2>
                {total > 0 && (
                  <span className="text-white bg-[#3a0099] px-4 py-1 rounded-full">
                    Page {currentPage} of {totalPages} • Showing {results.length} of {total} games
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Filters column */}
                <div className="lg:col-span-1">
                  {aggregations && (
                    <Filters 
                      creators={aggregations.creators?.buckets || []} 
                      playerRanges={aggregations.max_players?.buckets || []}
                      genres={[
                        ...(aggregations.genre?.buckets || []), 
                        ...(aggregations.genre_l1?.buckets || [])
                      ]}
                      subgenres={aggregations.genre_l2?.buckets || []}
                    />
                  )}
                </div>
                
                {/* Results column */}
                <div className="lg:col-span-3">
                  <Suspense fallback={<div className="text-center py-12">Loading results...</div>}>
                    <GameResults results={results} />
                  </Suspense>

                  {/* Only show pagination if there are results and multiple pages */}
                  {total > 0 && totalPages > 1 && (
                    <Pagination currentPage={currentPage} maxPages={totalPages} />
                  )}
                </div>
              </div>
            </div>
          ) : (
            // Homepage view when no search is performed
            <div className="w-full">
              <FeaturedGames />
              <Categories />
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
