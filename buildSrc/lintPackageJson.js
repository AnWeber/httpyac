// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');

const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));

if (packageJson.main !== './dist/index.js') {
  throw new Error('main entrypoint invalid');
}

if (packageJson.types !== './dist/index.d.ts') {
  throw new Error('types entrypoint invalid');
}
