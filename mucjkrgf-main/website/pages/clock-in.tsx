import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { useClockIn } from '../context/ClockInContext';
import { useWeb3 } from '../context/Web3Context';

interface NftMeta {
  tokenId: number;
  image?: string;
  name?: string;
}

export default function ClockInPage() {
  const { account } = useWeb3();
  const {
    tiers,
    loading,
    userNfts,
    clockIn,
    clockOut,
    claimRewards,
    refreshUserNfts,
  } = useClockIn();

  const [selectedNfts, setSelectedNfts] = useState<{ [tierId: number]: number[] }>({});
  const [busyTier, setBusyTier] = useState<number | null>(null);

  const toggleSelectNft = (tierId: number, tokenId: number) => {
    setSelectedNfts((prev) => {
      const current = prev[tierId] || [];
      if (current.includes(tokenId)) {
        return { ...prev, [tierId]: current.filter((id) => id !== tokenId) };
      }
      return { ...prev, [tierId]: [...current, tokenId] };
    });
  };

  const selectAllNfts = (tierId: number, nfts: NftMeta[]) => {
    setSelectedNfts((prev) => {
      const current = prev[tierId] || [];
      if (current.length === nfts.length) {
        return { ...prev, [tierId]: [] };
      }
      return { ...prev, [tierId]: nfts.map((n) => n.tokenId) };
    });
  };

  const handleClockIn = async (tierId: number) => {
    const ids = selectedNfts[tierId] || [];
    if (ids.length === 0) return;
    setBusyTier(tierId);
    try {
      await clockIn(tierId, ids);
      setSelectedNfts((prev) => ({ ...prev, [tierId]: [] }));
      await refreshUserNfts();
    } catch (e) {
      console.error(e);
    } finally {
      setBusyTier(null);
    }
  };

  const handleClockOut = async (tierId: number, tokenIds: number[]) => {
    if (tokenIds.length === 0) return;
    setBusyTier(tierId);
    try {
      await clockOut(tierId, tokenIds);
      await refreshUserNfts();
    } catch (e) {
      console.error(e);
    } finally {
      setBusyTier(null);
    }
  };

  const handleClaim = async (tierId: number) => {
    setBusyTier(tierId);
    try {
      await claimRewards(tierId);
      await refreshUserNfts();
    } catch (e) {
      console.error(e);
    } finally {
      setBusyTier(null);
    }
  };

  const getTierStyles = (tierId: number) => {
    switch (tierId) {
      case 1:
        return {
          wrapperBorder: 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/80',
          headerBg: 'bg-zinc-900/40 border-b border-zinc-800/80',
          titleColor: 'text-zinc-200',
          badge: 'border border-zinc-700 bg-zinc-900 text-zinc-400',
          statBoxBg: 'bg-zinc-900/60 border border-zinc-800/80',
          statValueColor: 'text-zinc-300',
          buttonClass:
            'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 hover:border-zinc-500 shadow-sm',
          accentText: 'text-zinc-400',
        };
      case 2:
        return {
          wrapperBorder: 'border-[#CCFF00]/40 bg-[#0f1115] shadow-[0_0_20px_rgba(204,255,0,0.03)]',
          headerBg: 'bg-[#CCFF00]/5 border-b border-[#CCFF00]/20',
          titleColor: 'text-[#CCFF00]',
          badge: 'border border-[#CCFF00]/50 bg-[#CCFF00]/10 text-[#CCFF00] shadow-[0_0_8px_rgba(204,255,0,0.2)]',
          statBoxBg: 'bg-zinc-900/80 border border-[#CCFF00]/20',
          statValueColor: 'text-[#CCFF00]',
          buttonClass:
            'bg-[#CCFF00] hover:bg-[#b8e600] text-black font-bold hover:shadow-[0_0_15px_rgba(204,255,0,0.3)]',
          accentText: 'text-[#CCFF00]',
        };
      case 3:
        return {
          wrapperBorder: 'border-amber-500/40 bg-[#0d0f12] shadow-[0_0_25px_rgba(245,158,11,0.04)]',
          headerBg: 'bg-amber-500/5 border-b border-amber-500/20',
          titleColor: 'text-amber-400',
          badge: 'border border-amber-500/50 bg-amber-500/10 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.25)]',
          statBoxBg: 'bg-zinc-900/80 border border-amber-500/20',
          statValueColor: 'text-amber-400',
          buttonClass:
            'bg-amber-500 hover:bg-amber-400 text-black font-bold hover:shadow-[0_0_15px_rgba(245,158,11,0.35)]',
          accentText: 'text-amber-400',
        };
      default:
        return {
          wrapperBorder: 'border-zinc-800 bg-zinc-950',
          headerBg: 'bg-zinc-900/40 border-b border-zinc-800',
          titleColor: 'text-white',
          badge: 'border border-zinc-800 bg-zinc-900 text-zinc-400',
          statBoxBg: 'bg-zinc-900/50 border border-zinc-800',
          statValueColor: 'text-[#CCFF00]',
          buttonClass: 'bg-[#CCFF00] text-black font-bold',
          accentText: 'text-zinc-400',
        };
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-widest uppercase">CLOCK IN</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Register your Mini Brokers for VIP rewards – no staking required
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-zinc-500 animate-pulse border border-zinc-800">
            LOADING CLOCK IN DATA...
          </div>
        ) : tiers.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 border border-zinc-800">
            NO VIP TIERS CONFIGURED YET.
          </div>
        ) : (
          <div className="space-y-8">
            {tiers.map((tier) => {
              const styles = getTierStyles(tier.id);
              const selectedIds = selectedNfts[tier.id] || [];
              const isBusy = busyTier === tier.id;

              // Filter available NFTs (not clocked in)
              const clockedInIds = tier.userClockedInTokens || [];
              const availableNfts = userNfts.filter((nft) => !clockedInIds.includes(nft.tokenId));

              return (
                <div
                  key={tier.id}
                  className={`border transition-all duration-300 relative overflow-hidden ${styles.wrapperBorder}`}
                >
                  {/* Tier Header Bar */}
                  <div className={`p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${styles.headerBg}`}>
                    <div className="flex items-center gap-3">
                      <h2 className={`text-xl font-black tracking-widest ${styles.titleColor}`}>
                        VIP {tier.id}
                      </h2>
                      <span className={`px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase ${styles.badge}`}>
                        {tier.active ? 'ACTIVE' : 'NOT CONFIGURED'}
                      </span>
                    </div>

                    {tier.pendingReward && Number(tier.pendingReward) > 0 ? (
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <span className="text-xs text-zinc-400">
                          EARNED:{' '}
                          <span className={`font-bold ${styles.statValueColor}`}>
                            {tier.pendingReward} {tier.rewardTokenSymbol}
                          </span>
                        </span>
                        <button
                          onClick={() => handleClaim(tier.id)}
                          disabled={isBusy}
                          className={`px-4 py-1.5 text-xs tracking-wider transition-all uppercase ${styles.buttonClass}`}
                        >
                          {isBusy ? 'CLAIMING...' : 'CLAIM REWARDS'}
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div className="p-5 space-y-6">
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {tier.description ||
                        `Tier ${tier.id} clock in options for registered Mini Brokers.`}
                    </p>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className={`p-3.5 ${styles.statBoxBg}`}>
                        <span className="text-[10px] text-zinc-500 block uppercase tracking-wider">
                          JOIN FEE
                        </span>
                        <span className="text-sm font-bold text-zinc-200 mt-0.5 block">
                          {tier.joinFee ? `${tier.joinFee} ETH` : '—'}
                        </span>
                      </div>
                      <div className={`p-3.5 ${styles.statBoxBg}`}>
                        <span className="text-[10px] text-zinc-500 block uppercase tracking-wider">
                          REWARD / NFT / 24H
                        </span>
                        <span className={`text-sm font-bold mt-0.5 block ${styles.statValueColor}`}>
                          {tier.rewardPerDay ? `${tier.rewardPerDay} ${tier.rewardTokenSymbol}` : '—'}
                        </span>
                      </div>
                    </div>

                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
                      REWARD TOKEN: <span className={styles.accentText}>{tier.rewardTokenSymbol || 'NOT CONFIGURED'}</span>
                    </div>

                    {/* Active Clocked-in NFTs Section */}
                    {clockedInIds.length > 0 && (
                      <div className="border-t border-zinc-800/80 pt-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-zinc-300 tracking-wider">
                            CLOCKED IN NFTS ({clockedInIds.length})
                          </span>
                          <button
                            onClick={() => handleClockOut(tier.id, clockedInIds)}
                            disabled={isBusy}
                            className="text-xs text-red-400 hover:text-red-300 underline tracking-wider"
                          >
                            CLOCK OUT ALL
                          </button>
                        </div>
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                          {clockedInIds.map((tokenId) => {
                            const nft = userNfts.find((n) => n.tokenId === tokenId);
                            return (
                              <div
                                key={tokenId}
                                className="border border-zinc-800 bg-zinc-900 p-2 text-center group relative"
                              >
                                {nft?.image ? (
                                  <img
                                    src={nft.image}
                                    alt={`#${tokenId}`}
                                    className="w-full aspect-square object-cover mb-1 border border-zinc-800"
                                  />
                                ) : (
                                  <div className="w-full aspect-square bg-zinc-950 flex items-center justify-center text-zinc-700 text-xs mb-1">
                                    #{tokenId}
                                  </div>
                                )}
                                <span className="text-[10px] text-zinc-400 font-mono block">#{tokenId}</span>
                                <button
                                  onClick={() => handleClockOut(tier.id, [tokenId])}
                                  disabled={isBusy}
                                  className="mt-1 w-full text-[9px] py-0.5 bg-red-950/80 text-red-400 border border-red-800 hover:bg-red-900 block"
                                >
                                  OUT
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Available NFTs Selection Grid */}
                    <div className="border-t border-zinc-800/80 pt-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-zinc-400 tracking-wider">
                          SELECT NFTS TO JOIN
                        </span>
                        {availableNfts.length > 0 && (
                          <button
                            onClick={() => selectAllNfts(tier.id, availableNfts)}
                            className="text-xs text-zinc-400 hover:text-white tracking-wider underline uppercase"
                          >
                            {selectedIds.length === availableNfts.length ? 'DESELECT ALL' : 'SELECT ALL'}
                          </button>
                        )}
                      </div>

                      {availableNfts.length === 0 ? (
                        <div className="p-6 text-center text-xs text-zinc-600 border border-zinc-900 bg-zinc-950/40">
                          NO AVAILABLE NFTS IN WALLET FOR THIS VIP TIER
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                          {availableNfts.map((nft) => {
                            const isSelected = selectedIds.includes(nft.tokenId);
                            return (
                              <div
                                key={nft.tokenId}
                                onClick={() => toggleSelectNft(tier.id, nft.tokenId)}
                                className={`cursor-pointer border p-2 transition-all text-center relative ${
                                  isSelected
                                    ? 'border-[#CCFF00] bg-[#CCFF00]/10 shadow-[0_0_10px_rgba(204,255,0,0.15)]'
                                    : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
                                }`}
                              >
                                {nft.image ? (
                                  <img
                                    src={nft.image}
                                    alt={`#${nft.tokenId}`}
                                    className="w-full aspect-square object-cover mb-1 border border-zinc-800"
                                  />
                                ) : (
                                  <div className="w-full aspect-square bg-zinc-950 flex items-center justify-center text-zinc-700 text-xs mb-1">
                                    #{nft.tokenId}
                                  </div>
                                )}
                                <span className={`text-[10px] font-mono block ${isSelected ? 'text-[#CCFF00] font-bold' : 'text-zinc-400'}`}>
                                  #{nft.tokenId}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Main Action Button */}
                      <button
                        onClick={() => handleClockIn(tier.id)}
                        disabled={selectedIds.length === 0 || isBusy || !tier.active}
                        className={`w-full py-3 mt-4 tracking-widest text-xs uppercase transition-all ${
                          selectedIds.length > 0 && tier.active && !isBusy
                            ? styles.buttonClass
                            : 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed'
                        }`}
                      >
                        {isBusy
                          ? 'PROCESSING...'
                          : !tier.active
                          ? 'TIER NOT ACTIVE'
                          : `JOIN (${selectedIds.length})`}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
