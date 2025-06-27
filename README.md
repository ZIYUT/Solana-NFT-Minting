# Solana Native NFT Minting Backend

This project provides a backend API for minting NFTs on the Solana blockchain using the native Metaplex Token Metadata program. It's built with Node.js, Express, and TypeScript.

## Features

- Mint NFTs with video files (or other media).
- Uploads media and metadata to a simulated IPFS (can be replaced with actual Pinata/IPFS integration).
- Uses `@solana/web3.js`, `@solana/spl-token`, and `@metaplex-foundation/mpl-token-metadata`.

## Prerequisites

- Node.js (v16 or later recommended)
- npm or yarn
- A Solana wallet with some SOL in it (preferably on devnet for testing).

## Setup

1.  **Clone the repository (or create the project as done by the assistant):**

    ```bash
    # If you were to clone it
    # git clone <repository-url>
    # cd solana-native-nft-minting
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    # or
    # yarn install
    ```

3.  **Create a `.env` file** in the root of the project and add your environment variables. A `.env.example` or the content below can be used as a template:

    ```env
    SOLANA_RPC_URL=https://api.devnet.solana.com
    CREATOR_PRIVATE_KEY=YOUR_WALLET_PRIVATE_KEY_ARRAY_AS_STRING_HERE
    # Example: CREATOR_PRIVATE_KEY=[1,2,3,...,64] (your secret key as a byte array string)
    # PINATA_API_KEY=YOUR_PINATA_API_KEY (Optional, if implementing actual IPFS upload)
    # PINATA_SECRET_KEY=YOUR_PINATA_SECRET_KEY (Optional)
    PORT=3002
    ```

    **Important:** `CREATOR_PRIVATE_KEY` should be the byte array of your wallet's secret key, formatted as a string. You can get this from your Phantom wallet (Export Private Key, then convert the base58 string to a byte array) or if you generated a keypair using `solana-keygen new --outfile my_keypair.json`, the `my_keypair.json` file contains this byte array.

    _To get the byte array from a base58 private key string (e.g., from Phantom export):_
    You can use a simple script or online tool. In Node.js with `bs58` library:

    ```javascript
    const bs58 = require("bs58");
    const privateKeyBase58 = "YOUR_BASE58_PRIVATE_KEY_STRING";
    const privateKeyBytes = bs58.decode(privateKeyBase58);
    console.log(JSON.stringify(Array.from(privateKeyBytes)));
    ```

4.  **Compile TypeScript:**

    ```bash
    npm run build
    ```

## Running the Application

### Development Mode (with auto-reloading)

```bash
npm run dev
```

The server will start, typically on `http://localhost:3002` (or the port specified in your `.env` file).

### Production Mode

First, build the project:

```bash
npm run build
```

Then, start the server:

```bash
npm start
```

## API Endpoints

### `POST /api/mint`

Mints a new NFT on the Solana blockchain.

- **Request Type:** `multipart/form-data`
- **Required Form Fields:**

  - `video`: The video file to be minted as an NFT (supports common video formats like .mp4, .mov, .avi, etc.)
  - `name` (string): Name of the NFT (max 32 characters)
  - `symbol` (string): Symbol of the NFT (max 10 characters)
  - `description` (string): Description of the NFT
  - `royaltyBasisPoints` (number): Royalty fee in basis points (e.g., 500 for 5%, max 10000 for 100%)

- **Optional Form Fields:**
  - `creators[0][address]` (string): Creator's Solana wallet address (defaults to the wallet in CREATOR_PRIVATE_KEY)
  - `creators[0][verified]` (boolean): Whether the creator is verified (defaults to true)
  - `creators[0][share]` (number): Creator's share percentage (defaults to 100)
  - `externalUrl` (string): External URL for the NFT

### API Usage Examples

#### Basic Example using cURL:

```bash
curl -X POST \
  -F 'video=@/path/to/your/video.mp4' \
  -F 'name=My Awesome Video NFT' \
  -F 'symbol=MAVN' \
  -F 'description=This is a very cool video NFT created on Solana blockchain.' \
  -F 'royaltyBasisPoints=500' \
  http://localhost:3002/api/mint
```

#### Advanced Example with Custom Creator:

