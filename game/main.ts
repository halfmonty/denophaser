import Phaser from 'https://esm.sh/phaser@4.0.0-rc.4';
// import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene.ts';

const config: Phaser.Types.Core.GameConfig = {
	type: Phaser.AUTO,
	width: 800,
	height: 600,
	parent: 'game-container',
	backgroundColor: '#2c3e50',
	physics: {
		default: 'arcade',
		arcade: {
			gravity: { x: 0, y: 250 },
			debug: false,
		},
	},
	scene: [ GameScene ],
};

// Start the game
const game = new Phaser.Game( config ); // Make game globally available for debugging
( window as any ).game = game;

console.log( '🎮 Phaser game initialized!' );
