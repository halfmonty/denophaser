import { SignalingManager } from './signaling.ts';
import { WebRTCManager } from './webrtc.ts';
import { RoomManager } from './room.ts';
import { ChatManager } from './chat.ts';
import { UIManager } from './ui.ts';
import { SignalingMessage, ChatMessage } from './types.ts';
import { Logger, AppError } from './utils.ts';

export class StarTopologyChat {
    private signaling: SignalingManager;
    private webrtc: WebRTCManager;
    private room: RoomManager;
    private chat: ChatManager;
    private ui: UIManager;
    private logger = new Logger('StarTopologyChat');

    constructor() {
        // Initialize all managers
        this.signaling = new SignalingManager();
        this.webrtc = new WebRTCManager();
        this.room = new RoomManager();
        this.chat = new ChatManager();
        this.ui = new UIManager();

        this.setupEventHandlers();
        this.initialize();
    }

    private initialize(): void {
        this.logger.log('Initializing application');
        this.signaling.connect();
    }

    private setupEventHandlers(): void {
        // Signaling events
        this.signaling.on('connected', () => {
            this.ui.updateConnectionStatus(true);
            this.ui.addSystemMessage('Connected to signaling server');
        });

        this.signaling.on('disconnected', () => {
            this.ui.updateConnectionStatus(false);
            this.ui.addSystemMessage('Disconnected from signaling server');
            this.cleanup();
        });

        this.signaling.on('message', (message) => {
            this.handleSignalingMessage(message);
        });

        this.signaling.on('error', (error) => {
            this.ui.showError(error.message);
        });

        // WebRTC events
        this.webrtc.on('peer:connected', ({ userId }) => {
            this.ui.addSystemMessage(`Connected to ${userId}`);
        });

        this.webrtc.on('peer:disconnected', ({ userId }) => {
            this.ui.addSystemMessage(`Connection to ${userId} lost`);
        });

        this.webrtc.on('datachannel:open', ({ userId, channel }) => {
            this.ui.addSystemMessage(`Chat channel with ${userId} established`);

            // Setup message handler for this channel
            channel.onmessage = (event: MessageEvent) => {
                try {
                    const message: ChatMessage = JSON.parse(event.data);
                    const currentUserId = this.room.getUserId();
                    if (currentUserId) {
                        this.chat.receiveMessage(message, userId, currentUserId, this.room.isHost());
                    }
                } catch (error) {
                    this.logger.error('Failed to parse chat message:', error);
                }
            };
        });

        this.webrtc.on('datachannel:closed', ({ userId }) => {
            this.ui.addSystemMessage(`Chat channel with ${userId} closed`);
        });

        this.webrtc.on('ice:candidate', ({ userId, candidate }) => {
            this.signaling.send({
                type: 'ice-candidate',
                targetId: userId,
                data: candidate
            });
        });

        this.webrtc.on('negotiation:offer', ({ userId, offer }) => {
            this.signaling.send({
                type: 'offer',
                targetId: userId,
                data: offer
            });
        });

        this.webrtc.on('negotiation:answer', ({ userId, answer }) => {
            this.signaling.send({
                type: 'answer',
                targetId: userId,
                data: answer
            });
        });

        // Room events
        this.room.on('room:created', (state) => {
            this.webrtc.setPolite(true); // Host is polite
            this.ui.addSystemMessage(`Room created! Room ID: ${state.roomId}`);
        });

        this.room.on('room:joined', (state) => {
            this.webrtc.setPolite(false); // Members are impolite
            this.ui.addSystemMessage(`Joined room: ${state.roomId}`);

            // Non-host creates connection to host
            if (!state.isHost && state.hostId) {
                this.webrtc.createConnection(state.hostId, true);
            }
        });

        this.room.on('room:updated', (state) => {
            this.ui.updateRoomState(state);
        });

        this.room.on('member:joined', ({ userId }) => {
            if (this.room.isHost()) {
                // Host waits for joining peer to initiate
                this.webrtc.createConnection(userId, false);
            }
        });

        this.room.on('member:left', ({ userId }) => {
            this.webrtc.closeConnection(userId);
        });

        // Chat events
        this.chat.on('message:sent', (message) => {
            const userId = this.room.getUserId();
            if (!userId) return;

            if (this.room.isHost()) {
                // Host broadcasts to all
                this.webrtc.getAllDataChannels().forEach((channel, targetUserId) => {
                    if (channel.readyState === 'open') {
                        channel.send(JSON.stringify(message));
                    }
                });
            } else {
                // Members send only to host
                const hostId = this.room.getHostId();
                if (hostId) {
                    const channel = this.webrtc.getDataChannel(hostId);
                    if (channel && channel.readyState === 'open') {
                        channel.send(JSON.stringify(message));
                    }
                }
            }
        });

        this.chat.on('message:broadcast', ({ message, excludeUserId }) => {
            // Host broadcasts message to other members
            this.webrtc.getAllDataChannels().forEach((channel, userId) => {
                if (userId !== excludeUserId && channel.readyState === 'open') {
                    channel.send(JSON.stringify(message));
                }
            });
        });

        // UI events
        this.ui.on('ui:createRoom', () => {
            try {
                this.room.validateCreateRoom();
                this.signaling.send({ type: 'create-room' });
            } catch (error) {
                if (error instanceof AppError) {
                    this.ui.showError(error.message);
                }
            }
        });

        this.ui.on('ui:joinRoom', (roomId) => {
            try {
                this.room.validateJoinRoom(roomId);
                this.signaling.send({ type: 'join-room', roomId });
            } catch (error) {
                if (error instanceof AppError) {
                    this.ui.showError(error.message);
                }
            }
        });

        this.ui.on('ui:leaveRoom', () => {
            this.signaling.send({ type: 'leave-room' });
            this.cleanup();
        });

        this.ui.on('ui:sendMessage', (text) => {
            const userId = this.room.getUserId();
            if (userId) {
                this.chat.sendMessage(text, userId);
            }
        });
    }

    private handleSignalingMessage(message: SignalingMessage): void {
        this.logger.log('Handling signaling message:', message.type);

        try {
            switch (message.type) {
                case 'room-created':
                    this.room.handleRoomCreated(message);
                    break;

                case 'room-joined':
                    this.room.handleRoomJoined(message);
                    break;

                case 'user-joined':
                    this.room.handleUserJoined(message);
                    break;

                case 'user-left':
                    this.room.handleUserLeft(message);
                    break;

                case 'offer':
                    if (message.userId && message.data) {
                        this.webrtc.handleOffer(message.userId, message.data as RTCSessionDescriptionInit);
                    }
                    break;

                case 'answer':
                    if (message.userId && message.data) {
                        this.webrtc.handleAnswer(message.userId, message.data as RTCSessionDescriptionInit);
                    }
                    break;

                case 'ice-candidate':
                    if (message.userId && message.data) {
                        this.webrtc.handleIceCandidate(message.userId, message.data as RTCIceCandidateInit);
                    }
                    break;

                case 'error':
                    if (message.error) {
                        this.ui.showError(message.error);
                    }
                    break;
            }
        } catch (error) {
            this.logger.error('Error handling signaling message:', error);
            if (error instanceof AppError) {
                this.ui.showError(error.message);
            }
        }
    }

    private cleanup(): void {
        this.logger.log('Cleaning up');
        this.webrtc.closeAllConnections();
        this.room.reset();
        this.chat.clearHistory();
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        (window as Window & { chat?: StarTopologyChat }).chat = new StarTopologyChat();
    });
} else {
    (window as Window & { chat?: StarTopologyChat }).chat = new StarTopologyChat();
}