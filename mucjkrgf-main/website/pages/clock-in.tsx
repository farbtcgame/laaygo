import React, { useState } from "react";
import { Layout } from "../components/Layout";
import { Countdown } from "../components/Countdown";
import { useWeb3 } from "../context/Web3Context";
import { CLOCK_IN_CONTRACT_ADDRESS, CLOCK_IN_LAUNCH_TIMESTAMP } from "../config/web3";

export default function ClockInPage() {
  const { account, isCorrectNetwork, connectWallet, switchNetwork } = useWeb3();
  const [status, setStatus] = useState<string | null>(null);

  const handleClockIn = async () => {
    setStatus(null);
    if (!account) {
      await connectWallet();
      return;
    }
    if (!isCorrectNetwork) {
      await switchNetwork();
      return;
    }
    if (!CLOCK_IN_CONTRACT_ADDRESS) {
      setStatus("Clock In contract hasn't been configured for Robinhood Chain MAINNET yet.");
      return;
    }
    setStatus("Clock In contract configured. Wire up the on-chain call here to go live.");
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="border-b border-zinc-800/80 pb-4">
          <h1 className="text-xl font-bold text-white tracking-widest uppercase">Clock In</h1>
          <p className="text-xs text-zinc-500 mt-1">Daily terminal check-in</p>
        </div>

        <Countdown
          target={CLOCK_IN_LAUNCH_TIMESTAMP}
          label="Clock In opens in"
          completeState={
            <div className="space-y-4 max-w-lg">
              <div className="p-3 border border-[#CCFF00]/40 bg-[#CCFF00]/10 text-[#CCFF00] text-xs font-bold tracking-wider uppercase">
                Clock In is available
              </div>

              <div className="border border-zinc-800/80 bg-[#0f1115] p-5 md:p-6 space-y-4">
                {status && (
                  <div className="p-3 border border-amber-900/50 bg-amber-950/20 text-amber-400 text-[11px] leading-relaxed">
                    {status}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleClockIn}
                  className="w-full py-3 bg-[#CCFF00] text-black font-bold uppercase tracking-wider hover:shadow-[0_0_15px_rgba(204,255,0,0.4)] transition-shadow"
                >
                  {!account ? "Connect Wallet" : !isCorrectNetwork ? "Switch to Robinhood Chain" : "Clock In"}
                </button>
              </div>
            </div>
          }
        />
      </div>
    </Layout>
  );
}
