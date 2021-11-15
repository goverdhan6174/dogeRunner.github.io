class Controller {
  constructor(context, onStartCb, onLoseCb, onPointUpdate) {
    this.context = context;
    this.height = this.context.canvas.height;
    this.width = this.context.canvas.width;
    this.playerStartCb = onStartCb;
    this.playerLoseCb = onLoseCb;
    this.playerUpdatePoint = onPointUpdate;
    this.canReset = false;
    this.points = 0;
    this.pointInterval = null;

    this.clashAudio = new Audio("Sounds/The Clash.mp3");
    this.countdownAudio = new Audio("Sounds/Time Countdown.mp3");
    this.loseAudio = new Audio("Sounds/Whining when you lose .mp3");

    this.activeKey = false;
    this.prevActiveKeyState = false;
    this.upKeyState = false;
    this.prevUpKeyState = false;

    this.ratio = 0.5625;
    this.gameVelocity = 0;
    this.gameState = "IDLE";

    this.playerMaxJumpFactor = 0.5;
    this.playerWidthFactor = 0.11;
    this.obstacleWidthFactor = 0.1;
    this.groundWidthFactor = 0.25;
    this.cloudWidthFactor = 0.15;
    this.collisionFactor = 0.9;

    this.playerCoordYOffset = 10;
    this.obstacleCoordYOffset = 0;

    this.countdownInterval = null;
    this.counterSpirt = [
      {
        image: document.getElementById("count3"),
      },
      {
        image: document.getElementById("count2"),
      },
      {
        image: document.getElementById("count1"),
      },
    ];
    this.counterFrameX = 350;
    this.counterFrameY = 400;
    this.counterFrameHeight = 280;
    this.counterFrameWidth = 280;
    this.counterSpirtFactor = 0.1;
    this.count = 0;

    this.gameLoseSpirt = [{ image: document.getElementById("gameover") }];
    this.gameLoseSpirtFactor = 0.7;

    this.cloudSpawnArea = 0.5 * this.height;
    this.init();
  }

  checkCollision(player, obstacle) {
    let XCollision = false;
    let YCollision = false;

    if (
      player.coordX < obstacle.coordX &&
      player.coordX + this.collisionFactor * player.spirtWidth > obstacle.coordX
    ) {
      XCollision = true;
    }

    if (
      // player.coordY < obstacle.coordY &&
      player.coordY + player.spirtHeight * this.collisionFactor >
      obstacle.coordY
    ) {
      YCollision = true;
    }

    return XCollision && YCollision;
  }

  init = () => {
    if (
      document.documentElement.clientWidth <
      document.documentElement.clientHeight
    ) {
      this.width = document.documentElement.clientWidth - 50;
    } else {
      this.width = document.documentElement.clientHeight - 50;
    }

    // this.height = this.width * this.ratio;
    this.width = document.documentElement.clientWidth;
    this.height = document.documentElement.clientHeight;
    this.context.imageSmoothingEnabled = false;
    this.context.canvas.setAttribute("height", this.height);
    this.context.canvas.setAttribute("width", this.width);
    this.counterSpirtSize = this.counterSpirtFactor * this.width;
    this.gameLoseSpirtWidth = this.gameLoseSpirtFactor * this.width;
    this.gameLoseSpirtHeight = this.gameLoseSpirtWidth / 2.6;
    this.playerWidth = this.playerWidthFactor * this.width;
    this.obstacleWidth = this.obstacleWidthFactor * this.width;
    this.groundWidth = this.groundWidthFactor * this.width;
    this.cloudWidth = this.cloudWidthFactor * this.width;
    this.playerMaxJump =
      this.obstacleWidth + this.obstacleWidth * this.playerMaxJumpFactor;

    this.ground = new Ground(this.groundWidth, this.width);
    this.clouds = new Clouds(this.cloudWidth, this.width, this.cloudSpawnArea);
    this.player = new Player(
      this.playerWidth,
      this.height,
      50,
      Ground.groundHeight - this.playerCoordYOffset,
      this.playerMaxJump
    );
    this.obstacles = new Obstacles(
      this.obstacleWidth,
      Ground.groundHeight - this.obstacleCoordYOffset,
      this.width,
      this.height
    );
  };

  inputHandler = (event) => {
    let keyState =
      event.type == "mousedown" || event.type == "touchstart" ? true : false;

    if (event.type == "keydown") {
      if (event.keyCode == 38 || event.keyCode == 32) {
        keyState = true;
      }
    }

    if (this.prevActiveKeyState != keyState) this.activeKey = keyState;
    this.prevActiveKeyState = keyState;

    let upKeyState =
      event.type == "mouseup" || event.type == "touchend" ? true : false;

    if (event.type == "keyup") {
      if (event.keyCode == 38 || event.keyCode == 32) {
        if (this.gameState == "IDLE") {
          this.start();
        }
        if (this.gameState == "LOSE") {
          if (this.canReset) {
            this.reset();
          }
        }
        upKeyState = true;
      }
    }

    if (this.prevUpKeyState != upKeyState) this.upKeyState = upKeyState;
    this.prevUpKeyState = upKeyState;
  };

  draw = () => {
    this.context.clearRect(0, 0, this.width, this.height);
    this.ground.draw(this.context);
    this.clouds.draw(this.context);
    if (this.gameState != "PLAY") {
      this.obstacles.draw(this.context);
    }
    this.player.draw(this.context);
    if (this.gameState == "COUNTDOWN") {
      let currentCounterSpirt = this.counterSpirt[this.count];
      if (currentCounterSpirt) {
        this.context.drawImage(
          currentCounterSpirt.image,
          this.counterFrameX,
          this.counterFrameY,
          this.counterFrameWidth,
          this.counterFrameHeight,
          this.width / 2 - this.counterSpirtSize / 2,
          this.height / 2 - this.counterSpirtSize / 2,
          this.counterSpirtSize,
          this.counterSpirtSize
        );
      }
    }
    if (this.gameState == "LOSE") {
      let currentCounterSpirt = this.gameLoseSpirt[0];
      if (currentCounterSpirt) {
        this.context.drawImage(
          currentCounterSpirt.image,
          this.width / 2 - this.gameLoseSpirtWidth / 2,
          this.height / 2 - this.gameLoseSpirtHeight / 2,
          this.gameLoseSpirtWidth,
          this.gameLoseSpirtHeight
        );
      }
    }
  };

  update = () => {
    if (this.gameState == "PLAY") {
      this.obstacles.update(this.gameVelocity, this.context);
      this.obstacles.obstacles.forEach((obstacle) => {
        let isCollisionDetected = this.checkCollision(this.player, obstacle);
        this.context.strokeRect(
          this.player.coordX,
          this.player.coordY,
          this.player.spirtWidth,
          this.player.spirtHeight
        );
        this.context.strokeRect(
          obstacle.coordX,
          obstacle.coordY,
          obstacle.spirtWidth,
          obstacle.spirtHeight
        );
        if (isCollisionDetected) {
          this.lose();
        }

        if (this.activeKey) {
          this.player.jump();
        }

        if (this.upKeyState) {
          this.player.falldown();
        }
      });
    }

    if (this.gameState == "LOSE") {
      // this.context.strokeRect(
      //   this.player.coordX,
      //   this.player.coordY,
      //   this.player.spirtWidth,
      //   this.player.spirtHeight
      // );
      // this.context.fill();
    }

    this.clouds.update(this.gameVelocity);
    this.ground.update(this.gameVelocity);
    this.player.update(this.gameVelocity);

    this.gameVelocity = this.gameVelocity + this.gameVelocity * 0.001;
  };

  setReset = () => {
    this.canReset = true;
  };

  reset = () => {
    if (this.gameState != "LOSE") return;

    this.canReset = false;
    this.gameState = "IDLE";
    this.gameVelocity = 0;
    this.count = 0;
    this.player.reset();
    this.obstacles.reset();
    this.playerUpdatePoint(this.points);
    this.start();
  };

  start = () => {
    if (this.gameState == "IDLE" || this.gameState == "LOSE") {
      this.playerStartCb();
      this.countdownAudio.play();
      this.countdownInterval = setInterval(() => {
        this.count++;
        if (this.count >= this.counterSpirt.length) {
          this.play();
          this.countdownAudio.pause();
          this.countdownAudio.currentTime = 0;
        }
      }, 1000);
      this.gameState = "COUNTDOWN";
      this.canReset = false;
    }
  };

  play = () => {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.player.start();
    this.gameState = "PLAY";
    this.gameVelocity = 40;
    this.pointInterval = setInterval(() => {
      this.points++;
      this.playerUpdatePoint(this.points);
    }, 150);
  };

  lose = () => {
    this.gameState = "LOSE";
    this.clashAudio.play();
    this.playerLoseCb(this.points, this);
    this.points = 0;
    this.gameVelocity = 0;
    if (this.pointInterval) clearInterval(this.pointInterval);
    this.player.lose();
    setTimeout(() => {
      this.loseAudio.play();
    }, 500);
  };

  resize = (event) => {
    this.init();
    this.draw();
  };
}

