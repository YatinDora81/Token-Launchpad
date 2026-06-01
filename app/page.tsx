"use client"
import HomePage from "@/components/HomePage";
import Navbar from "@/components/Navbar";
import { SolanaProvider } from "@/hooks/useSolana";

export default function Home() {
  return (
    <SolanaProvider>
      <Navbar />
      <HomePage />
    </SolanaProvider>
  );
}
