import {WIDTH, HEIGHT, LENGTH} from '@/constants/grid';
import Apples from '@/objects/apples';
import Laser from '@/objects/laser';
import Worm from '@/objects/worm';

export default class Maze extends Phaser.Scene {
  /**
   *  Where the actual game play happens. Control and logic updates are
   *  handled by the Game scene, though.
   *
   *  @extends Phaser.Scene
   */
  constructor() {
    super({
      key: 'Grid',

      //  Make the viewport an exact fit of the game board, giving a margin of
      //  half the grid length (8px) around its edges.
      cameras: [{
        x: LENGTH / 2,
        y: 2 * LENGTH,
        width: WIDTH * LENGTH,
        height: HEIGHT * LENGTH
      }]
    });
  }

  create() {
    this.debug();
  }

  //  ------------------------------------------------------------------------

  /**
   *  Add N apple sprites centered around the given grid coordinates.
   *
   *  @protected
   *  @param {number} [x=0] - The horizontal grid coordinate of the center apple.
   *  @param {number} [y=x] - The vertical grid coordinate of the center apple.
   *  @return {Apples} A group with Apple sprites.
   */
  addApples(x = 0, y = x) {
    return new Apples(this, x, y);
  }

  /**
   *  Add the worm group at the given grid coordinates.
   *
   *  @protected
   *  @param {number} [x=0] - The horizontal grid coordinate.
   *  @param {number} [y=x] - The vertical grid coordinate.
   *  @param {number} [id=1] - The player id.
   *  @return {Worm} The worm sprite.
   */
  addWorm(x = 0, y = x, id = 1) {
    return new Worm(this, x, y, id);
  }

  /**
   *  Add a laser beam to the grid.
   *
   *  @protected
   *  @return {Laser} A Laser sprite.
   */
  addLaser() {
    return new Laser(this);
  }

  /**
   *  Draw all grid cells.
   *
   *  @private
   */
  debug() {
    let graphics = this.add.graphics();
    graphics.lineStyle(1, 0x00FF00, 0.5);
    for (let i = 0; i <= HEIGHT; i++) {
      graphics.lineBetween(0, i * LENGTH, WIDTH * LENGTH, i * LENGTH);
    }
    for (let i = 0; i <= WIDTH; i++) {
      graphics.lineBetween(i * LENGTH, 0, i * LENGTH, HEIGHT * LENGTH);
    }
  }
}