'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount, useConnect } from 'wagmi';
import { useRouter } from 'next/navigation';
import { TableInfo, SybilResistanceConfig, DEFAULT_SYBIL_CONFIG, estimateGameDuration } from '@/lib/poker/types';
import {
  Users, Zap, Trophy, ChevronRight, Plus, Loader2, DollarSign, X, Clock,
  Shield, BadgeCheck, FileSpreadsheet, Image, Coins, AtSign, ArrowLeft, ArrowRight, Check
} from 'lucide-react';
import Link from 'next/link';

function getGuestId(): string {
  if (typeof window === 'undefined') return '';
  let guestId = sessionStorage.getItem('poker_guest_id');
  if (!guestId) {
    guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('poker_guest_id', guestId);
  }
  return guestId;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Starting soon';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

// Sybil badge definitions for lobby display
const SYBIL_BADGES: {
  key: keyof SybilResistanceConfig;
  label: string;
  color: string;
}[] = [
  { key: 'coinbaseVerification', label: 'CB Verified', color: 'bg-blue-500/20 text-blue-400' },
  { key: 'addressWhitelist', label: 'Whitelist', color: 'bg-amber-500/20 text-amber-400' },
  { key: 'nftGating', label: 'NFT Required', color: 'bg-purple-500/20 text-purple-400' },
  { key: 'tokenGating', label: 'Token Gate', color: 'bg-green-500/20 text-green-400' },
  { key: 'farcasterRequired', label: 'Farcaster', color: 'bg-violet-500/20 text-violet-400' },
  { key: 'baseNameRequired', label: '.base.eth', color: 'bg-cyan-500/20 text-cyan-400' },
];

const CHIP_OPTIONS = [1000, 1500, 2000, 3000, 5000];
const BLIND_OPTIONS = [
  { value: 2, label: '2 min' },
  { value: 3, label: '3 min' },
  { value: 5, label: '5 min' },
  { value: 10, label: '10 min' },
];

export default function PokerLobby() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const router = useRouter();
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [nameConfirmed, setNameConfirmed] = useState(false);
  const [showNameInput, setShowNameInput] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [guestId, setGuestId] = useState('');
  const [wiping, setWiping] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Wizard state
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  // Step 1: Game settings
  const [tableName, setTableName] = useState('');
  const [useScheduledStart, setUseScheduledStart] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [startingChips, setStartingChips] = useState(1500);
  const [blindInterval, setBlindInterval] = useState(3);
  // Step 2: Sybil resistance
  const [sybilConfig, setSybilConfig] = useState<SybilResistanceConfig>({ ...DEFAULT_SYBIL_CONFIG });
  const [whitelistAddresses, setWhitelistAddresses] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate guest ID on mount
  useEffect(() => {
    setGuestId(getGuestId());
  }, []);

  // Tick every second for countdowns
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const playerId = isConnected && address ? address : guestId;

  // Auto-connect Farcaster wallet if in Farcaster context
  useEffect(() => {
    if (isConnected || isConnecting) return;
    const isFarcaster = typeof window !== 'undefined' && (window as any).farcaster;
    if (isFarcaster && connectors.length > 0) {
      const farcasterConnector = connectors.find(c => c.id === 'farcasterMiniApp' || c.name.toLowerCase().includes('farcaster'));
      if (farcasterConnector) {
        setIsConnecting(true);
        connect({ connector: farcasterConnector }, {
          onSettled: () => setIsConnecting(false)
        });
      }
    }
  }, [isConnected, isConnecting, connectors, connect]);

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

  // Set default player name
  useEffect(() => {
    if (nameConfirmed) return;
    if (address) {
      setPlayerName(`Player_${address.slice(2, 6)}`);
      setNameConfirmed(true);
    } else {
      const savedName = typeof window !== 'undefined' ? sessionStorage.getItem('poker_guest_name') : null;
      if (savedName) {
        setPlayerName(savedName);
        setNameConfirmed(true);
      }
    }
  }, [address, nameConfirmed]);

  // Save guest name when it changes
  useEffect(() => {
    if (playerName && typeof window !== 'undefined') {
      sessionStorage.setItem('poker_guest_name', playerName);
    }
  }, [playerName]);

  const openWizard = () => {
    setTableName(`${playerName}'s Table`);
    setUseScheduledStart(false);
    setScheduledDate('');
    setScheduledTime('');
    setStartingChips(1500);
    setBlindInterval(3);
    setSybilConfig({ ...DEFAULT_SYBIL_CONFIG });
    setWhitelistAddresses([]);
    setWizardStep(1);
    setShowWizard(true);
  };

  const handleCreateTable = async () => {
    if (!playerId || !playerName) return;

    let scheduledStartTime: number | undefined;
    if (useScheduledStart && scheduledDate && scheduledTime) {
      const utcString = `${scheduledDate}T${scheduledTime}:00.000Z`;
      scheduledStartTime = new Date(utcString).getTime();
      if (scheduledStartTime <= Date.now()) {
        alert('Scheduled time must be in the future');
        return;
      }
    }

    // Build final sybil config with whitelist addresses
    const finalSybil: SybilResistanceConfig = {
      ...sybilConfig,
      addressWhitelist: {
        ...sybilConfig.addressWhitelist,
        addresses: sybilConfig.addressWhitelist.enabled ? whitelistAddresses : [],
      },
    };

    const anySybilEnabled = Object.values(finalSybil).some(
      (v) => typeof v === 'object' && 'enabled' in v && v.enabled
    );

    setCreating(true);
    try {
      const res = await fetch('/api/poker/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: playerId,
          creatorName: playerName,
          tableName: tableName || `${playerName}'s Table`,
          startingChips,
          blindIntervalMinutes: blindInterval,
          ...(scheduledStartTime ? { scheduledStartTime } : {}),
          ...(anySybilEnabled ? { sybilResistance: finalSybil } : {}),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowWizard(false);
        router.push(`/poker/${data.tableId}?playerId=${encodeURIComponent(playerId)}&playerName=${encodeURIComponent(playerName)}`);
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

  const handleWipeAll = async () => {
    if (!confirm('Wipe ALL games? This cannot be undone.')) return;
    setWiping(true);
    try {
      const res = await fetch('/api/poker/wipe', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setTables([]);
      }
    } catch (err) {
      console.error('Failed to wipe:', err);
    } finally {
      setWiping(false);
    }
  };

  const handleJoinTable = (tableId: string) => {
    if (!playerId || !playerName) {
      alert('Please enter your name first');
      return;
    }
    router.push(`/poker/${tableId}?playerId=${encodeURIComponent(playerId)}&playerName=${encodeURIComponent(playerName)}`);
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      // Parse CSV: split by newlines, then by commas, filter for valid Ethereum addresses
      const addresses = text
        .split(/[\r\n,]+/)
        .map((s) => s.trim())
        .filter((s) => /^0x[a-fA-F0-9]{40}$/.test(s));
      setWhitelistAddresses(addresses);
      setSybilConfig((prev) => ({
        ...prev,
        addressWhitelist: { ...prev.addressWhitelist, enabled: addresses.length > 0 },
      }));
    };
    reader.readAsText(file);
  };

  const toggleSybil = (key: keyof SybilResistanceConfig) => {
    setSybilConfig((prev) => ({
      ...prev,
      [key]: { ...prev[key], enabled: !(prev[key] as any).enabled },
    }));
  };

  const needsName = !nameConfirmed;
  const estimatedDuration = estimateGameDuration(startingChips, blindInterval);

  // Count active sybil badges for a table
  const getSybilBadges = (table: TableInfo) => {
    if (!table.sybilResistance) return [];
    return SYBIL_BADGES.filter((b) => {
      const val = table.sybilResistance?.[b.key];
      return val && typeof val === 'object' && 'enabled' in val && val.enabled;
    });
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 via-transparent to-purple-600/20" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtNi42MjcgMC0xMiA1LjM3My0xMiAxMnM1LjM3MyAxMiAxMiAxMiAxMi01LjM3MyAxMi0xMi01LjM3My0xMi0xMi0xMnptMCAyMGMtNC40MTggMC04LTMuNTgyLTgtOHMzLjU4Mi04IDgtOCA4IDMuNTgyIDggOC0zLjU4MiA4LTggOHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjAyIi8+PC9nPjwvc3ZnPg==')] opacity-30" />

        <div className="relative px-4 pt-8 pb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <span className="text-2xl">&#9824;</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Craic Poker</h1>
              <p className="text-emerald-400 text-xs font-medium">6-MAX NO-LIMIT HOLD&apos;EM</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 pb-8">
        {needsName ? (
          <div className="mt-8 max-w-xs mx-auto text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-3xl">&#9824;</span>
            </div>
            <h2 className="text-xl font-semibold mb-2">Enter Your Name</h2>
            <p className="text-gray-400 text-sm mb-6">Pick a name and start playing</p>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Your name..."
              autoFocus
              className="w-full bg-gray-900/50 rounded-xl px-4 py-3 text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/50 border border-gray-700/50 mb-4"
              maxLength={15}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && playerName.trim().length >= 2) {
                  setPlayerName(playerName.trim());
                  setNameConfirmed(true);
                }
              }}
            />
            <button
              onClick={() => {
                if (playerName.trim().length >= 2) {
                  setPlayerName(playerName.trim());
                  setNameConfirmed(true);
                }
              }}
              disabled={playerName.trim().length < 2}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:from-gray-700 disabled:to-gray-600 disabled:text-gray-400 text-white font-semibold rounded-xl transition-all mb-4"
            >
              Play
            </button>
            {!isConnected && (
              <p className="text-gray-600 text-xs">
                No wallet needed &bull; Play chips only
              </p>
            )}
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
                    <div className="text-xs text-gray-500">
                      {isConnected ? `${address?.slice(0, 6)}...${address?.slice(-4)}` : 'Guest'} &bull; Tap to change name
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500" />
              </button>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                onClick={openWizard}
                disabled={creating || !playerName}
                className="p-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:from-gray-700 disabled:to-gray-600 rounded-2xl font-semibold shadow-lg shadow-emerald-500/25 transition-all active:scale-[0.98] flex flex-col items-center gap-2"
              >
                {creating ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Plus className="w-6 h-6" />
                )}
                <span className="text-sm">Free Table</span>
              </button>

              <Link
                href="/poker/sponsored"
                className="p-4 bg-gradient-to-r from-yellow-600 to-orange-500 hover:from-yellow-500 hover:to-orange-400 rounded-2xl font-semibold shadow-lg shadow-yellow-500/25 transition-all active:scale-[0.98] flex flex-col items-center gap-2"
              >
                <DollarSign className="w-6 h-6" />
                <span className="text-sm">Sponsored</span>
              </Link>
            </div>

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
                <div className="text-xs text-gray-400">Blinds Up</div>
                <div className="text-sm font-semibold">3 min</div>
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
                    <span className="text-xl opacity-30">&#9824;</span>
                  </div>
                  <p className="text-gray-400 text-sm mb-1">No active tables</p>
                  <p className="text-gray-500 text-xs">Create one to get started</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tables.map((table) => {
                    const hasScheduled = !!(table as any).scheduledStartTime;
                    const scheduledMs = hasScheduled ? (table as any).scheduledStartTime - now : 0;
                    const isScheduledFuture = hasScheduled && scheduledMs > 0;
                    const badges = getSybilBadges(table);

                    return (
                      <button
                        key={table.tableId}
                        onClick={() => handleJoinTable(table.tableId)}
                        disabled={table.playerCount >= table.maxPlayers}
                        className="w-full p-4 bg-gray-800/40 hover:bg-gray-800/60 disabled:opacity-50 rounded-xl border border-gray-700/30 transition-colors text-left"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                              {badges.length > 0 ? (
                                <Shield className="w-5 h-5 text-purple-400" />
                              ) : (
                                <span className="text-lg">&#9824;</span>
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-sm">{table.name}</div>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {table.playerCount}/{table.maxPlayers}
                                </span>
                                <span>&bull;</span>
                                <span>Blinds {table.blinds}</span>
                                {table.startingChips && table.startingChips !== 1500 && (
                                  <>
                                    <span>&bull;</span>
                                    <span>{table.startingChips.toLocaleString()} chips</span>
                                  </>
                                )}
                                {isScheduledFuture && (
                                  <>
                                    <span>&bull;</span>
                                    <span className="flex items-center gap-1 text-yellow-400">
                                      <Clock className="w-3 h-3" />
                                      {formatCountdown(scheduledMs)}
                                    </span>
                                  </>
                                )}
                              </div>
                              {/* Sybil badges */}
                              {badges.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {badges.map((b) => (
                                    <span
                                      key={b.key}
                                      className={`px-1.5 py-0.5 text-[9px] font-medium rounded ${b.color}`}
                                    >
                                      {b.label}
                                    </span>
                                  ))}
                                </div>
                              )}
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
                              {isScheduledFuture ? 'scheduled' : table.status}
                            </span>
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Dev Tools */}
            <div className="mt-8 pt-4 border-t border-gray-800/50">
              <button
                onClick={handleWipeAll}
                disabled={wiping}
                className="w-full py-2.5 bg-red-900/30 hover:bg-red-900/50 disabled:opacity-50 text-red-400 text-sm font-medium rounded-xl border border-red-800/30 transition-colors"
              >
                {wiping ? 'Wiping...' : 'Wipe All Games (Test)'}
              </button>
            </div>

            <div className="mt-4 text-center text-xs text-gray-600">
              <p>Play chips only &bull; No real money</p>
            </div>
          </>
        )}
      </div>

      {/* Create Game Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-700/50 w-full max-w-sm shadow-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800 flex-shrink-0">
              <div className="flex items-center gap-3">
                {wizardStep === 2 && (
                  <button
                    onClick={() => setWizardStep(1)}
                    className="p-1 text-gray-400 hover:text-white transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}
                <div>
                  <h3 className="text-lg font-bold">Create Table</h3>
                  <p className="text-xs text-gray-500">Step {wizardStep} of 2</p>
                </div>
              </div>
              <button
                onClick={() => setShowWizard(false)}
                className="p-1 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="flex gap-1 px-4 pt-3 flex-shrink-0">
              <div className="flex-1 h-1 rounded-full bg-emerald-500" />
              <div className={`flex-1 h-1 rounded-full transition-colors ${wizardStep >= 2 ? 'bg-emerald-500' : 'bg-gray-800'}`} />
            </div>

            {/* Scrollable content */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Step 1: Game Settings */}
              {wizardStep === 1 && (
                <>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wider">Table Name</label>
                    <input
                      type="text"
                      value={tableName}
                      onChange={(e) => setTableName(e.target.value)}
                      placeholder="My Table"
                      className="w-full bg-gray-800/50 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 border border-gray-700/50"
                      maxLength={30}
                    />
                  </div>

                  {/* Scheduled Start */}
                  <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div
                        onClick={() => setUseScheduledStart(!useScheduledStart)}
                        className={`w-10 h-6 rounded-full transition-colors relative ${useScheduledStart ? 'bg-emerald-600' : 'bg-gray-700'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${useScheduledStart ? 'left-5' : 'left-1'}`} />
                      </div>
                      <span className="text-sm text-gray-300">Schedule start time</span>
                    </label>
                  </div>

                  {useScheduledStart && (
                    <div className="space-y-3 p-3 bg-gray-800/30 rounded-xl border border-gray-700/30">
                      <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>All times are in UTC</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Date</label>
                          <input
                            type="date"
                            value={scheduledDate}
                            onChange={(e) => setScheduledDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full bg-gray-900/50 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 border border-gray-700/50 [color-scheme:dark]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Time (UTC)</label>
                          <input
                            type="time"
                            value={scheduledTime}
                            onChange={(e) => setScheduledTime(e.target.value)}
                            className="w-full bg-gray-900/50 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 border border-gray-700/50 [color-scheme:dark]"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Starting Chips */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wider">Starting Chips</label>
                    <div className="flex gap-2">
                      {CHIP_OPTIONS.map((chips) => (
                        <button
                          key={chips}
                          onClick={() => setStartingChips(chips)}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                            startingChips === chips
                              ? 'bg-emerald-500 text-white'
                              : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 border border-gray-700/50'
                          }`}
                        >
                          {chips.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Blind Interval */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wider">Blind Interval</label>
                    <div className="flex gap-2">
                      {BLIND_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setBlindInterval(opt.value)}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                            blindInterval === opt.value
                              ? 'bg-emerald-500 text-white'
                              : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 border border-gray-700/50'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Estimated Duration */}
                  <div className="p-3 bg-gray-800/30 rounded-xl border border-gray-700/30">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Estimated Duration</span>
                      <span className="text-sm font-semibold text-emerald-400">~{estimatedDuration}</span>
                    </div>
                  </div>
                </>
              )}

              {/* Step 2: Sybil Resistance */}
              {wizardStep === 2 && (
                <>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">Sybil Resistance</h4>
                      <p className="text-xs text-gray-500">Control who can join your table</p>
                    </div>
                  </div>

                  {/* Coinbase Verification */}
                  <div className={`p-3 rounded-xl border transition-all ${
                    sybilConfig.coinbaseVerification.enabled
                      ? 'bg-blue-500/10 border-blue-500/30'
                      : 'bg-gray-800/30 border-gray-700/30'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <BadgeCheck className="w-4 h-4 text-blue-400" />
                        <div>
                          <div className="text-sm font-medium">Coinbase Verification</div>
                          <div className="text-[10px] text-gray-500">Proof of personhood via EAS</div>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleSybil('coinbaseVerification')}
                        className={`w-10 h-5 rounded-full transition-colors ${
                          sybilConfig.coinbaseVerification.enabled ? 'bg-blue-500' : 'bg-gray-700'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          sybilConfig.coinbaseVerification.enabled ? 'translate-x-5' : 'translate-x-0.5'
                        }`} />
                      </button>
                    </div>
                  </div>

                  {/* Address Whitelist */}
                  <div className={`p-3 rounded-xl border transition-all ${
                    sybilConfig.addressWhitelist.enabled
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-gray-800/30 border-gray-700/30'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                        <div>
                          <div className="text-sm font-medium">Address Whitelist</div>
                          <div className="text-[10px] text-gray-500">Upload CSV of allowed addresses</div>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleSybil('addressWhitelist')}
                        className={`w-10 h-5 rounded-full transition-colors ${
                          sybilConfig.addressWhitelist.enabled ? 'bg-amber-500' : 'bg-gray-700'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          sybilConfig.addressWhitelist.enabled ? 'translate-x-5' : 'translate-x-0.5'
                        }`} />
                      </button>
                    </div>
                    {sybilConfig.addressWhitelist.enabled && (
                      <div className="mt-2.5 space-y-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".csv"
                          onChange={handleCSVUpload}
                          className="hidden"
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full py-2 px-3 bg-gray-900/50 border border-dashed border-gray-600 rounded-lg text-xs text-gray-400 hover:border-amber-500/50 hover:text-amber-400 transition-colors"
                        >
                          {whitelistAddresses.length > 0
                            ? `${whitelistAddresses.length} addresses loaded`
                            : 'Choose CSV file...'}
                        </button>
                        {whitelistAddresses.length > 0 && (
                          <p className="text-[10px] text-gray-500">
                            {whitelistAddresses.slice(0, 2).map((a) => `${a.slice(0, 6)}...${a.slice(-4)}`).join(', ')}
                            {whitelistAddresses.length > 2 && ` +${whitelistAddresses.length - 2} more`}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* NFT Gating */}
                  <div className={`p-3 rounded-xl border transition-all ${
                    sybilConfig.nftGating.enabled
                      ? 'bg-purple-500/10 border-purple-500/30'
                      : 'bg-gray-800/30 border-gray-700/30'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Image className="w-4 h-4 text-purple-400" />
                        <div>
                          <div className="text-sm font-medium">NFT Gating</div>
                          <div className="text-[10px] text-gray-500">Require specific NFT ownership</div>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleSybil('nftGating')}
                        className={`w-10 h-5 rounded-full transition-colors ${
                          sybilConfig.nftGating.enabled ? 'bg-purple-500' : 'bg-gray-700'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          sybilConfig.nftGating.enabled ? 'translate-x-5' : 'translate-x-0.5'
                        }`} />
                      </button>
                    </div>
                    {sybilConfig.nftGating.enabled && (
                      <div className="mt-2.5 space-y-2">
                        <input
                          type="text"
                          placeholder="Contract address (0x...)"
                          value={sybilConfig.nftGating.contractAddress || ''}
                          onChange={(e) => setSybilConfig((prev) => ({
                            ...prev,
                            nftGating: { ...prev.nftGating, contractAddress: e.target.value },
                          }))}
                          className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                        />
                        <input
                          type="text"
                          placeholder="Token ID (optional — blank = any)"
                          value={sybilConfig.nftGating.tokenId || ''}
                          onChange={(e) => setSybilConfig((prev) => ({
                            ...prev,
                            nftGating: { ...prev.nftGating, tokenId: e.target.value },
                          }))}
                          className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                        />
                      </div>
                    )}
                  </div>

                  {/* Token Gating */}
                  <div className={`p-3 rounded-xl border transition-all ${
                    sybilConfig.tokenGating.enabled
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'bg-gray-800/30 border-gray-700/30'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Coins className="w-4 h-4 text-green-400" />
                        <div>
                          <div className="text-sm font-medium">Token Gating</div>
                          <div className="text-[10px] text-gray-500">Minimum token balance required</div>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleSybil('tokenGating')}
                        className={`w-10 h-5 rounded-full transition-colors ${
                          sybilConfig.tokenGating.enabled ? 'bg-green-500' : 'bg-gray-700'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          sybilConfig.tokenGating.enabled ? 'translate-x-5' : 'translate-x-0.5'
                        }`} />
                      </button>
                    </div>
                    {sybilConfig.tokenGating.enabled && (
                      <div className="mt-2.5 space-y-2">
                        <input
                          type="text"
                          placeholder="Token contract address (0x...)"
                          value={sybilConfig.tokenGating.contractAddress || ''}
                          onChange={(e) => setSybilConfig((prev) => ({
                            ...prev,
                            tokenGating: { ...prev.tokenGating, contractAddress: e.target.value },
                          }))}
                          className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-green-500/50"
                        />
                        <input
                          type="text"
                          placeholder="Minimum amount (e.g. 100)"
                          value={sybilConfig.tokenGating.minAmount || ''}
                          onChange={(e) => setSybilConfig((prev) => ({
                            ...prev,
                            tokenGating: { ...prev.tokenGating, minAmount: e.target.value },
                          }))}
                          className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-green-500/50"
                        />
                      </div>
                    )}
                  </div>

                  {/* Farcaster FID */}
                  <div className={`p-3 rounded-xl border transition-all ${
                    sybilConfig.farcasterRequired.enabled
                      ? 'bg-violet-500/10 border-violet-500/30'
                      : 'bg-gray-800/30 border-gray-700/30'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Users className="w-4 h-4 text-violet-400" />
                        <div>
                          <div className="text-sm font-medium">Farcaster Required</div>
                          <div className="text-[10px] text-gray-500">Must have Farcaster account</div>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleSybil('farcasterRequired')}
                        className={`w-10 h-5 rounded-full transition-colors ${
                          sybilConfig.farcasterRequired.enabled ? 'bg-violet-500' : 'bg-gray-700'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          sybilConfig.farcasterRequired.enabled ? 'translate-x-5' : 'translate-x-0.5'
                        }`} />
                      </button>
                    </div>
                  </div>

                  {/* Base Name Required */}
                  <div className={`p-3 rounded-xl border transition-all ${
                    sybilConfig.baseNameRequired.enabled
                      ? 'bg-cyan-500/10 border-cyan-500/30'
                      : 'bg-gray-800/30 border-gray-700/30'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <AtSign className="w-4 h-4 text-cyan-400" />
                        <div>
                          <div className="text-sm font-medium">Base Name Required</div>
                          <div className="text-[10px] text-gray-500">Must own a .base.eth name</div>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleSybil('baseNameRequired')}
                        className={`w-10 h-5 rounded-full transition-colors ${
                          sybilConfig.baseNameRequired.enabled ? 'bg-cyan-500' : 'bg-gray-700'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          sybilConfig.baseNameRequired.enabled ? 'translate-x-5' : 'translate-x-0.5'
                        }`} />
                      </button>
                    </div>
                  </div>

                  {/* No restrictions selected */}
                  {!sybilConfig.coinbaseVerification.enabled &&
                   !sybilConfig.addressWhitelist.enabled &&
                   !sybilConfig.nftGating.enabled &&
                   !sybilConfig.tokenGating.enabled &&
                   !sybilConfig.farcasterRequired.enabled &&
                   !sybilConfig.baseNameRequired.enabled && (
                    <div className="p-3 bg-gray-800/20 rounded-xl border border-dashed border-gray-700/50 text-center">
                      <p className="text-gray-500 text-xs">No restrictions — anyone can join</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-800 flex-shrink-0">
              {wizardStep === 1 ? (
                <button
                  onClick={() => setWizardStep(2)}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  Next: Sybil Resistance
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={() => setWizardStep(1)}
                    className="px-4 py-3.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-xl transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleCreateTable}
                    disabled={creating || (useScheduledStart && (!scheduledDate || !scheduledTime))}
                    className="flex-1 py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:from-gray-700 disabled:to-gray-600 disabled:text-gray-400 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Create Table
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
