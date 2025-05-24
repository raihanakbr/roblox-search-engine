"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Filter,
  Flame,
  Gamepad,
  Users,
  X
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"

interface FiltersProps {
  creators: Array<{ key: string, doc_count: number }>;
  playerRanges: Array<{ key: string, doc_count: number, from?: number, to?: number }>;
  genres: Array<{ key: string, doc_count: number }>; // Main genres (genre_l1)
  subgenres: Array<{ key: string, doc_count: number }>; // Subgenres (genre_l2)
}

export function Filters({ creators, playerRanges, genres, subgenres }: FiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Memoize the combined genres to prevent infinite re-renders
  const uniqueGenres = useMemo(() => {
    // Combine all three genre fields: genre, genre_l1 (passed as genres prop), and genre_l2 (subgenres)
    const allGenres = [...(genres || []), ...(subgenres || [])];
    
    // Create a map to handle duplicates and ensure we get all unique genres
    const genreMap = new Map();
    
    allGenres.forEach(genre => {
      if (genre.key && genre.key.trim() !== "") {
        const key = genre.key.toLowerCase();
        // If we already have this genre, sum the doc_count
        if (genreMap.has(key)) {
          const existing = genreMap.get(key);
          genreMap.set(key, {
            ...existing,
            doc_count: existing.doc_count + genre.doc_count
          });
        } else {
          genreMap.set(key, {
            key: genre.key, // Keep original case
            doc_count: genre.doc_count
          });
        }
      }
    });
    
    // Convert back to array and sort by doc_count
    return Array.from(genreMap.values()).sort((a, b) => b.doc_count - a.doc_count);
  }, [genres, subgenres]);

  // Get current filters from URL
  const currentGenres = searchParams.get("genres")?.split(",").filter(g => g.trim() !== "") || [];
  const currentMinPlayingNow = searchParams.get("min_playing_now") || "";
  const currentMinSupportedPlayers = searchParams.get("min_supported_players") || "";
  const currentMaxSupportedPlayers = searchParams.get("max_supported_players") || "";

  // State for input fields
  const [genreInput, setGenreInput] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>(currentGenres);
  const [minPlayingNow, setMinPlayingNow] = useState(currentMinPlayingNow);
  const [minSupportedPlayers, setMinSupportedPlayers] = useState(currentMinSupportedPlayers);
  const [maxSupportedPlayers, setMaxSupportedPlayers] = useState(currentMaxSupportedPlayers);
  const [isFiltering, setIsFiltering] = useState(false);

  // Suggestion states
  const [showGenreSuggestions, setShowGenreSuggestions] = useState(false);
  const [genreSuggestions, setGenreSuggestions] = useState<Array<{ key: string, doc_count: number }>>([]);

  const genreInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Filter genre suggestions based on input - fix the dependency array
  useEffect(() => {
    if (genreInput.trim().length > 0) {
      const filtered = uniqueGenres.filter(genre =>
        genre.key.toLowerCase().includes(genreInput.toLowerCase()) &&
        !selectedGenres.some(selected => selected.toLowerCase() === genre.key.toLowerCase())
      ).slice(0, 8); // Limit to 8 suggestions
      setGenreSuggestions(filtered);
      setShowGenreSuggestions(filtered.length > 0);
    } else {
      setShowGenreSuggestions(false);
      setGenreSuggestions([]);
    }
  }, [genreInput, selectedGenres, uniqueGenres]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        genreInputRef.current && 
        !genreInputRef.current.contains(event.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowGenreSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const addGenre = (genre: string) => {
    if (!selectedGenres.some(selected => selected.toLowerCase() === genre.toLowerCase())) {
      setSelectedGenres([...selectedGenres, genre]);
      setGenreInput("");
      setShowGenreSuggestions(false);
    }
  };

  const removeGenre = (genre: string) => {
    setSelectedGenres(selectedGenres.filter(g => g.toLowerCase() !== genre.toLowerCase()));
  };

  const handleGenreKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && genreInput.trim()) {
      e.preventDefault();
      // Find exact match or close match
      const exactMatch = uniqueGenres.find(g => 
        g.key.toLowerCase() === genreInput.toLowerCase()
      );
      
      if (exactMatch) {
        addGenre(exactMatch.key);
      } else if (genreSuggestions.length > 0) {
        addGenre(genreSuggestions[0].key);
      }
    }

    if (e.key === 'Escape') {
      setShowGenreSuggestions(false);
    }
  };

  const applyFilters = () => {
    setIsFiltering(true);

    console.log("Applying new filters:");
    console.log("- Selected genres:", selectedGenres);
    console.log("- Min Playing Now:", minPlayingNow);
    console.log("- Min Supported Players:", minSupportedPlayers);
    console.log("- Max Supported Players:", maxSupportedPlayers);

    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");

    // Set genre filter
    if (selectedGenres.length > 0) {
      params.set("genres", selectedGenres.join(","));
    } else {
      params.delete("genres");
    }

    // Set player count filters
    if (minPlayingNow) {
      params.set("min_playing_now", minPlayingNow);
    } else {
      params.delete("min_playing_now");
    }

    if (minSupportedPlayers) {
      params.set("min_supported_players", minSupportedPlayers);
    } else {
      params.delete("min_supported_players");
    }

    if (maxSupportedPlayers) {
      params.set("max_supported_players", maxSupportedPlayers);
    } else {
      params.delete("max_supported_players");
    }

    // Remove old parameters for backward compatibility
    params.delete("min_players");
    params.delete("max_players");
    params.delete("genre_l1");
    params.delete("genre_l2");
    params.delete("creators");
    params.delete("players");

    const url = `/?${params.toString()}`;
    console.log("Navigating to URL:", url);

    router.push(url);
    setTimeout(() => setIsFiltering(false), 500);
  };

  const resetFilters = () => {
    setSelectedGenres([]);
    setGenreInput("");
    setMinPlayingNow("");
    setMinSupportedPlayers("");
    setMaxSupportedPlayers("");

    const params = new URLSearchParams(searchParams.toString());
    params.delete("genres");
    params.delete("min_playing_now");
    params.delete("min_supported_players");
    params.delete("max_supported_players");
    // Clean up old parameters
    params.delete("min_players");
    params.delete("max_players");
    params.delete("genre_l1");
    params.delete("genre_l2");
    params.delete("creators");
    params.delete("players");

    router.push(`/?${params.toString()}`);
  };

  const hasActiveFilters = selectedGenres.length > 0 || minPlayingNow || minSupportedPlayers || maxSupportedPlayers;

  return (
    <div className="bg-[#2a0066]/70 rounded-xl p-4 border border-[#4f00b3] mb-6 sticky top-4 z-20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold flex items-center">
          <Filter className="mr-2 h-5 w-5 text-purple-400" />
          Filters
        </h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="text-xs text-purple-300 hover:text-white"
          >
            Reset
          </Button>
        )}
      </div>

      <Accordion type="multiple" defaultValue={["genres", "players"]}>
        {/* Genres section - Fixed z-index */}
        <AccordionItem value="genres" className="border-b-0 relative z-10">
          <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
            <span className="flex items-center">
              <Gamepad className="mr-2 h-4 w-4 text-pink-400" />
              Genres
            </span>
          </AccordionTrigger>
          <AccordionContent className="relative z-10">
            <div 
              className={`space-y-3 py-2 px-1 relative overflow-visible ${
                showGenreSuggestions && genreSuggestions.length > 0 ? 'mb-12' : 'mb-0'
              }`}
            >
              <div className="relative">
                <Label htmlFor="genre-input" className="text-sm text-purple-200 mb-2 block">
                  Add genres (type to search)
                </Label>
                <Input
                  ref={genreInputRef}
                  id="genre-input"
                  value={genreInput}
                  onChange={(e) => setGenreInput(e.target.value)}
                  onKeyDown={handleGenreKeyPress}
                  onFocus={() => {
                    if (genreInput.trim().length > 0 && genreSuggestions.length > 0) {
                      setShowGenreSuggestions(true);
                    }
                  }}
                  placeholder="e.g., simulation, adventure, rpg..."
                  className="bg-[#3a0099]/50 border-[#4f00b3] text-white placeholder-purple-300 focus:ring-2 focus:ring-purple-400 focus:border-purple-400 focus:outline-none transition-all duration-200"
                />
                
                {/* Fixed suggestions dropdown with higher z-index */}
                {showGenreSuggestions && genreSuggestions.length > 0 && (
                  <div 
                    ref={suggestionsRef}
                    className="absolute w-full mt-1 bg-[#2a0066] border border-[#4f00b3] rounded-md shadow-xl max-h-32 overflow-y-auto pb-4"
                    style={{ 
                      top: '100%', 
                      position: 'absolute',
                      zIndex: 9999
                    }}
                  >
                    {genreSuggestions.map((suggestion) => (
                      <div
                        key={suggestion.key}
                        className="px-2 py-1.5 hover:bg-[#3a0099] cursor-pointer text-xs text-white flex justify-between items-center border-b border-[#4f00b3]/30 last:border-b-0 transition-colors duration-150"
                        onClick={() => addGenre(suggestion.key)}
                      >
                        <span className="text-white">{suggestion.key}</span>
                        <span className="text-xs text-purple-300">({suggestion.doc_count})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected genres */}
              {selectedGenres.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedGenres.map((genre) => (
                    <Badge
                      key={genre}
                      className="bg-[#4f00b3] text-white hover:bg-[#3a0099] cursor-pointer"
                      onClick={() => removeGenre(genre)}
                    >
                      {genre}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}

              <p className="text-xs text-purple-300">
                Found {uniqueGenres.length} available genres. Type to search and click suggestions to add.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Player count section - Lower z-index */}
        <AccordionItem value="players" className="border-b-0 relative z-0 mt-0">
          <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
            <span className="flex items-center">
              <Users className="mr-2 h-4 w-4 text-blue-400" />
              Player Settings
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 py-2 px-1">
              {/* Current players filter - standalone */}
              <div>
                <Label htmlFor="min-playing-now" className="text-sm text-purple-200 mb-2 block flex items-center">
                  <Flame className="h-3 w-3 mr-1 text-orange-400" />
                  Min Playing Now
                </Label>
                <Input
                  id="min-playing-now"
                  type="number"
                  value={minPlayingNow}
                  onChange={(e) => setMinPlayingNow(e.target.value)}
                  placeholder="e.g., 100"
                  className="bg-[#3a0099]/50 border-[#4f00b3] text-white placeholder-purple-300 focus:ring-2 focus:ring-purple-400 focus:border-purple-400 focus:outline-none transition-all duration-200"
                />
              </div>

              {/* Supported players range - two inputs */}
              <div>
                <Label className="text-sm text-purple-200 mb-2 block flex items-center">
                  <Users className="h-3 w-3 mr-1 text-blue-400" />
                  Supported Players Range
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="min-supported" className="text-xs text-purple-300 mb-1 block">
                      Min
                    </Label>
                    <Input
                      id="min-supported"
                      type="number"
                      value={minSupportedPlayers}
                      onChange={(e) => setMinSupportedPlayers(e.target.value)}
                      placeholder="e.g., 2"
                      className="bg-[#3a0099]/50 border-[#4f00b3] text-white placeholder-purple-300 focus:ring-2 focus:ring-purple-400 focus:border-purple-400 focus:outline-none transition-all duration-200"
                    />
                  </div>
                  <div>
                    <Label htmlFor="max-supported" className="text-xs text-purple-300 mb-1 block">
                      Max
                    </Label>
                    <Input
                      id="max-supported"
                      type="number"
                      value={maxSupportedPlayers}
                      onChange={(e) => setMaxSupportedPlayers(e.target.value)}
                      placeholder="e.g., 50"
                      className="bg-[#3a0099]/50 border-[#4f00b3] text-white placeholder-purple-300 focus:ring-2 focus:ring-purple-400 focus:border-purple-400 focus:outline-none transition-all duration-200"
                    />
                  </div>
                </div>
              </div>

              <div className="text-xs text-purple-300 space-y-1">
                <p>• <strong>Min Playing Now:</strong> Games with at least this many current players</p>
                <p>• <strong>Supported Players Range:</strong> Games that support player count within this range</p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Button
        onClick={applyFilters}
        className="w-full mt-4 bg-purple-600 hover:bg-purple-700"
        disabled={isFiltering}
      >
        {isFiltering ? "Applying..." : "Apply Filters"}
      </Button>
    </div>
  )
}