class Player {
  constructor(playerWidth, height, coordX, coordY, maxJump) {
    this.alive = true;
    this.jumping = false;
    this.jumpVelocityFactor = 5;
    this.jumpVelocity = -50;
    this.currentJumpVelocity = 0;
    this.falling = false;
    this.gravity = 5;
    this.playerState = "IDLE";
    this.maxJump = maxJump;
    this.jumpAudio = new Audio("Sounds/jumping.mp3");

    this.idleSpirts = [
      {
        image: document.getElementById("idle1"),
        frameX: 782,
        frameY: 266,
      },
      {
        image: document.getElementById("idle2"),
        frameX: 781,
        frameY: 267,
      },
    ];
    this.jumpSpirts = [
      {
        image: document.getElementById("jump"),
        frameX: 783,
        frameY: 159,
        frameHeight: 650,
      },
    ];
    this.loseSpirts = [
      {
        image: document.getElementById("lose1"),
        frameX: 786,
        frameY: 269,
      },
      {
        image: document.getElementById("lose2"),
        frameX: 786,
        frameY: 269,
      },
    ];
    this.runSpirts = [
      {
        image: document.getElementById("run1"),
        frameX: 779,
        frameY: 277,
      },
      {
        image: document.getElementById("run2"),
        frameX: 830,
        frameY: 269,
      },
    ];

    this.currentSpirts = this.idleSpirts;
    this.spirtsIndex = 0;
    this.frameWidth = 550;
    this.frameHeight = 525;
    this.init(playerWidth, height, coordX, coordY);
  }

