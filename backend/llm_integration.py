import requests
import json
import logging
import os
from typing import Dict, List, Any, Optional
from dotenv import load_dotenv
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LLMService:
    def __init__(self, model_name="meta-llama/llama-3-8b-instruct"):
        self.model_name = model_name
        self.api_url = "https://router.huggingface.co/novita/v3/openai/chat/completions"
        self.api_key = os.environ.get("HUGGINGFACE_API_KEY") 
        
        if not self.api_key:
            logger.warning("HUGGINGFACE_API_KEY environment variable not set!")
        
        self.headers = {"Authorization": f"Bearer {self.api_key}"}
    
    def enhance_search(self, query: str, search_results: List[Dict]) -> Dict:
        """
        Enhance search results using LLM to improve relevance and provide suggestions
        
        Parameters:
        - query: Original search query
        - search_results: List of search results from Elasticsearch
        
        Returns:
        - Dictionary with enhanced information
        """
        # Format the search results for the LLM
        formatted_results = []
        for i, hit in enumerate(search_results[:5], 1):  # Limit to top 5 for LLM context
            source = hit["_source"]
            formatted_results.append(
                f"Game {i}: {source.get('name', 'Unknown')} "
                f"by {source.get('creator', {}).get('name', 'Unknown Creator')}\n"
                f"Description: {source.get('description', '')[:100]}...\n"
                f"Genre: {source.get('genre', 'Unknown')} "
                f"Players: {source.get('playing', 0)} "
                f"Visits: {source.get('visits', 0)}\n"
            )
        
        formatted_results_str = "\n".join(formatted_results)
        
        # Create prompt for the LLM
        prompt = f"""
        I'm searching for Roblox games with the query: "{query}"
        
        Here are the top search results:
        {formatted_results_str}
        
        Please provide:
        1. Improved search results ranking (list the games in order of relevance to the query)
        2. 3 alternative roblox game search queries I could try to find better results, avoid the word "games" and "roblox" because we already know that
        3. A brief analysis of what features of the top game match my search interests
        
        Format your response as JSON with keys "ranking", "alternative_queries", and "analysis".
        """
        
        try:
            # Prepare payload in the OpenAI-compatible format
            payload = {
                "messages": [
                    {"role": "user", "content": prompt}
                ],
                "model": self.model_name
            }
            
            # Call the API
            response = requests.post(self.api_url, headers=self.headers, json=payload)
            response.raise_for_status()
            
            # Parse response
            result = response.json()
            llm_text = result["choices"][0]["message"]["content"]
            
            # Try to extract JSON from the response
            return self._extract_json_from_llm_response(llm_text, query, search_results)
            
        except Exception as e:
            logger.error(f"Error calling LLM API: {e}")
            return {
                "error": "Failed to enhance search results with LLM",
                "ranking": list(range(1, len(search_results) + 1)),
                "alternative_queries": [f"{query} games", f"popular {query}", f"best {query}"],
                "analysis": "Unable to provide analysis due to LLM service error."
            }
    
    def generate_game_description(self, game_data: Dict) -> str:
        """
        Generate an enhanced game description based on the original data
        
        Parameters:
        - game_data: Original game data from Elasticsearch
        
        Returns:
        - Enhanced description string
        """
        prompt = f"""
        Here is information about a Roblox game:
        
        Name: {game_data.get('name', 'Unknown')}
        Original Description: {game_data.get('description', '')}
        Genre: {game_data.get('genre', 'Unknown')}
        Subgenre: {game_data.get('subgenre', 'Unknown')}
        
        Please write an engaging, improved description for this game that highlights its key features,
        gameplay, and why players might enjoy it. Keep it concise but informative.
        """
        
        try:
            # Prepare payload in the OpenAI-compatible format
            payload = {
                "messages": [
                    {"role": "user", "content": prompt}
                ],
                "model": self.model_name
            }
            
            # Call the API
            response = requests.post(self.api_url, headers=self.headers, json=payload)
            response.raise_for_status()
            
            # Parse response
            result = response.json()
            enhanced_description = result["choices"][0]["message"]["content"]
            
            return enhanced_description.strip()
            
        except Exception as e:
            logger.error(f"Error generating game description: {e}")
            return game_data.get('description', 'Description not available')
    
    def _extract_json_from_llm_response(self, response: str, query: str, search_results: List[Dict]) -> Dict:
        """
        Extract JSON from LLM response or create a fallback structure
        """
        # Default response in case of parsing failure
        default_response = {
            "ranking": list(range(1, len(search_results) + 1)),
            "alternative_queries": [f"{query} games", f"popular {query}", f"best {query}"],
            "analysis": "The top game appears to match your search interests based on its genre and popularity."
        }
        
        if not response:
            return default_response
            
        try:
            # Try to find JSON in the response
            start_idx = response.find('{')
            end_idx = response.rfind('}')
            
            if start_idx >= 0 and end_idx > start_idx:
                json_str = response[start_idx:end_idx+1]
                return json.loads(json_str)
            
            # If no JSON found, try to extract structured information
            lines = response.split('\n')
            ranking = []
            alt_queries = []
            analysis = ""
            
            section = None
            for line in lines:
                line = line.strip()
                
                if not line:
                    continue
                    
                if "ranking" in line.lower():
                    section = "ranking"
                    continue
                elif "alternative" in line.lower() and "queries" in line.lower():
                    section = "alternative_queries"
                    continue
                elif "analysis" in line.lower():
                    section = "analysis"
                    continue
                
                if section == "ranking" and line[0].isdigit():
                    ranking.append(int(line[0]))
                elif section == "alternative_queries" and ("- " in line or line[0].isdigit()):
                    clean_query = line.strip("- 0123456789. ")
                    alt_queries.append(clean_query)
                elif section == "analysis":
                    analysis += line + " "
            
            # Fill in with defaults if extraction failed
            if not ranking:
                ranking = default_response["ranking"]
            if len(alt_queries) < 3:
                alt_queries = default_response["alternative_queries"]
            if not analysis:
                analysis = default_response["analysis"]
                
            return {
                "ranking": ranking,
                "alternative_queries": alt_queries,
                "analysis": analysis.strip()
            }
            
        except Exception as e:
            logger.error(f"Error extracting JSON from LLM response: {e}")
            return default_response
        
if __name__ == "__main__":
    llm_service = LLMService()
    # Example usage
    query = "adventure games"
    search_results = [
        {
            "_source": {
                "name": "Adventure Island",
                "creator": {"name": "GameDev"},
                "description": "Explore the island and complete quests.",
                "genre": "Adventure",
                "playing": 100,
                "visits": 10000,
                "maxPlayers": 50
            }
        },
        # Add more search results as needed
    ]
    
    enhanced_results = llm_service.enhance_search(query, search_results)
    print(enhanced_results)