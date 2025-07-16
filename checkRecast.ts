// checkRecast.ts
export async function checkIfRecasted(fid: number, castHash: string): Promise<boolean> {
  const res = await fetch(`https://api.neynar.com/v2/farcaster/cast/${castHash}/recasts`, {
    headers: {
      'accept': 'application/json',
      'api_key': '197E7DE9-52A8-4E79-82A9-B92521EAAF08'
    }
  });

  if (!res.ok) {
    console.error("Failed to fetch recasters from Neynar:", res.status);
    return false;
  }

  const data = await res.json();
  const recasterFids = data.recasters.map((r: any) => r.fid);
  return recasterFids.includes(fid);
}
