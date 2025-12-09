const validRanks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
const validSuits = ['s', 'h', 'd', 'c'];

function isValidCardFormat(cards) {
  const parts = cards.trim().split(' ');
  console.log('Parts:', parts, 'Length:', parts.length);
  if (parts.length !== 2) return false;

  for (const card of parts) {
    console.log('Checking card:', JSON.stringify(card), 'Length:', card.length);
    if (card.length !== 2) return false;
    const rank = card[0];
    const suit = card[1];
    console.log('Rank:', rank, 'Suit:', suit);
    console.log('Valid rank?', validRanks.includes(rank), 'Valid suit?', validSuits.includes(suit));
    if (!validRanks.includes(rank) || !validSuits.includes(suit)) return false;
  }

  return true;
}

console.log('\n=== Test 1: Ac Ad ===');
console.log('Result:', isValidCardFormat('Ac Ad'));

console.log('\n=== Test 2: 2c 7s ===');
console.log('Result:', isValidCardFormat('2c 7s'));
