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
    const getAccounts = async () => {
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
    getAccounts();
  }, []);

  const handleBuy = async (tokenType: "steel" | "energy") => {
    setTxInfo((prev) => ({
      ...prev,
      [tokenType]: {
        jobId: undefined,
        txHash: undefined,
        txStatus: "building tx",
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
    if (!tx || "error" in tx) {
      setMessage((prev) => ({
        ...prev,
        [tokenType]: tx?.error ?? "Transaction build error",
      }));
      return;
    }
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
      [tokenType]: proving?.jobId
        ? `Proving transaction, jobId: ${proving.jobId}`
        : "Failed to prove transaction",
    }));
    setTxInfo((prev) => ({
      ...prev,
      [tokenType]: {
        jobId: proving?.jobId,
        txHash: undefined,
        txStatus: proving?.jobId ? "proving tx" : "Failed to prove transaction",
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
        let status = (await getTxStatus(steelTxHash))?.status;
        if (status === "unknown") status = "pending";
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
        let status = (await getTxStatus(energyTxHash))?.status;
        if (status === "unknown") status = "pending";
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
  }, [userAddress, txInfo.steel.txStatus, txInfo.energy.txStatus]);

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
    <div>
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-6 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-12">
            <h1 className="text-4xl font-bold text-white">
              <a
                href="https://github.com/zkcloudworker/web-token-example"
                className="hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                ZeroCraft Tokens
              </a>
            </h1>
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
                <CardTitle className="text-2xl mb-4">
                  <a
                    href="https://minatokens.com/token/B62qqHM3QrYA1FrTTFz3CzkxhVuSBFGJW1chum9qDLP1gagZhh2QxR7"
                    className="hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    MinaSteel Token
                  </a>
                </CardTitle>
                <div className="relative w-48 h-48 mx-auto">
                  <a
                    href="https://minatokens.com/token/B62qqHM3QrYA1FrTTFz3CzkxhVuSBFGJW1chum9qDLP1gagZhh2QxR7"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Image
                      src="/img/MinaSteel.png"
                      alt="MinaSteel Token"
                      fill
                      className="object-contain hover:opacity-80 transition-opacity"
                    />
                  </a>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-300 mb-2 h-[160px] overflow-y-auto">
                      MinaSteel is a fungible token central to the ZeroCraft
                      gaming ecosystem, secured on the Mina Protocol. It
                      represents a rare, premium-grade alloy essential for
                      crafting high-tier weapons, fortified armor, and advanced
                      tools. By holding or trading MinaSteel, players gain
                      access to superior forging capabilities, enabling them to
                      advance their in-game standing and strength within
                      ZeroCraft&rsquo;s competitive landscape.
                    </p>
                    <p className="text-sm text-gray-300">Price: 10 MINA</p>
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
                  disabled={
                    !userAddress ||
                    steelAmount === "" ||
                    txInfo.steel.jobId !== undefined ||
                    (txInfo.steel.txStatus !== undefined &&
                      txInfo.steel.txStatus !== "applied")
                  }
                >
                  {txInfo.steel.jobId !== undefined ||
                  (txInfo.steel.txStatus !== undefined &&
                    txInfo.steel.txStatus !== "applied") ? (
                    <div className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Processing...
                    </div>
                  ) : (
                    "Buy MinaSteel"
                  )}
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
                <CardTitle className="text-2xl mb-4">
                  <a
                    href="https://minatokens.com/token/B62qoipW2haMFPhZtoYiwLQ9ecceWv15u2KYG4c53AB6GigQBkC4nD5"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    MinaEnergy Token
                  </a>
                </CardTitle>
                <div className="relative w-48 h-48 mx-auto">
                  <a
                    href="https://minatokens.com/token/B62qoipW2haMFPhZtoYiwLQ9ecceWv15u2KYG4c53AB6GigQBkC4nD5"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Image
                      src="/img/MinaEnergy.png"
                      alt="MinaEnergy Token"
                      fill
                      className="object-contain"
                    />
                  </a>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-300 mb-2 h-[160px] overflow-y-auto">
                      MinaEnergy is a high-value, fungible token integral to the
                      ZeroCraft ecosystem, harnessed to power advanced spells,
                      magical enhancements, and dynamic in-game abilities. As a
                      strategic resource, MinaEnergy allows players to channel
                      raw mystical forces, elevating their capabilities to new
                      heights. Through acquisition and exchange of MinaEnergy,
                      participants gain the energy reserves necessary to outpace
                      rivals, unlock rare enchantments, and sustain their
                      presence in ZeroCraft&rsquo;s vibrant, competitive world.
                    </p>
                    <p className="text-sm text-gray-300">Price: 25 MINA</p>
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
                  disabled={
                    !userAddress ||
                    energyAmount === "" ||
                    txInfo.energy.jobId !== undefined ||
                    (txInfo.energy.txStatus !== undefined &&
                      txInfo.energy.txStatus !== "applied")
                  }
                >
                  {txInfo.energy.jobId !== undefined ||
                  (txInfo.energy.txStatus !== undefined &&
                    txInfo.energy.txStatus !== "applied") ? (
                    <div className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Processing...
                    </div>
                  ) : (
                    "Buy MinaEnergy"
                  )}
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
      <div>
        <footer className="fixed bottom-0 left-0 right-0 p-4 bg-black/50 backdrop-blur-sm">
          <div className="container mx-auto flex justify-center items-center gap-2">
            <a
              href="https://github.com/zkcloudworker/web-token-example"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <svg
                height="24"
                width="24"
                viewBox="0 0 16 16"
                className="fill-current"
              >
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              <span>View on GitHub</span>
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
