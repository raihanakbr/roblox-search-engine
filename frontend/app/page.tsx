"use client"

import { Categories } from "@/components/categories"
import { FeaturedGames } from "@/components/featured-games"
import { Filters } from "@/components/filters"
import { GameResults } from "@/components/game-results"
import { Pagination } from "@/components/pagination"
import { SearchForm } from "@/components/search-form"
import { searchGames } from "@/lib/search-action"
import { CheckCircle2, Gamepad2, Search, Sparkles, Trophy } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import Link from "next/link"

// Fetch aggregations function
async function fetchAggregations() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
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

function HomeContent() {
  const searchParams = useSearchParams();
  
  // Parse URL parameters
  const query = searchParams.get("query") || "";
  const page = Number.parseInt(searchParams.get("page") || "1", 10);
  const enhance = searchParams.get("enhance") === "true";
  const displayPageSize = 11;
  const maxPages = 10;

  // Parse filter parameters
  const genresParam = searchParams.get("genres");
  const genres = genresParam?.split(",").filter(g => g.trim() !== "") || [];
  const minPlayingNow = searchParams.get("min_playing_now") || "";
  const minSupportedPlayers = searchParams.get("min_supported_players") || "";
  const maxSupportedPlayers = searchParams.get("max_supported_players") || "";

  // Check if we have any filters applied
  const hasFilters = genres.length > 0 || minPlayingNow || minSupportedPlayers || maxSupportedPlayers;

  // Show results if we have a query OR if we have filters applied
  const shouldShowResults = query || hasFilters;

  // State for search results
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [suggestions, setSuggestions] = useState([]);
  const [llmAnalysis, setLlmAnalysis] = useState(null);
  const [aggregations, setAggregations] = useState(null);
  const [loading, setLoading] = useState(false);

  // Debug logs
  // useEffect(() => {
  //   console.log("URL params changed:", {
  //     query,
  //     genres,
  //     hasFilters,
  //     shouldShowResults,
  //     genresParam
  //   });
  // }, [query, genres, hasFilters, shouldShowResults, genresParam]);

  // Fetch aggregations on mount
  useEffect(() => {
    fetchAggregations().then(setAggregations);
  }, []);

  // Alternative approach - separate effect for search
  useEffect(() => {
    console.log("=== useEffect search triggered ===");
    console.log("shouldShowResults:", shouldShowResults);
    console.log("query:", `"${query}"`);
    console.log("genres:", genres);
    console.log("hasFilters:", hasFilters);
    
    if (!shouldShowResults) {
      console.log("Early return - shouldShowResults is false");
      setResults([]);
      setTotal(0);
      setCurrentPage(1);
      setTotalPages(0);
      setSuggestions([]);
      setLlmAnalysis(null);
      setLoading(false);
      return;
    }

    console.log("About to call performSearch");

    const performSearch = async () => {
      console.log("=== performSearch started ===");
      setLoading(true);
      console.log("Starting search with:", { query, genres });
      
      try {
        console.log("Calling searchGames with params:", {
          query: query || "",
          displayPageSize,
          page,
          maxPages,
          enhance,
          filters: {
            genres: genres,
            minPlayingNow: minPlayingNow,
            minSupportedPlayers: minSupportedPlayers,
            maxSupportedPlayers: maxSupportedPlayers
          }
        });

        const searchResults = await searchGames(
          query || "",
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
        );
        
        console.log("Search completed:", searchResults);
        setResults(searchResults.results);
        setTotal(searchResults.total);
        setCurrentPage(searchResults.currentPage);
        setTotalPages(searchResults.totalPages);
        setSuggestions(searchResults.suggestions);
        setLlmAnalysis(searchResults.llmAnalysis);
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
        setTotal(0);
        setCurrentPage(1);
        setTotalPages(0);
        setSuggestions([]);
        setLlmAnalysis(null);
      } finally {
        console.log("performSearch finally block");
        setLoading(false);
      }
    };

    console.log("About to call performSearch()");
    performSearch();
    console.log("performSearch() called");
  }, [shouldShowResults, query, JSON.stringify(genres), page, enhance, minPlayingNow, minSupportedPlayers, maxSupportedPlayers]);

  // Helper functions (same as before)
  const safeRender = (content) => {
    if (content === null || content === undefined) return "";
    if (typeof content === 'object') return JSON.stringify(content);
    return content.toString();
  };

  const renderLLMAnalysis = () => {
    if (!llmAnalysis) return null
    
    if (typeof llmAnalysis === "string") {
      return <p className="text-sm text-gray-300">{llmAnalysis}</p>
    }

    if (typeof llmAnalysis === "object") {
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

    return <p className="text-sm text-gray-300">Analysis available with AI enhancement.</p>
  }

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

          {shouldShowResults ? (
            <div className="w-full mt-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                  <Search className="mr-2 h-6 w-6 text-pink-400" />
                  {loading ? (
                    "Searching..."
                  ) : total > 0 ? (
                    <>
                      {query ? `${total} results for "${query}"` : `${total} games found`}
                      {genres.length > 0 && (
                        <span className="text-lg text-purple-300 ml-2">
                          in {genres.join(", ")}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      {query ? `No results found for "${query}"` : "No games found"}
                      {genres.length > 0 && (
                        <span className="text-lg text-purple-300 ml-2">
                          in {genres.join(", ")}
                        </span>
                      )}
                    </>
                  )}
                </h2>
                {total > 0 && !loading && (
                  <span className="text-white bg-[#3a0099] px-4 py-1 rounded-full">
                    Page {currentPage} of {totalPages} • Showing {results.length} of {total} games
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
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
                
                <div className="lg:col-span-3">
                  {loading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
                      <p className="mt-4 text-gray-400">Searching for games...</p>
                    </div>
                  ) : (
                    <GameResults results={results} />
                  )}

                  {total > 0 && totalPages > 1 && !loading && (
                    <Pagination currentPage={currentPage} maxPages={totalPages} />
                  )}
                </div>
              </div>
            </div>
          ) : (
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

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  )
}
