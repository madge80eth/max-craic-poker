#!/bin/bash

# Create Leaderboard Snapshot Script
# This script creates a snapshot of the current leaderboard for NFT claims

ADMIN_KEY="${ADMIN_RESET_KEY:-h3j29fk18u}"
BASE_URL="${NEXT_PUBLIC_BASE_URL:-http://localhost:3000}"

# Get current month in YYYY-MM format
CURRENT_MONTH=$(date +"%Y-%m")

# Get previous month
PREVIOUS_MONTH=$(date -d "1 month ago" +"%Y-%m" 2>/dev/null || date -v-1m +"%Y-%m" 2>/dev/null)

echo "=================================================="
echo "Creating Leaderboard Snapshots"
echo "=================================================="
echo ""
echo "Base URL: $BASE_URL"
echo "Current Month: $CURRENT_MONTH"
echo "Previous Month: $PREVIOUS_MONTH"
echo ""

# Function to create snapshot
create_snapshot() {
  local month=$1
  echo "Creating snapshot for $month..."

  response=$(curl -s -X POST "$BASE_URL/api/leaderboard/snapshot" \
    -H "Content-Type: application/json" \
    -d "{\"adminKey\":\"$ADMIN_KEY\",\"month\":\"$month\"}")

  echo "$response" | jq '.' 2>/dev/null || echo "$response"
  echo ""
}

# Create snapshots
echo "📸 Creating current month snapshot..."
create_snapshot "$CURRENT_MONTH"

echo "📸 Creating previous month snapshot..."
create_snapshot "$PREVIOUS_MONTH"

echo "=================================================="
echo "✅ Snapshots created!"
echo "=================================================="
echo ""
echo "To check eligibility for a wallet, run:"
echo "curl \"$BASE_URL/api/nft/eligibility?wallet=YOUR_WALLET_ADDRESS\""
