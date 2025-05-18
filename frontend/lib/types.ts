export interface Game {
  id: string | number
  rootPlaceId?: number
  name: string
  formattedName?: string // For highlighted search results
  description: string
  creator: {
    id: number
    name: string
    type: string
    hasVerifiedBadge: boolean
  }
  imageUrl?: string // New field for the actual thumbnail image
  thumbnail?: string // Keeping for backward compatibility
  playing: number
  visits: number
  maxPlayers?: number
  created?: string
  updated?: string
  genre?: string
  genre_l1?: string
  genre_l2?: string
  favoritedCount?: number
  isFavoritedByUser?: boolean
  price?: number | null
  // Keep these fields for compatibility with existing code
  likes?: number
  rating?: number
  genres?: string[]
  releaseDate?: string
  lastUpdated?: string
  content?: string // This contains the full text content for search
}
