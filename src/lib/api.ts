"use server";

import * as api from "@minatokens/api";

api.config({
  apiKey: process.env.MINA_TOKENS_API_KEY!,
  chain: "devnet",
});
type TokenTransaction = api.TokenTransaction;

const steelContractAddress =
  "B62qptJFtHr4idfUNKhwokPM1tJ3pV9n94eiQy6tcs1BAckrCuw9JAy";
const energyContractAddress =
  "B62qnv9jR1yA1Zda2raECfthSJkmNWeeGd3pHupt8UN9AZcgRQHHmMo";
const energyOffer = "B62qpYMV9qfotPjMmkqY91MztsRzEDbetwQXoha6nP6JgHLU2P1gxWz";
const steelOffer = "B62qqo3jEBeTwFiw3KzMJYrUMbnxqFSaDbcyrw5vTs17mVMxhQQo7e2";

export async function getTokensBalance(
  address: string
): Promise<{ steel: number | undefined; energy: number | undefined }> {
  try {
    const steelBalance: number =
      (
        await api.getTokenBalance({
          body: {
            address,
            tokenAddress: steelContractAddress,
          },
        })
      ).data?.balance ?? 0;

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
  try {
    const response = (
      await api.buyTokens({
        body: {
          offerAddress: tokenType === "steel" ? steelOffer : energyOffer,
          tokenAddress:
            tokenType === "steel"
              ? steelContractAddress
              : energyContractAddress,
          amount: Number(amount * 1_000_000_000),
          sender: address,
        },
      })
    ).data;
    return response;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error(error);
    return { error: error?.message ?? "Failed to build transaction" };
  }
}

export async function proveTx({
  tx,
  signedData,
}: {
  tx: TokenTransaction;
  signedData: string;
}) {
  const response = (
    await api.prove({
      body: {
        tx,
        signedData,
      },
    })
  ).data;

  return response;
}

export async function getTxHash(jobId: string) {
  const jobResults = (
    await api.getProof({
      body: {
        jobId,
      },
    })
  ).data;
  const jobStatus = jobResults?.jobStatus;
  if (
    jobResults?.success &&
    (jobStatus === "finished" || jobStatus === "used")
  ) {
    const result =
      jobResults?.results?.map((result) => result.hash ?? "") ?? [];
    if (result.length > 0) {
      return result[0];
    } else return undefined;
  }
}

export async function getTxStatus(hash: string) {
  const response = (
    await api.txStatus({
      body: {
        hash,
      },
    })
  ).data;
  return response;
}
