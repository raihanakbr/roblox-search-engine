import json
import os

def merge_roblox_data():
    try:
        # Define file paths
        base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        data_dir = os.path.join(base_path, "data")
        existing_file = os.path.join(data_dir, "roblox_data.json")
        new_file = os.path.join(data_dir, "roblox_games_gg.json")
        # Create data directory if it doesn't exist
        if not os.path.exists(data_dir):
            os.makedirs(data_dir)
        
        # Load existing data
        existing_data = []
        if os.path.exists(existing_file):
            with open(existing_file, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
            print(f"Loaded {len(existing_data)} existing games")
        
        # Load new data
        with open(new_file, 'r', encoding='utf-8') as f:
            new_data = json.load(f)
        print(f"Loaded {len(new_data)} new games")
        
        # Create dictionary from existing data for fast lookup
        existing_dict = {}
        for game in existing_data:
            # Some entries only have favoritedCount, use id or favoritedCount as identifier
            game_id = str(game.get('id', f"fav_{game.get('favoritedCount', '')}"))
            existing_dict[game_id] = game
        
        # Merge/update with new data
        updated_count = 0
        added_count = 0
        
        for game in new_data:
            game_id = str(game.get('id', ''))
            if not game_id:
                continue
                
            if game_id in existing_dict:
                # Update existing entry
                existing_dict[game_id].update(game)
                updated_count += 1
            else:
                # Add new entry
                existing_dict[game_id] = game
                added_count += 1
        
        # Convert back to list
        merged_data = list(existing_dict.values())
        
        # Save merged data
        with open(existing_file, 'w', encoding='utf-8') as f:
            json.dump(merged_data, f, indent=2, ensure_ascii=False)
        
        print(f"Merge completed: {updated_count} games updated, {added_count} games added")
        print(f"Total games in merged file: {len(merged_data)}")
        exit_code = 0
    except:
        exit_code = 1

if __name__ == "__main__":
    exit_code = merge_roblox_data()
    exit(exit_code)