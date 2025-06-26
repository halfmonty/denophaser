var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/game/main.ts
import Phaser2 from "https://esm.sh/phaser@3.70.0";

// src/game/scenes/GameScene.ts
var GameScene = class extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
    __publicField(this, "player");
    __publicField(this, "platforms");
    __publicField(this, "cursors");
    __publicField(this, "score", 0);
    __publicField(this, "scoreText");
  }
  preload() {
    this.load.once("complete", () => {
      this.add.graphics().fillStyle(65280).fillRect(0, 0, 32, 32).generateTexture("ground", 32, 32).destroy();
      this.add.graphics().fillStyle(39423).fillRect(0, 0, 32, 48).generateTexture("player", 32, 48).destroy();
      this.add.graphics().fillStyle(16776960).beginPath().moveTo(8, 0).lineTo(10, 6).lineTo(16, 6).lineTo(12, 10).lineTo(14, 16).lineTo(8, 12).lineTo(2, 16).lineTo(4, 10).lineTo(0, 6).lineTo(6, 6).closePath().fillPath().generateTexture("star", 16, 16).destroy();
    });
  }
  create() {
    this.time.delayedCall(0, () => {
      this.createGameObjects();
    });
  }
  createGameObjects() {
    this.platforms = this.physics.add.staticGroup();
    const ground = this.platforms.create(400, 568, "ground");
    ground.setScale(25, 2).refreshBody();
    const platform1 = this.platforms.create(600, 400, "ground");
    platform1.setScale(6, 1).refreshBody();
    const platform2 = this.platforms.create(50, 250, "ground");
    platform2.setScale(6, 1).refreshBody();
    const platform3 = this.platforms.create(750, 220, "ground");
    platform3.setScale(6, 1).refreshBody();
    this.player = this.physics.add.sprite(100, 450, "player");
    this.player.setBounce(0.2);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.platforms);
    const stars = this.physics.add.group({
      key: "star",
      repeat: 11,
      setXY: { x: 12, y: 0, stepX: 70 }
    });
    stars.children.entries.forEach((star) => {
      const starSprite = star;
      starSprite.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
    });
    this.physics.add.collider(stars, this.platforms);
    this.physics.add.overlap(this.player, stars, this.collectStar, void 0, this);
    this.cursors = this.input.keyboard.createCursorKeys();
    this.scoreText = this.add.text(16, 16, "Score: 0", {
      fontSize: "32px",
      color: "#ffffff"
    });
    this.add.text(400, 100, "Use Arrow Keys to Move\nCollect Yellow Stars!", {
      fontSize: "24px",
      color: "#ffffff",
      align: "center"
    }).setOrigin(0.5);
  }
  update() {
    if (!this.player || !this.cursors) return;
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-200);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(200);
    } else {
      this.player.setVelocityX(0);
    }
    if (this.cursors.up.isDown && this.player.body.touching.down) {
      this.player.setVelocityY(-330);
    }
  }
  collectStar(player, star) {
    const starSprite = star;
    starSprite.disableBody(true, true);
    this.score += 10;
    this.scoreText.setText("Score: " + this.score);
    const activeStars = starSprite.body.world.bodies.entries.filter(
      (body) => body.gameObject && body.gameObject.texture?.key === "star" && body.gameObject.active
    );
    if (activeStars.length === 0) {
      this.createNewStars();
    }
  }
  createNewStars() {
    const stars = this.physics.add.group({
      key: "star",
      repeat: 11,
      setXY: { x: 12, y: 0, stepX: 70 }
    });
    stars.children.entries.forEach((star) => {
      const starSprite = star;
      starSprite.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
    });
    this.physics.add.collider(stars, this.platforms);
    this.physics.add.overlap(this.player, stars, this.collectStar, void 0, this);
  }
};

// src/game/main.ts
var config = {
  type: Phaser2.AUTO,
  width: 800,
  height: 600,
  parent: "game-container",
  backgroundColor: "#2c3e50",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 250 },
      debug: false
    }
  },
  scene: [GameScene]
};
var game = new Phaser2.Game(config);
window.game = game;
console.log("\u{1F3AE} Phaser game initialized!");
//# sourceMappingURL=game.js.map
