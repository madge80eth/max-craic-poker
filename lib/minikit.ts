// lib/minikit.ts
export interface MiniKitUser {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl?: string;
  custody?: string;
  verifications?: string[];
}

export interface MiniKitWalletResponse {
  address: string;
}

export interface MiniKitSDK {
  install: () => Promise<boolean>;
  isInstalled: () => boolean;
  user: {
    wallet: {
      request: (params: { method: string; params?: any[] }) => Promise<MiniKitWalletResponse>;
      isConnected: () => boolean;
    };
    profile: () => Promise<MiniKitUser>;
  };
  share: (params: { text: string; embeds?: string[] }) => Promise<boolean>;
}

declare global {
  interface Window {
    MiniKit?: MiniKitSDK;
  }
}

export const isMiniKitAvailable = (): boolean => {
  return typeof window !== 'undefined' && !!window.MiniKit;
};

export const connectMiniKitWallet = async (): Promise<{ address: string; user: MiniKitUser }> => {
  if (!isMiniKitAvailable()) {
    throw new Error('MiniKit not available. Please open in Coinbase Wallet.');
  }

  try {
    const installed = await window.MiniKit!.install();
    if (!installed) {
      throw new Error('MiniKit installation failed');
    }

    const walletResponse = await window.MiniKit!.user.wallet.request({
      method: 'eth_requestAccounts'
    });

    const userProfile = await window.MiniKit!.user.profile();

    return {
      address: walletResponse.address,
      user: userProfile
    };
  } catch (error) {
    console.error('MiniKit wallet connection failed:', error);
    throw error;
  }
};

export const shareMiniKit = async (text: string, embedUrl?: string): Promise<boolean> => {
  if (!isMiniKitAvailable()) {
    return false;
  }

  try {
    return await window.MiniKit!.share({
      text,
      embeds: embedUrl ? [embedUrl] : undefined
    });
  } catch (error) {
    console.error('MiniKit sharing failed:', error);
    return false;
  }
};