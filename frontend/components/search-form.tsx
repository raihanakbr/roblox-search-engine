"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Search, Sparkles, Zap } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

interface SearchFormProps {
  initialQuery: string
  initialPage: number
  initialSuggestions?: string[]
}

export function SearchForm({ initialQuery, initialPage, initialSuggestions }: SearchFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(initialQuery)
  const [isLoading, setIsLoading] = useState(false)
  const [useLLM, setUseLLM] = useState(searchParams?.get("enhance") === "true")
  const [suggestions, setSuggestions] = useState<string[]>(initialSuggestions || [])

  // Update query when initialQuery changes
  useEffect(() => {
    setQuery(initialQuery)
  }, [initialQuery])

  // Update suggestions when initialSuggestions changes
  useEffect(() => {
    setSuggestions(initialSuggestions || [])
  }, [initialSuggestions])

  // Reset loading state when URL changes
  useEffect(() => {
    setIsLoading(false)
  }, [searchParams])

  // Also reset loading after a timeout as fallback
  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        setIsLoading(false)
      }, 10000)
      return () => clearTimeout(timeout)
    }
  }, [isLoading])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Only proceed if query is not empty
    if (!query.trim()) return
    
    setIsLoading(true)

    const params = new URLSearchParams(searchParams?.toString() || "")
    const currentQuery = params.get("query")
    const currentEnhance = params.get("enhance")
    
    params.set("query", query.trim())
    params.set("page", "1")
    
    if (useLLM) {
      params.set("enhance", "true")
    } else {
      params.delete("enhance")
    }

    const newUrl = `/?${params.toString()}`
    const currentUrl = `/?${searchParams?.toString() || ""}`
    
    console.log("Current URL:", currentUrl)
    console.log("New URL:", newUrl)
    
    // Check if URL will be the same
    if (newUrl === currentUrl || 
        (query.trim() === currentQuery && 
         (useLLM ? "true" : null) === currentEnhance)) {
      console.log("Same URL detected, forcing refresh")
      // Force a page refresh for the same URL
      window.location.href = newUrl
    } else {
      console.log("Different URL, using router.push")
      router.push(newUrl)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion)
    setIsLoading(true)
    
    const params = new URLSearchParams(searchParams?.toString() || "")
    params.set("query", suggestion)
    params.set("page", "1")
    
    if (useLLM) {
      params.set("enhance", "true")
    } else {
      params.delete("enhance")
    }
    
    const newUrl = `/?${params.toString()}`
    router.push(newUrl)
  }

  return (
    <div className="w-full space-y-4">
      <form onSubmit={handleSubmit} className="w-full">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search for games..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-[#3a0099]/50 border-[#4f00b3] text-white placeholder-purple-300 focus:ring-2 focus:ring-purple-400 focus:border-purple-400 focus:outline-none transition-all duration-200 h-12 text-lg"
            />
          </div>
          
          <Button 
            type="submit" 
            size="lg" 
            disabled={isLoading || !query.trim()}
            className="fun-button text-white font-bold px-8 h-12 hover:scale-105 transition-transform"
          >
            {isLoading ? (
              <>
                <Zap className="mr-2 h-5 w-5 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="mr-2 h-5 w-5" />
                Search
              </>
            )}
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
                className="cursor-pointer hover:bg-purple-700 text-purple-300 border-purple-500"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
