#!/bin/sh
node apps/worker/dist/index.js &
exec node apps/api/dist/index.js
