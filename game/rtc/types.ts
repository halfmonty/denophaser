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
	data?: RTCSessionDescriptionInit | RTCIceCandidateInit;
	members?: string[];
	hostId?: string;
	error?: string;
}

// Chat message type
export interface ChatMessage {
	type: 'chat';
	text: string;
	senderId: string;
	timestamp: number;
}

// Negotiation state for perfect negotiation pattern
export interface NegotiationState {
	makingOffer: boolean;
	ignoreOffer: boolean;
	isSettingRemoteAnswerPending: boolean;
}

// Extended RTCPeerConnection with our custom properties
export interface ExtendedRTCPeerConnection extends RTCPeerConnection {
	negotiationState: NegotiationState;
	pendingCandidates?: RTCIceCandidateInit[];
}

// Room state
export interface RoomState {
	roomId: string | null;
	userId: string | null;
	hostId: string | null;
	isHost: boolean;
	members: string[];
}

// UI Elements interface
export interface UIElements {
	createRoomBtn: HTMLButtonElement;
	joinRoomBtn: HTMLButtonElement;
	leaveRoomBtn: HTMLButtonElement;
	roomIdInput: HTMLInputElement;
	messageInput: HTMLInputElement;
	sendBtn: HTMLButtonElement;
	messages: HTMLDivElement;
	roomInfo: HTMLDivElement;
	membersList: HTMLDivElement;
	connectionStatus: HTMLDivElement;
}

// Event types for the event system
export type AppEventType =
	| 'websocket:connected'
	| 'websocket:disconnected'
	| 'websocket:message'
	| 'room:created'
	| 'room:joined'
	| 'room:left'
	| 'user:joined'
	| 'user:left'
	| 'peer:connected'
	| 'peer:disconnected'
	| 'datachannel:open'
	| 'datachannel:closed'
	| 'chat:message'
	| 'system:message'
	| 'error:occurred';

export interface AppEvent<T = unknown> {
	type: AppEventType;
	data: T;
}
