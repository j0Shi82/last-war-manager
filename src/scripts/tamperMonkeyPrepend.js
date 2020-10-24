const fs = require('fs');
const path = require('path');

const tmPrependString = fs.readFileSync(path.resolve(__dirname, '../tampermonkey.prepend'));
const bundleContent = fs.readFileSync(path.resolve(__dirname, '../../dist/last-war-manager.user.js'));

fs.writeFileSync(path.resolve(__dirname, '../../dist/last-war-manager.user.js'), tmPrependString);
fs.writeFileSync(path.resolve(__dirname, '../../dist/last-war-manager.user.js'), bundleContent, {
  flag: 'a',
});
