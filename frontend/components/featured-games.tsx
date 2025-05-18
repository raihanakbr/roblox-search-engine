"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Gamepad, Flame, Star, ChevronRight, ChevronLeft, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

export function FeaturedGames() {
  const [featuredGames, setFeaturedGames] = useState([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [expandedDescription, setExpandedDescription] = useState(false)

  useEffect(() => {
    async function fetchTrendingGames() {
      try {
        setLoading(true)
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://rofind.site"
        const response = await fetch(`${apiUrl}/api/trending`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        console.log(response.ok, response.status)
        
        if (!response.ok) {
          throw new Error('Failed to fetch trending games')
        }
        
        const data = await response.json()
        console.log("Trending games data:", data)
        
        if (data.hits && data.hits.hits) {
          const games = data.hits.hits.map(hit => hit._source)
          setFeaturedGames(games.slice(0, 5))
        } else {
          console.error("Unexpected API response format", data)
          setFeaturedGames([])
        }
      } catch (error) {
        console.error('Error fetching trending games:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTrendingGames()
  }, [])

  const nextSlide = () => {
    if (featuredGames.length === 0) return
    setActiveIndex((current) => (current === featuredGames.length - 1 ? 0 : current + 1))
  }

  const prevSlide = () => {
    if (featuredGames.length === 0) return
    setActiveIndex((current) => (current === 0 ? featuredGames.length - 1 : current - 1))
  }

  const truncateText = (text, maxLength = 100) => {
    if (!text || text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  }

  if (loading) {
    return (
      <div className="mb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-neutral-800 flex items-center">
            <Star className="mr-2 h-7 w-7 text-yellow-400" />
            Featured Games
          </h2>
        </div>
        <div className="flex justify-center items-center h-[500px] bg-[#3a0099]/10 rounded-2xl">
          <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin text-purple-600 mx-auto mb-4" />
            <p className="text-purple-800">Loading featured games...</p>
          </div>
        </div>
      </div>
    )
  }

  if (featuredGames.length === 0) {
    return null
  }

  return (
    <div className="mb-16">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-neutral-800 flex items-center">
          <Star className="mr-2 h-7 w-7 text-yellow-400" />
          Featured Games
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={prevSlide}
            className="bg-[#3a0099] border-[#4f00b3] text-white hover:bg-[#4f00b3] rounded-full h-10 w-10"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={nextSlide}
            className="bg-[#3a0099] border-[#4f00b3] text-white hover:bg-[#4f00b3] rounded-full h-10 w-10"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl" style={{ height: "500px" }}>
        {featuredGames.map((game, index) => (
          <div
            key={game.id}
            className={cn(
              "absolute inset-0 transition-all duration-500 ease-in-out",
              index === activeIndex ? "opacity-100 z-10" : "opacity-0 z-0",
            )}
          >
            <div className="relative h-full w-full">
              <Image
                src={game.imageUrl || `/placeholder.svg?height=432&width=768&text=${encodeURIComponent(game.name)}`}
                alt={game.name}
                fill
                className="object-cover rounded-2xl"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1a0033] via-[#1a0033]/70 to-transparent" />

              <div className="absolute bottom-0 left-0 w-full p-8">
                <div className="flex items-center mb-3">
                  <Badge className="bg-[#ff3366]/80 text-white border-none px-3 py-1 rounded-full mr-3">
                    <Flame className="h-3 w-3 mr-1" />
                    {(game.playing || 0).toLocaleString()} playing
                  </Badge>
                  {game.genre_l1 && <Badge className="fun-badge mr-3">{game.genre_l1}</Badge>}
                  {game.genre_l2 && <Badge className="fun-badge">{game.genre_l2}</Badge>}
                </div>

                <h3 className="text-4xl font-extrabold mb-3 text-white">{game.name}</h3>
                
                <div className="mb-6 max-w-3xl">
                  <p className="text-xl text-purple-200">
                    {expandedDescription && index === activeIndex
                      ? game.description
                      : truncateText(game.description, 150)}
                  </p>
                  
                  {game.description && game.description.length > 150 && (
                    <button 
                      onClick={() => setExpandedDescription(!expandedDescription)}
                      className="text-purple-300 hover:text-white text-sm mt-2 flex items-center transition-colors"
                    >
                      {expandedDescription && index === activeIndex ? (
                        <>Show Less <ChevronUp className="h-3 w-3 ml-1" /></>
                      ) : (
                        <>Read More <ChevronDown className="h-3 w-3 ml-1" /></>
                      )}
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center text-white">
                    By <span className="font-medium ml-1">{game.creator?.name || "Unknown"}</span>
                    {game.creator?.hasVerifiedBadge && (
                      <Badge className="ml-1 bg-[#00b3ff] text-white h-5 w-5 flex items-center justify-center p-0 rounded-full">
                        ✓
                      </Badge>
                    )}
                  </div>

                  <Button className="fun-button text-white px-6 py-2 rounded-full" asChild>
                    <a href={`https://roblox.com/games/${game.rootPlaceId || game.id}`} target="_blank" rel="noopener noreferrer">
                      <Gamepad className="h-5 w-5 mr-2" /> Play Now
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}

        <div className="absolute bottom-4 right-4 z-20 flex gap-2">
          {featuredGames.map((_, index) => (
            <button
              key={index}
              className={cn("w-3 h-3 rounded-full transition-all", index === activeIndex ? "bg-white" : "bg-white/30")}
              onClick={() => setActiveIndex(index)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
