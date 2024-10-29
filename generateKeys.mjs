import nacl from 'tweetnacl';

// تولید کلید خصوصی و عمومی با Ed25519
const keyPair = nacl.sign.keyPair();

const privateKey = Buffer.from(keyPair.secretKey).toString('hex');
const publicKey = Buffer.from(keyPair.publicKey).toString('hex');

console.log("Private Key:", privateKey);
console.log("Public Key:", publicKey);
