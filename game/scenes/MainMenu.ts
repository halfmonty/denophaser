export class MainMenu extends Phaser.Scene {
    background!: Phaser.GameObjects.Image;
    logo!: Phaser.GameObjects.Image;
    title!: Phaser.GameObjects.Text;

    constructor() {
        super('MainMenu');
    }

    preload() {
        this.load.image('background', 'assets/bg.png');
        this.load.image('logo', 'assets/logo2.png');
    }

    create() {
        this.background = this.add.image(512, 384, 'background');

        this.logo = this.add.image(512, 300, 'logo');
        // this.logo.scale = 0.6;

        this.title = this.add.text(512, 460, 'Start Game', {
            fontFamily: 'Arial Black', fontSize: 38, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);

        this.input.once('pointerdown', () => {
            this.scene.start('GameScene');
        });
    }
}