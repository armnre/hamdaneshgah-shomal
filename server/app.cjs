// Plesk "Application Startup File". Phusion Passenger loads CommonJS, so this boots the ESM bundle.
require('dotenv').config();
import('./dist/server.mjs').catch((e) => {
  console.error(e);
  process.exit(1);
});
