const express = require('express');
const router = express.Router();

const PINATA_JWT = process.env.PINATA_JWT_SECRET;

router.get('/pinata-jwt', (req: any, res: any) => {
  if (!PINATA_JWT) {
    return res.status(500).json({ error: 'Pinata JWT not set in env' });
  }
  res.json({ token: PINATA_JWT });
});

module.exports = router; 