"use client";
import {
  WalletDisconnectButton,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import { useEffect, useState } from "react";
import { useSolana } from "@/hooks/useSolana";

export default function Navbar() {
  const { connected, isMainnet, setNetwork } = useSolana();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-950 ring-1 ring-white/10 shadow-lg shadow-violet-500/20">
            <svg
              viewBox="0 0 32 32"
              fill="none"
              className="h-6 w-6"
              aria-hidden="true"
            >
              <path d="M16 3 27 9.5v13L16 29 5 22.5v-13L16 3Z" fill="#8b5cf6" />
              <path d="M16 3 27 9.5 16 16 5 9.5 16 3Z" fill="#a78bfa" />
              <path d="M16 16 27 9.5v13L16 29V16Z" fill="#6d28d9" />
              <path
                d="M16 12.5 20.5 15v5L16 22.5 11.5 20v-5L16 12.5Z"
                fill="#0a0a0f"
                opacity="0.55"
              />
            </svg>
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-base font-bold tracking-tight text-white">
              Launchana
            </span>
            <span className="text-[11px] font-medium text-zinc-400">
              {isMainnet ? "Solana Mainnet" : "Solana Devnet"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex items-center rounded-full border border-white/10 bg-zinc-900/80 p-1 text-xs font-semibold">
            <span
              className={`absolute top-1 bottom-1 left-1 w-20 rounded-full bg-linear-to-r from-violet-500 to-fuchsia-500 shadow transition-transform duration-300 ease-out ${
                isMainnet ? "translate-x-20" : "translate-x-0"
              }`}
            />
            <button
              type="button"
              onClick={() => setNetwork("devnet")}
              className={`relative z-10 w-20 rounded-full py-1.5 text-center transition-colors ${
                !isMainnet ? "text-white" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Devnet
            </button>
            <button
              type="button"
              onClick={() => setNetwork("mainnet-beta")}
              className={`relative z-10 w-20 rounded-full py-1.5 text-center transition-colors ${
                isMainnet ? "text-white" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Mainnet
            </button>
          </div>

          {mounted && (
            <>
              <span
                className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium sm:flex ${
                  connected
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : "border-zinc-700 bg-zinc-800/50 text-zinc-400"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    connected ? "bg-emerald-400" : "bg-zinc-500"
                  }`}
                />
                {connected ? "Connected" : "Disconnected"}
              </span>
              {!connected ? <WalletMultiButton /> : <WalletDisconnectButton />}
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