```bash
curl -X POST \
  -F 'video=@/path/to/your/video.mp4' \
  -F 'name=Premium Video NFT' \
  -F 'symbol=PVNFT' \
  -F 'description=A premium video NFT with custom creator settings.' \
  -F 'royaltyBasisPoints=750' \
  -F 'creators[0][address]=YourSolanaWalletAddressHere' \
  -F 'creators[0][verified]=true' \
  -F 'creators[0][share]=100' \
  -F 'externalUrl=https://your-website.com/nft-details' \
  http://localhost:3002/api/mint
```

#### JavaScript/Node.js Example:

```javascript
const FormData = require("form-data");
const fs = require("fs");
const axios = require("axios");

const mintNFT = async () => {
  const form = new FormData();
  form.append("video", fs.createReadStream("/path/to/your/video.mp4"));
  form.append("name", "My Video NFT");
  form.append("symbol", "MVNFT");
  form.append("description", "An amazing video NFT");
  form.append("royaltyBasisPoints", "500");

  try {
    const response = await axios.post("http://localhost:3002/api/mint", form, {
      headers: form.getHeaders(),
    });
    console.log("NFT minted successfully:", response.data);
  } catch (error) {
    console.error("Error minting NFT:", error.response?.data || error.message);
  }
};

mintNFT();
```

#### Python Example:

```python
import requests

def mint_nft():
    url = 'http://localhost:3002/api/mint'

    files = {
        'video': open('/path/to/your/video.mp4', 'rb')
    }

    data = {
        'name': 'My Python NFT',
        'symbol': 'PYNFT',
        'description': 'NFT created using Python',
        'royaltyBasisPoints': '500'
    }

    try:
        response = requests.post(url, files=files, data=data)
        if response.status_code == 200:
            print('NFT minted successfully:', response.json())
        else:
            print('Error:', response.json())
    except Exception as e:
        print('Request failed:', str(e))
    finally:
        files['video'].close()

mint_nft()
```

### API Responses

- **Success Response (200 OK):**

  ```json
  {
    "message": "NFT minted successfully!",
    "mintAddress": "<SOLANA_MINT_ADDRESS>",
    "transactionSignature": "<TRANSACTION_SIGNATURE>",
    "metadataAddress": "<METADATA_ACCOUNT_ADDRESS>",
    "videoUrl": "<IPFS_VIDEO_URL>",
    "metadataUrl": "<IPFS_METADATA_URL>"
  }
  ```

- **Error Response (400 Bad Request):**

  ```json
  {
    "message": "Missing required fields: name, symbol, description, royaltyBasisPoints."
  }
  ```

- **Error Response (500 Internal Server Error):**

  ```json
  {
    "message": "Failed to mint NFT.",
    "error": "<ERROR_DETAILS>"
  }
  ```

### Viewing Your NFT

After successful minting, you can view your NFT using the returned `mintAddress`:

- **Solana Explorer (Devnet):** `https://explorer.solana.com/address/<MINT_ADDRESS>?cluster=devnet`
- **SolScan (Devnet):** `https://solscan.io/token/<MINT_ADDRESS>?cluster=devnet`
- **Direct IPFS Access:** Use the returned `videoUrl` and `metadataUrl` to access files directly

### `POST /api/transfer`

Transfers an NFT to another wallet address.

- **Request Type:** `application/json`
- **Required Fields:**

  - `mintAddress` (string): The mint address of the NFT to transfer
  - `destinationAddress` (string): The Solana wallet address to transfer the NFT to

- **Response:**
  ```json
  {
    "message": "NFT transferred successfully!",
    "transactionSignature": "<TRANSACTION_SIGNATURE>"
  }
  ```

#### Example using cURL:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "mintAddress": "YOUR_NFT_MINT_ADDRESS",
    "destinationAddress": "RECIPIENT_WALLET_ADDRESS"
  }' \
  http://localhost:3002/api/transfer
```

#### JavaScript/Node.js Example:

```javascript
const axios = require("axios");

