import json
import logging

from elasticsearch import Elasticsearch

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ElasticsearchManager:
    def __init__(self, host="http://localhost:9200"):
        # Configuration for Elasticsearch 8.x
        self.es = Elasticsearch(
            hosts=[host],
            verify_certs=False,
            ssl_show_warn=False,
            request_timeout=30
        )
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
                    "universeId": {"type": "keyword"},
                    "name": {"type": "text", "analyzer": "standard", "fields": {"keyword": {"type": "keyword"}}},
                    "description": {"type": "text", "analyzer": "standard"},
                    "sourceName": {"type": "text"},
                    "sourceDescription": {"type": "text"},
                    "imageUrl": {"type": "keyword"},
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
    
    def delete_index(self, confirm=False):
        """Delete the Elasticsearch index"""
        if not confirm:
            logger.warning("Delete operation requires confirmation. Set confirm=True to proceed.")
            return False
            
        try:
            if self.es.indices.exists(index=self.index_name):
                self.es.indices.delete(index=self.index_name)
                logger.info(f"Successfully deleted index: {self.index_name}")
                return True
            else:
                logger.info(f"Index {self.index_name} does not exist, nothing to delete.")
                return False
        except Exception as e:
            logger.error(f"Error deleting index: {str(e)}")
            return False
    
    def recreate_index(self, data_file=None):
        """Delete and recreate the index, optionally reloading data"""
        try:
            # Delete if exists
            if self.es.indices.exists(index=self.index_name):
                self.es.indices.delete(index=self.index_name)
                logger.info(f"Deleted existing index: {self.index_name}")
            
            # Create new index
            self.create_index()
            
            # Reindex data if file provided
            if data_file:
                self.index_data(data_file)
                logger.info(f"Reloaded data from {data_file}")
            
            return True
        except Exception as e:
            logger.error(f"Error recreating index: {str(e)}")
            return False
    
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
            
            # Debug: Log data type and first few items
            print(f"Data type: {type(data)}, Length: {len(data)}")
            if data and len(data) > 0:
                print(f"First item ID: {data[0].get('id', 'NO_ID')}")
                print(f"First item keys: {list(data[0].keys())[:10]}")
            
            # Remove duplicates from source data and validate IDs
            unique_games = {}
            skipped_no_id = 0
            duplicates_found = 0
            
            for i, game in enumerate(data):
                game_id = game.get('id')
                
                # Validate ID
                if not game_id:
                    skipped_no_id += 1
                    print(f"Skipping game at index {i}: no ID found. Keys: {list(game.keys())[:5]}")
                    continue
                
                # Convert to string for consistency
                game_id_str = str(game_id)
                
                if game_id_str in unique_games:
                    duplicates_found += 1
                    print(f"Duplicate found: ID {game_id_str} ('{game.get('name', 'Unknown')}') at index {i}")
                else:
                    unique_games[game_id_str] = game
            
            logger.info(f"Processing: {len(unique_games)} unique games, {duplicates_found} duplicates removed, {skipped_no_id} skipped (no ID)")
            
            # Bulk indexing with game ID as document ID
            bulk_data = []
            indexed_count = 0
            failed_count = 0
            
            for game_id, game in unique_games.items():
                try:
                    # Use game ID as Elasticsearch document ID to prevent duplicates
                    bulk_data.append({
                        "index": {
                            "_index": self.index_name,
                            "_id": game_id  # This ensures no duplicates at ES level
                        }
                    })
                    bulk_data.append(game)
                    indexed_count += 1
                    
                    # Process in batches of 1000 documents (500 games)
                    if len(bulk_data) >= 1000:
                        print(f"Indexing batch: {indexed_count - len(bulk_data)//2 + 1} to {indexed_count}")
                        response = self.es.bulk(body=bulk_data)
                        
                        # Check for errors
                        if response.get('errors'):
                            for item in response['items']:
                                if 'index' in item and item['index'].get('status', 200) >= 400:
                                    failed_count += 1
                                    print(f"Failed to index: {item['index'].get('error', 'Unknown error')}")
                        
                        bulk_data = []
                
                except Exception as e:
                    print(f"Error preparing game {game_id}: {e}")
                    failed_count += 1
                    continue
            
            # Index remaining items
            if bulk_data:
                print(f"Indexing final batch: {indexed_count - len(bulk_data)//2 + 1} to {indexed_count}")
                response = self.es.bulk(body=bulk_data)
                
                # Check for errors
                if response.get('errors'):
                    for item in response['items']:
                        if 'index' in item and item['index'].get('status', 200) >= 400:
                            failed_count += 1
                            print(f"Failed to index: {item['index'].get('error', 'Unknown error')}")
            
            # Refresh index to make documents searchable
            self.es.indices.refresh(index=self.index_name)
            
            logger.info(f"Successfully indexed {indexed_count - failed_count} games into {self.index_name}")
            if failed_count > 0:
                logger.warning(f"{failed_count} documents failed to index")
                
        except Exception as e:
            logger.error(f"Error indexing data: {e}")
            raise
    
    def search(self, query_text, filters=None, size=10, from_=0):
        """
        Perform search against Elasticsearch index
        
        Parameters:
        - query_text: Text to search for
        - filters: Dictionary of field:value pairs to filter results
        - size: Number of results to return
        - from_: Offset for pagination
        """
        print(f"Elasticsearch search called with: query='{query_text}', size={size}, from_={from_}")
        
        # Map user-friendly filter names to actual Elasticsearch field paths
        field_mapping = {
            'genres': ['genre', 'genre_l1', 'genre_l2'],  # Search all three genre fields
            'min_playing_now': 'playing', # Current players minimum (playing >= value)
            'min_supported_players': 'maxPlayers', # Min supported players (maxPlayers >= value)
            'max_supported_players': 'maxPlayers', # Max supported players (maxPlayers <= value)
            # Legacy support
            'min_playing': 'playing',
            'max_players_limit': 'maxPlayers',
            'creators': 'creator.name.keyword',
            'genre_l1': 'genre_l1',
            'genre_l2': 'genre_l2',
            'maxPlayers': 'maxPlayers',
            'max_players': 'maxPlayers',
        }
        
        query = {
            "query": {
                "function_score": {
                    "query": {
                        "bool": {
                            "must": [
                                {
                                    "multi_match": {
                                        "query": query_text,
                                        "fields": ["name^3", "description^2", "creator.name", "genre^1.5", "genre_l1^1.5", "genre_l2^1.5"],
                                        "type": "best_fields",
                                        "fuzziness": "AUTO"
                                    }
                                }
                            ],
                            "filter": []
                        }
                    },
                    "functions": [
                        {
                            "field_value_factor": {
                                "field": "playing",
                                "factor": 0.05,
                                "modifier": "log1p",
                                "missing": 1
                            },
                            "weight": 0.8
                        },
                    ],
                    "score_mode": "sum",
                    "boost_mode": "multiply"
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
            # Add track_total_hits to ensure we get accurate total count
            "track_total_hits": True
        }
            
        # Add filters if provided
        if filters:
            print(f"Applying filters: {filters}")
            for field, value in filters.items():
                
                # Handle combined genres filter
                if field == 'genres' and isinstance(value, list):
                    # Create OR query for genre, genre_l1 and genre_l2
                    genre_queries = []
                    for genre in value:
                        genre_queries.extend([
                            {"term": {"genre": genre}},
                            {"term": {"genre_l1": genre}},
                            {"term": {"genre_l2": genre}}
                        ])
                    
                    if genre_queries:
                        query["query"]["function_score"]["query"]["bool"]["filter"].append({
                            "bool": {"should": genre_queries, "minimum_should_match": 1}
                        })
                
                # Handle min_playing_now filter (current players)
                elif field == 'min_playing_now' and value:
                    try:
                        min_val = int(value)
                        query["query"]["function_score"]["query"]["bool"]["filter"].append({
                            "range": {"playing": {"gte": min_val}}
                        })
                    except ValueError:
                        logger.error(f"Invalid min_playing_now value: {value}")
                        continue
                
                # Handle min_supported_players filter (game's max player capacity)
                elif field == 'min_supported_players' and value:
                    try:
                        min_val = int(value)
                        query["query"]["function_score"]["query"]["bool"]["filter"].append({
                            "range": {"maxPlayers": {"gte": min_val}}
                        })
                    except ValueError:
                        logger.error(f"Invalid min_supported_players value: {value}")
                        continue

                # Handle max_supported_players filter (game's max player capacity)
                elif field == 'max_supported_players' and value:
                    try:
                        max_val = int(value)
                        query["query"]["function_score"]["query"]["bool"]["filter"].append({
                            "range": {"maxPlayers": {"lte": max_val}}
                        })
                    except ValueError:
                        logger.error(f"Invalid max_supported_players value: {value}")
                        continue
                
                # Handle legacy filters for backward compatibility
                elif field == 'min_playing' and value:
                    try:
                        min_val = int(value)
                        query["query"]["function_score"]["query"]["bool"]["filter"].append({
                            "range": {"playing": {"gte": min_val}}
                        })
                    except ValueError:
                        logger.error(f"Invalid min_playing value: {value}")
                        continue
                
                elif field == 'max_players_limit' and value:
                    try:
                        max_val = int(value)
                        query["query"]["function_score"]["query"]["bool"]["filter"].append({
                            "range": {"maxPlayers": {"lte": max_val}}
                        })
                    except ValueError:
                        logger.error(f"Invalid max_players_limit value: {value}")
                        continue
                
                # Handle other filters (legacy support)
                else:
                    es_field = field_mapping.get(field, field)
                    
                    if isinstance(value, list):
                        if isinstance(es_field, list):
                            # Multiple fields (like genres)
                            field_queries = []
                            for ef in es_field:
                                field_queries.append({"terms": {ef: value}})
                            query["query"]["function_score"]["query"]["bool"]["filter"].append({
                                "bool": {"should": field_queries, "minimum_should_match": 1}
                            })
                        else:
                            query["query"]["function_score"]["query"]["bool"]["filter"].append({"terms": {es_field: value}})
                    else:
                        query["query"]["function_score"]["query"]["bool"]["filter"].append({"term": {es_field: value}})

        try:
            print(f"Elasticsearch query: {json.dumps(query, indent=2)}")
            results = self.es.search(index=self.index_name, body=query)
            
            # Log the results
            total_hits = results.get("hits", {}).get("total", {}).get("value", 0)
            returned_hits = len(results.get("hits", {}).get("hits", []))
            print(f"Elasticsearch returned: {returned_hits} documents out of {total_hits} total matches")
            
            return results
        except Exception as e:
            logger.error(f"Search error: {e}")
            return {"error": str(e)}
            
    def get_aggregations(self):
        """Get aggregations for faceted search"""
        query = {
            "size": 0,
            "aggs": {
                "genre": {
                    "terms": {"field": "genre", "size": 20}
                },
                "genre_l1": {
                    "terms": {"field": "genre_l1", "size": 20}
                },
                "genre_l2": {
                    "terms": {"field": "genre_l2", "size": 20}
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

    def get_trending_games(self, size=10):
        """
        Get trending games sorted by current player count
        
        Parameters:
        - size: Number of trending games to return
        """
        query = {
            "query": {
                "match_all": {}  # Match all documents
            },
            "sort": [
                {"playing": {"order": "desc"}}  # Sort by player count, highest first
            ],
            "size": size
        }
        
        try:
            results = self.es.search(index=self.index_name, body=query)
            return results
        except Exception as e:
            logger.error(f"Error fetching trending games: {e}")
            return {"error": str(e)}

    def remove_duplicates(self):
        """Remove duplicate documents based on game ID"""
        try:
            # First, get all unique IDs and their document IDs
            query = {
                "size": 0,
                "aggs": {
                    "unique_games": {
                        "terms": {
                            "field": "id",
                            "size": 10000
                        },
                        "aggs": {
                            "docs": {
                                "top_hits": {
                                    "size": 10,
                                    "_source": False
                                }
                            }
                        }
                    }
                }
            }
            
            result = self.es.search(index=self.index_name, body=query)
            
            delete_actions = []
            kept_count = 0
            deleted_count = 0
            
            for bucket in result['aggregations']['unique_games']['buckets']:
                game_id = bucket['key']
                docs = bucket['docs']['hits']['hits']
                
                # Keep the first document, mark others for deletion
                if len(docs) > 1:
                    for doc in docs[1:]:  # Skip first doc
                        delete_actions.append({
                            "delete": {
                                "_index": self.index_name,
                                "_id": doc['_id']
                            }
                        })
                        deleted_count += 1
                
                kept_count += 1
            
            # Execute bulk delete
            if delete_actions:
                logger.info(f"Removing {deleted_count} duplicate documents...")
                
                # Process in batches
                batch_size = 1000
                for i in range(0, len(delete_actions), batch_size):
                    batch = delete_actions[i:i + batch_size]
                    self.es.bulk(body=batch)
                
                # Refresh index
                self.es.indices.refresh(index=self.index_name)
                
                logger.info(f"Deduplication complete: kept {kept_count} unique games, removed {deleted_count} duplicates")
                return True
            else:
                logger.info("No duplicates found in index")
                return True
                
        except Exception as e:
            logger.error(f"Error removing duplicates: {e}")
            return False

    def get_index_stats(self):
        """Get basic statistics about the index"""
        try:
            stats = self.es.indices.stats(index=self.index_name)
            doc_count = stats['indices'][self.index_name]['total']['docs']['count']
            
            # Get unique game count
            query = {
                "size": 0,
                "aggs": {
                    "unique_games": {
                        "cardinality": {
                            "field": "id"
                        }
                    }
                }
            }
            
            result = self.es.search(index=self.index_name, body=query)
            unique_count = result['aggregations']['unique_games']['value']
            
            return {
                "total_documents": doc_count,
                "unique_games": unique_count,
                "duplicates": doc_count - unique_count
            }
            
        except Exception as e:
            logger.error(f"Error getting index stats: {e}")
            return None

if __name__ == "__main__":
    # Test script
    es_manager = ElasticsearchManager()
    if es_manager.check_connection():
        es_manager.create_index()
        es_manager.index_data("../data/roblox_data.json")
        
        # Test search
        test_results = es_manager.search("gorilla")
        print(f"Found {test_results['hits']['total']['value']} matches")