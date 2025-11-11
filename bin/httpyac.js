#!/usr/bin/env node

require('events').EventEmitter.defaultMaxListeners = 20;

const { cli } = require('../dist/index');
cli.execute(process.argv);