  init(playerWidth, height, coordX, coordY) {
    this.defaultSpirtHeight = playerWidth;
    this.spirtWidth = playerWidth;
    this.spirtHeight = playerWidth;
    this.canvasHeight = height;
    this.coordX = coordX;
    this.coordY = height - coordY - this.spirtHeight;
    this.initialCoordY = this.coordY;
    this.idleSpirts.forEach(this.setSpirtFrameHeight);
    this.jumpSpirts.forEach(this.setSpirtFrameHeight);
    this.loseSpirts.forEach(this.setSpirtFrameHeight);
    this.runSpirts.forEach(this.setSpirtFrameHeight);
  }

  setSpirtFrameHeight = (player) => {
    if (player.frameHeight) {
      let ratio = player.frameHeight / this.frameWidth;
      player.spirtWidth = this.spirtWidth * ratio;
      player.spirtHeight =
        player.spirtWidth * (this.frameHeight / this.frameWidth);
    } else {
      player.frameHeight = this.frameHeight;
      player.spirtHeight =
        this.spirtWidth * (this.frameHeight / this.frameWidth);
    }
  };

  draw(context) {
    let {
      image,
      frameX,
      frameY,
      frameHeight,
      spirtHeight,
    } = this.currentSpirts[this.spirtsIndex];

    context.save();
    context.translate(this.spirtWidth, 0);
    context.scale(-1, 1);
    context.drawImage(
      image,
      frameX,
      frameY,
      this.frameWidth,
      frameHeight,
      -this.coordX,
      this.coordY,
      this.spirtWidth,
      spirtHeight
    );
    context.restore();
  }

