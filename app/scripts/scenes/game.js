import {WIDTH, HEIGHT} from '@/constants/grid';

const generateGuid = () => {
  let result = '';
  for (let j = 0; j < 32; j++) {
    if (j === 8 || j === 12 || j === 16 || j === 20) {
      result += '-';
    }
    result += Math.floor(Math.random() * 16).toString(16).toUpperCase();
  }
  return result;
};

export default class Game extends Phaser.Scene {
  /**
   *  The main game scene. It spawns the other two game scenes in parallel.
   *  One is the score board, showing the player points and the eventual 'GAME
   *  OVER' message. The other is the grid where the actual game action
   *  happens. Player input and game logic updates are handled here.
   *
   *  This scene emits two events:
   *    - `next-player`: When it is the next player's turn.
   *    - `apple-eaten`: When a food gets eaten by the worm.
   *    - `worm-died`: When one of the worms died.
   *    - `game-over`: When the game has ended.
   *
   *  Those events are used to update the score board.
   *
   *  @extends Phaser.Scene
   */
  constructor() {
    super({key: 'Game'});
  }

  /**
   *  Called when this scene is initialized.
   *
   *  @protected
   *  @param {object} [data={}] - Initialization parameters.
   */
  init(/* data */) {
    this.gameId = generateGuid();
    this.timelimit = 0.5;
    this.curPlayer = 1;
    this.turns = 0;
    this.agents = [
      {},
      {id: 1, address: undefined, active: false, socket: undefined, worm: undefined, points: 0},
      {id: 2, address: undefined, active: false, socket: undefined, worm: undefined, points: 0}
    ];

    this.msgQueue = [];
  }

  /**
   *  Responsible for setting up game objects on the screen.
   *
   *  @protected
   *  @param {object} [data={}] - Initialization parameters.
   */
  create(/* data */) {
    //  Get a reference of the scenes to start.
    const scoreboard = this.scene.get('Scoreboard');
    const grid = this.scene.get('Grid');

    //  Run both scenes in parallel.
    this.scene
      .launch(scoreboard, {gameScene: this})
      .launch(grid);

    //  Add the game objects to the grid scene.
    let center = [Math.floor(WIDTH / 2), Math.floor(HEIGHT / 2)];
    this.apples = grid.addApples(center[0], center[1]);
    this.laser = grid.addLaser();
    this.agents[1].worm = grid.addWorm(4, Math.floor(HEIGHT / 2), 1);
    this.agents[2].worm = grid.addWorm(WIDTH - 7, Math.floor(HEIGHT / 2) + 1, 2);
    this.agents[2].worm.turnLeft();
    this.agents[2].worm.turnLeft();
    this.agents[2].worm.move();

    //  Create our keyboard controls.
    this.cursors = this.input.keyboard.addKeys({
      upKey: Phaser.Input.Keyboard.KeyCodes.UP,
      leftKey: Phaser.Input.Keyboard.KeyCodes.LEFT,
      rightKey: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      spaceBar: Phaser.Input.Keyboard.KeyCodes.SPACE
    });

    var agentConnections = this.agents.slice(1).map(agent => this.startConnection(agent));
    var self = this;
    Promise.all(agentConnections)
      .then(function (agents) {
        self.agents = [{}, ...agents];
        for (var agent of agents) {
          if (agent.socket) {
            // Inform agent about game rules and initial game state
            let msg = {
              type: 'start',
              player: agent.id,
              timelimit: self.timelimit,
              game: self.gameId,
              grid: [HEIGHT, WIDTH],
              players: [
                {
                  location: self.agents[1].worm.getGridLocation(),
                  orientation: self.agents[1].worm.getGridOrientation()
                },
                {
                  location: self.agents[2].worm.getGridLocation(),
                  orientation: self.agents[2].worm.getGridOrientation()
                }
              ],
              apples: self.apples.getGridLocation()
            };
            agent.socket.send(JSON.stringify(msg));

            // Listen for further messages from the agens
            agent.socket.addEventListener('message', (agent => function (event) {
              var msg = JSON.parse(event.data);
              console.log('Get msg from agent ' + agent.id, msg);
              if (msg.type === 'action') {
                if (self.curPlayer === agent.id) {
                  console.log('Received action from ACTIVE player ' + agent.id, msg);
                  self.updateLogic(agent.id, msg.action);
                } else {
                  console.log('Received action from NON-ACTIVE player ' + agent.id, msg);
                }
              }
              return false;
            })(agent));

            // Handle connectin shutdown
            agent.socket.addEventListener('close', (agent => function () {
              console.log('Closing connection to agent ' + agent.id);
            })(agent));

            // Handle connection errors
            agent.socket.addEventListener('error', (agent => function (event) {
              console.log('Error on connection to agent ' + agent.id, event);
            })(agent));
          }
        }
      })
      .catch(err => console.error(err));
  }

