const bcrypt = require('bcryptjs');

const passphrase = process.argv[2];
if (process.argv.length !== 3 || passphrase.length < 20) {
  console.error("usage: node scripts/hash-password.js '<passphrase of at least 20 characters>'");
  process.exit(1);
}
console.log(bcrypt.hashSync(passphrase, 12));
