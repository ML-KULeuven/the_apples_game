import {WIDTH, LENGTH} from '@/constants/grid';
import fontConfig from '@/constants/bitmap-fonts';
import {COLORS} from '@/constants/worm';

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
    this.activePlayer = 1;
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
      .on('next-player', (player, points) => {
        this.setActivePlayer(player);
        this.setScore(player, points);
      })
      .on('apple-eaten', (player, points) => this.setScore(player, points))
      .on('worm-fired', (player, points) => this.setScore(player, points))
      .on('worm-hit', (player, points) => this.setScore(player, points))
      .on('game-over', () => this.showGameOver());
  }

  /**
   *  Responsible for setting up game objects on the screen.
   *
   *  @protected
   *  @param {object} [data={}] - Initialization parameters.
   */
  create(/* data */) {
    this.scoreLabel = this.add.bitmapText(0, 0, fontConfig.image, 'P1');
    this.score =
      this.add.bitmapText(60, 0, fontConfig.image, '0')
        .setTint(0x003300);

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
    this.activePlayer = player;
    this.scoreLabel.setText('P' + String(player));
    this.scoreLabel.tint = COLORS[player];
  }

  /**
   *  Updates the displayed game score.
   *
   *  @param {number} player - The player id.
   *  @param {number} points - How many points the player scored.
   *  @private
   */
  setScore(player, points) {
    if (player === this.activePlayer) {
      this.score.setText(String(points));
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
