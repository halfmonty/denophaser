import { config } from './config.ts';

// Logging utilities
export class Logger {
    private context: string;

    constructor(context: string) {
        this.context = context;
    }

    log(...args: unknown[]): void {
        if (config.app.debugMode) {
            console.log(`[${this.context}]`, ...args);
        }
    }

    error(...args: unknown[]): void {
        console.error(`[${this.context}]`, ...args);
    }

    warn(...args: unknown[]): void {
        console.warn(`[${this.context}]`, ...args);
    }
}

// Event Emitter for inter-component communication
export class EventEmitter<T extends Record<string, unknown> = Record<string, unknown>> {
    private events: Map<keyof T, Set<(data: T[keyof T]) => void>> = new Map();

    on<K extends keyof T>(event: K, handler: (data: T[K]) => void): void {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }
        this.events.get(event)!.add(handler as (data: T[keyof T]) => void);
    }

    off<K extends keyof T>(event: K, handler: (data: T[K]) => void): void {
        const handlers = this.events.get(event);
        if (handlers) {
            handlers.delete(handler as (data: T[keyof T]) => void);
        }
    }

    emit<K extends keyof T>(event: K, data: T[K]): void {
        const handlers = this.events.get(event);
        if (handlers) {
            handlers.forEach(handler => handler(data));
        }
    }

    removeAllListeners(event?: keyof T): void {
        if (event) {
            this.events.delete(event);
        } else {
            this.events.clear();
        }
    }
}

// Validation helpers
export function isValidRoomId(roomId: string): boolean {
    // UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(roomId);
}

export function sanitizeMessage(message: string): string {
    return message.trim().slice(0, config.ui.maxMessageLength);
}

// Error handling helpers
export class AppError extends Error {
    constructor(
        message: string,
        public code: string,
        public recoverable: boolean = true
    ) {
        super(message);
        this.name = 'AppError';
    }
}

// Async utility functions
export async function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string = 'Operation timed out'
): Promise<T> {
    const timeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new AppError(errorMessage, 'TIMEOUT')), timeoutMs);
    });

    return Promise.race([promise, timeout]);
}

// DOM helpers
export function getRequiredElement<T extends HTMLElement>(id: string): T {
    const element = document.getElementById(id) as T | null;
    if (!element) {
        throw new AppError(`Required element with id "${id}" not found`, 'DOM_ERROR', false);
    }
    return element;
}