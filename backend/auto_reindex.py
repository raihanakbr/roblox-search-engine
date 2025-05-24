#!/usr/bin/env python3
"""
Auto-reindexing script for dynamic search engine
Automatically recreates Elasticsearch index with fresh data
"""

import logging
import os
import sys
import time
from datetime import datetime

from elasticsearch_utils import ElasticsearchManager

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('reindex.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

def auto_reindex():
    """Automatically reindex Elasticsearch for dynamic search engine"""
    try:
        start_time = datetime.now()
        logger.info("=== Starting automatic reindexing ===")
        
        # Connect to Elasticsearch
        es_host = os.environ.get("ELASTICSEARCH_HOST", "http://localhost:9200")
        logger.info(f"Connecting to Elasticsearch at {es_host}")
        
        es = ElasticsearchManager(host=es_host)
        if not es.check_connection():
            logger.error("Failed to connect to Elasticsearch")
            return 1
        
        # Get current stats before reindexing
        old_stats = None
        if es.es.indices.exists(index=es.index_name):
            old_stats = es.get_index_stats()
            logger.info(f"Current index stats: {old_stats['total_documents']} docs, {old_stats['unique_games']} unique games")
        
        # Check data file
        data_file = '../data/roblox_data.json'
        if not os.path.exists(data_file):
            logger.error(f"Data file not found: {data_file}")
            return 1
        
        file_size = os.path.getsize(data_file) / (1024 * 1024)  # MB
        logger.info(f"Data file size: {file_size:.2f} MB")
        
        # Recreate index automatically
        logger.info("Recreating index...")
        success = es.recreate_index(data_file=data_file)
        
        if not success:
            logger.error("Failed to recreate index")
            return 1
        
        # Get final stats
        final_stats = es.get_index_stats()
        if final_stats:
            logger.info(f"Reindexing completed successfully!")
            logger.info(f"Final stats: {final_stats['total_documents']} docs, {final_stats['unique_games']} unique games")
            
            # Compare with old stats
            if old_stats:
                doc_diff = final_stats['total_documents'] - old_stats['total_documents']
                unique_diff = final_stats['unique_games'] - old_stats['unique_games']
                logger.info(f"Changes: {doc_diff:+d} documents, {unique_diff:+d} unique games")
            
            if final_stats['duplicates'] == 0:
                logger.info("✅ No duplicates found - indexing was clean!")
            else:
                logger.warning(f"⚠️  {final_stats['duplicates']} duplicates detected")
        
        end_time = datetime.now()
        duration = end_time - start_time
        logger.info(f"Reindexing completed in {duration.total_seconds():.2f} seconds")
        logger.info("=== Automatic reindexing finished ===")
        
        return 0
        
    except Exception as e:
        logger.error(f"Error during automatic reindexing: {str(e)}")
        return 1

def check_and_reindex_if_needed():
    """Check if reindexing is needed based on data file modification time"""
    try:
        data_file = '../data/roblox_data.json'
        if not os.path.exists(data_file):
            logger.error(f"Data file not found: {data_file}")
            return 1
        
        # Check file modification time
        file_mtime = os.path.getmtime(data_file)
        file_time = datetime.fromtimestamp(file_mtime)
        
        # Check if we have a record of last indexing
        last_index_file = '.last_index_time'
        if os.path.exists(last_index_file):
            with open(last_index_file, 'r') as f:
                last_index_time = datetime.fromisoformat(f.read().strip())
            
            if file_time <= last_index_time:
                logger.info("Data file hasn't changed since last indexing - skipping")
                return 0
        
        logger.info(f"Data file modified at {file_time} - reindexing needed")
        
        # Perform reindexing
        result = auto_reindex()
        
        # Record successful indexing time
        if result == 0:
            with open(last_index_file, 'w') as f:
                f.write(datetime.now().isoformat())
        
        return result
        
    except Exception as e:
        logger.error(f"Error checking reindex necessity: {str(e)}")
        return 1

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--check":
        # Check if reindexing is needed based on file modification
        sys.exit(check_and_reindex_if_needed())
    else:
        # Force reindexing
        sys.exit(auto_reindex())
