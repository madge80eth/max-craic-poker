// Craic Protocol Design Tokens - GGPoker Aesthetic

export const colors = {
  // Backgrounds
  bg: {
    primary: '#0a0a0a',
    secondary: '#121212',
    tertiary: '#1a1a1a',
    card: '#1e1e1e',
    elevated: '#242424',
  },

  // Table
  table: {
    felt: '#1a472a',
    feltLight: '#1f5a34',
    feltDark: '#0f2d1a',
    rim: '#8b5a2b',
    rimLight: '#a67c52',
  },

  // Neon accents
  neon: {
    green: '#00ff88',
    greenGlow: 'rgba(0, 255, 136, 0.5)',
    orange: '#ff6b35',
    orangeGlow: 'rgba(255, 107, 53, 0.5)',
    purple: '#8b5cf6',
    purpleGlow: 'rgba(139, 92, 246, 0.5)',
    blue: '#3b82f6',
    blueGlow: 'rgba(59, 130, 246, 0.5)',
    red: '#ef4444',
    redGlow: 'rgba(239, 68, 68, 0.5)',
    gold: '#ffd700',
    goldGlow: 'rgba(255, 215, 0, 0.5)',
  },

  // Cards
  card: {
    white: '#ffffff',
    red: '#dc2626',
    black: '#1a1a1a',
  },

  // Chips
  chips: {
    white: '#f5f5f5',
    red: '#dc2626',
    green: '#16a34a',
    blue: '#2563eb',
    black: '#1a1a1a',
    purple: '#7c3aed',
    orange: '#ea580c',
    yellow: '#eab308',
  },

  // Text
  text: {
    primary: '#ffffff',
    secondary: '#a1a1a1',
    muted: '#6b6b6b',
    accent: '#00ff88',
  },

  // Status
  status: {
    success: '#22c55e',
    warning: '#eab308',
    error: '#ef4444',
    info: '#3b82f6',
  },
};

export const shadows = {
  glow: {
    green: '0 0 20px rgba(0, 255, 136, 0.4), 0 0 40px rgba(0, 255, 136, 0.2)',
    orange: '0 0 20px rgba(255, 107, 53, 0.4), 0 0 40px rgba(255, 107, 53, 0.2)',
    purple: '0 0 20px rgba(139, 92, 246, 0.4), 0 0 40px rgba(139, 92, 246, 0.2)',
    gold: '0 0 20px rgba(255, 215, 0, 0.4), 0 0 40px rgba(255, 215, 0, 0.2)',
    red: '0 0 20px rgba(239, 68, 68, 0.4), 0 0 40px rgba(239, 68, 68, 0.2)',
  },
  card: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2)',
  elevated: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.3)',
};

export const gradients = {
  // Button gradients
  greenButton: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)',
  orangeButton: 'linear-gradient(135deg, #ff6b35 0%, #ff4500 100%)',
  purpleButton: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
  goldButton: 'linear-gradient(135deg, #ffd700 0%, #f59e0b 100%)',
  redButton: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',

  // Table felt
  felt: 'radial-gradient(ellipse at center, #1f5a34 0%, #1a472a 50%, #0f2d1a 100%)',

  // Rim
  rim: 'linear-gradient(180deg, #a67c52 0%, #8b5a2b 50%, #5c3d1e 100%)',

  // Card back
  cardBack: 'linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%)',
};

export const animations = {
  // Keyframes defined in globals.css
  deal: 'deal 0.4s ease-out forwards',
  flip: 'flip 0.5s ease-in-out forwards',
  glow: 'glow 2s ease-in-out infinite',
  pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  bounce: 'bounce 1s infinite',
  slideUp: 'slideUp 0.3s ease-out forwards',
  fadeIn: 'fadeIn 0.2s ease-out forwards',
  scaleIn: 'scaleIn 0.2s ease-out forwards',
};

// Tailwind-compatible class generators
export const tw = {
  glowButton: (color: 'green' | 'orange' | 'purple' | 'gold' | 'red') => {
    const map = {
      green: 'from-emerald-400 to-emerald-600 shadow-emerald-500/40',
      orange: 'from-orange-400 to-orange-600 shadow-orange-500/40',
      purple: 'from-purple-400 to-purple-600 shadow-purple-500/40',
      gold: 'from-yellow-400 to-yellow-600 shadow-yellow-500/40',
      red: 'from-red-400 to-red-600 shadow-red-500/40',
    };
    return `bg-gradient-to-br ${map[color]} shadow-lg hover:shadow-xl transition-all duration-200 active:scale-[0.98]`;
  },

  neonText: (color: 'green' | 'orange' | 'purple' | 'gold') => {
    const map = {
      green: 'text-emerald-400 drop-shadow-[0_0_10px_rgba(0,255,136,0.5)]',
      orange: 'text-orange-400 drop-shadow-[0_0_10px_rgba(255,107,53,0.5)]',
      purple: 'text-purple-400 drop-shadow-[0_0_10px_rgba(139,92,246,0.5)]',
      gold: 'text-yellow-400 drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]',
    };
    return map[color];
  },
};
