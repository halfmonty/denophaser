import { SignalingMessage } from './types.ts';
import { config, getWebSocketUrl } from './config.ts';
import { AppError, EventEmitter, Logger } from './utils.ts';

export interface SignalingEvents {
	[event: string]: unknown;
	'connected': void;
	'disconnected': void;
	'message': SignalingMessage;
	'error': Error;
}

export class SignalingManager extends EventEmitter<SignalingEvents> {
	private ws: WebSocket | null = null;
	private logger = new Logger( 'SignalingManager' );
	private reconnectAttempts = 0;
	private reconnectTimer: number | null = null;
	private heartbeatTimer: number | null = null;

	connect(): void {
		const wsUrl = getWebSocketUrl();
		this.logger.log( 'Connecting to', wsUrl );

		try {
			this.ws = new WebSocket( wsUrl );
			this.setupWebSocketHandlers();
		} catch ( error ) {
			this.logger.error( 'Failed to create WebSocket:', error );
			this.emit( 'error', error as Error );
		}
	}

	disconnect(): void {
		this.logger.log( 'Disconnecting' );
		this.clearTimers();

		if ( this.ws ) {
			this.ws.onclose = null; // Prevent reconnection
			this.ws.close();
			this.ws = null;
		}

		this.emit( 'disconnected', undefined );
	}

	send( message: SignalingMessage ): void {
		if ( !this.isConnected() ) {
			throw new AppError( 'WebSocket is not connected', 'WS_NOT_CONNECTED' );
		}

		const data = JSON.stringify( message );
		this.logger.log( 'Sending:', message );
		this.ws!.send( data );
	}

	isConnected(): boolean {
		return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
	}

	private setupWebSocketHandlers(): void {
		if ( !this.ws ) return;

		this.ws.onopen = () => {
			this.logger.log( 'Connected' );
			this.reconnectAttempts = 0;
			this.startHeartbeat();
			this.emit( 'connected', undefined );
		};

		this.ws.onmessage = ( event: MessageEvent ) => {
			try {
				const message: SignalingMessage = JSON.parse( event.data );
				this.logger.log( 'Received:', message );
				this.emit( 'message', message );
			} catch ( error ) {
				this.logger.error( 'Failed to parse message:', error );
				this.emit(
					'error',
					new AppError( 'Invalid message format', 'PARSE_ERROR' ),
				);
			}
		};

		this.ws.onclose = () => {
			this.logger.log( 'Disconnected' );
			this.stopHeartbeat();
			this.emit( 'disconnected', undefined );
			this.attemptReconnect();
		};

		this.ws.onerror = ( error: Event ) => {
			this.logger.error( 'WebSocket error:', error );
			this.emit( 'error', new AppError( 'WebSocket error', 'WS_ERROR' ) );
		};
	}

	private attemptReconnect(): void {
		if ( this.reconnectAttempts >= config.websocket.reconnectAttempts ) {
			this.logger.error( 'Max reconnection attempts reached' );
			return;
		}

		this.reconnectAttempts++;
		const delay = config.websocket.reconnectDelay * this.reconnectAttempts;

		this.logger.log(
			`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`,
		);

		this.reconnectTimer = window.setTimeout( () => {
			this.connect();
		}, delay );
	}

	private startHeartbeat(): void {
		this.heartbeatTimer = window.setInterval( () => {
			if ( this.isConnected() ) {
				// In a real app, you might send a ping message here
				this.logger.log( 'Heartbeat' );
			}
		}, config.websocket.heartbeatInterval );
	}

	private stopHeartbeat(): void {
		if ( this.heartbeatTimer !== null ) {
			clearInterval( this.heartbeatTimer );
			this.heartbeatTimer = null;
		}
	}

	private clearTimers(): void {
		if ( this.reconnectTimer !== null ) {
			clearTimeout( this.reconnectTimer );
			this.reconnectTimer = null;
		}
		this.stopHeartbeat();
	}
}
