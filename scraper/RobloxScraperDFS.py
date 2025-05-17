import requests
import json
import time
from datetime import datetime

# Konfigurasi
INITIAL_GAME_ID = '7018190066'
TARGET_GAME_COUNT = 100
DELAY_SECONDS = 0.1  # Delay antara API calls untuk menghindari rate limiting

# Untuk melacak progress
collected_games = {}
visited_game_ids = set()
game_stack = []

# Fungsi untuk mengambil rekomendasi game
def fetch_game_recommendations(game_id):
    try:
        url = f"https://games.roblox.com/v1/games/recommendations/game/{game_id}"
        headers = {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(url, headers=headers)
        response.raise_for_status()  # Raise exception for HTTP errors
        
        data = response.json()
        return data.get('games', [])
    except Exception as e:
        print(f"Error fetching recommendations for game {game_id}: {str(e)}")
        return []

# Fungsi untuk mengambil detail game
def fetch_game_details(game_id):
    try:
        url = f"https://games.roblox.com/v1/games?universeIds={game_id}"
        headers = {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        data = response.json()
        if data.get('data') and len(data['data']) > 0:
            return data['data'][0]
        return None
    except Exception as e:
        print(f"Error fetching details for game {game_id}: {str(e)}")
        return None

# Fungsi DFS untuk mengumpulkan game
def collect_games_with_dfs():
    # Mulai dengan game awal
    game_stack.append(INITIAL_GAME_ID)
    
    while game_stack and len(collected_games) < TARGET_GAME_COUNT:
        current_game_id = game_stack.pop()  # Ambil dari akhir stack untuk DFS
        
        if current_game_id in visited_game_ids:
            continue  # Skip jika sudah diproses
        
        visited_game_ids.add(current_game_id)
        print(f"Memproses game {current_game_id} ({len(collected_games)}/{TARGET_GAME_COUNT})")
        
        # Ambil detail game jika belum terkumpul
        if current_game_id not in collected_games:
            game_details = fetch_game_details(current_game_id)
            if game_details:
                collected_games[current_game_id] = game_details
                print(f"Menambahkan game: {game_details['name']}")
        
        # Berhenti jika sudah mencapai target
        if len(collected_games) >= TARGET_GAME_COUNT:
            break
        
        # Ambil rekomendasi untuk game ini
        recommendations = fetch_game_recommendations(current_game_id)
        time.sleep(DELAY_SECONDS)  # Tambahkan delay untuk menghindari rate limiting
        
        # Tambahkan rekomendasi ke stack (dalam urutan terbalik untuk mempertahankan urutan DFS)
        for rec_game in reversed(recommendations):
            game_stack.append(str(rec_game['universeId']))
        
        # Tampilkan progress
        print(f"Ukuran stack: {len(game_stack)}, Terkumpul: {len(collected_games)}/{TARGET_GAME_COUNT}")

# Fungsi utama
def main():
    print('Memulai Roblox game scraper...')
    print(f"Target: {TARGET_GAME_COUNT} game dimulai dari ID {INITIAL_GAME_ID}")
    
    start_time = datetime.now()
    collect_games_with_dfs()
    end_time = datetime.now()
    
    duration = (end_time - start_time).total_seconds()
    print(f"\nPengumpulan selesai! {len(collected_games)} game terkumpul.")
    print(f"Waktu yang dibutuhkan: {duration:.2f} detik")
    
    # Konversi dict values menjadi list untuk serialisasi JSON
    games_list = list(collected_games.values())
    
    # Simpan ke file
    with open('roblox_games.json', 'w', encoding='utf-8') as f:
        json.dump(games_list, f, indent=2, ensure_ascii=False)
    
    print('Hasil disimpan ke roblox_games.json')
    
    # Beberapa statistik dasar
    total_plays = sum(game.get('visits', 0) for game in games_list)
    avg_plays = round(total_plays / len(games_list)) if games_list else 0
    print(f"Rata-rata jumlah kunjungan per game: {avg_plays:,}")

# Jalankan program
if __name__ == "__main__":
    main()