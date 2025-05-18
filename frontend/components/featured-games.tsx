"use client"

import { useState } from "react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Gamepad, Flame, Star, ChevronRight, ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"

// Featured games data
const featuredGames = [
  {
    id: "920587237",
    name: "Adopt Me!",
    description: "Adopt and raise cute pets, trade items, and build your dream home in this popular role-playing game.",
    imageUrl: "/placeholder.svg?height=432&width=768&text=Adopt+Me!",
    playing: 150000,
    visits: 32000000000,
    favoritedCount: 22000000,
    creator: { name: "Uplift Games", hasVerifiedBadge: true },
    genre_l1: "Role-Playing",
    genre_l2: "Adventure",
  },
  {
    id: "2753915549",
    name: "Blox Fruits",
    description:
      "Become a powerful pirate or marine in this One Piece inspired adventure game with Devil Fruits and combat.",
    imageUrl: "/placeholder.svg?height=432&width=768&text=Blox+Fruits",
    playing: 120000,
    visits: 12000000000,
    favoritedCount: 18000000,
    creator: { name: "Gamer Robot Inc", hasVerifiedBadge: true },
    genre_l1: "Fighting",
    genre_l2: "Adventure",
  },
  {
    id: "4924922222",
    name: "Brookhaven RP",
    description: "Live your dream life in this role-playing town with houses, vehicles, and jobs.",
    imageUrl: "/placeholder.svg?height=432&width=768&text=Brookhaven+RP",
    playing: 200000,
    visits: 18000000000,
    favoritedCount: 20000000,
    creator: { name: "Wolfpaq", hasVerifiedBadge: true },
    genre_l1: "Role-Playing",
    genre_l2: "Town & City",
  },
]

export function FeaturedGames() {
  const [activeIndex, setActiveIndex] = useState(0)

  const nextSlide = () => {
    setActiveIndex((current) => (current === featuredGames.length - 1 ? 0 : current + 1))
  }

  const prevSlide = () => {
    setActiveIndex((current) => (current === 0 ? featuredGames.length - 1 : current - 1))
  }

  return (
    <div className="mb-16">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-white flex items-center">
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
                src={game.imageUrl || "/placeholder.svg"}
                alt={game.name}
                fill
                className="object-cover rounded-2xl"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1a0033] via-[#1a0033]/70 to-transparent" />

              <div className="absolute bottom-0 left-0 w-full p-8">
                <div className="flex items-center mb-3">
                  <Badge className="bg-[#ff3366]/80 text-white border-none px-3 py-1 rounded-full mr-3">
                    <Flame className="h-3 w-3 mr-1" />
                    {game.playing.toLocaleString()} playing
                  </Badge>
                  <Badge className="fun-badge mr-3">{game.genre_l1}</Badge>
                  {game.genre_l2 && <Badge className="fun-badge">{game.genre_l2}</Badge>}
                </div>

                <h3 className="text-4xl font-extrabold mb-3 text-white">{game.name}</h3>
                <p className="text-xl text-purple-200 mb-6 max-w-3xl">{game.description}</p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center text-white">
                    By <span className="font-medium ml-1">{game.creator.name}</span>
                    {game.creator.hasVerifiedBadge && (
                      <Badge className="ml-1 bg-[#00b3ff] text-white h-5 w-5 flex items-center justify-center p-0 rounded-full">
                        ✓
                      </Badge>
                    )}
                  </div>

                  <Button className="fun-button text-white px-6 py-2 rounded-full" asChild>
                    <a href={`https://roblox.com/games/${game.id}`} target="_blank" rel="noopener noreferrer">
                      <Gamepad className="h-5 w-5 mr-2" /> Play Now
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Indicators */}
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
