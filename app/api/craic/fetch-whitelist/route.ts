import { NextResponse } from 'next/server';
import { createPublicClient, http, Address, parseAbi } from 'viem';
import { base, baseSepolia } from 'viem/chains';

const isTestnet = process.env.NEXT_PUBLIC_TESTNET === 'true';
const chain = isTestnet ? baseSepolia : base;
const rpcUrl = isTestnet ? 'https://sepolia.base.org' : 'https://mainnet.base.org';
const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mode } = body;

    if (mode === 'url') {
      const { url, key } = body as { url?: string; key?: string };
      if (!url) return NextResponse.json({ error: 'Missing URL' }, { status: 400 });

      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) return NextResponse.json({ error: `Fetch failed: ${res.status}` }, { status: 502 });
      const data = await res.json();

      let node: unknown = data;
      if (key) {
        for (const part of key.split('.')) {
          if (node && typeof node === 'object') node = (node as Record<string, unknown>)[part];
          else { node = undefined; break; }
        }
      }

      if (!Array.isArray(node)) {
        return NextResponse.json({ error: 'Key does not resolve to an array' }, { status: 400 });
      }

      const addresses = node.filter((a): a is string => typeof a === 'string' && ADDRESS_RE.test(a));
      return NextResponse.json({ addresses });
    }

    if (mode === 'contract') {
      const { contractAddress, methodName, topX = 100 } = body as {
        contractAddress?: string; methodName?: string; topX?: number;
      };
      if (!contractAddress || !methodName) {
        return NextResponse.json({ error: 'Missing contract address or method name' }, { status: 400 });
      }
      if (!ADDRESS_RE.test(contractAddress)) {
        return NextResponse.json({ error: 'Invalid contract address' }, { status: 400 });
      }

      const abi = parseAbi([`function ${methodName}() view returns (address[])`]);
      const result = await publicClient.readContract({
        address: contractAddress as Address,
        abi,
        functionName: methodName,
      });

      const addresses = (result as Address[]).slice(0, Math.min(topX, 100));
      return NextResponse.json({ addresses });
    }

    return NextResponse.json({ error: 'Invalid mode — use "url" or "contract"' }, { status: 400 });
  } catch (error) {
    console.error('Error fetching whitelist:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch whitelist' },
      { status: 500 }
    );
  }
}
