export class GameScene extends Phaser.Scene {
    private player!: Phaser.Physics.Arcade.Sprite
    private platforms!: Phaser.Physics.Arcade.StaticGroup
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
    private score = 0
    private scoreText!: Phaser.GameObjects.Text

    constructor() {
        super({ key: 'GameScene' })
    }

    preload() {
        // Create simple colored rectangles as sprites
        this.load.image('ground', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
        this.load.image('player', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
        this.load.image('star', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
    }

    create() {
        // Create platforms
        this.platforms = this.physics.add.staticGroup()
        
        // Ground
        const ground = this.platforms.create(400, 568, 'ground')
        ground.setScale(800, 64).refreshBody()
        ground.setTint(0x00ff00)
        
        // Platforms
        const platform1 = this.platforms.create(600, 400, 'ground')
        platform1.setScale(200, 32).refreshBody()
        platform1.setTint(0x00ff00)
        
        const platform2 = this.platforms.create(50, 250, 'ground')
        platform2.setScale(200, 32).refreshBody()
        platform2.setTint(0x00ff00)
        
        const platform3 = this.platforms.create(750, 220, 'ground')
        platform3.setScale(200, 32).refreshBody()
        platform3.setTint(0x00ff00)

        // Create player
        this.player = this.physics.add.sprite(100, 450, 'player')
        this.player.setScale(32, 48)
        this.player.setTint(0x0099ff)
        this.player.setBounce(0.2)
        this.player.setCollideWorldBounds(true)

        // Player physics
        this.physics.add.collider(this.player, this.platforms)

        // Create stars
        const stars = this.physics.add.group({
            key: 'star',
            repeat: 11,
            setXY: { x: 12, y: 0, stepX: 70 }
        })

        stars.children.entries.forEach((star) => {
            const starSprite = star as Phaser.Physics.Arcade.Sprite
            starSprite.setScale(16, 16)
            starSprite.setTint(0xffff00)
            starSprite.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8))
        })

        this.physics.add.collider(stars, this.platforms)

        // Collect stars
        this.physics.add.overlap(this.player, stars, this.collectStar, undefined, this)

        // Create cursor keys
        this.cursors = this.input.keyboard!.createCursorKeys()

        // Score text
        this.scoreText = this.add.text(16, 16, 'Score: 0', {
            fontSize: '32px',
            color: '#000'
        })

        // Instructions
        this.add.text(400, 100, 'Use Arrow Keys to Move\nCollect Yellow Stars!', {
            fontSize: '24px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5)
    }

    update() {
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-160)
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(160)
        } else {
            this.player.setVelocityX(0)
        }

        if (this.cursors.up.isDown && this.player.body!.touching.down) {
            this.player.setVelocityY(-330)
        }
    }

    private collectStar(player: Phaser.GameObjects.GameObject, star: Phaser.GameObjects.GameObject) {
        const starSprite = star as Phaser.Physics.Arcade.Sprite
        starSprite.disableBody(true, true)

        this.score += 10
        this.scoreText.setText('Score: ' + this.score)

        // Create new star when all are collected
        const stars = starSprite.body!.gameObject.parentContainer || this.physics.world.bodies.entries
        if (this.score % 120 === 0) { // Every 12 stars
            this.createNewStars()
        }
    }

    private createNewStars() {
        const stars = this.physics.add.group({
            key: 'star',
            repeat: 11,
            setXY: { x: 12, y: 0, stepX: 70 }
        })

        stars.children.entries.forEach((star) => {
            const starSprite = star as Phaser.Physics.Arcade.Sprite
            starSprite.setScale(16, 16)
            starSprite.setTint(0xffff00)
            starSprite.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8))
        })

        this.physics.add.collider(stars, this.platforms)
        this.physics.add.overlap(this.player, stars, this.collectStar, undefined, this)
    }
}