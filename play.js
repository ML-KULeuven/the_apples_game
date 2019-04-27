#!/usr/bin/env node

/**
 * Runs the apples game without a GUI. Each argument should correspond to the
 * websocket address of an agent.
 * e.g., `node play.js ws://localhost:8001 ws://localhost:8001`
 *
 * Note that running this script will likely print a "TypeError: Cannot read
 * property 'gl' of null" message. You can safely ignore this.
 */
const jsdom = require('jsdom');
const Datauri = require('datauri');
const datauri = new Datauri();
const {JSDOM} = jsdom;

// Since Node is for running javascript on a server, and not in a browser, it
// does not support running Phaser out of the box. We use jsdom to recreate most
// of the DOM javascript APIs from the browser.
JSDOM.fromFile('dist/index.html', {
  // To run the javascript code in the html file
  runScripts: 'dangerously',
  // Also load supported external resources
  resources: 'usable',
  // So requestAnimatingFrame events fire
  pretendToBeVisual: true
}).then(dom => {
  // Set the phaser config field 'Type' to 'Phaser.HEADLESS' (=3)
  dom.window.phaserType = 3;
  // jsdom doesn’t support the createObjectURL method
  // solution: use the dataURI package to return a URI representing 'blob'
  dom.window.URL.createObjectURL = blob => {
    if (blob) {
      return datauri.format(blob.type, blob[Object.getOwnPropertySymbols(blob)[0]]._buffer).content;
    }
  };
  dom.window.URL.revokeObjectURL = () => {};
  // neither does jsdom support 'scrollTo' and 'focus', but we don't need them
  dom.window.scrollTo = () => {};
  dom.window.focus = () => {};
  // pass the agent's addresses to the game
  dom.window.agents = [];
  var args = process.argv.slice(2);
  if (!isNaN(args[args.length - 1])) {
    dom.window.nb_apples = parseInt(args.pop(), 10);
  }
  for (var i = 0; i < args.length; i++) {
    dom.window.agents.push({id: i + 1, address: args[i]});
  }
  dom.window.gameOver = () => {
    process.exit(0);
  };
}).catch(error => {
  console.log(error.message);
  process.exit(1);
});
