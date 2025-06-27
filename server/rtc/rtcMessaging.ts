import { Hono } from '@hono/hono';
import { upgradeWebSocket } from '@hono/hono/deno';
import { SignalingMessage } from './types.ts';
import {
	handleCreateRoom,
	handleJoinRoom,
	handleLeaveRoom,
	handleSignaling,
} from './functions.ts';

const app = new Hono()
	.get(
		'/',
		upgradeWebSocket( ( _c ) => {
			let userId: string;

			return {
				onOpen: ( _event, _ws ) => {
					userId = crypto.randomUUID();
					console.log( `User ${userId} connected` );
				},

				onMessage: ( event, ws ) => {
					const message: SignalingMessage = JSON.parse( event.data.toString() );
					console.log( `Received from ${userId}:`, message );

					switch ( message.type ) {
						case 'create-room':
							handleCreateRoom( userId, ws.raw! );
							break;

						case 'join-room':
							if ( message.roomId ) {
								handleJoinRoom( userId, message.roomId, ws.raw! );
							}
							break;

						case 'leave-room':
							handleLeaveRoom( userId );
							break;

						case 'offer':
						case 'answer':
						case 'ice-candidate':
							handleSignaling( userId, message );
							break;
					}
				},

				onClose: () => {
					console.log( `User ${userId} disconnected` );
					handleLeaveRoom( userId );
				},

				onError: ( event ) => {
					console.error( `WebSocket error for user ${userId}:`, event );
				},
			};
		} ),
	);

export default app;
