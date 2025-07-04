import {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
    sendAndConfirmTransaction,
    LAMPORTS_PER_SOL,
    ComputeBudgetProgram
} from '@solana/web3.js';
import {
    MINT_SIZE,
    TOKEN_PROGRAM_ID,
    createInitializeMintInstruction,
    getMinimumBalanceForRentExemptMint,
    createAssociatedTokenAccountInstruction,
    getAssociatedTokenAddress,
    createMintToInstruction
} from '@solana/spl-token';
import {
    PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID,
    createCreateMetadataAccountV3Instruction,
    createCreateMasterEditionV3Instruction,
    Creator,
    CreateMetadataAccountArgsV3,
    CreateMasterEditionArgs
} from '@metaplex-foundation/mpl-token-metadata';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const RPC_URL = process.env.SOLANA_RPC_URL!;
const connection = new Connection(RPC_URL, 'confirmed');

// Helper function to get Keypair from secret key string
const getKeypairFromPrivateKey = (privateKeyString: string): Keypair => {
    const secretKey = Uint8Array.from(JSON.parse(privateKeyString));
    return Keypair.fromSecretKey(secretKey);
};

export interface MintNftParams {
    videoBuffer?: Buffer;
    originalFileName?: string;
    mimetype?: string;
    name: string;
    symbol: string;
    description: string;
    royaltyBasisPoints: number;
    creatorPrivateKey: string;
    creatorAddress?: string;
    ipfsUrl?: string;
}

export const mintNft = async (params: MintNftParams): Promise<string> => {
    const { videoBuffer, originalFileName, mimetype, name, symbol, description, royaltyBasisPoints, creatorPrivateKey, creatorAddress, ipfsUrl } = params;

    const creatorKeypair = getKeypairFromPrivateKey(creatorPrivateKey);
    const payer = creatorKeypair;
    const mintKeypair = Keypair.generate();

    // Use provided creatorAddress if available, otherwise use the one from the private key
    const actualCreatorPublicKey = creatorAddress ? new PublicKey(creatorAddress) : creatorKeypair.publicKey;

    console.log('Payer public key (from private key):', payer.publicKey.toBase58());
    console.log('Creator public key (for metadata):', actualCreatorPublicKey.toBase58());
    console.log('New Mint public key:', mintKeypair.publicKey.toBase58());

    // If ipfsUrl is provided, use it directly
    let videoIpfsUrl = ipfsUrl;

    const isVideo = true; // Assume always video for this use case
    const metadata = {
        name,
        symbol,
        description,
        image: videoIpfsUrl,
        animation_url: videoIpfsUrl,
        external_url: "",
        attributes: [
            { trait_type: "File Type", value: "Video" }
        ],
        properties: {
            files: [{
                uri: videoIpfsUrl,
                type: mimetype || 'video/mp4'
            }],
            category: "video",
            creators: [
                { address: actualCreatorPublicKey.toBase58(), share: 100 }
            ]
        },
        seller_fee_basis_points: royaltyBasisPoints,
    };

    const metadataBuffer = Buffer.from(JSON.stringify(metadata, null, 2));
    const metadataFileName = `${name.replace(/\s+/g, '_')}_metadata.json`;

    // 2. Create Mint Account and Initialize Mint
    const lamports = await getMinimumBalanceForRentExemptMint(connection);
    const createMintAccountIx = SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: MINT_SIZE,
        lamports,
        programId: TOKEN_PROGRAM_ID,
    });
    const initializeMintIx = createInitializeMintInstruction(
        mintKeypair.publicKey,
        0, // 0 decimals for NFT
        payer.publicKey, // Mint authority
        payer.publicKey  // Freeze authority (optional, can be null)
    );

    // 3. Create Associated Token Account for the creator
    const associatedTokenAccount = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        payer.publicKey
    );
    const createAtaIx = createAssociatedTokenAccountInstruction(
        payer.publicKey,
        associatedTokenAccount,
        payer.publicKey,
        mintKeypair.publicKey
    );

    // 4. Mint 1 token to the Associated Token Account
    const mintToIx = createMintToInstruction(
        mintKeypair.publicKey,
        associatedTokenAccount,
        payer.publicKey, // Mint authority
        1 // Amount (1 for NFT)
    );

    // 5. Create Metadata Account
    const metadataAccount = PublicKey.findProgramAddressSync(
        [
            Buffer.from('metadata'),
            TOKEN_METADATA_PROGRAM_ID.toBuffer(),
            mintKeypair.publicKey.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
    )[0];

    const creators: Creator[] = [
        { 
            address: actualCreatorPublicKey, 
            verified: actualCreatorPublicKey.equals(payer.publicKey), // Only set to true if creator is the payer
            share: 100 
        }
    ];

    const metadataV3Args: CreateMetadataAccountArgsV3 = {
        data: {
            name,
            symbol,
            uri: metadataFileName,
            sellerFeeBasisPoints: royaltyBasisPoints,
            creators: creators,
            collection: null, // Set to null if not part of a collection
            uses: null,       // Set to null if not using uses
        },
        isMutable: true,
        collectionDetails: null, // For non-collection NFTs or if not setting details now
    };

    const createMetadataIx = createCreateMetadataAccountV3Instruction(
        {
            metadata: metadataAccount,
            mint: mintKeypair.publicKey,
            mintAuthority: payer.publicKey,
            payer: payer.publicKey,
            updateAuthority: payer.publicKey,
            systemProgram: SystemProgram.programId, // Required for v2
        },
        { createMetadataAccountArgsV3: metadataV3Args }
    );

    // 6. Create Master Edition Account (marks the NFT as a Master Edition)
    const masterEditionAccount = PublicKey.findProgramAddressSync(
        [
            Buffer.from('metadata'),
            TOKEN_METADATA_PROGRAM_ID.toBuffer(),
            mintKeypair.publicKey.toBuffer(),
            Buffer.from('edition'),
        ],
        TOKEN_METADATA_PROGRAM_ID
    )[0];

    const createMasterEditionIx = createCreateMasterEditionV3Instruction(
        {
            edition: masterEditionAccount,
            mint: mintKeypair.publicKey,
            updateAuthority: payer.publicKey,
            mintAuthority: payer.publicKey,
            payer: payer.publicKey,
            metadata: metadataAccount,
            tokenProgram: TOKEN_PROGRAM_ID, // Required for v2
            systemProgram: SystemProgram.programId, // Required for v2
            // rent: SYSVAR_RENT_PUBKEY, // May be needed
        },
        { createMasterEditionArgs: { maxSupply: null } }
    );

    // Build and send transaction
    const addPriorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 10000, // Increased to 10000 microLamports. Adjust as needed.
    });

    const transaction = new Transaction().add(
        addPriorityFeeIx, // Add priority fee instruction first
        createMintAccountIx,
        initializeMintIx,
        createAtaIx,
        mintToIx,
        createMetadataIx,
        createMasterEditionIx
    );

    try {
        const signature = await sendAndConfirmTransaction(
            connection,
            transaction,
            [payer, mintKeypair], // Signers: payer and the new mint account
            { commitment: 'confirmed', preflightCommitment: 'confirmed' } // Added preflightCommitment
        );
        console.log('NFT Minted Successfully! Signature:', signature);
        console.log('Mint Address:', mintKeypair.publicKey.toBase58());
        return mintKeypair.publicKey.toBase58();
    } catch (error) {
        console.error('Error minting NFT:', error);
        throw error;
    }
};