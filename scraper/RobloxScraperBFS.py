import json
import time
from collections import deque
from datetime import datetime

import requests

# Konfigurasi
INITIAL_GAME_ID = '7018190066'
TARGET_GAME_COUNT = 10000
DELAY_SECONDS = 0.1
OUTPUT_FILE = './data/roblox_games_gg.json'

# Menyimpan data
collected_games = {}  # Game ID -> game data
visited_for_recommendations = set()  # Game IDs yang sudah diambil rekomendasinya
game_queue = deque()  # Queue untuk BFS

# Fungsi untuk mengambil informasi batch game 
def fetch_games_details(game_ids):
    if not game_ids:
        return {}
        
    try:
        # Menggabungkan ID game untuk permintaan batch
        ids_param = ",".join(game_ids)
        url = f"https://games.roblox.com/v1/games?universeIds={ids_param}"
        
        headers = {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        results = {}
        data = response.json()
        if data.get('data'):
            print(data['data'])
            for game in data['data']:
                if 'id' in game:
                    results[str(game['id'])] = game
        return results
    except Exception as e:
        print(f"Error fetching details for games: {str(e)}")
        return {}

# Fungsi untuk mengambil thumbnail game
def fetch_games_thumbnails(game_ids):
    if not game_ids:
        return {}
    
    try:
        # Menggabungkan ID game untuk permintaan batch
        ids_param = ",".join(game_ids)
        url = f"https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds={ids_param}&format=png&size=768x432"
        
        headers = {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        results = {}
        data = response.json()
        
        if data.get('data'):
            for item in data['data']:
                universe_id = str(item['universeId'])
                if item.get('thumbnails') and len(item['thumbnails']) > 0 and item['thumbnails'][0].get('imageUrl'):
                    results[universe_id] = item['thumbnails'][0]['imageUrl']
        
        return results
    except Exception as e:
        print(f"Error fetching thumbnails for games: {str(e)}")
        return {}

# Fungsi untuk mengambil rekomendasi batch
def fetch_and_process_recommendations():
    """Mengambil rekomendasi untuk game pertama dalam queue dan memproses hasilnya"""
    if not game_queue:
        return []
        
    current_game_id = game_queue.popleft()
    
    # Skip jika sudah diproses
    if current_game_id in visited_for_recommendations:
        return []
        
    visited_for_recommendations.add(current_game_id)
    print(f"Memproses game {current_game_id} ({len(collected_games)}/{TARGET_GAME_COUNT})")
    
    try:
        url = f"https://games.roblox.com/v1/games/recommendations/game/{current_game_id}"
        headers = {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        data = response.json()
        recommended_games = data.get('games', [])
        
        # Ekstrak ID dari semua game yang direkomendasikan
        new_game_ids = []
        for game in recommended_games:
            game_id = str(game['universeId'])
            if game_id not in collected_games:
                new_game_ids.append(game_id)
            
            # Tambahkan ke queue BFS jika belum dikunjungi
            if game_id not in visited_for_recommendations:
                game_queue.append(game_id)
        
        return new_game_ids
    except Exception as e:
        print(f"Error fetching recommendations for game {current_game_id}: {str(e)}")
        return []

# Fungsi utama untuk scraping
def main():
    try:
        print('Memulai Roblox game scraper (versi dioptimalkan)...')
        print(f"Target: {TARGET_GAME_COUNT} game dimulai dari ID {INITIAL_GAME_ID}")
        
        start_time = datetime.now()
        
        # Mulai dengan game awal
        game_queue.append(INITIAL_GAME_ID)
        collected_games[INITIAL_GAME_ID] = None  # Tandai untuk diambil detailnya nanti
        
        batch_size = 32  # Ukuran batch untuk mengambil detail game
        pending_details = [INITIAL_GAME_ID]  # IDs yang perlu diambil detailnya
        
        while game_queue and len(collected_games) < TARGET_GAME_COUNT:
            # Ambil rekomendasi dari game berikutnya dalam queue
            new_game_ids = fetch_and_process_recommendations()
            
            # Tambahkan game baru ke daftar yang perlu diambil detailnya
            for game_id in new_game_ids:
                if game_id not in collected_games and len(collected_games) < TARGET_GAME_COUNT:
                    collected_games[game_id] = None  # Placeholder sampai kita mendapatkan detailnya
                    pending_details.append(game_id)
            
            # Jika ada cukup game untuk batch atau sudah mencapai target,
            # ambil detail dari batch game
            if len(pending_details) >= batch_size or (len(collected_games) >= TARGET_GAME_COUNT and pending_details):
                batch_ids = pending_details[:batch_size]
                pending_details = pending_details[batch_size:]
                
                print(f"Mengambil detail untuk {len(batch_ids)} game...")
                game_details = fetch_games_details(batch_ids)
                
                # Fetch thumbnails for the same batch
                print(f"Mengambil thumbnail untuk {len(batch_ids)} game...")
                game_thumbnails = fetch_games_thumbnails(batch_ids)
                
                # Update koleksi dengan detail
                for game_id, details in game_details.items():
                    if game_id in collected_games:
                        # Add universe ID to the details
                        if details:
                            details['universeId'] = game_id
                            # Add image URL if available
                            if game_id in game_thumbnails:
                                details['imageUrl'] = game_thumbnails[game_id]
                        collected_games[game_id] = details
                        print(f"Menambahkan game: {details.get('name', 'Unknown')}")
                
                # Delay untuk menghindari rate limiting
                time.sleep(DELAY_SECONDS)
            
            print(f"Queue: {len(game_queue)}, Terkumpul: {len(collected_games)}/{TARGET_GAME_COUNT}, Pending details: {len(pending_details)}")
        
        # Ambil detail untuk semua game yang tersisa
        while pending_details:
            batch_ids = pending_details[:batch_size]
            pending_details = pending_details[batch_size:]
            
            print(f"Mengambil detail final untuk {len(batch_ids)} game...")
            game_details = fetch_games_details(batch_ids)
            
            # Fetch thumbnails for the final batch
            print(f"Mengambil thumbnail final untuk {len(batch_ids)} game...")
            game_thumbnails = fetch_games_thumbnails(batch_ids)
            
            for game_id, details in game_details.items():
                if game_id in collected_games:
                    # Add universe ID to the details
                    if details:
                        details['universeId'] = game_id
                        # Add image URL if available
                        if game_id in game_thumbnails:
                            details['imageUrl'] = game_thumbnails[game_id]
                    collected_games[game_id] = details
                    print(f"Menambahkan game: {details.get('name', 'Unknown')}")
            
            time.sleep(DELAY_SECONDS)
        
        # Hitung durasi
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        # Filter out games with no details
        valid_games = {id: details for id, details in collected_games.items() if details is not None}
        games_list = list(valid_games.values())
        
        print(f"\nPengumpulan selesai! {len(games_list)} game valid terkumpul dari {len(collected_games)} ID.")
        print(f"Waktu yang dibutuhkan: {duration:.2f} detik")
        
        # Simpan ke file
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(games_list, f, indent=2, ensure_ascii=False)
        
        print(f'Hasil disimpan ke {OUTPUT_FILE}')
        
        # Statistik dasar
        if games_list:
            total_plays = sum(game.get('visits', 0) for game in games_list)
            avg_plays = round(total_plays / len(games_list))
            print(f"Rata-rata kunjungan per game: {avg_plays:,}")
            return 0  # Success
    except Exception as e:
        print(f"Error in scraper: {str(e)}")
        return 1  # Failure
if __name__ == "__main__":
    exit_code = main()
    exit(exit_code)