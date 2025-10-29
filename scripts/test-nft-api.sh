#!/bin/bash

# NFT API Test Script
# Tests all NFT-related endpoints

BASE_URL="${NEXT_PUBLIC_BASE_URL:-http://localhost:3000}"
ADMIN_KEY="${ADMIN_RESET_KEY:-h3j29fk18u}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=================================================="
echo "NFT API Test Suite"
echo "=================================================="
echo ""
echo "Base URL: $BASE_URL"
echo ""

# Get current month
CURRENT_MONTH=$(date +"%Y-%m")
PREVIOUS_MONTH=$(date -d "1 month ago" +"%Y-%m" 2>/dev/null || date -v-1m +"%Y-%m" 2>/dev/null)

echo "📅 Test months:"
echo "  Current: $CURRENT_MONTH"
echo "  Previous: $PREVIOUS_MONTH"
echo ""

# Test 1: Create snapshot for current month
echo "=================================================="
echo "Test 1: Create snapshot (current month)"
echo "=================================================="
response=$(curl -s -X POST "$BASE_URL/api/leaderboard/snapshot" \
  -H "Content-Type: application/json" \
  -d "{\"adminKey\":\"$ADMIN_KEY\",\"month\":\"$CURRENT_MONTH\"}")

if echo "$response" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ PASS${NC}: Snapshot created for $CURRENT_MONTH"
  echo "$response" | jq '.snapshot.topWallets' 2>/dev/null || echo "$response"
else
  echo -e "${RED}✗ FAIL${NC}: Could not create snapshot"
  echo "$response"
fi
echo ""

# Test 2: Create snapshot for previous month
echo "=================================================="
echo "Test 2: Create snapshot (previous month)"
echo "=================================================="
response=$(curl -s -X POST "$BASE_URL/api/leaderboard/snapshot" \
  -H "Content-Type: application/json" \
  -d "{\"adminKey\":\"$ADMIN_KEY\",\"month\":\"$PREVIOUS_MONTH\"}")

if echo "$response" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ PASS${NC}: Snapshot created for $PREVIOUS_MONTH"
  echo "$response" | jq '.snapshot.topWallets' 2>/dev/null || echo "$response"
else
  echo -e "${RED}✗ FAIL${NC}: Could not create snapshot"
  echo "$response"
fi
echo ""

# Test 3: Get all snapshots
echo "=================================================="
echo "Test 3: Get all snapshots"
echo "=================================================="
response=$(curl -s "$BASE_URL/api/leaderboard/snapshot")

if echo "$response" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ PASS${NC}: Retrieved all snapshots"
  echo "$response" | jq '.' 2>/dev/null || echo "$response"
else
  echo -e "${RED}✗ FAIL${NC}: Could not retrieve snapshots"
  echo "$response"
fi
echo ""

# Test 4: Get specific snapshot
echo "=================================================="
echo "Test 4: Get specific snapshot"
echo "=================================================="
response=$(curl -s "$BASE_URL/api/leaderboard/snapshot?month=$CURRENT_MONTH")

if echo "$response" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ PASS${NC}: Retrieved snapshot for $CURRENT_MONTH"
  # Extract first wallet for testing
  TEST_WALLET=$(echo "$response" | jq -r '.snapshot.topWallets[0].walletAddress' 2>/dev/null)
  echo "Test wallet: $TEST_WALLET"
else
  echo -e "${RED}✗ FAIL${NC}: Could not retrieve snapshot"
  echo "$response"
fi
echo ""

# Test 5: Check eligibility (if we have a test wallet)
if [ ! -z "$TEST_WALLET" ] && [ "$TEST_WALLET" != "null" ]; then
  echo "=================================================="
  echo "Test 5: Check NFT eligibility"
  echo "=================================================="
  echo "Wallet: $TEST_WALLET"
  response=$(curl -s "$BASE_URL/api/nft/eligibility?wallet=$TEST_WALLET")

  if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ PASS${NC}: Checked eligibility"
    echo "$response" | jq '.' 2>/dev/null || echo "$response"
  else
    echo -e "${RED}✗ FAIL${NC}: Could not check eligibility"
    echo "$response"
  fi
  echo ""

  # Test 6: Claim NFT
  echo "=================================================="
  echo "Test 6: Claim NFT"
  echo "=================================================="
  echo "Wallet: $TEST_WALLET"
  echo "Month: $CURRENT_MONTH"
  response=$(curl -s -X POST "$BASE_URL/api/nft/claim" \
    -H "Content-Type: application/json" \
    -d "{\"walletAddress\":\"$TEST_WALLET\",\"month\":\"$CURRENT_MONTH\"}")

  if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ PASS${NC}: NFT claimed successfully"
    echo "$response" | jq '.' 2>/dev/null || echo "$response"
  else
    echo -e "${YELLOW}⚠ INFO${NC}: Claim failed (might be already claimed or invalid)"
    echo "$response"
  fi
  echo ""

  # Test 7: Check claim status
  echo "=================================================="
  echo "Test 7: Check claim status"
  echo "=================================================="
  response=$(curl -s "$BASE_URL/api/nft/claim?wallet=$TEST_WALLET&month=$CURRENT_MONTH")

  if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ PASS${NC}: Retrieved claim status"
    echo "$response" | jq '.' 2>/dev/null || echo "$response"
  else
    echo -e "${RED}✗ FAIL${NC}: Could not get claim status"
    echo "$response"
  fi
  echo ""

  # Test 8: Get all claims for wallet
  echo "=================================================="
  echo "Test 8: Get all claims for wallet"
  echo "=================================================="
  response=$(curl -s "$BASE_URL/api/nft/claim?wallet=$TEST_WALLET")

  if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ PASS${NC}: Retrieved all claims"
    echo "$response" | jq '.' 2>/dev/null || echo "$response"
  else
    echo -e "${RED}✗ FAIL${NC}: Could not get claims"
    echo "$response"
  fi
  echo ""
else
  echo -e "${YELLOW}⚠ SKIP${NC}: Tests 5-8 skipped (no wallet found in snapshot)"
  echo ""
fi

# Summary
echo "=================================================="
echo "Test Summary"
echo "=================================================="
echo ""
echo "To test in the browser:"
echo "  1. Open: $BASE_URL/mini-app"
echo "  2. Connect wallet: $TEST_WALLET"
echo "  3. Go to Leaderboard tab"
echo "  4. Look for 'Claim Your NFT Rewards' section"
echo ""
echo "To manually test eligibility:"
echo "  curl \"$BASE_URL/api/nft/eligibility?wallet=YOUR_WALLET\""
echo ""
