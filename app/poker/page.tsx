'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { TableInfo } from '@/lib/poker/types';

export default function PokerLobby() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [tableName, setTableName] = useState('');
  const [playerName, setPlayerName] = useState('');

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
    const interval = setInterval(fetchTables, 5000); // Poll every 5 seconds
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
          tableName: tableName || `${playerName}'s Table`,
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
      alert('Please connect wallet and enter a name');
      return;
    }
    router.push(`/poker/${tableId}?playerId=${address}&playerName=${encodeURIComponent(playerName)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">MCP Poker</h1>
          <p className="text-gray-400">6-Max No-Limit Hold&apos;em</p>
        </div>

        {/* Connection Check */}
        {!isConnected ? (
          <div className="bg-gray-800 rounded-xl p-8 text-center">
            <p className="text-gray-400 mb-4">Connect your wallet to play</p>
            <p className="text-sm text-gray-500">Use the wallet button in the header</p>
          </div>
        ) : (
          <>
            {/* Player Name Input */}
            <div className="bg-gray-800 rounded-xl p-4 mb-6">
              <label className="block text-sm text-gray-400 mb-2">Your Display Name</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                className="w-full bg-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                maxLength={20}
              />
            </div>

            {/* Create Table */}
            <div className="bg-gray-800 rounded-xl p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">Create New Table</h2>
              <div className="flex gap-4">
                <input
                  type="text"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  placeholder="Table name (optional)"
                  className="flex-1 bg-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  maxLength={30}
                />
                <button
                  onClick={handleCreateTable}
                  disabled={creating || !playerName}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-bold rounded-lg transition-colors"
                >
                  {creating ? 'Creating...' : 'Create Table'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                6-max SNG • 1,500 starting chips • 10-min blind levels
              </p>
            </div>

            {/* Available Tables */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">Available Tables</h2>

              {loading ? (
                <div className="text-center py-8 text-gray-400">Loading tables...</div>
              ) : tables.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No tables available. Create one to get started!
                </div>
              ) : (
                <div className="space-y-3">
                  {tables.map((table) => (
                    <div
                      key={table.tableId}
                      className="flex items-center justify-between bg-gray-700/50 rounded-lg p-4"
                    >
                      <div>
                        <div className="font-medium">{table.name}</div>
                        <div className="text-sm text-gray-400">
                          {table.playerCount}/{table.maxPlayers} players • Blinds {table.blinds}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            table.status === 'waiting'
                              ? 'bg-green-500/20 text-green-400'
                              : table.status === 'playing'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}
                        >
                          {table.status}
                        </span>
                        <button
                          onClick={() => handleJoinTable(table.tableId)}
                          disabled={table.status !== 'waiting' || table.playerCount >= table.maxPlayers}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                        >
                          {table.status === 'waiting' ? 'Join' : 'Watch'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Game Rules */}
            <div className="mt-6 text-center text-sm text-gray-500">
              <p>No-Limit Texas Hold&apos;em • Top 2 players win (65% / 35%)</p>
              <p>Play chips only - no real money</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
