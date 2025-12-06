// server/utils/encryption.js
const crypto = require('crypto');

const algorithm = 'aes-256-ctr';
const secretKey = process.env.ENCRYPTION_KEY; // Must be 32 chars
const ivLength = 16;

if (!secretKey || secretKey.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be set in .env and be 32 characters long');
}

const encrypt = (text) => {
    const iv = crypto.randomBytes(ivLength);
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey), iv);
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);

    return {
        iv: iv.toString('hex'),
        content: encrypted.toString('hex')
    };
};

const decrypt = (hash) => {
    const decipher = crypto.createDecipheriv(
        algorithm, 
        Buffer.from(secretKey), 
        Buffer.from(hash.iv, 'hex')
    );
    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(hash.content, 'hex')), 
        decipher.final()
    ]);

    return decrypted.toString();
};

module.exports = { encrypt, decrypt };