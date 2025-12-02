'use client';

import { useState, useEffect } from 'react';
import { Settings, CheckCircle, X } from 'lucide-react';

export default function MembershipSettings() {
  const [enabled, setEnabled] = useState(false);
  const [monthlyFee, setMonthlyFee] = useState('1000'); // $10 in cents
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/membership/check?address=0x0000000000000000000000000000000000000000');
      if (res.ok) {
        const data = await res.json();
        // Settings would come from a different endpoint in production
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch('/api/admin/membership-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          monthlyFeeUSDC: parseInt(monthlyFee)
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save settings');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Membership Settings</h2>
        <p className="text-blue-200 text-sm">Configure membership pricing and status</p>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-500/20 border border-green-400 rounded-lg p-4 mb-6 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-300 flex-shrink-0 mt-0.5" />
          <p className="text-green-200">Settings saved successfully!</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/20 border border-red-400 rounded-lg p-4 mb-6 flex items-start gap-3">
          <X className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5" />
          <p className="text-red-200">{error}</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Enable Membership */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="enabled"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-5 h-5 rounded border-white/20 bg-white/10 text-purple-600 focus:ring-purple-400 focus:ring-2"
          />
          <label htmlFor="enabled" className="text-white font-semibold cursor-pointer">
            Enable Membership System
          </label>
        </div>

        {/* Monthly Fee */}
        <div>
          <label className="block text-white font-semibold mb-2">
            Monthly Fee (in cents)
          </label>
          <input
            type="number"
            value={monthlyFee}
            onChange={(e) => setMonthlyFee(e.target.value)}
            placeholder="1000"
            min="0"
            step="100"
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-purple-400 transition-colors"
          />
          <p className="text-blue-300 text-xs mt-1">
            1000 cents = $10.00 (recommended)
          </p>
        </div>

        {/* Current Settings Display */}
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <h3 className="text-white font-semibold mb-3">Current Settings</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-blue-200">Status:</span>
              <span className={`font-semibold ${enabled ? 'text-green-300' : 'text-red-300'}`}>
                {enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-200">Monthly Fee:</span>
              <span className="text-white font-semibold">
                ${(parseInt(monthlyFee) / 100).toFixed(2)} USDC
              </span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSaving}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-4 px-6 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Settings className="w-5 h-5" />
              Save Settings
            </>
          )}
        </button>
      </form>
    </div>
  );
}
