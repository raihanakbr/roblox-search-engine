"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"

interface PaginationProps {
  currentPage: number
  maxPages: number
}

export function Pagination({ currentPage, maxPages }: PaginationProps) {
  const router = useRouter()

  // Don't render pagination if there's only 1 page or no pages
  if (maxPages <= 1) {
    return null
  }

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > maxPages) return

    // Get current URL search params
    const params = new URLSearchParams(window.location.search)

    // Update page parameter
    params.set("page", newPage.toString())

    // Navigate to new URL
    router.push(`/?${params.toString()}`)
  }

  // Generate page numbers to show (with smart truncation)
  const getPageNumbers = () => {
    const pages = []

    if (maxPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= maxPages; i++) {
        pages.push(i)
      }
    } else {
      // Smart pagination with ellipsis
      if (currentPage <= 4) {
        // Show: 1 2 3 4 5 ... maxPages
        for (let i = 1; i <= 5; i++) {
          pages.push(i)
        }
        pages.push("...")
        pages.push(maxPages)
      } else if (currentPage >= maxPages - 3) {
        // Show: 1 ... (maxPages-4) (maxPages-3) (maxPages-2) (maxPages-1) maxPages
        pages.push(1)
        pages.push("...")
        for (let i = maxPages - 4; i <= maxPages; i++) {
          pages.push(i)
        }
      } else {
        // Show: 1 ... (current-1) current (current+1) ... maxPages
        pages.push(1)
        pages.push("...")
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i)
        }
        pages.push("...")
        pages.push(maxPages)
      }
    }

    return pages
  }

  const pageNumbers = getPageNumbers()

  return (
    <div className="flex flex-col items-center justify-center mt-12 space-y-4">
      {/* Page info */}
      <div className="text-sm text-purple-300 font-medium">
        Page {currentPage} of {maxPages}
      </div>

      {/* Page numbers */}
      <div className="flex items-center justify-center space-x-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="bg-[#3a0099] border-[#4f00b3] text-white hover:bg-[#4f00b3] disabled:bg-[#2a0066] disabled:text-purple-400 disabled:border-[#2a0066] rounded-xl h-10 w-10"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {pageNumbers.map((page, index) => {
          if (page === "...") {
            return (
              <span
                key={`ellipsis-${index}`}
                className="px-3 py-2 text-purple-300 font-medium"
              >
                ...
              </span>
            )
          }

          return (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              onClick={() => handlePageChange(page as number)}
              className={
                currentPage === page
                  ? "bg-gradient-to-r from-[#ff3366] to-[#ff9933] text-white font-bold rounded-xl h-10 w-10"
                  : "bg-[#3a0099] border-[#4f00b3] text-white hover:bg-[#4f00b3] hover:text-white rounded-xl h-10 w-10"
              }
            >
              {page}
            </Button>
          )
        })}

        <Button
          variant="outline"
          size="icon"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === maxPages}
          className="bg-[#3a0099] border-[#4f00b3] text-white hover:bg-[#4f00b3] disabled:bg-[#2a0066] disabled:text-purple-400 disabled:border-[#2a0066] rounded-xl h-10 w-10"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
