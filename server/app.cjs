// Plesk "Application Startup File". Phusion Passenger loads CommonJS, so this boots the ESM bundle.
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
import('./dist/server.mjs').catch((e) => {
  console.error(e);
  process.exit(1);
});
