"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface PaginationProps {
  currentPage: number
  maxPages: number
}

export function Pagination({ currentPage, maxPages }: PaginationProps) {
  const router = useRouter()

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > maxPages) return

    // Get current URL search params
    const params = new URLSearchParams(window.location.search)

    // Update page parameter
    params.set("page", newPage.toString())

    // Navigate to new URL
    router.push(`/?${params.toString()}`)
  }

  return (
    <div className="flex flex-col items-center justify-center mt-12 space-y-4">
      {/* Page numbers */}
      <div className="flex items-center justify-center space-x-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="bg-[#3a0099] border-[#4f00b3] text-white hover:bg-[#4f00b3] rounded-xl h-10 w-10"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {Array.from({ length: maxPages }, (_, i) => i + 1).map((page) => (
          <Button
            key={page}
            variant={currentPage === page ? "default" : "outline"}
            onClick={() => handlePageChange(page)}
            className={
              currentPage === page
                ? "bg-gradient-to-r from-[#ff3366] to-[#ff9933] text-white rounded-xl h-10 w-10"
                : "bg-[#3a0099] border-[#4f00b3] text-white hover:bg-[#4f00b3] rounded-xl h-10 w-10"
            }
          >
            {page}
          </Button>
        ))}

        <Button
          variant="outline"
          size="icon"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === maxPages}
          className="bg-[#3a0099] border-[#4f00b3] text-white hover:bg-[#4f00b3] rounded-xl h-10 w-10"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
