## Testnet Consensus Layer

An emulator for the consensus layer (CL) that polls the recent fork choice and triggers block sync for the execution layer (EL).

Before running, make sure you have your JWT secret shared between the EL and CL:

```bash
make generate-jwt-secret
```

For a local instance, create an `.env` file to manage your variables:

```text
JWT_KEY_PATH=./jwt.hex
DATA_DIR=./fluent-rpc-data
TRUSTED_PEERS=enode://<TRUSTED_PEER_PUBLIC_KEY>@<TRUSTED_PEER_IP_ADDRESS>:30303
BLOCK_HASH_ORACLE=<BLOCK_HASH_ORACLE_HTTP_OR_WS>
```

After setting these parameters, simply run the compose file:

```bash
docker compose up
```