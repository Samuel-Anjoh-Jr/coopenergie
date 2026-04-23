# Alfajores Deployment

The Alfajores deployment was not executed from this workspace because `CELO_RELAYER_PRIVATE_KEY` is not configured with a real value in the root `.env`.

## Prerequisites

1. Set `CELO_RELAYER_PRIVATE_KEY` in [../.env](C:/Users/User/Documents/coopenergie/.env) to the funded deployer wallet's private key.
2. Make sure that wallet has Alfajores test CELO for gas.

## Run

From the repository root:

```powershell
cd contracts
bun run deploy:alfajores
```

## What the script does

1. Deploys `GasRelayer` with the deployer wallet as the initial owner.
2. Deploys `CoopFactory` with the `GasRelayer` address.
3. Transfers `GasRelayer` ownership to `CoopFactory`.
4. Writes the deployed addresses to `contracts/deployed-addresses.json`.

## After a successful deploy

Copy the deployed addresses into [../.env](C:/Users/User/Documents/coopenergie/.env):

```dotenv
COOP_FACTORY_ADDRESS=0x...
GAS_RELAYER_ADDRESS=0x...
```
