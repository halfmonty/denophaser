export const config = {
    // WebRTC configuration
    rtc: {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' }
        ],
        dataChannelOptions: {
            ordered: true
        }
    },

    // WebSocket configuration
    websocket: {
        reconnectAttempts: 3,
        reconnectDelay: 1000,
        heartbeatInterval: 30000
    },

    // UI configuration
    ui: {
        maxMessageLength: 500,
        maxMessagesDisplayed: 100,
        scrollToBottomThreshold: 50
    },

    // Application configuration
    app: {
        debugMode: true,
        maxRoomMembers: 10
    }
} as const;

// Helper function to get WebSocket URL
export function getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
}