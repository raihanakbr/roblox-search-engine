import json
import logging
import os
from typing import Any, Dict, List, Optional

from elasticsearch_utils import ElasticsearchManager
from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from llm_integration import LLMService
from pydantic import BaseModel

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="RoFind - Roblox Game Search Engine")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
elasticsearch_host = os.environ.get("ELASTICSEARCH_HOST", "http://localhost:9200")
es_manager = ElasticsearchManager(host=elasticsearch_host)
llm_service = LLMService()

# Define models
class SearchRequest(BaseModel):
    query: str
    filters: Optional[Dict[str, Any]] = None
    page: int = 1
    page_size: int = 10
    use_llm: bool = False

class GameData(BaseModel):
    id: str
    name: str
    description: str
    enhance_description: bool = False

# Add new models for index management
class DeleteIndexRequest(BaseModel):
    admin_key: str
    confirm: bool = False

class RecreateIndexRequest(BaseModel):
    admin_key: str
    data_file: Optional[str] = "./data/roblox_data.json"

class TrendingRequest(BaseModel):
    limit: int = 10

# Admin key for protected operations - in production use a more secure approach
ADMIN_KEY = os.environ.get("ADMIN_KEY", "your-secure-admin-key")

# Dependency to ensure Elasticsearch is connected
async def get_es_manager():
    if not es_manager.check_connection():
        raise HTTPException(status_code=503, detail="Elasticsearch service unavailable")
    return es_manager

# Serve static files
# app.mount("/static", StaticFiles(directory="../frontend"), name="static")

@app.get("/")
async def get_index():
    return FileResponse("../frontend/index.html")

@app.get("/health")
async def health_check(es: ElasticsearchManager = Depends(get_es_manager)):
    return {"status": "healthy", "elasticsearch": "connected"}

@app.post("/api/search")
async def search(
    request: SearchRequest,
    es: ElasticsearchManager = Depends(get_es_manager)
):
    # Calculate from_ for pagination
    from_ = (request.page - 1) * request.page_size
    
    # Perform search
    search_results = es.search(
        query_text=request.query,
        filters=request.filters,
        size=request.page_size,
        from_=from_
    )
    
    # Convert the Elasticsearch response to a dictionary
    search_dict = dict(search_results)
    if "hits" in search_dict and "hits" in search_dict["hits"]:
        seen_ids = set()
        unique_hits = []
        
        for hit in search_dict["hits"]["hits"]:
            game_id = hit["_source"].get("id")
            if game_id and game_id not in seen_ids:
                seen_ids.add(game_id)
                unique_hits.append(hit)
        
        # Update hits with deduplicated results
        search_dict["hits"]["hits"] = unique_hits
        search_dict["hits"]["total"]["value"] = len(unique_hits)
    print("ato gay")
    print(search_dict)
    # Check if we should enhance with LLM
    if request.use_llm and search_dict.get("hits", {}).get("hits", []):
        try:
            llm_enhancements = llm_service.enhance_search(
                query=request.query,
                search_results=search_dict["hits"]["hits"]
            )
            
            # Now we can safely add to the dictionary
            search_dict["llm_enhancements"] = llm_enhancements

        except Exception as e:
            logger.error(f"LLM enhancement failed: {e}")
            search_dict["llm_enhancements"] = {
                "error": "Failed to enhance results with LLM",
                "ranking": list(range(1, len(search_dict["hits"]["hits"]) + 1)),
                "alternative_queries": [
                    f"{request.query} games",
                    f"popular {request.query}",
                    f"best {request.query}"
                ],
                "analysis": "LLM enhancement unavailable."
            }
    
    return search_dict

@app.get("/api/aggregations")
async def get_aggregations(es: ElasticsearchManager = Depends(get_es_manager)):
    """Get aggregations for faceted search"""
    return es.get_aggregations()

@app.post("/api/enhance-description")
async def enhance_description(game_data: GameData):
    """Enhance a game description using LLM"""
    try:
        enhanced_description = llm_service.generate_game_description(game_data.dict())
        return {"original": game_data.description, "enhanced": enhanced_description}
    except Exception as e:
        logger.error(f"Error enhancing description: {e}")
        raise HTTPException(status_code=500, detail=f"LLM service error: {str(e)}")

@app.post("/api/initialize-data")
async def initialize_data(es: ElasticsearchManager = Depends(get_es_manager)):
    """Initialize the Elasticsearch index with Roblox data"""
    try:
        es.create_index()
        es.index_data("./data/roblox_data.json")
        return {"status": "success", "message": "Data initialized successfully"}
    except Exception as e:
        logger.error(f"Error initializing data: {e}")
        raise HTTPException(status_code=500, detail=f"Data initialization error: {str(e)}")

@app.post("/api/admin/delete-index")
async def delete_index(
    request: DeleteIndexRequest,
    es: ElasticsearchManager = Depends(get_es_manager)
):
    """Delete the Elasticsearch index (admin only)"""
    # Simple security check
    if request.admin_key != ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Unauthorized: Invalid admin key")
        
    success = es.delete_index(confirm=request.confirm)
    if success:
        return {"status": "success", "message": f"Index {es.index_name} deleted"}
    else:
        raise HTTPException(status_code=400, detail="Failed to delete index. Ensure confirm=True is set.")

@app.post("/api/admin/recreate-index")
async def recreate_index(
    request: RecreateIndexRequest,
    es: ElasticsearchManager = Depends(get_es_manager)
):
    """Delete and recreate the Elasticsearch index (admin only)"""
    # Simple security check
    if request.admin_key != ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Unauthorized: Invalid admin key")
    
    data_file = request.data_file
    # Validate that data file exists
    if data_file and not os.path.exists(data_file):
        raise HTTPException(status_code=400, detail=f"Data file not found: {data_file}")
        
    success = es.recreate_index(data_file=data_file)
    if success:
        return {
            "status": "success", 
            "message": f"Index {es.index_name} recreated" + 
                      (f" and data loaded from {data_file}" if data_file else "")
        }
    else:
        raise HTTPException(status_code=500, detail="Failed to recreate index.")

@app.post("/api/trending")
async def get_trending_games(
    request: TrendingRequest = TrendingRequest(),
    es: ElasticsearchManager = Depends(get_es_manager)
):
    """Get the top trending games based on current player count"""
    # Ensure limit is within reasonable bounds
    limit = max(1, min(request.limit, 50))  # Between 1 and 50
    
    # Get trending games
    trending_results = es.get_trending_games(size=limit)
    
    # Process results to ensure unique entries and clean format
    trending_dict = dict(trending_results)
    if "hits" in trending_dict and "hits" in trending_dict["hits"]:
        seen_ids = set()
        unique_hits = []
        
        for hit in trending_dict["hits"]["hits"]:
            game_id = hit["_source"].get("id")
            if game_id and game_id not in seen_ids:
                seen_ids.add(game_id)
                unique_hits.append(hit)
        
        # Update hits with deduplicated results
        trending_dict["hits"]["hits"] = unique_hits
        trending_dict["hits"]["total"]["value"] = len(unique_hits)
    
    return trending_dict

if __name__ == "__main__":
    import uvicorn

    # Create index and load data if needed
    if es_manager.check_connection() and not es_manager.es.indices.exists(index=es_manager.index_name):
        es_manager.create_index()
        
        # Check if data file exists
        if os.path.exists("./data/roblox_data.json"):
            es_manager.index_data("./data/roblox_data.json")
            
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)