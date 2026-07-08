// Production GateDeps: real Base RPC + Basescan lookups.
// Requires an archive-capable RPC (see GAME-CREATION-SPEC §4 honest-limit note).

import { createPublicClient, http, parseAbi } from 'viem';
import { base } from 'viem/chains';
import { Address } from './types';
import { GateDeps } from './gates';

const ERC20_ABI = parseAbi(['function balanceOf(address account) view returns (uint256)']);
const ERC721_ABI = parseAbi(['function balanceOf(address owner) view returns (uint256)']);

const RPC_URL = process.env.BASE_ARCHIVE_RPC_URL || process.env.BASE_RPC_URL || 'https://mainnet.base.org';

const publicClient = createPublicClient({ chain: base, transport: http(RPC_URL) });

async function basescanFirstTxTimestamp(wallet: Address): Promise<number | null> {
  const apiKey = process.env.BASESCAN_API_KEY;
  const url =
    `https://api.basescan.org/api?module=account&action=txlist&address=${wallet}` +
    `&startblock=0&endblock=99999999&page=1&offset=1&sort=asc` +
    (apiKey ? `&apikey=${apiKey}` : '');
  const res = await fetch(url);
  const data = await res.json();
  const first = data?.result?.[0];
  if (!first?.timeStamp) return null;
  return Number(first.timeStamp);
}

/** Binary search over block timestamps to find the last block at or before `timestamp`. */
async function findBlockAtOrBefore(timestamp: number): Promise<number> {
  const latest = await publicClient.getBlock({ blockTag: 'latest' });
  let lo = BigInt(0);
  let hi = latest.number;
  if (Number(latest.timestamp) <= timestamp) return Number(latest.number);

  while (lo < hi) {
    const mid = (lo + hi + BigInt(1)) / BigInt(2);
    const block = await publicClient.getBlock({ blockNumber: mid });
    if (Number(block.timestamp) <= timestamp) {
      lo = mid;
    } else {
      hi = mid - BigInt(1);
    }
  }
  return Number(lo);
}

export const defaultGateDeps: GateDeps = {
  now: () => Date.now(),

  async getBlockNumber() {
    return Number(await publicClient.getBlockNumber());
  },

  async getBlockTimestamp(blockNumber: number) {
    const block = await publicClient.getBlock({ blockNumber: BigInt(blockNumber) });
    return Number(block.timestamp);
  },

  findBlockAtOrBefore,

  async getErc20Balance(token, wallet, blockNumber) {
    return publicClient.readContract({
      address: token,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [wallet],
      blockNumber: blockNumber !== undefined ? BigInt(blockNumber) : undefined,
    });
  },

  async getErc721Balance(collection, wallet, blockNumber) {
    return publicClient.readContract({
      address: collection,
      abi: ERC721_ABI,
      functionName: 'balanceOf',
      args: [wallet],
      blockNumber: blockNumber !== undefined ? BigInt(blockNumber) : undefined,
    });
  },

  getFirstTxTimestamp: basescanFirstTxTimestamp,
};
