import { SearchForm } from "@/components/search-form"
import { GameResults } from "@/components/game-results"
import { Pagination } from "@/components/pagination"
import { FeaturedGames } from "@/components/featured-games"
import { Categories } from "@/components/categories"
import { Filters } from "@/components/filters"
import { searchGames } from "@/lib/search-action"
import { Suspense } from "react"
import { Gamepad2, Sparkles, Search, Trophy, CheckCircle2, List } from "lucide-react"

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
  searchParams: { 
    query?: string; 
    page?: string; 
    enhance?: string; 
    creators?: string; 
    players?: string;
    genre_l1?: string; // Update to genre_l1
    genre_l2?: string; // Add genre_l2
  }
}) {
  const query = searchParams.query || ""
  const page = Number.parseInt(searchParams.page || "1", 10)
  const enhance = searchParams.enhance === "true"
  const pageSize = 21 // Fixed page size of 21 items
  const maxPages = 10 // Maximum of 10 pages (210 items total)

  console.log(`Search with query: ${query}, page: ${page}, enhance: ${enhance}`)

  // Parse creators from URL parameters
  const creatorsParam = searchParams.creators;
  const creators = creatorsParam?.split(",").filter(c => c.trim() !== "") || [];

  console.log("Extracted creators from URL:", creators);

  // Parse genres from URL parameters - now using genre_l1 and genre_l2
  const genresL1Param = searchParams.genre_l1;
  const genresL1 = genresL1Param?.split(",").filter(g => g.trim() !== "") || [];
  
  const genresL2Param = searchParams.genre_l2;
  const genresL2 = genresL2Param?.split(",").filter(g => g.trim() !== "") || [];

  const playerRange = searchParams.players || "";

  // Fetch aggregations
  const aggregations = await fetchAggregations();

  // Pass the enhance parameter and filters to the searchGames function
  const { results, total, currentPage, totalPages, suggestions, llmAnalysis } = query
    ? await searchGames(
        query, 
        pageSize, 
        page, 
        maxPages, 
        enhance, 
        { 
          creators: creators, 
          genre_l1: genresL1, // Changed from genres to genre_l1
          genre_l2: genresL2, // Added genre_l2
          playerRange: playerRange 
        }
      )
    : { results: [], total: 0, currentPage: 1, totalPages: 0, suggestions: [], llmAnalysis: null }

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
              <p className="text-sm text-white ml-5">{analysisData.top_game}</p>
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
                          <span className="font-medium">{feature.name}</span>
                          {feature.description && (
                            <span className="block ml-1 text-xs text-gray-200">
                              {feature.description}
                            </span>
                          )}
                        </div>
                      ) : (
                        /* Otherwise render as string */
                        feature.toString()
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
              <p className="text-sm text-gray-300">{analysisData.conclusion}</p>
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
            <h1 className="text-5xl md:text-7xl font-extrabold mb-6 text-center fun-heading">Rofind</h1>
          </div>

          <p className="text-lg text-neutral-800 font-medium mb-10 text-center max-w-2xl">
            Discover amazing games and adventures in the Roblox universe!
          </p>

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
                    ? `${total > 210 ? "210+" : total} results for "${query}"`
                    : `No results found for "${query}"`}
                </h2>
                {total > 0 && (
                  <span className="text-white bg-[#3a0099] px-4 py-1 rounded-full">Page {currentPage} of 10</span>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Filters column */}
                <div className="lg:col-span-1">
                  {aggregations && (
                    <Filters 
                      creators={aggregations.creators.buckets} 
                      playerRanges={aggregations.max_players.buckets}
                      genres={aggregations.genre_l1.buckets} // Changed from genres to genre_l1
                      subgenres={aggregations.genre_l2.buckets} // Added genre_l2
                    />
                  )}
                </div>
                
                {/* Results column */}
                <div className="lg:col-span-3">
                  <Suspense fallback={<div className="text-center py-12">Loading results...</div>}>
                    <GameResults results={results} />
                  </Suspense>

                  {total > 0 && <Pagination currentPage={currentPage} maxPages={10} />}
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