const transferNFT = async () => {
  try {
    const response = await axios.post("http://localhost:3002/api/transfer", {
      mintAddress: "YOUR_NFT_MINT_ADDRESS",
      destinationAddress: "RECIPIENT_WALLET_ADDRESS",
    });
    console.log("NFT transferred successfully:", response.data);
  } catch (error) {
    console.error(
      "Error transferring NFT:",
      error.response?.data || error.message
    );
  }
};

transferNFT();
```

#### Python Example:

```python
import requests

def transfer_nft():
    url = 'http://localhost:3002/api/transfer'

    data = {
        'mintAddress': 'YOUR_NFT_MINT_ADDRESS',
        'destinationAddress': 'RECIPIENT_WALLET_ADDRESS'
    }

    try:
        response = requests.post(url, json=data)
        if response.status_code == 200:
            print('NFT transferred successfully:', response.json())
        else:
            print('Error:', response.json())
    except Exception as e:
        print('Request failed:', str(e))

transfer_nft()
```

### `POST /api/update-royalty`

Updates the royalty fee for an existing NFT.

- **Request Type:** `application/json`
- **Required Fields:**

  - `mintAddress` (string): The mint address of the NFT to update
  - `royaltyBasisPoints` (number): New royalty fee in basis points (e.g., 500 for 5%, max 10000 for 100%)

- **Response:**
  ```json
  {
    "message": "NFT royalty updated successfully!",
    "transactionSignature": "<TRANSACTION_SIGNATURE>",
    "newRoyaltyBasisPoints": 500
  }
  ```

#### Example using cURL:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "mintAddress": "YOUR_NFT_MINT_ADDRESS",
    "royaltyBasisPoints": 500
  }' \
  http://localhost:3002/api/update-royalty
```

#### JavaScript/Node.js Example:

```javascript
const axios = require("axios");

const updateNFTRoyalty = async () => {
  try {
    const response = await axios.post(
      "http://localhost:3002/api/update-royalty",
      {
        mintAddress: "YOUR_NFT_MINT_ADDRESS",
        royaltyBasisPoints: 500,
      }
    );
    console.log("NFT royalty updated successfully:", response.data);
  } catch (error) {
    console.error(
      "Error updating NFT royalty:",
      error.response?.data || error.message
    );
  }
};

updateNFTRoyalty();
```

#### Python Example:

```python
import requests

def update_nft_royalty():
    url = 'http://localhost:3002/api/update-royalty'

    data = {
        'mintAddress': 'YOUR_NFT_MINT_ADDRESS',
        'royaltyBasisPoints': 500
    }

    try:
        response = requests.post(url, json=data)
        if response.status_code == 200:
            print('NFT royalty updated successfully:', response.json())
        else:
            print('Error:', response.json())
    except Exception as e:
        print('Request failed:', str(e))

update_nft_royalty()
```

## Project Structure

```
solana-native-nft-minting/
├── .env                # Environment variables
├── .gitignore          # Git ignore rules
├── package.json        # Project dependencies and scripts
├── tsconfig.json       # TypeScript compiler options
├── README.md           # This file
├── uploads/            # Temporary storage for uploaded files (created automatically)
└── src/
    ├── index.ts        # Main application entry point, Express server setup
    ├── services/
    │   └── mintService.ts # Core logic for NFT minting
    └── routes/
        └── mintRoutes.ts  # API routes for minting
```

## Backend Usage Guide

### Environment Configuration

1. **Solana Network Configuration:**

   - For **development/testing**: Use `https://api.devnet.solana.com` (free)
   - For **production**: Use `https://api.mainnet-beta.solana.com` or a premium RPC provider
   - **Important**: Ensure your wallet has sufficient SOL for transaction fees

2. **Wallet Setup:**

   - The `CREATOR_PRIVATE_KEY` should be a byte array (not base58 string)
   - Example format: `[123,45,67,89,...]` (64 numbers)
   - This wallet will be the authority for all minted NFTs
   - Ensure this wallet has SOL for transaction fees (~0.01 SOL per mint)

3. **Port Configuration:**
   - Default port is 3002, can be changed via `PORT` environment variable
   - Make sure the port is not in use by other applications

### Development Workflow

1. **Start Development Server:**

   ```bash
   npm run dev
   ```

   This starts the server with auto-reload on file changes.

