import { Hono } from '@hono/hono'
import { serveStatic } from '@hono/hono/deno'
import { upgradeWebSocket } from '@hono/hono/deno'

const app = new Hono()

// Store WebSocket connections for live reload
const reloadConnections = new Set<WebSocket>()

// Room management
interface Room {
  id: string;
  host: string;
  members: Map<string, WebSocket>;
}

const rooms = new Map<string, Room>();
const userToRoom = new Map<string, string>();

// WebSocket message types
interface SignalingMessage {
  type: "create-room" | "join-room" | "leave-room" | "offer" | "answer" | "ice-candidate" | "room-created" | "room-joined" | "user-joined" | "user-left" | "error";
  roomId?: string;
  userId?: string;
  targetId?: string;
  data?: any;
  members?: string[];
  hostId?: string;
  error?: string;
}

// WebSocket endpoint
app.get("/ws", upgradeWebSocket((_c) => {
  let userId: string;

  return {
    onOpen: (_event, _ws) => {
      userId = crypto.randomUUID();
      console.log(`User ${userId} connected`);
    },

    onMessage: (event, ws) => {
      const message: SignalingMessage = JSON.parse(event.data.toString());
      console.log(`Received from ${userId}:`, message);

      switch (message.type) {
        case "create-room":
          handleCreateRoom(userId, ws.raw!);
          break;

        case "join-room":
          if (message.roomId) {
            handleJoinRoom(userId, message.roomId, ws.raw!);
          }
          break;

        case "leave-room":
          handleLeaveRoom(userId);
          break;

        case "offer":
        case "answer":
        case "ice-candidate":
          handleSignaling(userId, message);
          break;
      }
    },

    onClose: () => {
      console.log(`User ${userId} disconnected`);
      handleLeaveRoom(userId);
    },

    onError: (event) => {
      console.error(`WebSocket error for user ${userId}:`, event);
    }
  };
}));

function handleCreateRoom(userId: string, ws: WebSocket) {
  const roomId = crypto.randomUUID();
  const room: Room = {
    id: roomId,
    host: userId,
    members: new Map([[userId, ws]])
  };

  rooms.set(roomId, room);
  userToRoom.set(userId, roomId);

  const response: SignalingMessage = {
    type: "room-created",
    roomId,
    userId,
    hostId: userId,
    members: [userId]
  };

  ws.send(JSON.stringify(response));
  console.log(`Room ${roomId} created by ${userId}`);
}

function handleJoinRoom(userId: string, roomId: string, ws: WebSocket) {
  const room = rooms.get(roomId);

  if (!room) {
    const error: SignalingMessage = {
      type: "error",
      error: "Room not found"
    };
    ws.send(JSON.stringify(error));
    return;
  }

  // Add user to room
  room.members.set(userId, ws);
  userToRoom.set(userId, roomId);

  // Get all member IDs
  const memberIds = Array.from(room.members.keys());

  // Send room-joined to the new user
  const joinResponse: SignalingMessage = {
    type: "room-joined",
    roomId,
    userId,
    hostId: room.host,
    members: memberIds
  };
  ws.send(JSON.stringify(joinResponse));

  // Notify host about new user (only host needs to know in star topology)
  if (userId !== room.host) {
    const hostWs = room.members.get(room.host);
    if (hostWs) {
      const userJoinedMsg: SignalingMessage = {
        type: "user-joined",
        roomId,
        userId,
        members: memberIds
      };
      hostWs.send(JSON.stringify(userJoinedMsg));
    }
  }

  console.log(`User ${userId} joined room ${roomId}`);
}

function handleLeaveRoom(userId: string) {
  const roomId = userToRoom.get(userId);
  if (!roomId) return;

  const room = rooms.get(roomId);
  if (!room) return;

  room.members.delete(userId);
  userToRoom.delete(userId);

  // If host left, close the room
  if (userId === room.host) {
    // Notify all members that room is closing
    room.members.forEach((ws, _memberId) => {
      const msg: SignalingMessage = {
        type: "error",
        error: "Host disconnected. Room closed."
      };
      ws.send(JSON.stringify(msg));
    });
    rooms.delete(roomId);
    console.log(`Room ${roomId} closed - host left`);
  } else {
    // Notify host that user left
    const hostWs = room.members.get(room.host);
    if (hostWs) {
      const userLeftMsg: SignalingMessage = {
        type: "user-left",
        roomId,
        userId,
        members: Array.from(room.members.keys())
      };
      hostWs.send(JSON.stringify(userLeftMsg));
    }
    console.log(`User ${userId} left room ${roomId}`);
  }
}

function handleSignaling(senderId: string, message: SignalingMessage) {
  const roomId = userToRoom.get(senderId);
  if (!roomId) return;

  const room = rooms.get(roomId);
  if (!room) return;

  // Forward signaling message to target
  if (message.targetId) {
    const targetWs = room.members.get(message.targetId);
    if (targetWs) {
      const forwardMsg = {
        ...message,
        userId: senderId
      };
      targetWs.send(JSON.stringify(forwardMsg));
      console.log(`Forwarded ${message.type} from ${senderId} to ${message.targetId}`);
    }
  }
}

// WebSocket endpoint for live reload
app.get('/ws/reload', upgradeWebSocket((_c) => {
  return {
    onOpen: (_event, ws) => {
      console.log('🤝 Live reload client connected')
      reloadConnections.add(ws.raw!)
    },
    onClose: (_event, ws) => {
      console.log('👋 Live reload client disconnected')
      reloadConnections.delete(ws.raw!)
    },
    onError: (event, ws) => {
      console.log('🤷‍♂️ Live reload WebSocket error:', event)
      reloadConnections.delete(ws.raw!)
    }
  }
}))

// API endpoint to trigger reload (called by build script)
app.post('/api/reload', (c) => {
  console.log('👍 Triggering reload for', reloadConnections.size, 'clients')

  for (const ws of reloadConnections) {
    try {
      ws.send('reload')
    } catch (error) {
      console.log('🚩 Error sending reload signal:', error)
      reloadConnections.delete(ws)
    }
  }

  return c.json({ success: true, clients: reloadConnections.size })
})

// Serve the main HTML file
app.use('/*', serveStatic({ root: './static/' }));
app.get('/', serveStatic({ path: './static/index.html' }));
app.get('*', serveStatic({ path: './static/404.html' }));
// app.get('/*', serveStatic({
//   path: './static/*',
//   mimes: {
//     js: 'application/javascript'
//   }
// }))

// Health check endpoint
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Start server
const port = 3000
console.log(`🚀 Server starting on http://localhost:${port}`)
console.log(`🎮 Game available at http://localhost:${port}`)
console.log(`⚡ Live reload enabled`)

Deno.serve({ port }, app.fetch)