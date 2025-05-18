import { Card, CardContent } from "@/components/ui/card"
import { Gamepad2, Sword, Car, Building, Ghost, Rocket, Trophy, Users } from "lucide-react"
import Link from "next/link"

const categories = [
  {
    name: "Adventure",
    icon: <Rocket className="h-8 w-8 mb-2 text-pink-400" />,
    query: "adventure",
    color: "from-pink-500 to-purple-500",
  },
  {
    name: "Role-Playing",
    icon: <Users className="h-8 w-8 mb-2 text-blue-400" />,
    query: "role-playing",
    color: "from-blue-500 to-cyan-500",
  },
  {
    name: "Fighting",
    icon: <Sword className="h-8 w-8 mb-2 text-red-400" />,
    query: "fighting",
    color: "from-red-500 to-orange-500",
  },
  {
    name: "Racing",
    icon: <Car className="h-8 w-8 mb-2 text-green-400" />,
    query: "racing",
    color: "from-green-500 to-teal-500",
  },
  {
    name: "Horror",
    icon: <Ghost className="h-8 w-8 mb-2 text-purple-400" />,
    query: "horror",
    color: "from-purple-500 to-indigo-500",
  },
  {
    name: "Simulator",
    icon: <Gamepad2 className="h-8 w-8 mb-2 text-yellow-400" />,
    query: "simulator",
    color: "from-yellow-500 to-amber-500",
  },
  {
    name: "Building",
    icon: <Building className="h-8 w-8 mb-2 text-indigo-400" />,
    query: "building",
    color: "from-indigo-500 to-blue-500",
  },
  {
    name: "Popular",
    icon: <Trophy className="h-8 w-8 mb-2 text-amber-400" />,
    query: "popular",
    color: "from-amber-500 to-red-500",
  },
]

export function Categories() {
  return (
    <div className="mb-16">
      <h2 className="text-3xl font-bold text-neutral-800 mb-6">Popular Categories</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {categories.map((category) => (
          <Link key={category.name} href={`/?query=${category.query}`} className="block">
            <Card
              className={`bg-gradient-to-br ${category.color} border-none overflow-hidden rounded-xl hover:scale-105 transition-transform`}
            >
              <CardContent className="p-6 text-center">
                {category.icon}
                <h3 className="text-xl font-bold text-white">{category.name}</h3>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
