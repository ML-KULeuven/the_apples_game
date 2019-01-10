import {WIDTH, HEIGHT, LENGTH} from '@/constants/grid';

export default class Laser extends Phaser.GameObjects.Image {
  /**
   *  A laser beam fired by a worm.
   *
   *  @param {Phaser.Scene} scene - The scene that owns this image.
   *  @extends Phaser.GameObjects.Image
   */
  constructor(scene) {
    super(scene);

    this.maxDuration = 100;
    this.freq = 80; // The frequency (4) = the number of waves
    this.sin = Phaser.Math.SinCosTableGenerator(880, 3, 1, this.freq).sin;
    this.bmd = scene.add.graphics();

    this.active = false;
    this.duration = this.maxDuration;
  }

  /**
   *  Initializes the laser beam to the given location.
   *
   *  @public
   *  @param {Phaser.Geom.Point} posFiring - Position of the worm firing.
   *  @param {Phaser.Geom.Point} dirFiring - The direction which the firing worm faces.
   *  @param {Phaser.Geom.Point} posTarget - Position of the other worm.
   *  @returns {boolean} Whether the laser updated or not.
   */
  fire(posFiring, dirFiring, posTarget) {
    var hit = false;
    if (dirFiring.y === 0) {
      this.direction = 'H';
      this.y = posFiring.y;
      if (dirFiring.x > 0) {
        this.x0 = posFiring.x;
        if (posFiring.y === posTarget.y && posFiring.x < posTarget.x) {
          hit = true;
          this.x1 = posTarget.x;
        } else {
          this.x1 = WIDTH * LENGTH;
        }
      } else {
        if (posFiring.y === posTarget.y && posTarget.x < posFiring.x) {
          hit = true;
          this.x0 = posTarget.x;
        } else {
          this.x0 = 0;
        }
        this.x1 = posFiring.x;
      }
    } else {
      this.direction = 'V';
      this.x = posFiring.x;
      if (dirFiring.y > 0) {
        this.y0 = posFiring.y;
        if (posFiring.x === posTarget.x && posFiring.y < posTarget.y) {
          hit = true;
          this.y1 = posTarget.y;
        } else {
          this.y1 = HEIGHT * LENGTH;
        }
      } else {
        if (posFiring.x === posTarget.x && posTarget.y < posFiring.y) {
          hit = true;
          this.y0 = posTarget.y;
        } else {
          this.y0 = 0;
        }
        this.y1 = posFiring.x;
      }
    }
    this.active = true;
    return hit;
  }

  /**
   *  Updates the laser beam animation.
   *
   *  @public
   *  @param {number} time - The current game clock value.
   *  @param {number} delta - Time since previous update.
   *  @returns {boolean} Whether the laser updated or not.
   */
  update(time, delta) {
    if (this.active) {
      this.bmd.clear();
      this.bmd.lineStyle(1, 0xFFFFFF, 1.0);
      this.bmd.fillStyle(0xFFFFFF, 1.0);
      if (this.direction === 'H') {
        for (let i = this.x0; i < this.x1 - this.freq + (LENGTH / 2); i++) {
          this.bmd.fillRect(i + (time % this.freq), this.y + this.sin[i], 2, 1);
        }
      } else {
        for (let i = this.y0; i < this.y1 - this.freq + (LENGTH / 2); i++) {
          this.bmd.fillRect(this.x + this.sin[i], i + (time % this.freq), 2, 1);
        }
      }
      this.duration -= delta;
      if (this.duration <= 0) {
        this.active = false;
        this.duration = this.maxDuration;
        this.bmd.clear();
      }
      return true;
    }
    return false;
  }
}
