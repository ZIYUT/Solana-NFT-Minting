# Solana NFT Minting Tool

This is a simple Solana NFT minting tool that allows you to create NFTs on the Solana blockchain's DevNet test network.

## Your Minted NFT
- **NFT Address**: [D4udVQBZLp4EG8bNhMNiYW3HXh1K9e7ggY9k9jRnUSVP](https://explorer.solana.com/address/D4udVQBZLp4EG8bNhMNiYW3HXh1K9e7ggY9k9jRnUSVP/transfers?cluster=devnet)
- **Minter Wallet**: CEqRKCaGhXhPbDDhxKFjMiq6ta8owDSECWGa8iujQkvg

## Tool Usage Instructions
Please refer to the following file for detailed usage guidelines:

[GUIDE.md](GUIDE.md)

### Solana NFT Minting Tool Usage Guide
This is a simple tool to help you mint NFTs on the Solana DevNet testnet.

#### Prerequisites
1. **Install Dependencies**
2. **Configure Environment Variables**
   Create a `.env` file and add the following content:
   ```
   # Pinata API Credentials
   PINATA_API_KEY=your_PINATA_API_KEY
   PINATA_SECRET_KEY=your_PINATA_SECRET_KEY

   # Solana Wallet Private Key (Optional)
   SOLANA_PRIVATE_KEY=your_SOLANA_PRIVATE_KEY
   ```
   **Note**: If `SOLANA_PRIVATE_KEY` is not provided, the system will automatically create a temporary wallet.

#### Usage Workflow
**Step 1: Upload Image to IPFS**
```bash
node upload-to-ipfs.js image_path.png "NFT Name" "NFT Description"
```

**Step 2: Mint NFT**
Using the IPFS metadata URI returned from the previous step:
```bash
npx tsx mint-nft.ts https://gateway.pinata.cloud/ipfs/your_metadata_hash "NFT Name"
```

#### View Your NFT
After successful minting, you will see output similar to the following:

Click the link to view your NFT on the Solana blockchain explorer.

#### Important Notes
- This tool uses the Solana DevNet testnet; minted NFTs will not appear on the mainnet.
- NFTs minted on DevNet have no real-world value and are for testing purposes only.
- To mint real NFTs on the mainnet, modify the network settings in the code and use real SOL.