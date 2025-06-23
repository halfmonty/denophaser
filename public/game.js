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
    this.load.image("ground", "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==");
    this.load.image("player", "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==");
    this.load.image("star", "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==");
  }
  create() {
    this.platforms = this.physics.add.staticGroup();
    const ground = this.platforms.create(400, 568, "ground");
    ground.setScale(800, 64).refreshBody();
    ground.setTint(65280);
    const platform1 = this.platforms.create(600, 400, "ground");
    platform1.setScale(200, 32).refreshBody();
    platform1.setTint(65280);
    const platform2 = this.platforms.create(50, 250, "ground");
    platform2.setScale(200, 32).refreshBody();
    platform2.setTint(65280);
    const platform3 = this.platforms.create(750, 220, "ground");
    platform3.setScale(200, 32).refreshBody();
    platform3.setTint(65280);
    this.player = this.physics.add.sprite(100, 450, "player");
    this.player.setScale(32, 48);
    this.player.setTint(39423);
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
      starSprite.setScale(16, 16);
      starSprite.setTint(16776960);
      starSprite.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
    });
    this.physics.add.collider(stars, this.platforms);
    this.physics.add.overlap(this.player, stars, this.collectStar, void 0, this);
    this.cursors = this.input.keyboard.createCursorKeys();
    this.scoreText = this.add.text(16, 16, "Score: 0", {
      fontSize: "32px",
      color: "#000"
    });
    this.add.text(400, 100, "Use Arrow Keys to Move\nCollect Yellow Stars!", {
      fontSize: "24px",
      color: "#ffffff",
      align: "center"
    }).setOrigin(0.5);
  }
  update() {
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-160);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(160);
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
    const stars = starSprite.body.gameObject.parentContainer || this.physics.world.bodies.entries;
    if (this.score % 120 === 0) {
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
      starSprite.setScale(16, 16);
      starSprite.setTint(16776960);
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
      gravity: { x: 0, y: 300 },
      debug: false
    }
  },
  scene: [GameScene]
};
var game = new Phaser2.Game(config);
window.game = game;
console.log("\u{1F3AE} Phaser game initialized!");
//# sourceMappingURL=game.js.map
