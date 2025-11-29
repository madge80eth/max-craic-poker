import { NextRequest, NextResponse } from 'next/server';
import { getAllTransactions, getRevenueStats } from '@/lib/revenue-redis';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const limit = parseInt(searchParams.get('limit') || '1000');

    // Get transactions and stats
    const [transactions, stats] = await Promise.all([
      getAllTransactions(limit),
      getRevenueStats()
    ]);

    if (format === 'csv') {
      // Generate CSV
      const csvHeaders = 'Type,Amount (USD),Token,Wallet,Date,TX Hash,Metadata\n';
      const csvRows = transactions.map(tx => {
        const amount = (tx.amount / 100).toFixed(2);
        const date = new Date(tx.timestamp).toISOString();
        const metadata = tx.metadata ? JSON.stringify(tx.metadata).replace(/,/g, ';') : '';

        return `${tx.type},${amount},${tx.tokenSymbol || 'USDC'},${tx.walletAddress},${date},${tx.txHash || ''},${metadata}`;
      }).join('\n');

      const csv = csvHeaders + csvRows;

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="mcp-revenue-${Date.now()}.csv"`
        }
      });
    }

    // JSON format (default)
    const exportData = {
      exportedAt: new Date().toISOString(),
      summary: {
        totalVolume: (stats.totalVolume / 100).toFixed(2),
        platformCut: (stats.platformCut / 100).toFixed(2),
        totalTips: (stats.totalTips / 100).toFixed(2),
        totalMemberships: (stats.totalMemberships / 100).toFixed(2),
        totalRaffleDistributions: (stats.totalRaffleDistributions / 100).toFixed(2),
        transactionCount: stats.transactionCount,
        activeMemberships: stats.activeMemberships
      },
      transactions: transactions.map(tx => ({
        id: tx.id,
        type: tx.type,
        amountUSD: (tx.amount / 100).toFixed(2),
        token: tx.tokenSymbol || 'USDC',
        wallet: tx.walletAddress,
        date: new Date(tx.timestamp).toISOString(),
        txHash: tx.txHash || null,
        metadata: tx.metadata || null
      }))
    };

    if (searchParams.get('download') === 'true') {
      return new NextResponse(JSON.stringify(exportData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="mcp-revenue-${Date.now()}.json"`
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: exportData
    });

  } catch (error) {
    console.error('❌ Revenue export error:', error);
    return NextResponse.json(
      { error: 'Failed to export revenue data', details: String(error) },
      { status: 500 }
    );
  }
}
