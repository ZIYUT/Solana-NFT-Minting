import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(express.json());

// Import all the route handlers
const mintRoutes = require('./routes/mintRoutes');
import paymentRoutes from './routes/paymentRoutes';
import transactionRoutes from './routes/transactionRoutes';
import transferRoutes from './routes/transferRoutes';
import royaltyRoutes from './routes/royaltyRoutes';
const pinataJwtRoutes = require('./routes/pinataJwtRoutes');

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
apiRouter.use('/', pinataJwtRoutes);

// Mount the main API router to the /api path
app.use('/api', apiRouter);

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
});

// Export the app for Vercel
export default app;