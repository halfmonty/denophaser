import { ExtendedRTCPeerConnection, NegotiationState } from './types.ts';
import { config } from './config.ts';
import { Logger, EventEmitter, AppError } from './utils.ts';

export interface WebRTCEvents {
    'peer:connected': { userId: string };
    'peer:disconnected': { userId: string };
    'datachannel:open': { userId: string; channel: RTCDataChannel };
    'datachannel:closed': { userId: string };
    'ice:candidate': { userId: string; candidate: RTCIceCandidateInit };
    'negotiation:offer': { userId: string; offer: RTCSessionDescriptionInit };
    'negotiation:answer': { userId: string; answer: RTCSessionDescriptionInit };
}

export class WebRTCManager extends EventEmitter<WebRTCEvents> {
    private connections = new Map<string, ExtendedRTCPeerConnection>();
    private dataChannels = new Map<string, RTCDataChannel>();
    private logger = new Logger('WebRTCManager');
    private isPolite: boolean = false;

    setPolite(polite: boolean): void {
        this.isPolite = polite;
        this.logger.log(`Set polite mode: ${polite}`);
    }

    async createConnection(userId: string, createDataChannel: boolean): Promise<ExtendedRTCPeerConnection> {
        this.logger.log(`Creating connection to ${userId}, createDataChannel: ${createDataChannel}`);

        const pc = new RTCPeerConnection(config.rtc) as ExtendedRTCPeerConnection;
        this.connections.set(userId, pc);

        // Initialize negotiation state
        pc.negotiationState = {
            makingOffer: false,
            ignoreOffer: false,
            isSettingRemoteAnswerPending: false
        };

        this.setupPeerConnectionHandlers(pc, userId);

        if (createDataChannel) {
            const channel = pc.createDataChannel('chat', config.rtc.dataChannelOptions);
            this.setupDataChannel(channel, userId);
        } else {
            pc.ondatachannel = (event: RTCDataChannelEvent) => {
                this.setupDataChannel(event.channel, userId);
            };
        }

        return pc;
    }

    async handleOffer(userId: string, offer: RTCSessionDescriptionInit): Promise<void> {
        await this.handleNegotiation(userId, offer);
    }

    async handleAnswer(userId: string, answer: RTCSessionDescriptionInit): Promise<void> {
        await this.handleNegotiation(userId, answer);
    }

    async handleIceCandidate(userId: string, candidate: RTCIceCandidateInit): Promise<void> {
        const pc = this.connections.get(userId);
        if (!pc) {
            this.logger.warn(`No connection found for ${userId}`);
            return;
        }

        // Buffer candidates if setting remote description
        if (pc.negotiationState?.isSettingRemoteAnswerPending) {
            if (!pc.pendingCandidates) {
                pc.pendingCandidates = [];
            }
            pc.pendingCandidates.push(candidate);
            return;
        }

        try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
            await this.processPendingCandidates(pc);
        } catch (error) {
            this.logger.error(`Error adding ICE candidate for ${userId}:`, error);
        }
    }

    getDataChannel(userId: string): RTCDataChannel | undefined {
        return this.dataChannels.get(userId);
    }

    getAllDataChannels(): Map<string, RTCDataChannel> {
        return new Map(this.dataChannels);
    }

    closeConnection(userId: string): void {
        this.logger.log(`Closing connection to ${userId}`);

        const pc = this.connections.get(userId);
        if (pc) {
            pc.close();
            this.connections.delete(userId);
        }

        const channel = this.dataChannels.get(userId);
        if (channel) {
            channel.close();
            this.dataChannels.delete(userId);
        }
    }

    closeAllConnections(): void {
        this.logger.log('Closing all connections');

        this.connections.forEach((pc, userId) => {
            this.closeConnection(userId);
        });
    }

    private setupPeerConnectionHandlers(pc: ExtendedRTCPeerConnection, userId: string): void {
        pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
            if (event.candidate) {
                this.emit('ice:candidate', {
                    userId,
                    candidate: event.candidate.toJSON()
                });
            }
        };

        pc.onconnectionstatechange = () => {
            this.logger.log(`Connection state with ${userId}: ${pc.connectionState}`);

            if (pc.connectionState === 'connected') {
                this.emit('peer:connected', { userId });
            } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                this.emit('peer:disconnected', { userId });
            }
        };

        pc.onnegotiationneeded = async () => {
            try {
                const state = pc.negotiationState;
                state.makingOffer = true;
                await pc.setLocalDescription();

                if (pc.localDescription) {
                    this.emit('negotiation:offer', {
                        userId,
                        offer: pc.localDescription
                    });
                }
            } catch (error) {
                this.logger.error(`Error in negotiationneeded for ${userId}:`, error);
            } finally {
                pc.negotiationState.makingOffer = false;
            }
        };
    }

    private setupDataChannel(channel: RTCDataChannel, userId: string): void {
        this.dataChannels.set(userId, channel);

        channel.onopen = () => {
            this.logger.log(`Data channel with ${userId} opened`);
            this.emit('datachannel:open', { userId, channel });
        };

        channel.onclose = () => {
            this.logger.log(`Data channel with ${userId} closed`);
            this.dataChannels.delete(userId);
            this.emit('datachannel:closed', { userId });
        };

        channel.onerror = (error: Event) => {
            this.logger.error(`Data channel error with ${userId}:`, error);
        };
    }

    private async handleNegotiation(userId: string, description: RTCSessionDescriptionInit): Promise<void> {
        let pc = this.connections.get(userId);

        if (!pc) {
            pc = await this.createConnection(userId, false);
        }

        const state = pc.negotiationState;

        try {
            // Check for offer collision
            const offerCollision = description.type === 'offer' &&
                (state.makingOffer || pc.signalingState !== 'stable');

            // Impolite peer ignores colliding offers
            state.ignoreOffer = !this.isPolite && offerCollision;

            if (state.ignoreOffer) {
                this.logger.log('Ignoring colliding offer as impolite peer');
                return;
            }

            state.isSettingRemoteAnswerPending = description.type === 'answer';
            await pc.setRemoteDescription(description);
            state.isSettingRemoteAnswerPending = false;

            // Send answer if we received an offer
            if (description.type === 'offer') {
                await pc.setLocalDescription();
                if (pc.localDescription) {
                    this.emit('negotiation:answer', {
                        userId,
                        answer: pc.localDescription
                    });
                }
            }

            await this.processPendingCandidates(pc);
        } catch (error) {
            this.logger.error(`Error in negotiation with ${userId}:`, error);
            throw new AppError('Negotiation failed', 'NEGOTIATION_ERROR');
        }
    }

    private async processPendingCandidates(pc: ExtendedRTCPeerConnection): Promise<void> {
        if (pc.pendingCandidates && pc.pendingCandidates.length > 0) {
            for (const candidate of pc.pendingCandidates) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (error) {
                    this.logger.error('Error adding pending ICE candidate:', error);
                }
            }
            pc.pendingCandidates = [];
        }
    }
}