from elasticsearch import Elasticsearch
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ElasticsearchManager:
    def __init__(self, host="http://localhost:9200"):
        self.es = Elasticsearch(host)
        self.index_name = "roblox_games"
        
    def check_connection(self):
        if self.es.ping():
            logger.info("Connected to Elasticsearch")
            return True
        else:
            logger.error("Could not connect to Elasticsearch")
            return False
    
    def create_index(self):
        """Create index with mapping for Roblox games data"""
        if self.es.indices.exists(index=self.index_name):
            logger.info(f"Index {self.index_name} already exists")
            return
        
        mapping = {
            "mappings": {
                "properties": {
                    "id": {"type": "keyword"},
                    "name": {"type": "text", "analyzer": "standard", "fields": {"keyword": {"type": "keyword"}}},
                    "description": {"type": "text", "analyzer": "standard"},
                    "sourceName": {"type": "text"},
                    "sourceDescription": {"type": "text"},
                    "creator": {
                        "properties": {
                            "id": {"type": "long"},
                            "name": {"type": "text", "fields": {"keyword": {"type": "keyword"}}},
                            "type": {"type": "keyword"},
                            "isRNVAccount": {"type": "boolean"},
                            "hasVerifiedBadge": {"type": "boolean"}
                        }
                    },
                    "price": {"type": "float", "null_value": 0},
                    "allowedGearGenres": {"type": "keyword"},
                    "allowedGearCategories": {"type": "keyword"},
                    "playing": {"type": "integer"},
                    "visits": {"type": "long"},
                    "maxPlayers": {"type": "integer"},
                    "created": {"type": "date"},
                    "updated": {"type": "date"},
                    "genre": {"type": "keyword"},
                    "genre_l1": {"type": "keyword"},
                    "genre_l2": {"type": "keyword"},
                    "isAllGenre": {"type": "boolean"},
                    "isFavoritedByUser": {"type": "boolean"},
                    "favoritedCount": {"type": "integer"}
                }
            },
            "settings": {
                "analysis": {
                    "analyzer": {
                        "game_analyzer": {
                            "type": "custom",
                            "tokenizer": "standard",
                            "filter": ["lowercase", "asciifolding", "stop"]
                        }
                    }
                }
            }
        }
        
        try:
            self.es.indices.create(index=self.index_name, body=mapping)
            logger.info(f"Created index {self.index_name}")
        except Exception as e:
            logger.error(f"Error creating index: {e}")
    
    def index_data(self, data_file):
        """Index data from JSON file into Elasticsearch"""
        try:
            with open(data_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            logger.info(f"Loaded {len(data)} games from {data_file}")
            
            # Check if data is a list or dict with an array inside
            if isinstance(data, dict) and any(isinstance(data.get(k), list) for k in data):
                # Find the key that contains the array of games
                for k in data:
                    if isinstance(data[k], list):
                        data = data[k]
                        break
            
            # Bulk indexing
            bulk_data = []
            for game in data:
                bulk_data.append({"index": {"_index": self.index_name}})
                bulk_data.append(game)
                
                # Process in batches of 1000
                if len(bulk_data) >= 2000:
                    self.es.bulk(body=bulk_data)
                    bulk_data = []
            
            # Index remaining items
            if bulk_data:
                self.es.bulk(body=bulk_data)
                
            logger.info(f"Successfully indexed {len(data)} games into {self.index_name}")
        except Exception as e:
            logger.error(f"Error indexing data: {e}")
    
    def search(self, query_text, filters=None, size=10, from_=0):
        """
        Perform search against Elasticsearch index
        
        Parameters:
        - query_text: Text to search for
        - filters: Dictionary of field:value pairs to filter results
        - size: Number of results to return
        - from_: Offset for pagination
        """
        # Base query using multi_match for text search
        query = {
            "query": {
                "bool": {
                    "must": [
                        {
                            "multi_match": {
                                "query": query_text,
                                "fields": ["name^3", "description^2", "creator.name", "genre"],
                                "type": "best_fields",
                                "fuzziness": "AUTO"
                            }
                        }
                    ],
                    "filter": []
                }
            },
            "size": size,
            "from": from_,
            "highlight": {
                "fields": {
                    "name": {},
                    "description": {}
                }
            },
            "sort": [
                "_score",
                {"visits": {"order": "desc"}},
                {"playing": {"order": "desc"}}
            ]
        }
        
        # Add filters if provided
        if filters:
            for field, value in filters.items():
                if isinstance(value, list):
                    query["query"]["bool"]["filter"].append({"terms": {field: value}})
                else:
                    query["query"]["bool"]["filter"].append({"term": {field: value}})
        
        try:
            results = self.es.search(index=self.index_name, body=query)
            return results
        except Exception as e:
            logger.error(f"Search error: {e}")
            return {"error": str(e)}
            
    def get_aggregations(self):
        """Get aggregations for faceted search"""
        query = {
            "size": 0,
            "aggs": {
                "genres": {
                    "terms": {"field": "genre.keyword", "size": 20}
                },
                "creators": {
                    "terms": {"field": "creator.name.keyword", "size": 20}
                },
                "max_players": {
                    "range": {
                        "field": "maxPlayers",
                        "ranges": [
                            {"to": 10},
                            {"from": 10, "to": 20},
                            {"from": 20, "to": 50},
                            {"from": 50}
                        ]
                    }
                },
                "player_count": {
                    "stats": {"field": "playing"}
                },
                "visits_stats": {
                    "stats": {"field": "visits"}
                }
            }
        }
        
        try:
            results = self.es.search(index=self.index_name, body=query)
            return results["aggregations"]
        except Exception as e:
            logger.error(f"Aggregation error: {e}")
            return {"error": str(e)}

if __name__ == "__main__":
    # Test script
    es_manager = ElasticsearchManager()
    if es_manager.check_connection():
        es_manager.create_index()
        es_manager.index_data("./data/roblox_data.json")
        
        # Test search
        test_results = es_manager.search("gorilla")
        print(f"Found {test_results['hits']['total']['value']} matches")