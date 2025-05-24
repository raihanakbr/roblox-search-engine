import argparse
import json
import os
import sys

from elasticsearch_utils import ElasticsearchManager


def index_elasticsearch(force_recreate=False, auto_confirm=False):
    try:
        # Get the host from environment variable or use elasticsearch service name
        es_host = os.environ.get("ELASTICSEARCH_HOST", "http://localhost:9200")
        print(f"Connecting to Elasticsearch at {es_host}")
        
        es = ElasticsearchManager(host=es_host)
        if not es.check_connection():
            print("Error: Could not connect to Elasticsearch")
            return 1
        
        # Check if index exists and get current stats
        if es.es.indices.exists(index=es.index_name):
            print(f"Index {es.index_name} already exists")
            old_stats = es.get_index_stats()
            if old_stats:
                print(f"Current stats: {old_stats['total_documents']} docs, {old_stats['unique_games']} unique games, {old_stats['duplicates']} duplicates")
            
            # Auto-confirm or ask user
            if auto_confirm or force_recreate:
                print("Auto-recreating index for dynamic search engine...")
                response = 'y'
            else:
                response = input("Do you want to recreate the index? This will delete all existing data. (y/N): ")
            
            if response.lower() != 'y':
                print("Indexing cancelled")
                return 0
            
            print("Recreating index...")
            es.recreate_index()
        else:
            print("Creating new index...")
            es.create_index()
        
        # Analyze source file before indexing
        data_file = '../data/roblox_data.json'
        if not os.path.exists(data_file):
            print(f"Data file not found: {data_file}")
            return 1
        
        print(f"Analyzing source file: {data_file}")
        source_stats = analyze_source_file(data_file)
        if source_stats:
            print(f"Source file: {source_stats['total']} records, {source_stats['unique']} unique games")
            if source_stats['duplicates'] > 0:
                print(f"⚠️  Source file contains {source_stats['duplicates']} duplicates - will be cleaned during indexing")
        
        print("Starting data indexing...")
        es.index_data(data_file)
        
        # Get final stats
        final_stats = es.get_index_stats()
        if final_stats:
            print(f"Indexing completed successfully!")
            print(f"Final stats: {final_stats['total_documents']} docs, {final_stats['unique_games']} unique games, {final_stats['duplicates']} duplicates")
            
            if final_stats['duplicates'] == 0:
                print("✅ No duplicates found - indexing was clean!")
            else:
                print(f"⚠️  {final_stats['duplicates']} duplicates detected in index")
        
        return 0
        
    except Exception as e:
        print(f"Error during indexing: {str(e)}")
        return 1

def analyze_source_file(data_file):
    """Analyze source JSON file for duplicates and statistics"""
    try:
        with open(data_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Check if data is a list or dict with an array inside
        if isinstance(data, dict) and any(isinstance(data.get(k), list) for k in data):
            for k in data:
                if isinstance(data[k], list):
                    data = data[k]
                    break
        
        # Check for duplicates by ID
        ids_seen = set()
        unique_games = 0
        duplicates = 0
        
        for game in data:
            game_id = str(game.get('id', ''))
            if game_id and game_id != '':
                if game_id in ids_seen:
                    duplicates += 1
                else:
                    ids_seen.add(game_id)
                    unique_games += 1
        
        return {
            'total': len(data),
            'unique': unique_games,
            'duplicates': duplicates
        }
        
    except Exception as e:
        print(f"Error analyzing source file: {e}")
        return None

def main():
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Index Roblox games data into Elasticsearch')
    parser.add_argument('--auto', action='store_true', 
                       help='Run automatically without user prompts (for dynamic search engine)')
    parser.add_argument('--force', action='store_true',
                       help='Force recreate index even if it exists')
    parser.add_argument('--analyze-only', action='store_true',
                       help='Only analyze source file without indexing')
    
    args = parser.parse_args()
    
    # Check if running in containerized environment (auto-detect)
    is_containerized = os.environ.get('ELASTICSEARCH_HOST', '').startswith('http://elasticsearch:')
    
    # If analyze-only mode
    if args.analyze_only:
        data_file = "../data/roblox_data.json"
        if not os.path.exists(data_file):
            print(f"Data file not found: {data_file}")
            return 1
        
        print(f"Analyzing source file: {data_file}")
        stats = analyze_source_file(data_file)
        if stats:
            print(f"Total records: {stats['total']}")
            print(f"Unique games: {stats['unique']}")
            print(f"Duplicates: {stats['duplicates']}")
        return 0
    
    # Auto-enable auto flag if in containerized environment (unless explicitly overridden)
    auto_confirm = args.auto or is_containerized
    if is_containerized and not args.auto:
        print("Detected containerized environment - enabling auto mode")
    
    # Run indexing
    return index_elasticsearch(force_recreate=args.force, auto_confirm=auto_confirm)

if __name__ == "__main__":
    sys.exit(main())