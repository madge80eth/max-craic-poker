'use client';

import Link from 'next/link';
import { CheckCircle, Play, Star, Zap, Crown, Video, Gift, Clock } from 'lucide-react';

export default function MembershipInfoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-purple-800 p-4 pb-24">
      <div className="max-w-2xl mx-auto pt-8 space-y-6">

        {/* Header */}
        <div className="text-center mb-8">
          <Crown className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">👑 Membership Benefits</h1>
          <p className="text-blue-200">Support the creator & unlock exclusive perks</p>
        </div>

        {/* Price Card */}
        <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl p-6 border border-purple-400/30 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-5xl font-bold text-white">$10</span>
            <span className="text-purple-100 text-xl">/ month</span>
          </div>
          <p className="text-purple-100 text-sm">Auto-renews via USDC on Base</p>
        </div>

        {/* Benefits Section */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-400" />
            What You Get
          </h2>

          <div className="space-y-4">
            {/* Benefit 1 */}
            <div className="flex items-start gap-3 bg-white/5 rounded-lg p-4 border border-white/10">
              <Video className="w-6 h-6 text-purple-400 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-white font-bold mb-1">Unlock All Exclusive Content</h3>
                <p className="text-blue-200 text-sm">
                  Get instant access to all members-only videos including deep strategy breakdowns,
                  tournament hand reviews, and behind-the-scenes content.
                </p>
              </div>
            </div>

            {/* Benefit 2 */}
            <div className="flex items-start gap-3 bg-white/5 rounded-lg p-4 border border-white/10">
              <Clock className="w-6 h-6 text-blue-400 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-white font-bold mb-1">Early Access to New Videos</h3>
                <p className="text-blue-200 text-sm">
                  Be the first to watch new content. Members get early access to all new videos
                  before they're released to the public.
                </p>
              </div>
            </div>

            {/* Benefit 3 */}
            <div className="flex items-start gap-3 bg-white/5 rounded-lg p-4 border border-white/10">
              <Zap className="w-6 h-6 text-yellow-400 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-white font-bold mb-1">Priority Access to Features</h3>
                <p className="text-blue-200 text-sm">
                  Members get priority access to new community features, exclusive raffle entries,
                  and special events as they're released.
                </p>
              </div>
            </div>

            {/* Benefit 4 */}
            <div className="flex items-start gap-3 bg-white/5 rounded-lg p-4 border border-white/10">
              <Gift className="w-6 h-6 text-pink-400 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-white font-bold mb-1">Support Poker Education</h3>
                <p className="text-blue-200 text-sm">
                  Your membership directly supports the creation of high-quality poker content
                  and helps grow the community.
                </p>
              </div>
            </div>

            {/* Benefit 5 */}
            <div className="flex items-start gap-3 bg-white/5 rounded-lg p-4 border border-white/10">
              <Crown className="w-6 h-6 text-purple-400 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-white font-bold mb-1">Member Badge & Recognition</h3>
                <p className="text-blue-200 text-sm">
                  Show your support with a special member badge visible throughout the platform.
                  Stand out in the community!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-4">How It Works</h2>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                1
              </div>
              <div>
                <p className="text-white font-semibold">Subscribe via USDC</p>
                <p className="text-blue-200 text-sm">
                  One-click payment of $10 USDC on Base. Low fees, instant confirmation.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                2
              </div>
              <div>
                <p className="text-white font-semibold">Instant Access</p>
                <p className="text-blue-200 text-sm">
                  Your membership activates immediately and lasts for 30 days from purchase.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                3
              </div>
              <div>
                <p className="text-white font-semibold">Enjoy All Benefits</p>
                <p className="text-blue-200 text-sm">
                  Watch exclusive content, get early access, and enjoy priority features.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                4
              </div>
              <div>
                <p className="text-white font-semibold">Auto-Renewal</p>
                <p className="text-blue-200 text-sm">
                  Membership auto-renews every 30 days. Cancel anytime from your account.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-4">FAQ</h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-white font-bold mb-1">Can I cancel anytime?</h3>
              <p className="text-blue-200 text-sm">
                Yes! Your membership is valid for 30 days from purchase. You can cancel anytime
                and you'll retain access until the end of your billing period.
              </p>
            </div>

            <div>
              <h3 className="text-white font-bold mb-1">What payment methods are accepted?</h3>
              <p className="text-blue-200 text-sm">
                Currently, we accept USDC (USD Coin) on the Base network. This ensures low fees,
                instant transactions, and full transparency on the blockchain.
              </p>
            </div>

            <div>
              <h3 className="text-white font-bold mb-1">How much content is members-only?</h3>
              <p className="text-blue-200 text-sm">
                We maintain a healthy mix of free and premium content. Highlights and shorter clips
                are free, while in-depth strategy videos, full hand breakdowns, and exclusive tutorials
                require membership.
              </p>
            </div>

            <div>
              <h3 className="text-white font-bold mb-1">Do I need membership to enter the draw?</h3>
              <p className="text-blue-200 text-sm">
                No! The raffle draw is always free to enter. Membership is optional and gives you
                access to exclusive video content and other perks.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-3">
          <Link
            href="/mini-app/media"
            className="block w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 px-6 rounded-lg hover:opacity-90 transition text-center"
          >
            Subscribe Now - $10/month
          </Link>

          <Link
            href="/mini-app/info"
            className="block w-full bg-white/10 text-white font-semibold py-3 px-6 rounded-lg hover:bg-white/20 transition text-center border border-white/20"
          >
            ← Back to Info
          </Link>
        </div>

      </div>
    </div>
  );
}
