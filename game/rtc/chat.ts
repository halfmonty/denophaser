import { ChatMessage } from './types.ts';
import { EventEmitter, Logger, sanitizeMessage } from './utils.ts';

export interface ChatEvents {
	[event: string]: unknown;
	'message:sent': ChatMessage;
	'message:received': ChatMessage;
	'message:broadcast': { message: ChatMessage; excludeUserId?: string };
}

export interface MessageDisplay {
	text: string;
	type: 'own' | 'other' | 'system';
	timestamp: number;
}

export class ChatManager extends EventEmitter<ChatEvents> {
	private logger = new Logger( 'ChatManager' );
	private messageHistory: MessageDisplay[] = [];

	sendMessage( text: string, userId: string ): ChatMessage | null {
		const sanitized = sanitizeMessage( text );
		if ( !sanitized ) {
			this.logger.warn( 'Empty message, not sending' );
			return null;
		}

		const message: ChatMessage = {
			type: 'chat',
			text: sanitized,
			senderId: userId,
			timestamp: Date.now(),
		};

		this.addToHistory( sanitized, 'own' );
		this.emit( 'message:sent', message );

		return message;
	}

	receiveMessage(
		message: ChatMessage,
		fromUserId: string,
		currentUserId: string,
		isHost: boolean,
	): void {
		if ( message.type !== 'chat' ) {
			this.logger.warn( 'Invalid message type:', message );
			return;
		}

		// Display the message
		const displayText = `${message.senderId}: ${message.text}`;
		this.addToHistory( displayText, 'other' );

		this.emit( 'message:received', message );

		// If host, broadcast to others
		if ( isHost && message.senderId !== currentUserId ) {
			this.logger.log( 'Broadcasting message from', message.senderId );
			this.emit( 'message:broadcast', {
				message,
				excludeUserId: fromUserId,
			} );
		}
	}

	addSystemMessage( text: string ): void {
		this.addToHistory( text, 'system' );
	}

	getMessageHistory(): MessageDisplay[] {
		return [ ...this.messageHistory ];
	}

	clearHistory(): void {
		this.messageHistory = [];
		this.logger.log( 'Message history cleared' );
	}

	private addToHistory( text: string, type: MessageDisplay['type'] ): void {
		this.messageHistory.push( {
			text,
			type,
			timestamp: Date.now(),
		} );

		// Limit history size
		const maxMessages = 100; // Could be configurable
		if ( this.messageHistory.length > maxMessages ) {
			this.messageHistory = this.messageHistory.slice( -maxMessages );
		}
	}
}