  update(velocity) {
    // this.jumpVelocity = -this.jumpVelocityFactor * velocity;
    this.spirtsIndex = ++this.spirtsIndex % this.currentSpirts.length;

    if (this.playerState == "IDLE" || this.playerState == "LOSE") return;

    if (this.jumping && this.alive) {
      this.currentJumpVelocity += this.gravity;
      if (this.currentJumpVelocity >= 0) {
        this.falling = true;
      }
      if (this.coordY < this.maxJump) {
        this.coordY = this.maxJump;
      }

      this.coordY += this.currentJumpVelocity;
      if (
        this.coordY + this.runSpirts[this.spirtsIndex].spirtHeight >=
        this.canvasHeight - this.runSpirts[this.spirtsIndex].spirtHeight
      ) {
        this.updateState("RUN");
      }
    }
  }

  updateState(state) {
    this.playerState = state;
    this.coordY = this.coordY + this.spirtHeight - this.defaultSpirtHeight;
    this.spirtHeight = this.defaultSpirtHeight;
    this.jumping = false;

    switch (state) {
      case "IDLE": {
        this.alive = true;
        this.jumping = false;
        this.currentSpirts = this.idleSpirts;
        this.coordY = this.initialCoordY;
        break;
      }
      case "RUN": {
        this.jumping = false;
        this.coordY = this.initialCoordY;
        this.currentSpirts = this.runSpirts;
        break;
      }
      case "JUMP": {
        this.jumping = true;
        this.currentJumpVelocity = this.jumpVelocity;
        this.currentSpirts = this.jumpSpirts;
        this.spirtHeight =
          this.defaultSpirtHeight *
          (this.currentSpirts[0].frameHeight / this.frameWidth);
        break;
      }
      case "LOSE": {
        this.jumping = false;
        this.alive = false;
        this.currentSpirts = this.loseSpirts;
        break;
      }
    }
    this.spirtsIndex = 0;
  }

  start() {
    this.updateState("RUN");
  }

  reset() {
    this.updateState("IDLE");
  }

  jump() {
    if (!this.alive) return;

    if (!this.jumping) {
      this.updateState("JUMP");
      this.jumpAudio.play();
      this.falling = false;
    }
  }

  lose() {
    this.updateState("LOSE");
  }

  falldown() {
    return;
    if (!this.falling) {
      this.currentJumpVelocity = 0;
      this.falling = true;
      console.log("falldown");
    }
  }
}

class Obstacles {
  constructor(obstacleWidth, coordY, canvasWidth, canvasHeight) {
    this.obstacleSpirts = [
      {
        image: document.getElementById("obstacle1"),
        frameX: 783,
        frameY: 304,
        frameWidth: 496,
        frameHeight: 471,
        sizeFactor: 1,
      },
      {
        image: document.getElementById("obstacle2"),
        frameX: 766,
        frameY: 348,
        frameWidth: 583,
        frameHeight: 447,
        sizeFactor: 1.2,
      },
      {
        image: document.getElementById("obstacle3"),
        frameX: 779,
        frameY: 445,
        frameWidth: 550,
        frameHeight: 276,
        sizeFactor: 1,
      },
      {
        image: document.getElementById("obstacle4"),
        frameX: 957,
        frameY: 400,
        frameWidth: 196,
        frameHeight: 278,
        sizeFactor: 0.5,
      },
      {
        image: document.getElementById("obstacle5"),
        frameX: 805,
        frameY: 333,
        frameWidth: 500,
        frameHeight: 418,
        sizeFactor: 1,
      },
      {
        image: document.getElementById("obstacle6"),
        frameX: 758,
        frameY: 377,
        frameWidth: 500,
        frameHeight: 418,
        sizeFactor: 1,
      },
      {
        image: document.getElementById("obstacle7"),
        frameX: 757,
        frameY: 331,
        frameWidth: 500,
        frameHeight: 418,
        sizeFactor: 1,
      },
    ];
    this.spirtsIndex = 0;
    this.init(obstacleWidth, coordY, canvasWidth, canvasHeight);
  }

