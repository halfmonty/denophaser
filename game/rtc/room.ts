import { RoomState, SignalingMessage } from './types.ts';
import { Logger, EventEmitter, AppError, isValidRoomId } from './utils.ts';
import { config } from './config.ts';

export interface RoomEvents {
    'room:created': RoomState;
    'room:joined': RoomState;
    'room:left': void;
    'room:updated': RoomState;
    'member:joined': { userId: string; members: string[] };
    'member:left': { userId: string; members: string[] };
}

export class RoomManager extends EventEmitter<RoomEvents> {
    private state: RoomState = {
        roomId: null,
        userId: null,
        hostId: null,
        isHost: false,
        members: []
    };

    private logger = new Logger('RoomManager');

    getState(): Readonly<RoomState> {
        return { ...this.state };
    }

    isInRoom(): boolean {
        return this.state.roomId !== null;
    }

    isHost(): boolean {
        return this.state.isHost;
    }

    getUserId(): string | null {
        return this.state.userId;
    }

    getRoomId(): string | null {
        return this.state.roomId;
    }

    getHostId(): string | null {
        return this.state.hostId;
    }

    getMembers(): string[] {
        return [...this.state.members];
    }

    handleRoomCreated(message: SignalingMessage): void {
        if (!message.userId || !message.roomId || !message.hostId || !message.members) {
            throw new AppError('Invalid room created message', 'INVALID_MESSAGE');
        }

        this.state = {
            roomId: message.roomId,
            userId: message.userId,
            hostId: message.hostId,
            isHost: true,
            members: message.members
        };

        this.logger.log('Room created:', this.state);
        this.emit('room:created', this.state);
        this.emit('room:updated', this.state);
    }

    handleRoomJoined(message: SignalingMessage): void {
        if (!message.userId || !message.roomId || !message.hostId || !message.members) {
            throw new AppError('Invalid room joined message', 'INVALID_MESSAGE');
        }

        this.state = {
            roomId: message.roomId,
            userId: message.userId,
            hostId: message.hostId,
            isHost: false,
            members: message.members
        };

        this.logger.log('Room joined:', this.state);
        this.emit('room:joined', this.state);
        this.emit('room:updated', this.state);
    }

    handleUserJoined(message: SignalingMessage): void {
        if (!message.userId || !message.members) {
            throw new AppError('Invalid user joined message', 'INVALID_MESSAGE');
        }

        this.state.members = message.members;

        this.logger.log('User joined:', message.userId);
        this.emit('member:joined', { userId: message.userId, members: message.members });
        this.emit('room:updated', this.state);
    }

    handleUserLeft(message: SignalingMessage): void {
        if (!message.userId || !message.members) {
            throw new AppError('Invalid user left message', 'INVALID_MESSAGE');
        }

        this.state.members = message.members;

        this.logger.log('User left:', message.userId);
        this.emit('member:left', { userId: message.userId, members: message.members });
        this.emit('room:updated', this.state);
    }

    validateJoinRoom(roomId: string): void {
        if (this.isInRoom()) {
            throw new AppError('Already in a room', 'ALREADY_IN_ROOM');
        }

        if (!isValidRoomId(roomId)) {
            throw new AppError('Invalid room ID format', 'INVALID_ROOM_ID');
        }
    }

    validateCreateRoom(): void {
        if (this.isInRoom()) {
            throw new AppError('Already in a room', 'ALREADY_IN_ROOM');
        }
    }

    reset(): void {
        this.state = {
            roomId: null,
            userId: null,
            hostId: null,
            isHost: false,
            members: []
        };

        this.logger.log('Room state reset');
        this.emit('room:left', undefined);
        this.emit('room:updated', this.state);
    }

    canAcceptMoreMembers(): boolean {
        return this.state.members.length < config.app.maxRoomMembers;
    }
}