import { NextResponse } from 'next/server';
import { createPublicClient, http, Address, parseAbi } from 'viem';
import { base, baseSepolia } from 'viem/chains';

const isTestnet = process.env.NEXT_PUBLIC_TESTNET === 'true';
const chain = isTestnet ? baseSepolia : base;
const rpcUrl = isTestnet ? 'https://sepolia.base.org' : 'https://mainnet.base.org';

const ERC20_META_ABI = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
]);

const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const addr = searchParams.get('address');

  if (!addr || !/^0x[0-9a-fA-F]{40}$/.test(addr)) {
    return NextResponse.json({ error: 'Invalid token address' }, { status: 400 });
  }

  if (addr === '0x0000000000000000000000000000000000000000') {
    return NextResponse.json({ name: 'Ether', symbol: 'ETH', decimals: 18 });
  }

  try {
    const [name, symbol, decimals] = await Promise.all([
      publicClient.readContract({ address: addr as Address, abi: ERC20_META_ABI, functionName: 'name' }),
      publicClient.readContract({ address: addr as Address, abi: ERC20_META_ABI, functionName: 'symbol' }),
      publicClient.readContract({ address: addr as Address, abi: ERC20_META_ABI, functionName: 'decimals' }),
    ]);
    return NextResponse.json({ name, symbol, decimals });
  } catch {
    return NextResponse.json({ error: 'Token not found or not ERC-20' }, { status: 404 });
  }
}
