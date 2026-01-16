'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { TableInfo } from '@/lib/poker/types';
import { Users, Zap, Trophy, ChevronRight, Plus, Loader2 } from 'lucide-react';

export default function PokerLobby() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);

  // Fetch tables
  useEffect(() => {
    const fetchTables = async () => {
      try {
        const res = await fetch('/api/poker/tables');
        const data = await res.json();
        if (data.success) {
          setTables(data.tables);
        }
      } catch (error) {
        console.error('Failed to fetch tables:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTables();
    const interval = setInterval(fetchTables, 5000);
    return () => clearInterval(interval);
  }, []);

  // Set default player name from address
  useEffect(() => {
    if (address && !playerName) {
      setPlayerName(`Player_${address.slice(2, 6)}`);
    }
  }, [address, playerName]);

  const handleCreateTable = async () => {
    if (!address || !playerName) return;

    setCreating(true);
    try {
      const res = await fetch('/api/poker/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: address,
          creatorName: playerName,
          tableName: `${playerName}'s Table`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        router.push(`/poker/${data.tableId}?playerId=${address}&playerName=${encodeURIComponent(playerName)}`);
      } else {
        alert(data.error || 'Failed to create table');
      }
    } catch (error) {
      console.error('Failed to create table:', error);
      alert('Failed to create table');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinTable = (tableId: string) => {
    if (!address || !playerName) {
      alert('Please connect wallet first');
      return;
    }
    router.push(`/poker/${tableId}?playerId=${address}&playerName=${encodeURIComponent(playerName)}`);
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 via-transparent to-purple-600/20" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtNi42MjcgMC0xMiA1LjM3My0xMiAxMnM1LjM3MyAxMiAxMiAxMiAxMi01LjM3MyAxMi0xMi01LjM3My0xMi0xMi0xMnptMCAyMGMtNC40MTggMC04LTMuNTgyLTgtOHMzLjU4Mi04IDgtOCA4IDMuNTgyIDggOC0zLjU4MiA4LTggOHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjAyIi8+PC9nPjwvc3ZnPg==')] opacity-30" />

        <div className="relative px-4 pt-8 pb-6">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <span className="text-2xl">♠</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">MCP Poker</h1>
              <p className="text-emerald-400 text-xs font-medium">6-MAX NO-LIMIT HOLD&apos;EM</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 pb-8">
        {!isConnected ? (
          /* Connect Wallet Prompt */
          <div className="mt-8 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-800/50 flex items-center justify-center">
              <span className="text-4xl opacity-50">♠</span>
            </div>
            <h2 className="text-xl font-semibold mb-2">Connect to Play</h2>
            <p className="text-gray-400 text-sm mb-6">Connect your wallet to join tables</p>
          </div>
        ) : (
          <>
            {/* Player Name Section */}
            {showNameInput ? (
              <div className="mb-6 p-4 bg-gray-800/50 rounded-2xl border border-gray-700/50">
                <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Display Name</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Your name"
                    className="flex-1 bg-gray-900/50 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 border border-gray-700/50"
                    maxLength={15}
                  />
                  <button
                    onClick={() => setShowNameInput(false)}
                    className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-medium transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNameInput(true)}
                className="mb-6 w-full flex items-center justify-between p-4 bg-gray-800/30 rounded-2xl border border-gray-700/30 hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold">
                    {playerName.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium">{playerName}</div>
                    <div className="text-xs text-gray-500">Tap to change name</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500" />
              </button>
            )}

            {/* Quick Play Button */}
            <button
              onClick={handleCreateTable}
              disabled={creating || !playerName}
              className="w-full mb-6 p-5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:from-gray-700 disabled:to-gray-600 rounded-2xl font-semibold text-lg shadow-lg shadow-emerald-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
            >
              {creating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Create Table
                </>
              )}
            </button>

            {/* Game Info Cards */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="p-3 bg-gray-800/30 rounded-xl border border-gray-700/30 text-center">
                <Users className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
                <div className="text-xs text-gray-400">Players</div>
                <div className="text-sm font-semibold">6 Max</div>
              </div>
              <div className="p-3 bg-gray-800/30 rounded-xl border border-gray-700/30 text-center">
                <Zap className="w-5 h-5 mx-auto mb-1 text-yellow-400" />
                <div className="text-xs text-gray-400">Starting</div>
                <div className="text-sm font-semibold">1,500</div>
              </div>
              <div className="p-3 bg-gray-800/30 rounded-xl border border-gray-700/30 text-center">
                <Trophy className="w-5 h-5 mx-auto mb-1 text-purple-400" />
                <div className="text-xs text-gray-400">Payout</div>
                <div className="text-sm font-semibold">65/35</div>
              </div>
            </div>

            {/* Available Tables */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Available Tables</h2>
                <span className="text-xs text-gray-500">{tables.length} tables</span>
              </div>

              {loading ? (
                <div className="py-12 text-center">
                  <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-gray-500" />
                  <p className="text-sm text-gray-500">Loading tables...</p>
                </div>
              ) : tables.length === 0 ? (
                <div className="py-12 text-center bg-gray-800/20 rounded-2xl border border-dashed border-gray-700/50">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-800/50 flex items-center justify-center">
                    <span className="text-xl opacity-30">♠</span>
                  </div>
                  <p className="text-gray-400 text-sm mb-1">No active tables</p>
                  <p className="text-gray-500 text-xs">Create one to get started</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tables.map((table) => (
                    <button
                      key={table.tableId}
                      onClick={() => handleJoinTable(table.tableId)}
                      disabled={table.playerCount >= table.maxPlayers}
                      className="w-full p-4 bg-gray-800/40 hover:bg-gray-800/60 disabled:opacity-50 rounded-xl border border-gray-700/30 transition-colors text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                            <span className="text-lg">♠</span>
                          </div>
                          <div>
                            <div className="font-medium text-sm">{table.name}</div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {table.playerCount}/{table.maxPlayers}
                              </span>
                              <span>•</span>
                              <span>Blinds {table.blinds}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 text-[10px] font-medium rounded-full uppercase ${
                              table.status === 'waiting'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : table.status === 'playing'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-gray-500/20 text-gray-400'
                            }`}
                          >
                            {table.status}
                          </span>
                          <ChevronRight className="w-4 h-4 text-gray-500" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-xs text-gray-600">
              <p>Play chips only • No real money</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
