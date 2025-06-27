export class GameScene extends Phaser.Scene {
	private player!: Phaser.Physics.Arcade.Sprite;
	private platforms!: Phaser.Physics.Arcade.StaticGroup;
	private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
	private score = 0;
	private scoreText!: Phaser.GameObjects.Text;
	private stars!: Phaser.Physics.Arcade.Group;

	constructor() {
		super( { key: 'GameScene' } );
	}

	preload() {
		// Create simple colored rectangles as textures dynamically
		// this.load.image('ground', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==')

		// Create textures programmatically instead of loading data URIs
		this.load.once( 'complete', () => {
			// Create ground texture
			this.add.graphics()
				.fillStyle( 0x00ff00 )
				.fillRect( 0, 0, 32, 32 )
				.generateTexture( 'ground', 32, 32 )
				.destroy();

			// Create player texture
			this.add.graphics()
				.fillStyle( 0x0099ff )
				.fillRect( 0, 0, 32, 48 )
				.generateTexture( 'player', 32, 48 )
				.destroy();

			// Create star texture
			this.add.graphics()
				.fillStyle( 0xffff00 )
				.beginPath()
				.moveTo( 8, 0 )
				.lineTo( 10, 6 )
				.lineTo( 16, 6 )
				.lineTo( 12, 10 )
				.lineTo( 14, 16 )
				.lineTo( 8, 12 )
				.lineTo( 2, 16 )
				.lineTo( 4, 10 )
				.lineTo( 0, 6 )
				.lineTo( 6, 6 )
				.closePath()
				.fillPath()
				.generateTexture( 'star', 16, 16 )
				.destroy();
		} );
	}

	create() {
		// Wait for textures to be created before using them
		this.time.delayedCall( 0, () => {
			this.createGameObjects();
		} );
	}

	private createGameObjects() {
		// Create platforms
		this.platforms = this.physics.add.staticGroup();

		// Ground
		const ground = this.platforms.create( 400, 568, 'ground' );
		ground.setScale( 25, 2 ).refreshBody();

		// Platforms
		const platform1 = this.platforms.create( 600, 400, 'ground' );
		platform1.setScale( 6, 1 ).refreshBody();

		const platform2 = this.platforms.create( 50, 250, 'ground' );
		platform2.setScale( 6, 1 ).refreshBody();

		const platform3 = this.platforms.create( 750, 220, 'ground' );
		platform3.setScale( 6, 1 ).refreshBody();

		// Create player
		this.player = this.physics.add.sprite( 100, 450, 'player' );
		this.player.setBounce( 0.2 );
		this.player.setCollideWorldBounds( true );

		// Player physics
		this.physics.add.collider( this.player, this.platforms );

		// Create stars
		this.stars = this.physics.add.group( {
			key: 'star',
			repeat: 11,
			setXY: { x: 12, y: 0, stepX: 70 },
		} );

		console.log( this.stars );
		this.stars.children.forEach( ( star ) => {
			const starSprite = star as Phaser.Physics.Arcade.Sprite;
			starSprite.setBounceY( Phaser.Math.FloatBetween( 0.4, 0.8 ) );
		} );

		this.physics.add.collider( this.stars, this.platforms );

		// Collect stars
		this.physics.add.overlap(
			this.player,
			this.stars,
			this.collectStar as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
			undefined,
			this,
		);

		// Create cursor keys
		this.cursors = this.input.keyboard!.createCursorKeys();

		// Score text
		this.scoreText = this.add.text( 16, 16, 'Score: 0', {
			fontSize: '32px',
			color: '#ffffff',
		} );

		// Instructions
		this.add.text( 400, 100, 'Use Arrow Keys to Move\nCollect Yellow Stars!', {
			fontSize: '24px',
			color: '#ffffff',
			align: 'center',
		} ).setOrigin( 0.5 );
	}

	override update() {
		if ( !this.player || !this.cursors ) return;

		if ( this.cursors.left.isDown ) {
			this.player.setVelocityX( -200 );
		} else if ( this.cursors.right.isDown ) {
			this.player.setVelocityX( 200 );
		} else {
			this.player.setVelocityX( 0 );
		}

		if ( this.cursors.up.isDown && this.player.body!.touching.down ) {
			this.player.setVelocityY( -330 );
		}
	}

	private collectStar = (
		_player: Phaser.Physics.Arcade.Sprite,
		star: Phaser.Physics.Arcade.Sprite,
	) => {
		star.disableBody( true, true );
		// (star as Phaser.Types.Physics.Arcade.GameObjectWithBody).destroy(true);// .disableBody(true, true);
		//star.destroy(true);

		if ( this.stars.countActive( true ) === 0 ) {
			this.stars.children.forEach( ( child ) => {
				( child as Phaser.Physics.Arcade.Sprite ).enableBody(
					true,
					( child as any ).x,
					0,
					true,
					true,
				);
			} );
		}
		this.score += 10;
		this.scoreText.setText( 'Score: ' + this.score );
	};
}
