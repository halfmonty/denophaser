// WebSocket message types
export interface SignalingMessage {
	type:
		| 'create-room'
		| 'join-room'
		| 'leave-room'
		| 'offer'
		| 'answer'
		| 'ice-candidate'
		| 'room-created'
		| 'room-joined'
		| 'user-joined'
		| 'user-left'
		| 'error';
	roomId?: string;
	userId?: string;
	targetId?: string;
	data?: unknown;
	members?: string[];
	hostId?: string;
	error?: string;
}

// Room management
export interface Room {
	id: string;
	host: string;
	members: Map<string, WebSocket>;
}
