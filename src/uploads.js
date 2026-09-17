const fs = require('node:fs');
const path = require('node:path');
const { UPLOAD_DIR } = require('./db');

// R2 (or any S3-compatible bucket) keeps uploads alive across deploys on hosts with no persistent
// disk. Without these vars set, files go to the local UPLOAD_DIR instead - what local dev and the
// tests use.
const useR2 = Boolean(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET && process.env.R2_PUBLIC_URL);

let s3;
function client() {
  if (!s3) {
    const { S3Client } = require('@aws-sdk/client-s3');
    s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY }
    });
  }
  return s3;
}

// name is the server-generated random file name (e.g. "<hex>.png"), never a name a caller chooses.
async function save(name, buffer) {
  if (!useR2) {
    await fs.promises.writeFile(path.join(UPLOAD_DIR, name), buffer, { flag: 'wx' });
    return '/uploads/' + name;
  }
  const { PutObjectCommand } = require('@aws-sdk/client-s3');
  await client().send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: name,
    Body: buffer,
    ContentType: mimeFromExt(path.extname(name)),
    CacheControl: 'public, max-age=31536000, immutable'
  }));
  return process.env.R2_PUBLIC_URL.replace(/\/+$/, '') + '/' + name;
}

function mimeFromExt(ext) {
  return { '.jpg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' }[ext] || 'application/octet-stream';
}

module.exports = { save };