  /**
   *  Handles updates to game logic, physics and game objects.
   *
   *  @protected
   *  @param {number} time - Current internal clock time.
   *  @param {number} delta - Time elapsed since last update.
   */
  update(time, delta) {
    this.laser.update(time, delta);
    if (!this.agents[this.curPlayer].address 
      && this.agents[1].worm.updated
      && this.agents[2].worm.updated) {
      this.handleUserInput();
    }
  }
   
  //  ------------------------------------------------------------------------

  /**
   *  Handles user input.
   *
   *  @private
   */
  handleUserInput() {
    const {upKey, leftKey, rightKey, spaceBar} = this.cursors;

    //  Check which key was just pressed down, then change the direction the
    //  Worm is heading.
    if (Phaser.Input.Keyboard.JustDown(upKey)) {
      this.updateLogic(this.curPlayer, 'move');
    } else if (Phaser.Input.Keyboard.JustDown(leftKey)) {
      this.updateLogic(this.curPlayer, 'left');
    } else if (Phaser.Input.Keyboard.JustDown(rightKey)) {
      this.updateLogic(this.curPlayer, 'right');
    } else if (Phaser.Input.Keyboard.JustDown(spaceBar)) {
      this.updateLogic(this.curPlayer, 'fire');
    }
  }

  /**
   *  Updates game logic.
   *
   *  @private
   *  @param {number} player - The active player's ID.
   *  @param {String} action - The executed action.
   */
  updateLogic(player, action) {
    const worm = this.agents[player].worm;
    const otherWorm = this.agents[3 - this.curPlayer].worm;

    if (action === 'move') {
      worm.move();
    } else if (action === 'left') {
      worm.turnLeft();
    } else if (action === 'right') {
      worm.turnRight();
    } else if (action === 'fire') {
      worm.fire();
      var hit = this.laser.fire(worm.headPosition, worm.direction, otherWorm.headPosition);
      if (hit) {
        let lives = otherWorm.tag();
        this.events.emit('worm-hit', 3 - this.curPlayer, lives);
      }
    }

    if (worm.updated) {
      //  If the worm updated, we need to check for collision against apples.
      let appleEaten = this.apples.checkIfEaten(worm.headPosition);
      if (appleEaten) {
        this.updatePoints(this.curPlayer);
      }
    }

    this.turns += 1;
    if (worm.update()) {
      this.events.emit('worm-hit', player, worm.lives);
    }
    if (otherWorm.update()) {
      this.events.emit('worm-hit', 3 - player, otherWorm.lives);
    }
    this.apples.update();
    if (otherWorm.lives > 0) {
      this.curPlayer = 3 - this.curPlayer;
    }
    this.events.emit('next-player', this.curPlayer);

    let reply = {
      type: 'action',
      player: player,
      nextplayer: this.curPlayer,
      players: [
        {
          location: this.agents[1].worm.getGridLocation(),
          orientation: this.agents[1].worm.getGridOrientation(),
          score: this.agents[1].points
        },
        {
          location: this.agents[2].worm.getGridLocation(),
          orientation: this.agents[2].worm.getGridOrientation(),
          score: this.agents[2].points
        }
      ],
      apples: this.apples.getGridLocation(),
      game: this.gameId
    };
    this.sendToAgents(reply);
  }

  /**
   *  Announces game over.
   *
   *  @private
   */
  endGame() {
    this.events.emit('game-over');
  }

  /**
   *  Updates score points.
   *
   *  @param {number} agent - The ID of the agent which scored a point.
   *  @private
   */
  updatePoints(agent) {
    this.agents[agent].points += 1;
    this.events.emit('apple-eaten', agent, this.agents[agent].points);
  }

  startConnection(agent) {
    return new Promise(function (resolve, reject) {
      var address = document.getElementById('agent' + agent.id).value;
      console.log('Address agent' + agent.id + ': ' + address);
      if (address === '') {
        resolve(agent);
      } else {
        console.log('Starting websocket for agent ' + agent.id + ' on address ' + address);
        agent.address = address;
        agent.socket = new WebSocket(address);
        agent.socket.onopen = function () {
          console.log('Agent ' + agent.id + ' connected');
          agent.active = true;
          resolve(agent);
        };
        agent.socket.onerror = function (err) {
          reject(err);
        };
      }
    });
  }

  sendToAgents(msg) {
    this.msgQueue.push(JSON.stringify(msg));
    this.trySendingToAgents();
  }

  trySendingToAgents() {
    var allConnected = true;
    for (let i = 1; i < 3; i++) {
      if (this.agents[i].address !== undefined && this.agents[i].active === false) {
        allConnected = false;
        break;
      }
    }
    if (allConnected && this.agents[1].worm.updated && this.agents[2].worm.updated) {
      if (this.msgQueue.length === 0) {
        return;
      }
      var msg = this.msgQueue.shift();
      console.log('Send msg to agents', msg);
      for (let i = 1; i < 3; i++) {
        if (this.agents[i].active === true) {
          this.agents[i].socket.send(msg);
        }
      }
    } else {
      // Wait until all are connected
      setTimeout(this.trySendingToAgents.bind(this), 100);
    }
  }
}
