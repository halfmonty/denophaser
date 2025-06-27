import { UIElements, RoomState } from './types.ts';
import { MessageDisplay } from './chat.ts';
import { Logger, EventEmitter, getRequiredElement } from './utils.ts';
import { config } from './config.ts';

export interface UIEvents {
    'ui:createRoom': void;
    'ui:joinRoom': string;
    'ui:leaveRoom': void;
    'ui:sendMessage': string;
}

export class UIManager extends EventEmitter<UIEvents> {
    private elements: UIElements;
    private logger = new Logger('UIManager');

    constructor() {
        super();
        this.elements = this.getUIElements();
        this.setupEventListeners();
    }

    private getUIElements(): UIElements {
        return {
            createRoomBtn: getRequiredElement<HTMLButtonElement>('createRoomBtn'),
            joinRoomBtn: getRequiredElement<HTMLButtonElement>('joinRoomBtn'),
            leaveRoomBtn: getRequiredElement<HTMLButtonElement>('leaveRoomBtn'),
            roomIdInput: getRequiredElement<HTMLInputElement>('roomIdInput'),
            messageInput: getRequiredElement<HTMLInputElement>('messageInput'),
            sendBtn: getRequiredElement<HTMLButtonElement>('sendBtn'),
            messages: getRequiredElement<HTMLDivElement>('messages'),
            roomInfo: getRequiredElement<HTMLDivElement>('roomInfo'),
            membersList: getRequiredElement<HTMLDivElement>('membersList'),
            connectionStatus: getRequiredElement<HTMLDivElement>('connectionStatus')
        };
    }

    private setupEventListeners(): void {
        this.elements.createRoomBtn.addEventListener('click', () => {
            this.emit('ui:createRoom', undefined);
        });

        this.elements.joinRoomBtn.addEventListener('click', () => {
            const roomId = this.elements.roomIdInput.value.trim();
            if (roomId) {
                this.emit('ui:joinRoom', roomId);
            } else {
                this.showAlert('Please enter a room ID');
            }
        });

        this.elements.leaveRoomBtn.addEventListener('click', () => {
            this.emit('ui:leaveRoom', undefined);
        });

        this.elements.sendBtn.addEventListener('click', () => {
            this.handleSendMessage();
        });

        this.elements.messageInput.addEventListener('keypress', (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                this.handleSendMessage();
            }
        });
    }

    private handleSendMessage(): void {
        const text = this.elements.messageInput.value.trim();
        if (text) {
            this.emit('ui:sendMessage', text);
            this.elements.messageInput.value = '';
        }
    }

    updateConnectionStatus(connected: boolean): void {
        this.elements.connectionStatus.textContent = connected ?
            'Connected to signaling server' :
            'Disconnected from signaling server';
        this.elements.connectionStatus.className = `status ${connected ? 'connected' : 'disconnected'}`;

        this.elements.createRoomBtn.disabled = !connected;
        this.elements.joinRoomBtn.disabled = !connected;
    }

    updateRoomState(state: RoomState): void {
        const inRoom = state.roomId !== null;

        this.elements.createRoomBtn.disabled = inRoom;
        this.elements.joinRoomBtn.disabled = inRoom;
        this.elements.leaveRoomBtn.disabled = !inRoom;
        this.elements.messageInput.disabled = !inRoom;
        this.elements.sendBtn.disabled = !inRoom;

        if (inRoom) {
            this.elements.roomInfo.innerHTML = `
                <strong>Room ID:</strong> ${state.roomId}<br>
                <strong>Your ID:</strong> ${state.userId}<br>
                <strong>Role:</strong> ${state.isHost ? 'Host (Hub)' : 'Member'}<br>
                ${!state.isHost ? `<strong>Host ID:</strong> ${state.hostId}` : ''}
            `;

            this.updateMembersList(state.members, state.userId, state.hostId);
        } else {
            this.elements.roomInfo.innerHTML = '';
            this.elements.membersList.innerHTML = '';
            this.elements.roomIdInput.value = '';
        }
    }

    updateMembersList(members: string[], currentUserId: string | null, hostId: string | null): void {
        const memberCount = members.length;
        const memberRoles = members.map(id => {
            if (id === currentUserId) return `${id} (You)`;
            if (id === hostId) return `${id} (Host)`;
            return id;
        });

        this.elements.membersList.innerHTML = `
            <strong>Members (${memberCount}):</strong><br>
            ${memberRoles.join('<br>')}
        `;
    }

    addMessage(message: MessageDisplay): void {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.type}`;
        messageDiv.textContent = message.text;
        this.elements.messages.appendChild(messageDiv);

        // Auto-scroll to bottom if near bottom
        const messages = this.elements.messages;
        const isNearBottom = messages.scrollHeight - messages.scrollTop - messages.clientHeight < config.ui.scrollToBottomThreshold;
        if (isNearBottom) {
            messages.scrollTop = messages.scrollHeight;
        }

        // Limit displayed messages
        while (messages.children.length > config.ui.maxMessagesDisplayed) {
            messages.removeChild(messages.firstChild!);
        }
    }

    addChatMessage(text: string, type: 'own' | 'other'): void {
        this.addMessage({ text, type, timestamp: Date.now() });
    }

    addSystemMessage(text: string): void {
        this.addMessage({ text, type: 'system', timestamp: Date.now() });
    }

    showAlert(message: string): void {
        // In a real app, this could be a nicer modal or toast notification
        alert(message);
    }

    showError(error: string): void {
        this.addSystemMessage(`Error: ${error}`);
        this.logger.error('UI Error:', error);
    }

    clearMessages(): void {
        this.elements.messages.innerHTML = '';
    }

    setRoomIdInput(roomId: string): void {
        this.elements.roomIdInput.value = roomId;
    }

    focusMessageInput(): void {
        this.elements.messageInput.focus();
    }
}