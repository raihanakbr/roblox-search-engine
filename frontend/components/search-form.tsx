"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, Zap, Sparkles, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

interface SearchFormProps {
  initialQuery: string
  initialPage: number
}

export function SearchForm({ initialQuery, initialPage }: SearchFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(initialQuery)
  const [isLoading, setIsLoading] = useState(false)
  const [useLLM, setUseLLM] = useState(searchParams?.get("enhance") === "true")
  const [suggestions, setSuggestions] = useState<string[]>([])

  useEffect(() => {
    // Get query suggestions from search results if available
    const suggestionsData = localStorage.getItem("querysuggestions")
    if (suggestionsData) {
      try {
        setSuggestions(JSON.parse(suggestionsData))
      } catch (e) {
        console.error("Failed to parse suggestions", e)
      }
    }
  }, [])

  // Add this effect to reset loading state when URL changes
  useEffect(() => {
    // This will capture when navigation is complete
    setIsLoading(false)
  }, [searchParams])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true) // Set loading to true

    const params = new URLSearchParams()
    if (query) params.set("query", query)
    params.set("page", "1") // Reset to page 1 on new search
    if (useLLM) params.set("enhance", "true")

    router.push(`/?${params.toString()}`)
    // Don't reset isLoading here - it will be reset by the useEffect when navigation completes
  }

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion)
    setIsLoading(true) // Set loading to true
    
    const params = new URLSearchParams()
    params.set("query", suggestion)
    params.set("page", "1")
    if (useLLM) params.set("enhance", "true")
    
    router.push(`/?${params.toString()}`)
    // Don't reset isLoading here either
  }

  return (
    <div className="w-full space-y-4">
      <form onSubmit={handleSubmit} className="w-full">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="Find your next adventure..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-[#2a0066] border-[#4f00b3] h-14 pl-12 pr-4 text-white rounded-xl text-lg"
            />
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-300 h-6 w-6" />
          </div>

          <Button type="submit" className="fun-button h-14 px-8 rounded-xl text-lg font-bold" disabled={isLoading}>
            <Zap className="h-5 w-5 mr-2" />
            {isLoading ? "Searching..." : "Search"}
          </Button>
        </div>

        <div className="flex items-center space-x-2 mt-3">
          <Switch 
            id="use-llm" 
            checked={useLLM} 
            onCheckedChange={setUseLLM}
          />
          <Label htmlFor="use-llm" className="flex items-center cursor-pointer text-neutral-700">
            <Sparkles className="h-4 w-4 mr-2 text-purple-400" />
            Enhance with AI
          </Label>
        </div>
      </form>

      {suggestions.length > 0 && (
        <div className="mt-3">
          <p className="text-sm text-gray-400 mb-2">Related searches:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <Badge 
                key={index} 
                variant="outline" 
                className="cursor-pointer hover:bg-purple-900 transition-colors py-1.5"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
                <ArrowRight className="h-3 w-3 ml-1" />
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