  init = (obstacleWidth, coordY, canvasWidth, canvasHeight) => {
    this.coordY = canvasHeight - coordY;
    this.canvasWidth = canvasWidth;
    this.spirtWidth = obstacleWidth;
    this.obstacleSpirts.forEach((obstacle) => {
      obstacle.spirtWidth = this.spirtWidth * obstacle.sizeFactor;
      obstacle.spirtHeight =
        obstacle.spirtWidth * (obstacle.frameHeight / obstacle.frameWidth);
    });
    this.obstacles = this.generateObstacles();
  };

  draw(context) {
    this.obstacles.forEach((obstacle) => {
      context.drawImage(
        obstacle.image,
        obstacle.frameX,
        obstacle.frameY,
        obstacle.frameWidth,
        obstacle.frameHeight,
        obstacle.coordX,
        obstacle.coordY,
        obstacle.spirtWidth,
        obstacle.spirtHeight
      );
    });
  }

  update(velocity, context) {
    this.obstacles = this.obstacles.map((obstacle) => {
      if (obstacle.coordX + obstacle.spirtWidth < 0) {
        let obstacle = this.generateObstacles();
        return obstacle[0];
      }
      obstacle.coordX -= velocity;
      return obstacle;
    });
    this.draw(context);
  }

  reset() {
    this.obstacles = this.generateObstacles();
  }

  generateObstacles = (
    numberOfObstacles = 1,
    canvasWidth = this.canvasWidth
  ) => {
    if (numberOfObstacles < 1)
      throw new Error("Number Of Ground cant be smaller than one");

    if (numberOfObstacles === 1 && this.obstacleSpirts.length) {
      let obstacle = {
        ...this.obstacleSpirts[
          Math.floor(Math.random() * this.obstacleSpirts.length)
        ],
      };
      obstacle.coordX = canvasWidth + (Math.random() * canvasWidth) / 4;
      obstacle.coordY = this.coordY - obstacle.spirtHeight;
      return [obstacle];
    }
    let obstacles = [];
    for (let i = 0; i < numberOfObstacles; i++) {
      let randomInt = Math.floor(Math.random() * this.obstacleSpirts.length);
      let obstacle = {
        ...this.obstacleSpirts[randomInt],
        coordX: i * this.spirtWidth,
        coordY: this.coordY - obstacle.spirtHeight,
      };
      obstacles.push(obstacle);
    }
    return obstacles;
  };
}

class Ground {
  constructor(groundWidth, canvasWidth) {
    this.groundSpirts = [
      {
        image: document.getElementById("ground1"),
        frameX: 460,
        frameY: 420,
      },
      {
        image: document.getElementById("ground2"),
        frameX: 490,
        frameY: 530,
      },
      {
        image: document.getElementById("ground3"),
        frameX: 490,
        frameY: 530,
      },
    ];
    this.frameWidth = 1250;
    this.frameHeight = 400;
    this.ratio = this.frameHeight / this.frameWidth;
    this.init(groundWidth, canvasWidth);
  }

  static groundHeight = 0;

  init = (groundWidth, canvasWidth) => {
    this.spirtWidth = groundWidth;
    this.spirtHeight = this.spirtWidth * this.ratio;
    Ground.groundHeight = this.spirtHeight;
    this.noOfGrounds = Math.ceil(canvasWidth / this.spirtWidth) + 4;
    this.grounds = this.generateGround(this.noOfGrounds);
  };

  draw(context) {
    this.grounds.forEach((ground) => {
      context.drawImage(
        ground.image,
        ground.frameX,
        ground.frameY,
        this.frameWidth,
        this.frameHeight,
        ground.coordX,
        context.canvas.height - this.spirtHeight,
        this.spirtWidth,
        this.spirtHeight
      );
    });
  }

  update(velocity) {
    if (this.grounds[0].coordX + this.spirtWidth < 0) {
      this.grounds.shift();
      let newGround = this.generateGround();
      this.grounds.push(newGround);
    }
    this.grounds.forEach((ground) => (ground.coordX -= velocity));
  }

