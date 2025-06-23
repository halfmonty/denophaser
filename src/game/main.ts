import Phaser from 'https://esm.sh/phaser@3.70.0'
import { GameScene } from './scenes/GameScene.ts'

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#2c3e50',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 300 },
            debug: false
        }
    },
    scene: [GameScene]
}

// Start the game
const game = new Phaser.Game(config)

// Make game globally available for debugging
;(window as any).game = game

console.log('🎮 Phaser game initialized!')