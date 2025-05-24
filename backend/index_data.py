from elasticsearch_utils import ElasticsearchManager
import os
import sys

def index_elasticsearch():
    try:
        # Get the host from environment variable or use elasticsearch service name
        es_host = os.environ.get("ELASTICSEARCH_HOST", "http://elasticsearch:9200")
        print(f"Connecting to Elasticsearch at {es_host}")
        
        es = ElasticsearchManager(host=es_host)
        if not es.check_connection():
            print("Error: Could not connect to Elasticsearch")
            return 1
            
        es.create_index()
        es.index_data('../data/roblox_data.json')
        print("Successfully indexed data in Elasticsearch")
        return 0
    except Exception as e:
        print(f"Error during indexing: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(index_elasticsearch())