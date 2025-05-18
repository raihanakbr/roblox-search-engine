"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { 
  Users, Filter, Star, Crown, ChevronDown, ChevronUp, Gamepad, Tag 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

interface FiltersProps {
  creators: Array<{key: string, doc_count: number}>;
  playerRanges: Array<{key: string, doc_count: number, from?: number, to?: number}>;
  genres: Array<{key: string, doc_count: number}>; // Main genres (genre_l1)
  subgenres: Array<{key: string, doc_count: number}>; // Subgenres (genre_l2)
}

export function Filters({ creators, playerRanges, genres, subgenres }: FiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get the current filters from search params
  const currentCreators = searchParams.get("creators")?.split(",") || [];
  const currentPlayerRange = searchParams.get("players") || "";
  const currentGenres = searchParams.get("genre_l1")?.split(",") || [];
  const currentSubgenres = searchParams.get("genre_l2")?.split(",") || [];
  
  // Set up state for filters
  const [selectedCreators, setSelectedCreators] = useState<string[]>(currentCreators);
  const [selectedPlayerRange, setSelectedPlayerRange] = useState<string>(currentPlayerRange);
  const [selectedGenres, setSelectedGenres] = useState<string[]>(currentGenres);
  const [selectedSubgenres, setSelectedSubgenres] = useState<string[]>(currentSubgenres);
  const [isFiltering, setIsFiltering] = useState(false);
  
  const applyFilters = () => {
    setIsFiltering(true);
    
    // Debug what's being sent
    console.log("Applying filters:");
    console.log("- Selected creators:", selectedCreators);
    console.log("- Selected genres (L1):", selectedGenres);
    console.log("- Selected subgenres (L2):", selectedSubgenres);
    
    const params = new URLSearchParams(searchParams.toString());
    
    // Always reset to page 1 when applying new filters
    params.set("page", "1");
    
    // Set creator filter
    if (selectedCreators && selectedCreators.length > 0) {
      params.set("creators", selectedCreators.join(","));
    } else {
      params.delete("creators");
    }
    
    // Set genre (L1) filter
    if (selectedGenres && selectedGenres.length > 0) {
      params.set("genre_l1", selectedGenres.join(","));
    } else {
      params.delete("genre_l1");
    }
    
    // Set subgenre (L2) filter
    if (selectedSubgenres && selectedSubgenres.length > 0) {
      params.set("genre_l2", selectedSubgenres.join(","));
    } else {
      params.delete("genre_l2");
    }
    
    // Set player range filter
    if (selectedPlayerRange) {
      params.set("players", selectedPlayerRange);
    } else {
      params.delete("players");
    }
    
    const url = `/?${params.toString()}`;
    console.log("Navigating to URL:", url);
    
    // Keep the current query and enhance params
    router.push(url);
    setTimeout(() => setIsFiltering(false), 500);
  };
  
  const resetFilters = () => {
    setSelectedCreators([]);
    setSelectedGenres([]);
    setSelectedSubgenres([]);
    setSelectedPlayerRange("");
    
    const params = new URLSearchParams(searchParams.toString());
    params.delete("creators");
    params.delete("genre_l1");
    params.delete("genre_l2");
    params.delete("players");
    
    router.push(`/?${params.toString()}`);
  };
  
  const toggleCreator = (creator: string) => {
    setSelectedCreators(prev => 
      prev.includes(creator) 
        ? prev.filter(c => c !== creator)
        : [...prev, creator]
    );
  };
  
  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => 
      prev.includes(genre) 
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };
  
  const toggleSubgenre = (subgenre: string) => {
    setSelectedSubgenres(prev => 
      prev.includes(subgenre) 
        ? prev.filter(sg => sg !== subgenre)
        : [...prev, subgenre]
    );
  };

  // Filter out empty genres
  const filteredGenres = genres?.filter(genre => genre.key !== "") || [];
  const filteredSubgenres = subgenres?.filter(subgenre => subgenre.key !== "") || [];

  return (
    <div className="bg-[#2a0066]/70 rounded-xl p-4 border border-[#4f00b3] mb-6 sticky top-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold flex items-center">
          <Filter className="mr-2 h-5 w-5 text-purple-400" />
          Filters
        </h3>
        {(selectedCreators.length > 0 || selectedGenres.length > 0 || selectedSubgenres.length > 0 || selectedPlayerRange) && (
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
      
      <Accordion type="multiple" defaultValue={["genres", "subgenres", "creators", "players"]}>
        {/* Genres (L1) section */}
        <AccordionItem value="genres" className="border-b-0">
          <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
            <span className="flex items-center">
              <Gamepad className="mr-2 h-4 w-4 text-pink-400" />
              Genres
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 py-2">
              {filteredGenres.length > 0 ? (
                filteredGenres.slice(0, 12).map((genre) => (
                  <div key={genre.key} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`genre-${genre.key}`} 
                      checked={selectedGenres.includes(genre.key)} 
                      onCheckedChange={() => toggleGenre(genre.key)}
                    />
                    <Label 
                      htmlFor={`genre-${genre.key}`}
                      className="text-sm cursor-pointer flex items-center justify-between w-full"
                    >
                      <span>{genre.key}</span>
                      <span className="text-xs text-purple-300">({genre.doc_count})</span>
                    </Label>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400">No genre filters available</p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
        
        {/* Subgenres (L2) section */}
        <AccordionItem value="subgenres" className="border-b-0">
          <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
            <span className="flex items-center">
              <Tag className="mr-2 h-4 w-4 text-green-400" />
              Subgenres
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 py-2">
              {filteredSubgenres.length > 0 ? (
                filteredSubgenres.slice(0, 15).map((subgenre) => (
                  <div key={subgenre.key} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`subgenre-${subgenre.key}`} 
                      checked={selectedSubgenres.includes(subgenre.key)} 
                      onCheckedChange={() => toggleSubgenre(subgenre.key)}
                    />
                    <Label 
                      htmlFor={`subgenre-${subgenre.key}`}
                      className="text-sm cursor-pointer flex items-center justify-between w-full"
                    >
                      <span>{subgenre.key}</span>
                      <span className="text-xs text-purple-300">({subgenre.doc_count})</span>
                    </Label>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400">No subgenre filters available</p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
        
        {/* Existing Creators section */}
        <AccordionItem value="creators" className="border-b-0">
          <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
            <span className="flex items-center">
              <Crown className="mr-2 h-4 w-4 text-yellow-400" />
              Top Creators
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 py-2">
              {creators && creators.length > 0 ? (
                creators.slice(0, 10).map((creator) => (
                  <div key={creator.key} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`creator-${creator.key}`} 
                      checked={selectedCreators.includes(creator.key)} 
                      onCheckedChange={() => toggleCreator(creator.key)}
                    />
                    <Label 
                      htmlFor={`creator-${creator.key}`}
                      className="text-sm cursor-pointer flex items-center justify-between w-full"
                    >
                      <span className="truncate">{creator.key}</span>
                      <span className="text-xs text-purple-300 ml-1">({creator.doc_count})</span>
                    </Label>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400">No creator filters available</p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
        
        {/* Existing Players section */}
        <AccordionItem value="players" className="border-b-0">
          <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
            <span className="flex items-center">
              <Users className="mr-2 h-4 w-4 text-blue-400" />
              Max Players
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 py-2">
              {playerRanges && playerRanges.length > 0 ? (
                playerRanges.map((range) => (
                  <div key={range.key} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`range-${range.key}`} 
                      checked={selectedPlayerRange === range.key}
                      onCheckedChange={() => setSelectedPlayerRange(
                        selectedPlayerRange === range.key ? "" : range.key
                      )}
                    />
                    <Label 
                      htmlFor={`range-${range.key}`}
                      className="text-sm cursor-pointer flex items-center justify-between w-full"
                    >
                      <span>
                        {range.key === "*-10.0" ? "Up to 10" : 
                         range.key === "10.0-20.0" ? "10-20" :
                         range.key === "20.0-50.0" ? "20-50" : "50+"}
                      </span>
                      <span className="text-xs text-purple-300">({range.doc_count})</span>
                    </Label>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400">No player range filters available</p>
              )}
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