#!/usr/bin/env node

import * as oclif from '@oclif/core';
import flush from '@oclif/core/flush';
// @ts-expect-error Handle is a pure JS file
import handle from '@oclif/core/handle';

oclif.run().then(flush).catch(handle);
