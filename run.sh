#!/bin/bash

export PATH=$PATH:node_modules/.bin

#npm install
npm run clean
npm run tsc

egg-scripts stop --title=egg-plugin-tmp
egg-scripts start --port=7001   --daemon  --title=egg-plugin-tmp --workers=1


