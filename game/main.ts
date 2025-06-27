import Phaser from 'https://esm.sh/phaser@4.0.0-rc.4';
import { GameScene } from './scenes/GameScene.ts';
import { MainMenu } from './scenes/MainMenu.ts';
// export { StarTopologyChat } from './rtc/app.ts';

const StartGame = () => {
	const config: Phaser.Types.Core.GameConfig = {
		type: Phaser.AUTO,
		width: 1024,
		height: 768,
		parent: 'game-container',
		backgroundColor: '#2c3e50',
		physics: {
			default: 'arcade',
			arcade: {
				gravity: { x: 0, y: 250 },
				debug: false,
			},
		},
		scene: [MainMenu, GameScene],
	};

	// Start the game
	const game = new Phaser.Game(config); // Make game globally available for debugging
	(window as any).game = game;

	console.log('🎮 Phaser game initialized!');
};

export { StartGame };
