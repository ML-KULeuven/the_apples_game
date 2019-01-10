import {WIDTH, HEIGHT, LENGTH} from '@/constants/grid';
import {N, LIVES} from '@/constants/worm';

export default class Worm {
  /**
   *  Handles the logic and appearance of the worms in the grid.
   *
   *  @param {Phaser.Scene} scene - The scene that owns this object.
   *  @param {number} x - The horizontal coordinate relative to the scene viewport.
   *  @param {number} y - The vertical coordinate relative to the scene viewport.
   *  @param {number} id - The player id.
   */
  constructor(scene, x, y, id) {
    this.scene = scene;

    // Create sprites
    this.body = scene.add.group({
      defaultKey: 'body' + id,
      createCallback: o => o.setOrigin(0.5)
    });
    this.head = this.body.create((x * LENGTH) + (LENGTH / 2), (y * LENGTH) + (LENGTH / 2), 'head' + id);

    // Position on the grid
    this.direction = new Phaser.Geom.Point(LENGTH, 0);
    this.headPosition = new Phaser.Geom.Point(0, 0);
    this.tailPosition = new Phaser.Geom.Point(0, 0);
    this.move();
    this.grow();
    this.move();
    this.grow();

    // Instance variables
    this.lives = LIVES;
    this.n = 0;
    this.N = parseInt(document.getElementById('n_tagged').value, 10) || N;
    this.updated = true;
  }

  getGridLocation() {
    return [Math.ceil(this.headPosition.x / LENGTH), Math.ceil(this.headPosition.y / LENGTH)];
  }

  getGridOrientation() {
    if (this.direction.x < 0 && this.direction.y === 0) {
      return 'left';
    }
    if (this.direction.x > 0 && this.direction.y === 0) {
      return 'right';
    }
    if (this.direction.x === 0 && this.direction.y < 0) {
      return 'up';
    }
    if (this.direction.x === 0 && this.direction.y > 0) {
      return 'down';
    }
    return undefined;
  }

  /**
   *  Makes the worm rotate counter clockwise on the next update.
   *
   *  @public
   */
  turnLeft() {
    if (this.updated) {
      this.direction.setTo(this.direction.y, -this.direction.x);
      this.head.angle -= 90;

      this.updated = false;
      this.move();
    }
  }

  /**
   *  Makes the worm rotate clockwise on the next update.
   *
   *  @public
   */
  turnRight() {
    if (this.updated) {
      this.direction.setTo(-this.direction.y, this.direction.x);
      this.head.angle += 90;

      this.updated = false;
      this.move();
    }
  }

  /**
   *  Moves the worm segments around the maze.
   *
   *  @private
   *  @returns {boolean} Whether the worm has moved or not.
   */
  move() {
    //  Update the worm position according to the direction the player wants
    //  it to move to. The `Math.Wrap` function call allows the worm to wrap
    //  around the screen edges, so when it goes off any side it should
    //  re-appear on the opposite side.
    this.headPosition.setTo(
      Phaser.Math.Wrap(this.head.x + this.direction.x, 0, WIDTH * LENGTH),
      Phaser.Math.Wrap(this.head.y + this.direction.y, 0, HEIGHT * LENGTH)
    );

    //  Update the body segments and place the last coordinate into
    //  `this.tailPosition`.
    Phaser.Actions.ShiftPosition(
      this.body.children.entries,
      this.headPosition.x,
      this.headPosition.y,
      1,
      this.tailPosition
    );

    this.updated = true;

    return true;
  }

  /**
   *  Adds a new segment to the worm.
   *
   *  @private
   */
  grow() {
    this.body.create(this.tailPosition.x, this.tailPosition.y);
  }

  tag() {
    this.updated = false;
    this.scene.tweens.add({

      // adding the knife to tween targets
      targets: [this.head, ...this.body.getChildren()],

      // y destination
      alpha: 0.5,
      ease: 'Bounce',
      yoyo: true,

      // tween duration
      duration: 500,

      // callback scope
      callbackScope: this,

      // function to be executed once the tween has been completed
      onComplete: function () {
        if (this.lives === 0) {
          this.die();
        }
        this.alpha = 1;
        this.updated = true;
      }
    });

    this.lives -= 1;
    return this.lives;
  }

  fire() {
    this.updated = false;
    this.scene.tweens.add({

      // adding the knife to tween targets
      targets: [this.head],

      // y destination
      x: (this.head.x - (this.direction.x / LENGTH * 5)),
      y: (this.head.y - (this.direction.y / LENGTH * 5)),
      ease: 'Linear',
      yoyo: true,

      // tween duration
      duration: 200,

      // callback scope
      callbackScope: this,

      // function to be executed once the tween has been completed
      onComplete: function () {
        this.updated = true;
      }
    });
  }

  /**
   *  Kill this worm.
   *
   *  @private
   *  @returns {boolean} Whether the worm was killed or not.
   */
  die() {
    this.body.toggleVisible();
    this.n = this.N;
    return true;
  }

  /**
   *  Updates the worm in the grid.
   *
   *  @public
   *  @returns {boolean} Whether the worm updated or not.
   */
  update() {
    if (this.n > 0) {
      this.n -= 1;
      if (this.n === 0) {
        this.body.toggleVisible();
        this.lives = LIVES;
        return true;
      }
    }
    return false;
  }
}
