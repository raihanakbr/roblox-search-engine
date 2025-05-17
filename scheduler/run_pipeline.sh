#!/bin/bash
set -e  # Exit immediately if a command exits with non-zero status

# Add a test message to verify cron is executing the script
echo "=======================================" >> /var/log/cron.log
echo "CRON JOB STARTED at $(date)" >> /var/log/cron.log
echo "=======================================" >> /var/log/cron.log

# Log start time
echo "Starting Roblox data pipeline - $(date)"

# Step 1: Run the scraper and wait for completion
echo "Step 1: Running BFS scraper"
cd /app
/usr/local/bin/python -m scraper.RobloxScraperBFS
if [ $? -ne 0 ]; then
    echo "Error: Scraper failed"
    exit 1
fi
echo "Scraper completed successfully"

# Step 2: Merge games
echo "Step 2: Merging game data"
cd /app
/usr/local/bin/python -m backend.merge_games
if [ $? -ne 0 ]; then
    echo "Error: Merge failed"
    exit 1
fi
echo "Merge completed successfully"

# Step 3: Index in Elasticsearch
echo "Step 3: Indexing data in Elasticsearch"
cd /app/backend
/usr/local/bin/python index_data.py
if [ $? -ne 0 ]; then
    echo "Error: Indexing failed"
    exit 1
fi
echo "Indexing completed successfully"

# Log completion
echo "Pipeline completed successfully - $(date)"