import {WIDTH, HEIGHT} from '@/constants/grid';
import {N} from '@/constants/apple';

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
   *    - `worm-fired`: When one of the worms fired.
   *    - `worm-hit`: When one of the worms was hit.
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
    this.curPlayer = 1;
    this.turns = 0;

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
    this.apples = grid.addApples(window.nb_apples || N);
    this.laser = grid.addLaser();
    if (window.agents === undefined) {
      window.agents = [
        {id: 1, address: '', active: false, socket: undefined, worm: undefined, points: 0},
        {id: 2, address: '', active: false, socket: undefined, worm: undefined, points: 0}
      ];
    }
    window.agents.forEach(agent => {
      let x = Math.floor(Math.random() * WIDTH);
      let y = Math.floor(Math.random() * HEIGHT);
      const directions = ['UP', 'RIGHT', 'LEFT', 'DOWN'];
      let dir = directions[Math.floor(Math.random() * directions.length)];
      agent.worm = grid.addWorm(x, y, dir, agent.id);
      agent.points = 0;
    });

    //  Create our keyboard controls.
    this.cursors = this.input.keyboard.addKeys({
      upKey: Phaser.Input.Keyboard.KeyCodes.UP,
      leftKey: Phaser.Input.Keyboard.KeyCodes.LEFT,
      rightKey: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      spaceBar: Phaser.Input.Keyboard.KeyCodes.SPACE
    });

    var agentConnections = window.agents.map(agent => this.startConnection(agent));
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
              game: self.gameId,
              grid: [WIDTH, HEIGHT],
              players: window.agents.map(agent => ({
                location: agent.worm.getGridLocation(),
                orientation: agent.worm.getGridOrientation()
              })),
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
    var allUpdated = window.agents.every(agent => agent.worm.updated !== false);
    if (!window.agents.find(agent => agent.id === this.curPlayer).address && allUpdated && !this.laser.active) {
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
   *  @return {bool} True if the game updated; false if it ended.
   */
  updateLogic(player, action) {
    const curPlayer = window.agents.find(agent => agent.id === player);
    const otherPlayers = window.agents.filter(agent => agent.id !== player);

    if (action === 'move') {
      curPlayer.worm.move();
    } else if (action === 'left') {
      curPlayer.worm.turnLeft();
    } else if (action === 'right') {
      curPlayer.worm.turnRight();
    } else if (action === 'fire') {
      curPlayer.worm.fire();
      curPlayer.points = Math.max(0, curPlayer.points - 1);
      this.events.emit('worm-fired', curPlayer.id, curPlayer.points);
      var hit = otherPlayers
        .map(otherPlayer => ({
          worm: otherPlayer.worm,
          distance: Phaser.Math.Distance.Between(
            curPlayer.worm.headPosition.x, curPlayer.worm.headPosition.y,
            otherPlayer.worm.headPosition.x, otherPlayer.worm.headPosition.y)
        }))
        .sort((a, b) => a.distance - b.distance)
        .find(otherPlayer => this.laser.fire(curPlayer.worm.headPosition, curPlayer.worm.direction, otherPlayer.worm.headPosition));
      if (hit) {
        hit.worm.tag();
        let hitPlayer = window.agents.find(agent => agent.id === hit.worm.id);
        hitPlayer.points = Math.max(0, hitPlayer.points - 50);
        this.events.emit('worm-hit', hit.id, hitPlayer.points);
      }
    }

    if (curPlayer.worm.updated) {
      //  If the worm updated, we need to check for collision against apples.
      let appleEaten = this.apples.checkIfEaten(curPlayer.worm.headPosition);
      if (appleEaten) {
        curPlayer.points += 1;
        this.events.emit('apple-eaten', curPlayer.id, curPlayer.points);
      }
    }

    if (this.apples.checkIfAllEaten()) {
      this.endGame();
      return false;
    }

    this.curPlayer = (this.curPlayer % window.agents.length) + 1;
    if (this.curPlayer === 1) {
      this.turns += 1;
      if (this.turns === 1000) {
        this.endGame();
        return false;
      }
      this.apples.update();
    }
    this.events.emit('next-player', this.curPlayer, window.agents.find(agent => agent.id === this.curPlayer).points);

    let reply = {
      type: 'action',
      player: player,
      nextplayer: this.curPlayer,
      players: window.agents.map(agent => ({
        location: agent.worm.getGridLocation(),
        orientation: agent.worm.getGridOrientation(),
        score: agent.points
      })),
      apples: this.apples.getGridLocation(),
      game: this.gameId
    };
    this.sendToAgents(reply);
    return true;
  }

  /**
   *  Announces game over.
   *
   *  @private
   */
  endGame() {
    this.events.emit('game-over');
    let sortedByScore = window.agents.sort(function (a, b) {
      return a.points < b.points ? -1 : 1;
    });
    let reply = {
      type: 'end',
      game: this.gameId,
      players: window.agents.map(agent => ({
        location: agent.worm.getGridLocation(),
        orientation: agent.worm.getGridOrientation(),
        score: agent.points
      })),
      apples: this.apples.getGridLocation(),
      winner: sortedByScore[sortedByScore.length - 1].id
    };
    this.sendToAgents(reply);
    this.scene
      .stop('Loader')
      .stop('Game')
      .stop('Scoreboard')
      .stop('Grid')
      .start('Loader');
  }

  startConnection(agent) {
    return new Promise(function (resolve, reject) {
      console.log('Address agent' + agent.id + ': ' + agent.address);
      if (agent.address === '') {
        resolve(agent);
      } else {
        console.log('Starting websocket for agent ' + agent.id + ' on address ' + agent.address);
        agent.socket = new WebSocket(agent.address);
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

  personalize(msg, agent) {
    // Make sure each agent can only  observe its local neighborhood
    let msgObj = JSON.parse(msg);
    let l = msgObj.players[agent.id - 1].location;
    function isInWindow(p) {
      let dx = Math.abs(l[0] - p[0]);
      if (dx > WIDTH / 2) {
        dx = WIDTH - dx;
      }
      let dy = Math.abs(l[1] - p[1]);
      if (dy > HEIGHT / 2) {
        dy = HEIGHT - dy;
      }
      return (dx <= 7 && dy <= 7);
    }
    msgObj.apples = msgObj.apples.filter(a => isInWindow(a));
    msgObj.players
      .filter(p => !isInWindow(p.location))
      .forEach(p => {
        p.location = ['?', '?'];
        p.orientation = '?';
      });
    return JSON.stringify(msgObj);
  }

  sendToAgents(msg) {
    this.msgQueue.push(JSON.stringify(msg));
    this.trySendingToAgents();
  }

  trySendingToAgents() {
    var allConnected = window.agents.every(agent => agent.address === undefined || agent.active !== false);
    var allUpdated = window.agents.every(agent => agent.worm.updated !== false);
    if (allConnected && allUpdated && !this.laser.active) {
      if (this.msgQueue.length === 0) {
        return;
      }
      var msg = this.msgQueue.shift();
      console.log('Send msg to agents', msg);
      window.agents
        .filter(agent => agent.active)
        .forEach(agent => agent.socket.send(this.personalize(msg, agent)));
    } else {
      // Wait until all are connected
      setTimeout(this.trySendingToAgents.bind(this), 100);
    }
  }
}
