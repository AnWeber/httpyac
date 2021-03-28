#!/usr/bin/env node
"use strict";
const { cli } = require('../dist/index');
cli.send(process.argv);