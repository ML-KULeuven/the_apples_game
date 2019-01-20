/*
 *  `app` module
 *  ============
 *
 *  Provides the game initialization routine.
 */

import 'phaser';
//  Import game instance configuration.
import * as config from '@/config';

//  Boot the game.
export function boot() {
  return new Phaser.Game(config);
}

boot();
