#!/usr/bin/env python3
"""
Elasticsearch Index Management Utility
"""
import argparse

from elasticsearch_utils import ElasticsearchManager


def main():
    parser = argparse.ArgumentParser(description="Manage Elasticsearch Roblox Games Index")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--delete', action='store_true', help='Delete the index')
    group.add_argument('--recreate', action='store_true', help='Delete and recreate the index')
    parser.add_argument('--data', help='Data file path for reindexing (with --recreate)')
    
    args = parser.parse_args()
    
    # Initialize Elasticsearch manager
    es_manager = ElasticsearchManager()
    if not es_manager.check_connection():
        print("Error: Cannot connect to Elasticsearch")
        return 1
        
    if args.delete:
        print("Warning: This will delete the Roblox games index.")
        confirmation = input("Type 'yes' to confirm: ")
        if confirmation.lower() == 'yes':
            if es_manager.delete_index(confirm=True):
                print(f"Index {es_manager.index_name} deleted successfully")
                return 0
            else:
                print("Failed to delete index")
                return 1
        else:
            print("Operation canceled")
            return 0
            
    elif args.recreate:
        print("Warning: This will delete and recreate the Roblox games index.")
        if args.data:
            print(f"Data will be loaded from: {args.data}")
        confirmation = input("Type 'yes' to confirm: ")
        if confirmation.lower() == 'yes':
            if es_manager.recreate_index(data_file=args.data):
                print(f"Index {es_manager.index_name} recreated successfully")
                return 0
            else:
                print("Failed to recreate index")
                return 1
        else:
            print("Operation canceled")
            return 0
    
    return 0

if __name__ == "__main__":
    exit(main())
