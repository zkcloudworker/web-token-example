"use server";

import { MinaTokensAPI, TokenTransaction } from "@minatokens/api";

const api = new MinaTokensAPI({
  apiKey: process.env.MINA_TOKENS_API_KEY!,
  chain: "devnet",
});

const steelContractAddress =
  "B62qqHM3QrYA1FrTTFz3CzkxhVuSBFGJW1chum9qDLP1gagZhh2QxR7";
const energyContractAddress =
  "B62qoipW2haMFPhZtoYiwLQ9ecceWv15u2KYG4c53AB6GigQBkC4nD5";
const energyOffer = "B62qoyyKucX9k2Q7cP3iNMH77aDZcmXfD985sdwDJ4dL83bKhEbxXer";
const steelOffer = "B62qq4EsQ7vk8iAfCK7nZTpuCjpc4YAhKWLkVTCWa6movxFb1N152zr";

export async function getTokensBalance(
  address: string
): Promise<{ steel: number | undefined; energy: number | undefined }> {
  try {
    const steelBalance: number =
      (
        await api.getBalance({
          address,
          tokenAddress: steelContractAddress,
        })
      ).balance ?? 0;

    const response = await fetch(`https://minatokens.com/api/v1/balance`, {
      method: "POST",
      headers: {
        "x-api-key": process.env.MINA_TOKENS_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        address,
        tokenAddress: energyContractAddress,
      }),
    });

    const energyBalance = response.ok
      ? (await response.json()).balance ?? 0
      : 0;

    return {
      steel: steelBalance / 1_000_000_000,
      energy: energyBalance / 1_000_000_000,
    };
  } catch (error) {
    console.error(error);
    return {
      steel: undefined,
      energy: undefined,
    };
  }
}

export async function buildBuyTx({
  address,
  amount,
  tokenType,
}: {
  address: string;
  amount: number;
  tokenType: "steel" | "energy";
}) {
  const response = await api.buildTransaction({
    txType: "buy",
    offerAddress: tokenType === "steel" ? steelOffer : energyOffer,
    tokenAddress:
      tokenType === "steel" ? steelContractAddress : energyContractAddress,
    amount: Number(amount * 1_000_000_000),
    sender: address,
  });

  return response;
}

export async function proveTx({
  tx,
  signedData,
}: {
  tx: TokenTransaction;
  signedData: string;
}) {
  const response = await api.proveTransaction({
    tx,
    signedData,
  });

  return response;
}

export async function getTxHash(jobId: string) {
  const jobResults = await api.getProof({ jobId });
  const jobStatus = jobResults.jobStatus;
  if (
    jobResults.success &&
    (jobStatus === "finished" || jobStatus === "used")
  ) {
    const result = jobResults.results?.map((result) => result.hash ?? "") ?? [];
    if (result.length > 0) {
      return result[0];
    } else return undefined;
  }
}

export async function getTxStatus(hash: string) {
  const response = await api.txStatus({ hash });
  return response.status;
}
