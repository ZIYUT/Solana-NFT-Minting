const bs58 = require('bs58');
const privateKeyBase58 = 'dYDxbbXoXrdLzLGFzjG9ums7TTpw3UZCY9B2kd5P9UYsbv2oR2RgQ9wPvU1cxudWLer2Qfo1eoPT2CDDu7Rjqa6'; // 替换成您的私钥
const privateKeyBytes = bs58.decode(privateKeyBase58);
console.log(JSON.stringify(Array.from(privateKeyBytes)));