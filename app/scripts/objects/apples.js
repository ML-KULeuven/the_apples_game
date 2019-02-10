import {LENGTH, WIDTH, HEIGHT} from '@/constants/grid';

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
    scene.add.existing(this);
  }

  /**
   *  Eat this apple.
   *
   *  @public
   *  @returns {boolean} Whether the apple was eaten or not.
   */
  eat() {
    this.setVisible(false);
    return true;
  }

  getGridLocation() {
    return [Math.ceil(this.x / LENGTH), Math.ceil(this.y / LENGTH)];
  }
}

function bestCandidateSampler(width, height, numCandidates, numSamplesMax) {
  var numSamples = 0;

  var quadtree = [[Math.random() * width, Math.random() * height]];

  return function () {
    if (++numSamples > numSamplesMax) {
      return;
    }
    var bestCandidate = 0;
    var bestDistance = 0;
    for (var i = 0; i < numCandidates; ++i) {
      var c = [Math.random() * width, Math.random() * height];
      var closest = quadtree.slice(1).reduce(function (min, p) {
        if (distance(c, p) < min.d) {
          min.point = p;
          min.d = distance(c, p);
        }
        return min;
      }, {point: quadtree[0], d: distance(quadtree[0], c)});
      if (closest.d > bestDistance) {
        bestDistance = closest.d;
        bestCandidate = c;
      }
    }
    quadtree.push(bestCandidate);
    return bestCandidate;
  };
}

function distance(a, b) {
  // euclididan distance in a torus world
  let dx = Math.abs(a[0] - b[0]);
  if (dx > WIDTH / 2) {
    dx = WIDTH - dx;
  }
  let dy = Math.abs(a[1] - b[1]);
  if (dy > HEIGHT / 2) {
    dy = HEIGHT - dy;
  }
  return (dx * dx) + (dy * dy);
}

export default class Apples extends Phaser.GameObjects.Group {
  /**
   *  A group of apples to be eaten by the worms.
   *
   *  @param {Phaser.Scene} scene - The scene that owns this group.
   *  @param {number} n - The number of patches on the field.
   *  @extends Phaser.GameObjects.Image
   */
  constructor(scene, n) {
    super(scene);
    this.nb_apples = n;
    // Create apples only once and store references in a 2D structure
    this.apples = new Array(HEIGHT);
    for (var y = 0; y < HEIGHT; y++) {
      this.apples[y] = new Array(WIDTH);
      for (var x = 0; x < WIDTH; x++) {
        let apple = new Apple(scene, x, y);
        this.apples[y][x] = apple;
        apple.setVisible(false);
      }
    }
    // And show a ranomly evenly distributed set of n apples
    let sample = bestCandidateSampler(WIDTH, HEIGHT, 100, n);
    for (let i = 0; i < n; i++) {
      let location = sample().map(Math.floor);
      let apple = this.apples[location[1]][location[0]];
      apple.setVisible(true);
    }
  }

  /**
   *  Updates the apples in the grid.
   *
   *  @public
   *  @returns {boolean} Whether an apple updated or not.
   */
  update() {
    for (var x = 0; x < WIDTH; x++) {
      for (var y = 0; y < HEIGHT; y++) {
        if (this.apples[y][x].visible) {
          continue;
        }
        let nbNeighbors = 0;
        for (var nbx = -2; nbx <= 2; nbx++) {
          for (var nby = -2; nby <= 2; nby++) {
            if (nbx === 0 && nby === 0) {
              continue;
            }
            let newX = Phaser.Math.Wrap(x + nbx, 0, WIDTH);
            let newY = Phaser.Math.Wrap(y + nby, 0, HEIGHT);
            if (distance([x,y], [newX, newY]) <= 2 && this.apples[newY][newX].visible) {
              nbNeighbors++;
            }
          }
        }
        let P;
        switch (nbNeighbors) {
        case 0:
          P = 0;
          break;
        case 1:
          P = 0.005;
          break;
        case 2:
          P = 0.02;
          break;
        default:
          P = 0.05;
        }
        if (Math.random() < P) {
          let apple = this.apples[y][x];
          apple.setVisible(true);
          this.nb_apples++;
        }
      }
    }
    return true;
  }

  checkIfEaten(snakePosition) {
    let apple = this.apples[Math.floor(snakePosition.y / LENGTH)][Math.floor(snakePosition.x / LENGTH)];
    if (apple.visible) {
      apple.eat();
      this.nb_apples--;
      return true;
    }
    return false;
  }

  checkIfAllEaten() {
    return this.nb_apples === 0;
  }

  getGridLocation() {
    return this.children.entries.filter(apple => apple.visible).map(apple => apple.getGridLocation());
  }
}