2. **Test the API:**

   ```bash
   # Health check
   curl http://localhost:3002/

   # Test mint endpoint with a sample video
   curl -X POST \
     -F 'video=@./sample-video.mp4' \
     -F 'name=Test NFT' \
     -F 'symbol=TEST' \
     -F 'description=Testing NFT minting' \
     -F 'royaltyBasisPoints=500' \
     http://localhost:3002/api/mint
   ```

3. **Monitor Logs:**
   The server logs will show:
   - Incoming requests
   - File upload status
   - IPFS upload simulation
   - Solana transaction details
   - Any errors during the process

### Production Deployment

#### Option 1: Traditional Server Deployment

1. **Build the application:**

   ```bash
   npm run build
   ```

2. **Set production environment variables:**

   ```bash
   export NODE_ENV=production
   export SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
   export CREATOR_PRIVATE_KEY="[your,production,private,key,array]"
   export PORT=3002
   ```

3. **Start the production server:**

   ```bash
   npm start
   ```

4. **Use a process manager (recommended):**

   ```bash
   # Install PM2
   npm install -g pm2

   # Start with PM2
   pm2 start dist/index.js --name "nft-minting-api"

   # Save PM2 configuration
   pm2 save
   pm2 startup
   ```

#### Option 2: Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3002

CMD ["npm", "start"]
```

Build and run:

```bash
docker build -t nft-minting-api .
docker run -p 3002:3002 --env-file .env nft-minting-api
```

### Security Considerations

1. **Private Key Security:**

   - Never commit private keys to version control
   - Use environment variables or secure key management systems
   - Consider using hardware wallets for production

2. **API Security:**

   - Implement rate limiting for the mint endpoint
   - Add authentication/authorization if needed
   - Validate file types and sizes
   - Use HTTPS in production

3. **File Upload Security:**
   - Limit file sizes (current limit: 50MB)
   - Validate file types (only allow video files)
   - Scan uploaded files for malware

### Monitoring and Maintenance

1. **Health Checks:**

   - Monitor the `/` endpoint for server health
   - Check Solana RPC connectivity
   - Monitor wallet SOL balance

2. **Error Handling:**

   - Common errors and solutions:
     - `TransactionExpiredBlockheightExceededError`: Retry the transaction
     - `Insufficient funds`: Add SOL to the creator wallet
     - `RPC node errors`: Switch to a different RPC provider

3. **Backup and Recovery:**
   - Backup your private keys securely
   - Keep transaction logs for audit purposes
   - Monitor failed transactions

### Customization Options

1. **IPFS Integration:**

   - Replace the simulated IPFS with real Pinata integration
   - Add environment variables for Pinata API keys
   - Implement proper error handling for IPFS uploads

2. **Database Integration:**

   - Add a database to store mint records
   - Track NFT metadata and transaction history
   - Implement user management

3. **Additional Features:**
   - Batch minting support
   - NFT collection creation
   - Metadata updates
   - Transfer functionality

## Troubleshooting

### Common Issues

1. **"Missing required fields" error:**

   - Ensure all required form fields are provided
   - Check that field names match exactly (case-sensitive)

2. **"Insufficient funds" error:**

   - Add SOL to your creator wallet
   - Each mint requires ~0.01 SOL for transaction fees

3. **"RPC node errors":**

   - Check your `SOLANA_RPC_URL` is correct
   - Try switching to a different RPC provider
   - For free usage, use `https://api.devnet.solana.com`

4. **File upload errors:**
   - Check file size (max 50MB)
   - Ensure file is a valid video format
   - Check available disk space

### Getting Help

- Check the server logs for detailed error messages
- Verify your environment variables are set correctly
- Test with a simple video file first
- Ensure your wallet has sufficient SOL balance

## Notes

- The current IPFS upload in `mintService.ts` is a placeholder. For a production application, you should integrate a real IPFS pinning service like Pinata.
- Error handling can be further improved for production use.
- Ensure your `CREATOR_PRIVATE_KEY` in the `.env` file has enough SOL on the chosen network (devnet/mainnet) to cover transaction fees.
- This backend is designed for video NFTs but can be easily modified to support other media types.
- All NFTs are minted using the Metaplex Token Metadata standard, ensuring compatibility with major Solana NFT marketplaces.