  generateGround = (numberOfGrounds = 1) => {
    if (numberOfGrounds < 1)
      throw new Error("Number Of Ground cant be smaller than one");

    if (numberOfGrounds === 1 && this.groundSpirts.length) {
      let ground = {
        ...this.groundSpirts[
          Math.floor(Math.random() * this.groundSpirts.length)
        ],
      };
      let lastGroundCoordX = this.grounds[this.grounds.length - 1].coordX;
      ground.coordX = lastGroundCoordX + this.spirtWidth;
      return ground;
    }
    let grounds = [];
    for (let i = 0; i < numberOfGrounds; i++) {
      let randomInt = Math.floor(Math.random() * this.groundSpirts.length);
      let ground = {
        ...this.groundSpirts[randomInt],
        coordX: i * this.spirtWidth,
      };
      grounds.push(ground);
    }
    return grounds;
  };
}

class Clouds {
  constructor(cloudWidth, canvasWidth, cloudSpawnArea) {
    this.cloudSpirts = [
      {
        image: document.getElementById("cloud1"),
        frameX: 741,
        frameY: 382,
        speedFactor: 1.8,
      },
      {
        image: document.getElementById("cloud2"),
        frameX: 741,
        frameY: 382,
        speedFactor: 1.3,
      },
      {
        image: document.getElementById("cloud3"),
        frameX: 741,
        frameY: 382,
        speedFactor: 1.1,
      },
      {
        image: document.getElementById("cloud4"),
        frameX: 766,
        frameY: 357,
        speedFactor: 1.6,
      },
    ];
    this.frameWidth = 635;
    this.frameHeight = 325;
    this.spirtsIndex = 0;
    this.cloudSpeed = 40;
    this.cloudSpawnArea = cloudSpawnArea;
    this.clouds = this.generateCloud(5, canvasWidth, cloudSpawnArea);
    this.init(cloudWidth, canvasWidth);
  }

  init = (cloudWidth, canvasWidth) => {
    this.canvasWidth = canvasWidth;
    this.spirtWidth = cloudWidth;
    this.spirtHeight = this.spirtWidth * (this.frameHeight / this.frameWidth);
  };

  draw(context) {
    this.clouds.forEach((cloud) => {
      context.drawImage(
        cloud.image,
        cloud.frameX,
        cloud.frameY,
        this.frameWidth,
        this.frameHeight,
        cloud.coordX,
        cloud.coordY,
        this.spirtWidth,
        this.spirtHeight
      );
    });
  }

  update(velocity) {
    let newCloudAdd = false;
    this.clouds = this.clouds.map((cloud) => {
      let cloudSpeed = cloud.speedFactor * this.cloudSpeed - velocity;

      if (velocity <= 0) {
        cloud.movingForward = true;
      }

      if (cloudSpeed < 0 && cloud.movingForward) {
        cloud.coordX =
          -this.spirtWidth - Math.random() * 0.12 * this.canvasWidth;
        cloud.movingForward = false;
        newCloudAdd = true;
      }

      if (
        (cloudSpeed < 0 &&
          !cloud.movingForward &&
          cloud.coordX > this.canvasWidth) ||
        (cloudSpeed > 0 &&
          cloud.movingForward &&
          cloud.coordX + this.spirtWidth < 0)
      ) {
        let cloud = this.generateCloud(
          1,
          this.canvasWidth,
          this.cloudSpawnArea
        );
        newCloudAdd = true;
        return cloud;
      }

      cloud.coordX -= cloudSpeed;
      return cloud;
    });

    if (newCloudAdd) {
      this.clouds.sort((a, b) => b.speedFactor - a.speedFactor);
    }
  }

  generateCloud = (
    numberOfClouds = 1,
    canvasWidth = this.canvasWidth,
    cloudSpawnArea = this.cloudSpawnArea
  ) => {
    if (numberOfClouds < 1)
      throw new Error("Number Of Cloud cant be smaller than one");

    if (numberOfClouds === 1 && this.cloudSpirts.length) {
      let cloud = {
        ...this.cloudSpirts[
          Math.floor(Math.random() * this.cloudSpirts.length)
        ],
      };

      cloud.coordX = canvasWidth + (Math.random() * canvasWidth) / 4;
      cloud.coordY = Math.random() * cloudSpawnArea;
      cloud.movingForward = true;

      return cloud;
    }
    let clouds = [];
    for (let i = 0; i < numberOfClouds; i++) {
      let randomInt = Math.floor(Math.random() * this.cloudSpirts.length);
      let cloud = {
        ...this.cloudSpirts[randomInt],
        coordX: Math.random() * 1.5 * canvasWidth,
        coordY: Math.random() * cloudSpawnArea,
        movingForward: true,
      };
      clouds.push(cloud);
    }

    clouds.sort((a, b) => b.speedFactor - a.speedFactor);

    return clouds;
  };
}

