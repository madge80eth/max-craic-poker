import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    // For now, return a simple transaction that doesn't do anything onchain
    // but allows us to get the user's wallet address
    return NextResponse.json({
      chainId: "eip155:8453", // Base mainnet
      method: "eth_sendTransaction",
      params: {
        abi: [],
        to: "0x0000000000000000000000000000000000000000",
        data: "0x",
        value: "0"
      }
    })
  } catch (error) {
    console.error("Error in /api/tx:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}