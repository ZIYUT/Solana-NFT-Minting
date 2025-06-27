import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(express.json());

// Import all the route handlers
import mintRoutes from './routes/mintRoutes';
import paymentRoutes from './routes/paymentRoutes';
import transactionRoutes from './routes/transactionRoutes';
import transferRoutes from './routes/transferRoutes';
import royaltyRoutes from './routes/royaltyRoutes';

// Create a main router for all /api endpoints
const apiRouter = express.Router();

// Health check endpoint
apiRouter.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'API is healthy' });
});

// Root of the API
apiRouter.get('/', (req, res) => {
  res.send('Solana Native NFT Minting API is running!');
});

// Mount all the specific routers onto the main API router
apiRouter.use('/', mintRoutes); // Handles endpoints like /mint
apiRouter.use('/', paymentRoutes); // Handles endpoints like /verify-payment
apiRouter.use('/transactions', transactionRoutes);
apiRouter.use('/transfer', transferRoutes);
apiRouter.use('/', royaltyRoutes);

// Mount the main API router to the /api path
app.use('/api', apiRouter);

// Export the app for Vercel
export default app;