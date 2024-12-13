# Sample Next.js app using Mina Tokens API

This is a sample Next.js app that uses the Mina Tokens API to fetch and display token information and to buy tokens.
You don't need to use o1js library in this example as only the Mina Tokens API POST endpoint is used.

You can test this app on https://zerocraft.minatokens.com/

The documentation is available on https://docs.minatokens.com

## Example of getting token balance

https://github.com/zkcloudworker/web-token-example/blob/main/src/lib/api.ts#L17

### Using @minatokens/api

```typescript
const steelBalance: number =
  (
    await api.getBalance({
      address,
      tokenAddress: steelContractAddress,
    })
  ).balance ?? 0;
```

### Using fetch

```typescript
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

const energyBalance = response.ok ? (await response.json()).balance ?? 0 : 0;
```

## Example of building buy token transaction

https://github.com/zkcloudworker/web-token-example/blob/main/src/lib/api.ts#L58

```typescript
const response = await api.buildTransaction({
  txType: "buy",
  offerAddress: tokenType === "steel" ? steelOffer : energyOffer,
  tokenAddress:
    tokenType === "steel" ? steelContractAddress : energyContractAddress,
  amount: Number(amount * 1_000_000_000),
  sender: address,
});
```

## Example of signing transaction

https://github.com/zkcloudworker/web-token-example/blob/main/src/app/page.tsx#L103

```typescript
const txResult = await(window as unknown as MinaWindow).mina?.sendTransaction(
  tx.walletPayload
);
const signedData = txResult?.signedData;
```

## Example of proving transaction

https://github.com/zkcloudworker/web-token-example/blob/main/src/lib/api.ts#L79

```typescript
const response = await api.proveTransaction({
  tx,
  signedData,
});
```
