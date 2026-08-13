import React, { useEffect, useMemo, useState } from "react";
import { Layout } from "../components/Layout";
import { Countdown } from "../components/Countdown";
import { useWeb3 } from "../context/Web3Context";
import { useClockIn, VipLevelConfig } from "../context/ClockInContext";
import { CLOCK_IN_LAUNCH_TIMESTAMP, WEB3_CONFIG, ALCHEMY_API_KEY } from "../config/web3";
import { fetchOwnedMiniBrokers, OwnedNft } from "../lib/alchemyNfts";
import { ethers } from "ethers";

type LoadState = "IDLE" | "LOADING" | "LOADED" | "ERROR";

const VIP_DESCRIPTIONS: Record<number, string> = {
  1: "Entry-level clock in. Register your Mini Brokers to start earning a steady reward every 24 hours — your NFT never leaves your wallet.",
  2: "Mid-tier clock in with a higher reward rate per NFT. A great step up once you're comfortable with how clocking in works.",
  3: "Top-tier clock in for the most committed holders — the highest reward per NFT, per completed 24-hour cycle.",
};

function VipCard({
  cfg,
  ownedNfts,
  registeredTokenIds,
  registrationsByToken,
  fmt,
  onJoin,
  onClaim,
  busy,
}: {
  cfg: VipLevelConfig;
  ownedNfts: OwnedNft[];
  registeredTokenIds: string[];
  registrationsByToken: Record<string, { pendingAmount: bigint; active: boolean }>;
  fmt: (amount: bigint, decimals: number) => string;
  onJoin: (vipLevel: 1 | 2 | 3, tokenIds: string[]) => void;
  onClaim: (tokenIds: string[]) => void;
  busy: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // NFTs owned but not currently registered under ANY vip level are eligible to join this one.
  const eligibleNfts = useMemo(
    () => ownedNfts.filter((n) => !registeredTokenIds.includes(n.tokenId)),
    [ownedNfts, registeredTokenIds]
  );

  const myRegisteredForThisVip = useMemo(
    () =>
      Object.entries(registrationsByToken)
        .filter(([, r]) => r.active)
        .map(([tokenId]) => tokenId),
    [registrationsByToken]
  );

  const totalClaimable = useMemo(
    () => myRegisteredForThisVip.reduce((sum, id) => sum + (registrationsByToken[id]?.pendingAmount || BigInt(0)), BigInt(0)),
    [myRegisteredForThisVip, registrationsByToken]
  );

  const toggle = (tokenId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tokenId)) next.delete(tokenId);
      else next.add(tokenId);
      return next;
    });
  };

  const selectAll = () => {
    setSelected((prev) => (prev.size === eligibleNfts.length ? new Set() : new Set(eligibleNfts.map((n) => n.tokenId))));
  };

  return (
    <div className="border border-zinc-800 bg-[#0f1115] p-6 space-y-4">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-bold text-white tracking-wide">VIP {cfg.vipLevel}</h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-md">{VIP_DESCRIPTIONS[cfg.vipLevel]}</p>
        </div>
        <span
          className={`px-2.5 py-1 text-[10px] font-bold tracking-widest border whitespace-nowrap ${
            cfg.active
              ? "bg-[#CCFF00]/10 text-[#CCFF00] border-[#CCFF00]/40"
              : "bg-zinc-900 text-zinc-500 border-zinc-700"
          }`}
        >
          {cfg.active ? "● OPEN" : "● NOT CONFIGURED"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-2 bg-zinc-950 border border-zinc-900">
          <span className="text-[10px] text-zinc-500 block">JOIN FEE</span>
          <span className="text-white font-bold">
            {cfg.feeTokenSymbol ? `${fmt(cfg.feeAmount, cfg.feeTokenDecimals)} $${cfg.feeTokenSymbol}` : "—"}
          </span>
        </div>
        <div className="p-2 bg-zinc-950 border border-zinc-900">
          <span className="text-[10px] text-zinc-500 block">REWARD / NFT / 24H</span>
          <span className="text-[#CCFF00] font-bold">
            {cfg.rewardTokenSymbol ? `${fmt(cfg.rewardAmountPerCycle, cfg.rewardTokenDecimals)} $${cfg.rewardTokenSymbol}` : "—"}
          </span>
        </div>
      </div>

      <div className="text-[10px] text-zinc-600 font-mono break-all">
        REWARD TOKEN: {cfg.rewardToken && cfg.rewardToken !== ethers.ZeroAddress ? cfg.rewardToken : "NOT CONFIGURED"}
      </div>

      {/* Eligible NFTs to join with */}
      <div className="space-y-2 pt-2 border-t border-zinc-900">
        <div className="flex justify-between items-center">
          <p className="text-[10px] text-zinc-500 tracking-widest">SELECT NFTS TO JOIN</p>
          {eligibleNfts.length > 0 && (
            <button
              type="button"
              onClick={selectAll}
              className="px-2 py-1 border border-zinc-700 text-[10px] font-bold tracking-widest text-zinc-300 hover:border-[#CCFF00] hover:text-[#CCFF00] transition-colors"
            >
              {selected.size === eligibleNfts.length ? "DESELECT ALL" : "SELECT ALL"}
            </button>
          )}
        </div>

        {eligibleNfts.length === 0 ? (
          <p className="text-[10px] text-zinc-600 py-3">No eligible NFTs (already registered or none owned).</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1">
            {eligibleNfts.map((nft) => {
              const isSelected = selected.has(nft.tokenId);
              return (
                <button
                  key={nft.tokenId}
                  type="button"
                  onClick={() => toggle(nft.tokenId)}
                  className={`relative border p-1 space-y-1 transition-colors ${
                    isSelected ? "border-[#CCFF00] bg-zinc-900" : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                  }`}
                >
                  <div className="aspect-square w-full bg-zinc-900 overflow-hidden flex items-center justify-center">
                    {nft.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[9px] text-zinc-600">#{nft.tokenId}</span>
                    )}
                  </div>
                  <p className="text-[9px] text-zinc-500 truncate">#{nft.tokenId}</p>
                </button>
              );
            })}
          </div>
        )}

        <button
          onClick={() => onJoin(cfg.vipLevel, Array.from(selected))}
          disabled={selected.size === 0 || busy || !cfg.active}
          className="w-full py-2.5 bg-[#CCFF00] text-black font-bold text-xs tracking-widest disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#b8e600] transition-colors"
        >
          JOIN ({selected.size})
        </button>
      </div>

      {/* Registered NFTs & claim */}
      {myRegisteredForThisVip.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-zinc-900">
          <p className="text-[10px] text-zinc-500 tracking-widest">
            REGISTERED: {myRegisteredForThisVip.length} NFT{myRegisteredForThisVip.length === 1 ? "" : "s"} — CLAIMABLE:{" "}
            <span className="text-[#CCFF00] font-bold">
              {cfg.rewardTokenSymbol ? `${fmt(totalClaimable, cfg.rewardTokenDecimals)} $${cfg.rewardTokenSymbol}` : "0"}
            </span>
          </p>
          <button
            onClick={() => onClaim(myRegisteredForThisVip)}
            disabled={totalClaimable === BigInt(0) || busy}
            className="w-full py-2.5 bg-zinc-900 border border-zinc-700 text-white font-bold text-xs tracking-widest disabled:opacity-30 disabled:cursor-not-allowed hover:border-[#CCFF00] transition-colors"
          >
            CLAIM REWARD
          </button>
        </div>
      )}
    </div>
  );
}

