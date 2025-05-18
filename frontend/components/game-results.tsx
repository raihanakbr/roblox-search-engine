"use client"

import Image from "next/image"
import { ThumbsUp, Users, Gamepad, Flame } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { GameModal } from "./game-modal"
import type { Game } from "@/lib/types"

interface GameResultsProps {
  results: Game[]
}

export function GameResults({ results }: GameResultsProps) {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)

  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-medium text-purple-300">No games found</h3>
        <p className="text-purple-200 mt-2">Try a different search term</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {results.map((game, index) => {
          // Determine genres to display
          const genresToShow = []
          if (game.genre_l1) genresToShow.push(game.genre_l1)
          if (game.genre_l2 && game.genre_l2 !== game.genre_l1) genresToShow.push(game.genre_l2)
          if (genresToShow.length === 0 && game.genres) genresToShow.push(...game.genres)

          // Use imageUrl if available, otherwise fall back to thumbnail or placeholder
          const imageSource =
            game.imageUrl ||
            game.thumbnail ||
            `/placeholder.svg?height=432&width=768&text=${encodeURIComponent(game.name)}`

          // Only the first card is large (spans 2 columns)
          const isLargeCard = index === 0

          return (
            <Card
              key={game.id}
              className={`game-card bg-gradient-to-br from-[#2a0066] to-[#1a0033] border-[#4f00b3] overflow-hidden rounded-xl ${
                isLargeCard ? "md:col-span-2" : ""
              }`}
              onClick={() => setSelectedGame(game)}
            >
              <div className="card-image relative w-full" style={{ aspectRatio: "16/9" }}>
                <Image
                  src={imageSource || "/placeholder.svg"}
                  alt={game.name}
                  fill
                  className="object-cover rounded-t-xl"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a0033]/90 to-transparent" />

                <div className="absolute top-4 right-4 flex gap-2">
                  {game.maxPlayers && (
                    <Badge className="bg-[#4f00b3]/80 text-white border-none px-3 py-1 rounded-full">
                      <Users className="h-3 w-3 mr-1" />
                      Max {game.maxPlayers}
                    </Badge>
                  )}
                  <Badge className="bg-[#ff3366]/80 text-white border-none px-3 py-1 rounded-full">
                    <Flame className="h-3 w-3 mr-1" />
                    {game.playing.toLocaleString()}
                  </Badge>
                </div>

                <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
                  {genresToShow.map((genre) => (
                    <Badge key={genre} className="fun-badge">
                      {genre}
                    </Badge>
                  ))}
                </div>
              </div>

              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3
                    className="text-2xl font-extrabold mb-2 text-white"
                    dangerouslySetInnerHTML={{ __html: game.formattedName || game.name }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#ff3366] bg-[#ff3366]/10 text-[#ff3366] hover:bg-[#ff3366]/20 rounded-full"
                    asChild
                    onClick={(e) => {
                      e.stopPropagation() // Prevent card click
                    }}
                  >
                    <a
                      href={`https://roblox.com/games/${game.rootPlaceId || game.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Gamepad className="h-4 w-4 mr-1" /> Play
                    </a>
                  </Button>
                </div>

                <p className="text-purple-200 text-base mb-6 line-clamp-2">{game.description}</p>

                <div className="flex items-center justify-between text-sm text-purple-300">
                  <div className="flex items-center">
                    <div className="h-5 w-5 mr-1">
                      <Image
                        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-vnxYMDksFirVdQoBDCD6PvpfZ1pzYA.png"
                        alt="Visits"
                        width={20}
                        height={20}
                      />
                    </div>
                    <span>{game.visits?.toLocaleString() || "0"} visits</span>
                  </div>

                  <div className="flex items-center">
                    <ThumbsUp className="h-4 w-4 mr-1 text-pink-400" />
                    <span>{game.favoritedCount?.toLocaleString() || "0"} favorites</span>
                  </div>

                  <div className="flex items-center text-xs">
                    By{" "}
                    <span className="font-medium text-white ml-1">
                      {game.creator?.name || (typeof game.creator === "string" ? game.creator : "Unknown")}
                    </span>
                    {game.creator?.hasVerifiedBadge && (
                      <Badge className="ml-1 bg-[#00b3ff] text-white h-4 w-4 flex items-center justify-center p-0 rounded-full">
                        ✓
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <GameModal game={selectedGame} isOpen={selectedGame !== null} onClose={() => setSelectedGame(null)} />
    </>
  )
}
