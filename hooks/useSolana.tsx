"use client";
import {
  ConnectionProvider,
  useWallet,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import { createContext, useContext, useState, type ReactNode } from "react";
import "@solana/wallet-adapter-react-ui/styles.css";

export type Network = "devnet" | "mainnet-beta";

const RPC_URLS: Record<Network, string> = {
  devnet: process.env.NEXT_PUBLIC_DEVNET_RPC || clusterApiUrl("devnet"),
  "mainnet-beta":
    process.env.NEXT_PUBLIC_MAINNET_RPC || clusterApiUrl("mainnet-beta"),
};

type SolanaContextValue = {
  network: Network;
  setNetwork: (network: Network) => void;
  toggleNetwork: () => void;
  isMainnet: boolean;
  endpoint: string;
};

const SolanaContext = createContext<SolanaContextValue | null>(null);

export function SolanaProvider({ children }: { children: ReactNode }) {
  const [network, setNetwork] = useState<Network>("devnet");
  const endpoint = RPC_URLS[network];

  const value: SolanaContextValue = {
    network,
    setNetwork,
    toggleNetwork: () =>
      setNetwork(network === "devnet" ? "mainnet-beta" : "devnet"),
    isMainnet: network === "mainnet-beta",
    endpoint,
  };

  return (
    <SolanaContext.Provider value={value}>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={[]} autoConnect>
          <WalletModalProvider>{children}</WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </SolanaContext.Provider>
  );
}

export function useSolana() {
  const ctx = useContext(SolanaContext);
  if (!ctx) {
    throw new Error("useSolana must be used within a <SolanaProvider>");
  }
  const wallet = useWallet();
  return { ...ctx, ...wallet };
}
