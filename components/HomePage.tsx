"use client";
import { useSolana } from "@/hooks/useSolana";
import { Button } from "./ui/button";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  createAssociatedTokenAccountInstruction,
  createInitializeMetadataPointerInstruction,
  createInitializeMint2Instruction,
  createMintToInstruction,
  createSetAuthorityInstruction,
  AuthorityType,
  ExtensionType,
  getAssociatedTokenAddressSync,
  getMintLen,
  LENGTH_SIZE,
  TOKEN_2022_PROGRAM_ID,
  TYPE_SIZE,
} from "@solana/spl-token";
import {
  createInitializeInstruction,
  pack,
  TokenMetadata,
} from "@solana/spl-token-metadata";
import { Shield, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? "bg-violet-500" : "bg-zinc-700"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function Label({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="text-sm font-semibold text-zinc-200">
      {children}
      {required && <span className="text-violet-400"> *</span>}
    </label>
  );
}

const input =
  "w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-white placeholder:text-zinc-600 outline-none transition focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/15";

export default function HomePage() {
  const { publicKey } = useSolana();
  const { connection } = useConnection();
  const wallet = useWallet();

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [amount, setAmount] = useState("");
  const [decimals, setDecimals] = useState("9");
  const [revokeMint, setRevokeMint] = useState(false);
  const [revokeFreeze, setRevokeFreeze] = useState(false);
  const [revokeUpdate, setRevokeUpdate] = useState(false);
  const [description, setDescription] = useState("");
  const [useLogoUrl, setUseLogoUrl] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mintAddress, setMintAddress] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!image) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const createTokenHandler = async () => {
    console.log("Btn called");
    if (!publicKey || !name || !symbol || !amount) return;
    if (!useLogoUrl && !image) return;
    if (useLogoUrl && !logoUrl) return;

    const form = new FormData();
    form.append("name", name);
    form.append("symbol", symbol);
    if (description) form.append("description", description);
    if (useLogoUrl) {
      form.append("logoUrl", logoUrl);
    } else if (image) {
      form.append("image", image);
    }

    const res = await fetch("/api/upload", { method: "POST", body: form });
    const upload = await res.json();
    if (!res.ok) throw new Error(upload.error || "Upload failed");

    console.log(upload);
    console.log(upload.metadataUrl);
    // gen mint keypair
    const newKeyPair = Keypair.generate();

    const metaData: TokenMetadata = {
      mint: newKeyPair.publicKey,
      name,
      symbol,
      uri: upload.metadataUrl,
      additionalMetadata: [],
    };

    const mintlen = getMintLen([ExtensionType.MetadataPointer]);
    const metadatalen = TYPE_SIZE + LENGTH_SIZE + pack(metaData).length;

    const lamports = await connection.getMinimumBalanceForRentExemption(
      mintlen + metadatalen,
    );

    const freezeAuthority = !revokeFreeze;

    const tnx = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: publicKey,
        lamports: lamports,
        newAccountPubkey: newKeyPair.publicKey,
        programId: TOKEN_2022_PROGRAM_ID,
        space: mintlen,
      }),
      createInitializeMetadataPointerInstruction(
        newKeyPair.publicKey,
        publicKey,
        newKeyPair.publicKey,
        TOKEN_2022_PROGRAM_ID,
      ),
      createInitializeMint2Instruction(
        newKeyPair.publicKey,
        Number(decimals),
        publicKey,
        freezeAuthority ? publicKey : null,
        TOKEN_2022_PROGRAM_ID,
      ),
      createInitializeInstruction({
        programId: TOKEN_2022_PROGRAM_ID,
        mint: newKeyPair.publicKey,
        metadata: newKeyPair.publicKey,
        name: metaData.name,
        symbol: metaData.symbol,
        uri: metaData.uri,
        mintAuthority: publicKey,
        updateAuthority: revokeUpdate ? PublicKey.default : publicKey,
      }),
    );

    tnx.feePayer = publicKey;
    const blockHash = (await connection.getLatestBlockhash()).blockhash;
    tnx.recentBlockhash = blockHash;

    tnx.partialSign(newKeyPair);
    await wallet.sendTransaction(tnx, connection);
    console.log(`Mint address is ${newKeyPair.publicKey.toBase58()}`);

    const ataAddress = getAssociatedTokenAddressSync(
      newKeyPair.publicKey,
      publicKey,
      false,
      TOKEN_2022_PROGRAM_ID,
    );

    const mintAmount = Math.floor(Number(amount) * 10 ** Number(decimals));

    // 2 create ata
    const tnx2 = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        publicKey,
        ataAddress,
        publicKey,
        newKeyPair.publicKey,
        TOKEN_2022_PROGRAM_ID,
      ),
      createMintToInstruction(
        newKeyPair.publicKey,
        ataAddress,
        publicKey,
        mintAmount,
        [],
        TOKEN_2022_PROGRAM_ID,
      ),
    );

    if (revokeMint) {
      tnx2.add(
        createSetAuthorityInstruction(
          newKeyPair.publicKey,
          publicKey,
          AuthorityType.MintTokens,
          null,
          [],
          TOKEN_2022_PROGRAM_ID,
        ),
      );
    }

    tnx2.feePayer = publicKey;
    const blockHash2 = (await connection.getLatestBlockhash()).blockhash;
    tnx2.recentBlockhash = blockHash2;

    await wallet.sendTransaction(tnx2, connection);

    setMintAddress(newKeyPair.publicKey.toBase58());
    console.log(`Token Minted to this address ${ataAddress.toBase58()}`);
  };

  const hasLogo = useLogoUrl ? !!logoUrl : !!image;
  const canSubmit =
    name && symbol && amount && decimals && publicKey && hasLogo;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      {mintAddress && (
        <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-400">
            Token created
          </p>
          <p className="mt-1 break-all font-mono text-sm text-emerald-200">
            {mintAddress}
          </p>
        </div>
      )}
      <div className="rounded-2xl border border-zinc-800 bg-[#12121a] p-6 shadow-xl sm:p-8">
        <h1 className="text-2xl font-bold text-white">Token information</h1>

        <div className="mt-8 flex flex-col gap-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label required>Token Name (Max 30)</Label>
              <input
                className={input}
                placeholder="My awesome token"
                maxLength={30}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label required>Token Symbol (Max 10)</Label>
              <input
                className={input}
                placeholder="AWESOME"
                maxLength={10}
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              />
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label required>Decimals</Label>
              <input
                type="number"
                min="0"
                max="9"
                className={input}
                value={decimals}
                onChange={(e) => setDecimals(e.target.value)}
              />
              <p className="text-xs text-zinc-500">
                Change the number of decimals for your token.
              </p>
            </div>
            <div className="space-y-2">
              <Label required>Supply</Label>
              <input
                type="number"
                min="0"
                className={input}
                placeholder="1000000000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <p className="text-xs text-zinc-500">
                The initial number of available tokens that will be created in
                your wallet.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <Label>Logo</Label>
              <div className="flex items-center gap-2">
                <Toggle checked={useLogoUrl} onChange={setUseLogoUrl} />
                <span className="text-sm text-zinc-400">Enter logo url</span>
              </div>
            </div>
            {useLogoUrl ? (
              <input
                className={input}
                placeholder="https://..."
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
              />
            ) : (
              <div className="flex items-start gap-4">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 transition hover:border-violet-500/50"
                >
                  {preview ? (
                    <img
                      src={preview}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Upload className="h-6 w-6 text-zinc-500" />
                  )}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => setImage(e.target.files?.[0] ?? null)}
                />
                <p className="pt-2 text-sm text-zinc-500">
                  Upload PNG, JPG or SVG for your token logo.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <textarea
              className={`${input} min-h-[100px] resize-y`}
              placeholder="Here you can briefly describe your token."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="border-t border-zinc-800 pt-6">
            <h2 className="text-lg font-semibold text-white">
              Additional Settings
            </h2>

            <div className="mt-4 space-y-4">
              {[
                {
                  title: "Revoke Mint Authority",
                  desc: "Prevent additional token supply to increase investors trust.",
                  checked: revokeMint,
                  onChange: setRevokeMint,
                  tip: "Revoking mint authority means no one can mint more tokens. This increases buyer trust and improves safety ratings on DEX scanners.",
                },
                {
                  title: "Revoke Freeze Authority",
                  desc: "Prevent token freezing.",
                  checked: revokeFreeze,
                  onChange: setRevokeFreeze,
                  tip: "Revoking freeze authority means no one can freeze token accounts. This makes the token safer for buyers.",
                },
                {
                  title: "Revoke Update Authority",
                  desc: "Make token metadata immutable.",
                  checked: revokeUpdate,
                  onChange: setRevokeUpdate,
                  tip: "Revoking update authority locks name, symbol and URI forever. Recommended for fair launches.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium text-zinc-200">{item.title}</p>
                      <p className="mt-0.5 text-sm text-zinc-500">
                        {item.desc}
                      </p>
                    </div>
                    <Toggle checked={item.checked} onChange={item.onChange} />
                  </div>
                  {item.checked && (
                    <div className="mt-3 flex gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
                      <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                      <p className="text-xs leading-relaxed text-amber-200/80">
                        {item.tip}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Button
            type="button"
            onClick={createTokenHandler}
            disabled={!canSubmit}
            className="h-12 w-full rounded-xl bg-violet-600 text-base font-semibold text-white hover:bg-violet-500 disabled:opacity-40"
          >
            Crreate Token
          </Button>
        </div>
      </div>
    </main>
  );
}
