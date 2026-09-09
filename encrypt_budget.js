// encrypt_budget.js — 用预算密码把 budget_secret.json 里的明文预算加密成 budget.enc.json
// 算法：PBKDF2(SHA-256, 100000 次) 派生 256 位密钥 + AES-256-GCM。
// 密码与明文预算只存在于 budget_secret.json（已 gitignore），永不进入仓库。
const fs = require('fs');
const crypto = require('crypto');

const secret = JSON.parse(fs.readFileSync('budget_secret.json', 'utf8'));
const password = String(secret.password);
const budget = secret.budget;

const salt = crypto.randomBytes(16);
const iterations = 100000;
const key = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
const iv = crypto.randomBytes(12);

const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
const plaintext = Buffer.from(JSON.stringify(budget), 'utf8');
const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
const tag = cipher.getAuthTag();

const out = {
  salt: salt.toString('base64'),
  iv: iv.toString('base64'),
  iter: iterations,
  data: Buffer.concat([ciphertext, tag]).toString('base64')
};
fs.writeFileSync('budget.enc.json', JSON.stringify(out) + '\n');
console.log('已加密预算 → budget.enc.json（密文', ciphertext.length, '字节）');
