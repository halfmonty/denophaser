import { Room, SignalingMessage } from './types.ts';

const rooms = new Map<string, Room>();
const userToRoom = new Map<string, string>();

export function handleCreateRoom( userId: string, ws: WebSocket ) {
	const roomId = crypto.randomUUID();
	const room: Room = {
		id: roomId,
		host: userId,
		members: new Map( [ [ userId, ws ] ] ),
	};

	rooms.set( roomId, room );
	userToRoom.set( userId, roomId );

	const response: SignalingMessage = {
		type: 'room-created',
		roomId,
		userId,
		hostId: userId,
		members: [ userId ],
	};

	ws.send( JSON.stringify( response ) );
	console.log( `Room ${roomId} created by ${userId}` );
}

export function handleJoinRoom(
	userId: string,
	roomId: string,
	ws: WebSocket,
) {
	const room = rooms.get( roomId );

	if ( !room ) {
		const error: SignalingMessage = {
			type: 'error',
			error: 'Room not found',
		};
		ws.send( JSON.stringify( error ) );
		return;
	}

	// Add user to room
	room.members.set( userId, ws );
	userToRoom.set( userId, roomId );

	// Get all member IDs
	const memberIds = Array.from( room.members.keys() );

	// Send room-joined to the new user
	const joinResponse: SignalingMessage = {
		type: 'room-joined',
		roomId,
		userId,
		hostId: room.host,
		members: memberIds,
	};
	ws.send( JSON.stringify( joinResponse ) );

	// Notify host about new user (only host needs to know in star topology)
	if ( userId !== room.host ) {
		const hostWs = room.members.get( room.host );
		if ( hostWs ) {
			const userJoinedMsg: SignalingMessage = {
				type: 'user-joined',
				roomId,
				userId,
				members: memberIds,
			};
			hostWs.send( JSON.stringify( userJoinedMsg ) );
		}
	}

	console.log( `User ${userId} joined room ${roomId}` );
}

export function handleLeaveRoom( userId: string ) {
	const roomId = userToRoom.get( userId );
	if ( !roomId ) return;

	const room = rooms.get( roomId );
	if ( !room ) return;

	room.members.delete( userId );
	userToRoom.delete( userId );

	// If host left, close the room
	if ( userId === room.host ) {
		// Notify all members that room is closing
		room.members.forEach( ( ws, _memberId ) => {
			const msg: SignalingMessage = {
				type: 'error',
				error: 'Host disconnected. Room closed.',
			};
			ws.send( JSON.stringify( msg ) );
		} );
		rooms.delete( roomId );
		console.log( `Room ${roomId} closed - host left` );
	} else {
		// Notify host that user left
		const hostWs = room.members.get( room.host );
		if ( hostWs ) {
			const userLeftMsg: SignalingMessage = {
				type: 'user-left',
				roomId,
				userId,
				members: Array.from( room.members.keys() ),
			};
			hostWs.send( JSON.stringify( userLeftMsg ) );
		}
		console.log( `User ${userId} left room ${roomId}` );
	}
}

export function handleSignaling( senderId: string, message: SignalingMessage ) {
	const roomId = userToRoom.get( senderId );
	if ( !roomId ) return;

	const room = rooms.get( roomId );
	if ( !room ) return;

	// Forward signaling message to target
	if ( message.targetId ) {
		const targetWs = room.members.get( message.targetId );
		if ( targetWs ) {
			const forwardMsg = {
				...message,
				userId: senderId,
			};
			targetWs.send( JSON.stringify( forwardMsg ) );
			console.log(
				`Forwarded ${message.type} from ${senderId} to ${message.targetId}`,
			);
		}
	}
}
