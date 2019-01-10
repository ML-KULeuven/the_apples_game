import {WIDTH, LENGTH} from '@/constants/grid';
import fontConfig from '@/constants/bitmap-fonts';

export default class Scoreboard extends Phaser.Scene {
  /**
   *  Shows the scored points and the remaining lives of each player.
   *
   *  Upon initialization, it receives the host scene object and binds to its
   *  emitted events to receive updates.
   *
   *  @extends Phaser.Scene
   */
  constructor() {
    super({
      key: 'Scoreboard',

      //  Align the scene viewport to the top of the screen, with a margin of
      //  half the length of the grid unit (8px) around its edges.
      cameras: [{
        x: LENGTH / 2,
        y: LENGTH / 2,
        width: WIDTH * LENGTH,
        height: 3 * LENGTH
      }]
    });
  }

  /**
   *  Called when this scene is initialized.
   *
   *  @protected
   *  @param {object} data - Initialization parameters.
   *  @param {Game} data.gameScene - The host scene.
   */
  init({gameScene}) {
    //  Bind the maze events to update the score board.
    gameScene.events
      .on('next-player', player => this.setActivePlayer(player))
      .on('apple-eaten', (player, points) => this.setScore(player, points))
      .on('worm-hit', (player, lives) => this.setLives(player, lives))
      .on('game-over', () => this.showGameOver());
  }

  /**
   *  Responsible for setting up game objects on the screen.
   *
   *  @protected
   *  @param {object} [data={}] - Initialization parameters.
   */
  create(/* data */) {
    this.scoreLabelP1 = this.add.bitmapText(0, 0, fontConfig.image, 'P1');
    this.scoreP1 =
      this.add.bitmapText(60, 0, fontConfig.image, '0')
        .setTint(0x003300);
    this.livesP1 = this.add.group({
      key: 'heart',
      maxSize: 2,
      repeat: 1,
      setXY: {x: LENGTH / 2, y: 30, stepX: LENGTH}
    });

    this.scoreLabelP2 =
      this.add.bitmapText(WIDTH * LENGTH, 0, fontConfig.image, 'P2')
        .setOrigin(1, 0);
    this.scoreP2 =
      this.add.bitmapText((WIDTH * LENGTH) - 60, 0, fontConfig.image, '0')
        .setOrigin(1, 0)
        .setTint(0x003300);
    this.livesP2 = this.add.group({
      key: 'heart',
      maxSize: 2,
      repeat: 1,
      setXY: {x: ((WIDTH * LENGTH) - (LENGTH / 2)), y: 30, stepX: -LENGTH}
    });

    this.gameOverLabel =
      this.add.bitmapText((WIDTH * LENGTH) / 2, 0, fontConfig.image, 'GAME OVER')
        .setOrigin(0.5, 0)
        .setTint(0x003300)
        .setVisible(false);

    this.setActivePlayer(1);
  }

  //  -------------------------------------------------------------------------

  /**
   *  Updates the active player indicator.
   *
   *  @param {number} player - The active player id.
   *  @private
   */
  setActivePlayer(player) {
    this.scoreLabelP1.tint = 0x003300;
    this.scoreLabelP2.tint = 0x003300;
    if (player === 1) {
      this.scoreLabelP1.tint = 0xE5C787;
    } else if (player === 2) {
      this.scoreLabelP2.tint = 0x7F6F60;
    }
  }

  /**
   *  Updates the displayed game score.
   *
   *  @param {number} player - The player id.
   *  @param {number} points - How many points the player scored.
   *  @private
   */
  setScore(player, points) {
    if (player === 1) {
      this.scoreP1.setText(String(points));
    } else if (player === 2) {
      this.scoreP2.setText(String(points));
    }
  }

  /**
   *  Updates the displayed remaining lives.
   *
   *  @param {number} player - The player id.
   *  @param {number} lives - How many lives the player has.
   *  @private
   */
  setLives(player, lives) {
    let group;
    if (player === 1) {
      group = this.livesP1;
    } else if (player === 2) {
      group = this.livesP2;
    }
    for (var i = 0, len = group.children.size; i < len; i++) {
      if (i < lives) {
        group.children.entries[i].visible = true;
      } else {
        group.children.entries[i].visible = false;
      }
    }
  }

  /**
   *  Displays the 'GAME OVER' message.
   *
   *  @private
   */
  showGameOver() {
    this.gameOverLabel.setVisible(true);
  }
}