export default function ClockInPage() {
  const { account, walletConnectReady, connectWallet, isCorrectNetwork, switchNetwork } = useWeb3();
  const {
    clockInConfigured,
    vipConfigs,
    registrationsByToken,
    txState,
    txHash,
    errorMessage,
    joinVip,
    claimVip,
    refreshClockInData,
  } = useClockIn();

  const [ownedNfts, setOwnedNfts] = useState<OwnedNft[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("IDLE");
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadOwnedNfts = React.useCallback(async () => {
    if (!account) {
      setOwnedNfts([]);
      setLoadState("IDLE");
      return;
    }
    setLoadState("LOADING");
    setLoadError(null);
    try {
      const nfts = await fetchOwnedMiniBrokers(account);
      setOwnedNfts(nfts);
      setLoadState("LOADED");
      await refreshClockInData(nfts.map((n) => n.tokenId));
    } catch (err: any) {
      setLoadState("ERROR");
      setLoadError(
        err?.message === "ALCHEMY_NOT_CONFIGURED"
          ? "Alchemy API key not configured yet — set NEXT_PUBLIC_ALCHEMY_API_KEY."
          : "Couldn't load your NFTs right now. Please try again shortly."
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  useEffect(() => {
    loadOwnedNfts();
  }, [loadOwnedNfts]);

  useEffect(() => {
    if (txState === "JOIN_SUCCESSFUL" || txState === "CLAIM_SUCCESSFUL") {
      loadOwnedNfts();
    }
  }, [txState, loadOwnedNfts]);

  const fmt = (amount: bigint, decimals: number) => {
    const formatted = ethers.formatUnits(amount, decimals);
    return parseFloat(formatted).toLocaleString(undefined, { maximumFractionDigits: 4 });
  };

  // tokenIds this wallet currently has an active registration on, across any VIP level.
  const registeredTokenIds = useMemo(
    () => Object.entries(registrationsByToken).filter(([, r]) => r.active).map(([id]) => id),
    [registrationsByToken]
  );

  const txStatusLabel: Record<string, string> = {
    IDLE: "",
    CONFIRM_IN_WALLET: "CONFIRM IN WALLET…",
    TRANSACTION_PENDING: "TRANSACTION PROCESSING…",
    JOIN_SUCCESSFUL: "JOINED SUCCESSFULLY",
    CLAIM_SUCCESSFUL: "REWARD CLAIMED",
    TRANSACTION_FAILED: "TRANSACTION FAILED",
    TRANSACTION_REJECTED: "TRANSACTION REJECTED",
    WRONG_NETWORK: "WRONG NETWORK",
    INSUFFICIENT_BALANCE: "INSUFFICIENT TOKEN BALANCE FOR FEE",
  };

  const isBusy = txState === "CONFIRM_IN_WALLET" || txState === "TRANSACTION_PENDING";

  return (
    <Layout>
      <div className="space-y-6">
        <div className="border-b border-zinc-800/80 pb-4">
          <h1 className="text-xl font-bold text-white tracking-widest uppercase">Clock In</h1>
          <p className="text-xs text-zinc-500 mt-1">Register your Mini Brokers for VIP rewards — no staking required</p>
        </div>

        <Countdown
          target={CLOCK_IN_LAUNCH_TIMESTAMP}
          label="Clock In opens in"
          completeState={
            <div className="space-y-6">
              {!clockInConfigured && (
                <div className="p-3 border border-amber-900/50 bg-amber-950/20 text-amber-400 text-xs">
                  Clock In contract address isn&apos;t configured yet — set
                  NEXT_PUBLIC_CLOCK_IN_CONTRACT_ADDRESS once the contract has been deployed.
                </div>
              )}

              {account && !isCorrectNetwork && (
                <div className="p-3 border border-red-900/50 bg-red-950/20 text-red-400 text-xs flex items-center justify-between gap-3">
                  <span>Wrong network for Clock In.</span>
                  <button
                    onClick={switchNetwork}
                    className="px-3 py-1.5 bg-red-900 border border-red-800 text-red-200 text-[10px] font-bold tracking-widest hover:bg-red-800"
                  >
                    SWITCH NETWORK
                  </button>
                </div>
              )}

              {!walletConnectReady ? (
                <div className="p-3 border border-amber-900/50 bg-amber-950/20 text-amber-400 text-xs">
                  WalletConnect Project ID not configured yet — set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID.
                </div>
              ) : !account ? (
                <div className="flex flex-col items-center justify-center py-12 border border-dashed border-zinc-800 space-y-4">
                  <p className="text-xs text-zinc-500">Connect your wallet to see your Mini Brokers.</p>
                  <button
                    onClick={connectWallet}
                    className="px-6 py-2.5 bg-[#CCFF00] text-black font-bold text-xs tracking-widest hover:bg-[#b8e600] transition-colors"
                  >
                    CONNECT WALLET
                  </button>
                </div>
              ) : loadState === "LOADING" ? (
                <div className="py-12 text-center text-xs text-zinc-500 animate-pulse">Loading your collection…</div>
              ) : loadState === "ERROR" ? (
                <div className="p-3 border border-red-900/50 bg-red-950/20 text-red-400 text-xs">{loadError}</div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {vipConfigs.map((cfg) => (
                    <VipCard
                      key={cfg.vipLevel}
                      cfg={cfg}
                      ownedNfts={ownedNfts}
                      registeredTokenIds={registeredTokenIds}
                      registrationsByToken={Object.fromEntries(
                        Object.entries(registrationsByToken).filter(([, r]) => r.vipLevel === cfg.vipLevel)
                      )}
                      fmt={fmt}
                      onJoin={joinVip}
                      onClaim={claimVip}
                      busy={isBusy}
                    />
                  ))}
                </div>
              )}

              {!ALCHEMY_API_KEY && account && (
                <div className="p-3 border border-amber-900/50 bg-amber-950/20 text-amber-400 text-xs">
                  Note: NEXT_PUBLIC_ALCHEMY_API_KEY isn&apos;t set in .env.local, so NFT lookups above will show a
                  config warning until it&apos;s added.
                </div>
              )}

              {txState !== "IDLE" && txStatusLabel[txState] && (
                <div className="p-2 text-[10px] tracking-widest text-zinc-400 border border-zinc-800 bg-zinc-950">
                  {txStatusLabel[txState]}
                  {txState === "TRANSACTION_FAILED" && errorMessage ? ` — ${errorMessage}` : ""}
                  {txHash && (
                    <a
                      href={`${WEB3_CONFIG.EXPLORER_URL}/tx/${txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-[#CCFF00] mt-1 underline"
                    >
                      VIEW TRANSACTION
                    </a>
                  )}
                </div>
              )}
            </div>
          }
        />
      </div>
    </Layout>
  );
}
