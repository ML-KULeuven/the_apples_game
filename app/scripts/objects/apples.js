import {LENGTH} from '@/constants/grid';
import {N} from '@/constants/apple';

class Apple extends Phaser.GameObjects.Image {
  /**
   *  An apple to be eaten by the worms.
   *
   *  @param {Phaser.Scene} scene - The scene that owns this image.
   *  @param {number} x - The horizontal coordinate relative to the scene viewport.
   *  @param {number} y - The vertical coordinate relative to the scene viewport.
   *  @extends Phaser.GameObjects.Image
   */
  constructor(scene, x, y) {
    super(scene, (x * LENGTH) + (LENGTH / 2), (y * LENGTH) + (LENGTH / 2), 'food');
    this.setOrigin(0.5);
    this.setScale(0.8, 0.8);
    this.n = 0;
    this.N = parseInt(document.getElementById('n_apples').value, 10) || N;
    scene.add.existing(this);
  }

  /**
   *  Eat this apple.
   *
   *  @public
   *  @returns {boolean} Whether the apple was eaten or not.
   */
  eat() {
    if (this.visible) {
      this.visible = false;
      console.log(this.N);
      this.n = this.N;
      return true;
    }
    return false;
  }

  /**
   *  Updates the apple in the grid.
   *
   *  @public
   *  @returns {boolean} Whether the apple updated or not.
   */
  update() {
    if (this.n > 0) {
      this.n -= 1;
      if (this.n === 0) {
        this.visible = true;
        return true;
      }
    }
    return false;
  }

  getGridLocation() {
    return [Math.ceil(this.x / LENGTH), Math.ceil(this.y / LENGTH)];
  }
}

export default class Apples extends Phaser.GameObjects.Group {
  /**
   *  A group of apples to be eaten by the worms.
   *
   *  @param {Phaser.Scene} scene - The scene that owns this group.
   *  @param {number} cx - The horizontal coordinate relative to the scene viewport.
   *  @param {number} cy - The vertical coordinate relative to the scene viewport.
   *  @extends Phaser.GameObjects.Image
   */
  constructor(scene, cx, cy) {
    super(scene);
    for (let x = 0; x <= 5; x++) {
      for (let y = 5 - x; y >= 0; y--) {
        if (x === 0 && y === 0) {
          this.add(new Apple(scene, cx, cy));
        } else if (y === 0) {
          this.add(new Apple(scene, cx - x, cy));
          this.add(new Apple(scene, cx + x, cy));
        } else if (x === 0) {
          this.add(new Apple(scene, cx, cy + y));
          this.add(new Apple(scene, cx, cy - y));
        } else {
          this.add(new Apple(scene, cx + x, cy - y));
          this.add(new Apple(scene, cx + x, cy + y));
          this.add(new Apple(scene, cx - x, cy + y));
          this.add(new Apple(scene, cx - x, cy - y));
        }
      }
    }
  }

  /**
   *  Updates the apples in the grid.
   *
   *  @public
   *  @returns {boolean} Whether an apple updated or not.
   */
  update() {
    let updated = false;
    this.children.iterate(function (apple) {
      updated = apple.update() || updated;
    });
    return updated;
  }

  checkIfEaten(snakePosition) {
    let eat = false;
    this.children.iterate(function (apple) {
      if (apple.visible & snakePosition.x === apple.x && snakePosition.y === apple.y) {
        eat = true;
        apple.eat();
      }
    });
    return eat;
  }

  getGridLocation() {
    return this.children.entries.filter(apple => apple.visible).map(apple => apple.getGridLocation());
  }
}
