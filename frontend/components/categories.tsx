"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Gamepad2, Sword, Car, Building, Ghost, Rocket, Trophy, Users, Cog, MapPin, Zap, Home } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"

// Icon mapping for different genres
const genreIcons = {
  "Simulation": <Cog className="h-8 w-8 mb-2 text-blue-400" />,
  "Obby & Platformer": <Building className="h-8 w-8 mb-2 text-green-400" />,
  "Roleplay & Avatar Sim": <Users className="h-8 w-8 mb-2 text-purple-400" />,
  "Adventure": <Rocket className="h-8 w-8 mb-2 text-orange-400" />,
  "Tycoon": <Trophy className="h-8 w-8 mb-2 text-yellow-400" />,
  "Vehicle Sim": <Car className="h-8 w-8 mb-2 text-indigo-400" />,
  "Town and City": <Home className="h-8 w-8 mb-2 text-emerald-400" />,
  "Sports & Racing": <Gamepad2 className="h-8 w-8 mb-2 text-red-400" />,
  "Incremental Simulator": <Zap className="h-8 w-8 mb-2 text-cyan-400" />,
  "All": <Ghost className="h-8 w-8 mb-2 text-gray-400" />,
  "Sports": <Gamepad2 className="h-8 w-8 mb-2 text-red-400" />,
  "RPG": <Sword className="h-8 w-8 mb-2 text-red-600" />,
  "Building": <Building className="h-8 w-8 mb-2 text-amber-400" />,
  "Comedy": <Users className="h-8 w-8 mb-2 text-pink-400" />,
  "Horror": <Ghost className="h-8 w-8 mb-2 text-gray-600" />,
};

// Color mapping for different genres
const genreColors = {
  "Simulation": "from-blue-500 to-cyan-500",
  "Obby & Platformer": "from-green-500 to-teal-500",
  "Roleplay & Avatar Sim": "from-purple-500 to-pink-500",
  "Adventure": "from-orange-500 to-red-500",
  "Tycoon": "from-yellow-500 to-amber-500",
  "Vehicle Sim": "from-indigo-500 to-blue-500",
  "Town and City": "from-emerald-500 to-green-500",
  "Sports & Racing": "from-red-500 to-rose-500",
  "Incremental Simulator": "from-cyan-500 to-blue-500",
  "All": "from-gray-500 to-slate-500",
  "Sports": "from-red-500 to-rose-500",
  "RPG": "from-red-600 to-orange-600",
  "Building": "from-amber-500 to-yellow-500",
  "Comedy": "from-pink-500 to-rose-500",
  "Horror": "from-gray-600 to-black",
};

interface Category {
  name: string;
  genre: string;
  doc_count: number;
  icon: React.ReactNode;
  color: string;
}

export function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetch(`${apiUrl}/api/aggregations`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch aggregations");
        }
        
        const data = await response.json();
        
        // Combine all genre data and get top 8
        const allGenres = [
          ...(data.genre_l1?.buckets || []),
          ...(data.genre_l2?.buckets || []),
          ...(data.genre?.buckets || [])
        ];

        // Filter out empty genres and combine duplicates
        const genreMap = new Map();
        
        allGenres.forEach(genre => {
          if (genre.key && genre.key.trim() !== "" && genre.key !== "All") {
            const key = genre.key;
            if (genreMap.has(key)) {
              const existing = genreMap.get(key);
              genreMap.set(key, {
                ...existing,
                doc_count: existing.doc_count + genre.doc_count
              });
            } else {
              genreMap.set(key, {
                name: key,
                genre: key,
                doc_count: genre.doc_count,
                icon: genreIcons[key] || <Gamepad2 className="h-8 w-8 mb-2 text-blue-400" />,
                color: genreColors[key] || "from-blue-500 to-purple-500"
              });
            }
          }
        });

        // Get top 8 categories by doc_count
        const topCategories = Array.from(genreMap.values())
          .sort((a, b) => b.doc_count - a.doc_count)
          .slice(0, 8);

        setCategories(topCategories);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching categories:", err);
        setError("Failed to load categories");
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  if (loading) {
    return (
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-neutral-800 mb-6">Popular Categories</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="bg-gray-200 animate-pulse border-none rounded-xl">
              <CardContent className="p-6 text-center h-24"></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-neutral-800 mb-6">Popular Categories</h2>
        <div className="text-center text-red-500 p-4">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-16">
      <h2 className="text-3xl font-bold text-neutral-800 mb-6">Popular Categories</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {categories.map((category) => (
          <Link 
            key={category.genre} 
            href={`/?genres=${encodeURIComponent(category.genre)}`} 
            className="block"
          >
            <Card
              className={`bg-gradient-to-br ${category.color} border-none overflow-hidden rounded-xl hover:scale-105 transition-transform`}
            >
              <CardContent className="p-6 text-center">
                {category.icon}
                <h3 className="text-xl font-bold text-white">{category.name}</h3>
                <p className="text-sm text-white/80 mt-1">{category.doc_count.toLocaleString()} games</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
