"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  getTokensBalance,
  buildBuyTx,
  proveTx,
  getTxHash,
  getTxStatus,
} from "@/lib/api";

interface MinaWindow extends Window {
  mina?: {
    requestAccounts: () => Promise<string[]>;
    getAccounts: () => Promise<string[]>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendTransaction: (payload: any) => Promise<any>;
  };
}

export default function TokenPage() {
  const [steelAmount, setSteelAmount] = useState("");
  const [energyAmount, setEnergyAmount] = useState("");
  const [steelBalance, setSteelBalance] = useState<number | undefined>(
    undefined
  );
  const [energyBalance, setEnergyBalance] = useState<number | undefined>(
    undefined
  );
  const [message, setMessage] = useState<Record<string, string>>({
    steel: "",
    energy: "",
  });
  const [userAddress, setUserAddress] = useState<string | undefined>(undefined);
  const [txInfo, setTxInfo] = useState<{
    steel: {
      jobId?: string;
      txHash?: string;
      txStatus?: string;
    };
    energy: {
      jobId?: string;
      txHash?: string;
      txStatus?: string;
    };
  }>({
    steel: {},
    energy: {},
  });

  useEffect(() => {
    const connectWallet = async () => {
      try {
        const accounts = await (
          window as unknown as MinaWindow
        ).mina?.getAccounts();
        if (accounts?.[0]) {
          setUserAddress(accounts[0]);
        }
      } catch (error) {
        console.error("Failed to connect wallet:", error);
      }
    };
    connectWallet();
  }, []);

  const handleBuy = async (tokenType: "steel" | "energy") => {
    setTxInfo((prev) => ({
      ...prev,
      [tokenType]: {
        jobId: undefined,
        txHash: undefined,
        txStatus: undefined,
      },
    }));
    if (!userAddress) {
      return;
    }
    const amount = tokenType === "steel" ? steelAmount : energyAmount;
    if (!amount) {
      return;
    }
    setMessage((prev) => ({
      ...prev,
      [tokenType]: "Building transaction...",
    }));
    const tx = await buildBuyTx({
      tokenType,
      amount: Number(amount),
      address: userAddress,
    });
    await (window as unknown as MinaWindow).mina?.requestAccounts();
    const txResult = await (
      window as unknown as MinaWindow
    ).mina?.sendTransaction(tx.walletPayload);
    const signedData = txResult?.signedData;
    if (!signedData) {
      setMessage((prev) => ({
        ...prev,
        [tokenType]: "No signature received",
      }));
      return;
    }
    const proving = await proveTx({ tx, signedData });
    setMessage((prev) => ({
      ...prev,
      [tokenType]: `Proving transaction, jobId: ${proving.jobId}`,
    }));
    setTxInfo((prev) => ({
      ...prev,
      [tokenType]: {
        jobId: proving.jobId,
        txHash: undefined,
        txStatus: undefined,
      },
    }));
  };

  useEffect(() => {
    const getTxHashPolling = async () => {
      const steelJobId = txInfo.steel.jobId;
      const energyJobId = txInfo.energy.jobId;

      if (steelJobId) {
        const hash = await getTxHash(steelJobId);
        if (hash) {
          setTxInfo((prev) => ({
            ...prev,
            steel: {
              ...prev.steel,
              jobId: undefined,
              txHash: hash,
            },
          }));
        }
      }

      if (energyJobId) {
        const hash = await getTxHash(energyJobId);
        if (hash) {
          setTxInfo((prev) => ({
            ...prev,
            energy: {
              ...prev.energy,
              jobId: undefined,
              txHash: hash,
            },
          }));
        }
      }
    };

    getTxHashPolling();
    const interval = setInterval(getTxHashPolling, 5000);

    return () => clearInterval(interval);
  }, [txInfo.steel.jobId, txInfo.energy.jobId]);

  useEffect(() => {
    const getTxStatusPolling = async () => {
      const steelTxHash = txInfo.steel.txHash;
      const energyTxHash = txInfo.energy.txHash;

      if (steelTxHash) {
        const status = await getTxStatus(steelTxHash);
        if (status) {
          setTxInfo((prev) => ({
            ...prev,
            steel: {
              ...prev.steel,
              txHash: steelTxHash,
              txStatus: status,
            },
          }));
        }
      }

      if (energyTxHash) {
        const status = await getTxStatus(energyTxHash);
        if (status) {
          setTxInfo((prev) => ({
            ...prev,
            energy: {
              ...prev.energy,
              txHash: energyTxHash,
              txStatus: status,
            },
          }));
        }
      }
    };

    getTxStatusPolling();
    const interval = setInterval(getTxStatusPolling, 20000);

    return () => clearInterval(interval);
  }, [txInfo.steel.txHash, txInfo.energy.txHash]);

  useEffect(() => {
    // Steel token status
    let steelMessage = "";
    if (txInfo.steel.jobId) {
      steelMessage += `Job ID: ${txInfo.steel.jobId}\n`;
    }
    if (txInfo.steel.txHash) {
      steelMessage += `Tx Hash: ${txInfo.steel.txHash}\n`;
    }
    if (txInfo.steel.txStatus) {
      steelMessage += `Tx Status: ${txInfo.steel.txStatus}\n`;
    }

    // Energy token status
    let energyMessage = "";
    if (txInfo.energy.jobId) {
      energyMessage += `Job ID: ${txInfo.energy.jobId}\n`;
    }
    if (txInfo.energy.txHash) {
      energyMessage += `Tx Hash: ${txInfo.energy.txHash}\n`;
    }
    if (txInfo.energy.txStatus) {
      energyMessage += `Tx Status: ${txInfo.energy.txStatus}\n`;
    }

    setMessage({
      steel: steelMessage,
      energy: energyMessage,
    });
  }, [
    txInfo.steel.jobId,
    txInfo.steel.txHash,
    txInfo.steel.txStatus,
    txInfo.energy.jobId,
    txInfo.energy.txHash,
    txInfo.energy.txStatus,
  ]);

  useEffect(() => {
    const getBalance = async () => {
      if (!userAddress) {
        setSteelBalance(undefined);
        setEnergyBalance(undefined);
        return;
      }
      const { steel, energy } = await getTokensBalance(userAddress);
      setSteelBalance(steel);
      setEnergyBalance(energy);
    };
    getBalance();
  }, [userAddress, message]);

  const handleConnect = async () => {
    const account = await (
      window as unknown as MinaWindow
    ).mina?.requestAccounts();
    if (account && Array.isArray(account) && account.length > 0) {
      setUserAddress(account[0]);
    } else {
      setUserAddress(undefined);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-4xl font-bold text-white">ZeroCraft Tokens</h1>
          {userAddress ? (
            <div className="bg-gray-700 text-white py-2 px-4 rounded-full text-sm">
              {userAddress.slice(0, 4)}...{userAddress.slice(-4)}
            </div>
          ) : (
            <Button
              onClick={handleConnect}
              className="bg-gray-800 hover:bg-gray-700 text-white"
            >
              CONNECT
            </Button>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* MinaSteel Token Card */}
          <Card className="bg-gradient-to-b from-zinc-900 to-zinc-800 border-zinc-700 text-white">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl mb-4">MinaSteel Token</CardTitle>
              <div className="relative w-48 h-48 mx-auto">
                <Image
                  src="/img/MinaSteel.png"
                  alt="MinaSteel Token"
                  fill
                  className="object-contain"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-300 mb-2 h-[180px] overflow-y-auto">
                    MinaSteel is a fungible token central to the ZeroCraft
                    gaming ecosystem, secured on the Mina Protocol. It
                    represents a rare, premium-grade alloy essential for
                    crafting high-tier weapons, fortified armor, and advanced
                    tools. By holding or trading MinaSteel, players gain access
                    to superior forging capabilities, enabling them to advance
                    their in-game standing and strength within ZeroCraft&rsquo;s
                    competitive landscape.
                  </p>
                </div>
                <div>
                  <Label htmlFor="steel-amount" className="text-gray-300">
                    Amount to Buy
                  </Label>
                  <Input
                    id="steel-amount"
                    type="number"
                    placeholder="Enter amount"
                    value={steelAmount}
                    onChange={(e) => setSteelAmount(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
              </div>
              {steelBalance !== undefined && (
                <div>
                  <p className="text-sm text-gray-300 mb-1">Your Balance</p>
                  <p className="text-xl font-bold">
                    {steelBalance.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    STEEL
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button
                onClick={() => handleBuy("steel")}
                className="w-full bg-zinc-700 hover:bg-zinc-500"
                disabled={!userAddress}
              >
                Buy MinaSteel
              </Button>
              {message.steel && (
                <div className="text-sm text-gray-400 break-all whitespace-pre-line">
                  {message.steel}
                </div>
              )}
            </CardFooter>
          </Card>

          {/* MinaEnergy Token Card */}
          <Card className="bg-gradient-to-b from-cyan-900 to-cyan-950 border-cyan-800 text-white">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl mb-4">MinaEnergy Token</CardTitle>
              <div className="relative w-48 h-48 mx-auto">
                <Image
                  src="/img/MinaEnergy.png"
                  alt="MinaEnergy Token"
                  fill
                  className="object-contain"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-300 mb-2 h-[180px] overflow-y-auto">
                    MinaEnergy is a high-value, fungible token integral to the
                    ZeroCraft ecosystem, harnessed to power advanced spells,
                    magical enhancements, and dynamic in-game abilities. As a
                    strategic resource, MinaEnergy allows players to channel raw
                    mystical forces, elevating their capabilities to new
                    heights. Through acquisition and exchange of MinaEnergy,
                    participants gain the energy reserves necessary to outpace
                    rivals, unlock rare enchantments, and sustain their presence
                    in ZeroCraft&rsquo;s vibrant, competitive world.
                  </p>
                </div>
                <div>
                  <Label htmlFor="energy-amount" className="text-gray-300">
                    Amount to Buy
                  </Label>
                  <Input
                    id="energy-amount"
                    type="number"
                    placeholder="Enter amount"
                    value={energyAmount}
                    onChange={(e) => setEnergyAmount(e.target.value)}
                    className="bg-cyan-900 border-cyan-800 text-white"
                  />
                </div>
              </div>
              {energyBalance !== undefined && (
                <div>
                  <p className="text-sm text-gray-300 mb-1">Your Balance</p>
                  <p className="text-xl font-bold">
                    {energyBalance.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    ENERGY
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button
                onClick={() => handleBuy("energy")}
                className="w-full bg-cyan-800 hover:bg-cyan-600"
                disabled={!userAddress}
              >
                Buy MinaEnergy
              </Button>
              {message.energy && (
                <div className="text-sm text-gray-400 break-all whitespace-pre-line">
                  {message.energy}
                </div>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
