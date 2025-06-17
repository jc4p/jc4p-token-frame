#!/bin/bash

# Load environment variables
source .dev.vars

CONTRACT="0xf20b196c483385badf308a5ce1be2492c95ab166"
BUYER="0x0db12c0a67bc5b8942ea3126a465d7a0b23126c7"
QTY=1
PRICE=30000000
NONCE=4
SIGNATURE="0x1a7f03a5a326a924cbbfca571ed5bc2fe0ff7caf194328a450009028a40b97176d4cd60536546a4c96a08e6a5c0d1c8bbff4a684723bf8d99411c54878447eff1b"

echo "=== Debugging Voucher ==="
echo "Buyer: $BUYER"
echo "Qty: $QTY"
echo "Price: $PRICE ($(echo "scale=2; $PRICE / 1000000" | bc) USDC)"
echo "Nonce: $NONCE"
echo ""

echo "=== Checking Contract State ==="
echo "Signer address on contract:"
cast call $CONTRACT "signerAddress()(address)" --rpc-url $ALCHEMY_RPC_URL

echo ""
echo "Current nonce for buyer:"
cast call $CONTRACT "nonces(address)(uint256)" $BUYER --rpc-url $ALCHEMY_RPC_URL

echo ""
echo "=== Verifying Voucher ==="
echo "Running verifyVoucher..."
cast call $CONTRACT "verifyVoucher(address,uint256,uint256,uint256,bytes)(bool)" \
  $BUYER $QTY $PRICE $NONCE $SIGNATURE \
  --rpc-url $ALCHEMY_RPC_URL

echo ""
echo "=== Simulating Buy Transaction ==="
cast call $CONTRACT "buy(address,uint256,uint256,uint256,bytes)" \
  $BUYER $QTY $PRICE $NONCE $SIGNATURE \
  --from $BUYER \
  --rpc-url $ALCHEMY_RPC_URL