(function () {
  window.addEventListener("load", function (event) {
    let startBox = document.getElementById("start-controller-box");
    let restartBox = document.getElementById("restart-controller-box");
    let startText = document.getElementById("start-game-text");
    let restartText = document.getElementById("restart-game-text");
    let highScoreText = document.getElementById("game-high-score-text");
    let gameScoreTexts = document.getElementsByClassName("game-score-text");
    let gameHighScore = document.getElementsByClassName("game-high-score")[0];
    let startButton = document.getElementById("btn-start");
    let restartButton = document.getElementById("btn-restart");
    let gameInfoDrawerOpener = document.getElementById("game-info-menu-opener");
    let gameScore = document.getElementById("game-score");
    let drawerGameScore = document.getElementById("drawer-game-score");

    const touchDevice = "ontouchstart" in document.documentElement;

    if (touchDevice) {
      startText.innerText = "Touch to Jump and avoid obstacle";
      restartText.innerText = "Tap restart button to play again";
    } else {
      startText.innerText = "Press Spacebar/ArrowUp to Jump and avoid obstacle";
      restartText.innerText = "Press Spacebar or restart button to play again";
    }

    function displayHighScore(score = 0) {
      let highScore = localStorage.getItem("doge-runner-high-score");
      if (!highScore || +highScore <= +score) {
        highScore = score;
        localStorage.setItem("doge-runner-high-score", score);
        highScoreText.innerText = score;
      } else {
        highScoreText.innerText = highScore;
      }
      if (highScore && +highScore > 0) gameHighScore.classList.remove("hidden");
    }

    function displayCurrentScore(score) {
      Array.from(gameScoreTexts).forEach((htmlSpan) => {
        htmlSpan.innerText = score;
      });
    }

    displayHighScore();

    function gameOnStart() {
      gameInfoDrawerOpener.checked = false;
      gameScore.classList.remove("hidden");
      drawerGameScore.classList.add("hidden");
    }

    function gameOnLose(currentScore, controller) {
      startBox.classList.add("hidden");
      restartBox.classList.remove("hidden");
      gameHighScore.classList.remove("hidden");
      gameScore.classList.add("hidden");
      drawerGameScore.classList.remove("hidden");

      displayCurrentScore(currentScore);
      displayHighScore(currentScore);

      setTimeout(() => {
        gameInfoDrawerOpener.checked = true;
        controller.setReset();
      }, 2000);
    }

    let canvas = document.getElementById("canvas");
    const context = canvas.getContext("2d");

    let gameController = new Controller(
      context,
      gameOnStart,
      gameOnLose,
      displayCurrentScore
    );

    gameController.draw();

    let lastTime = 0;
    function FrameReqCallback(timestamp) {
      const deltaTime = timestamp - lastTime;
      lastTime = timestamp;

      gameController.draw();
      gameController.update(deltaTime);

      setTimeout(() => {
        window.requestAnimationFrame(FrameReqCallback);
      }, 1000 / 12);

      if (gameController.status === "END") {
        window.cancelAnimationFrame(requestAnimFrameId);
      }
    }

    let requestAnimFrameId = window.requestAnimationFrame(FrameReqCallback);

    window.addEventListener("resize", gameController.resize);
    window.addEventListener("mousedown", gameController.inputHandler);
    window.addEventListener("mouseup", gameController.inputHandler);
    window.addEventListener("keydown", gameController.inputHandler);
    window.addEventListener("keyup", gameController.inputHandler);
    window.addEventListener("touchstart", gameController.inputHandler);
    window.addEventListener("touchend", gameController.inputHandler);

    startButton.addEventListener("click", () => {
      gameInfoDrawerOpener.checked = false;
      gameController.start();
    });

    restartButton.addEventListener("click", () => {
      gameController.reset();
    });

    // GameController.start();
  });
})();
