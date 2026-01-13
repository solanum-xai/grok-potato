# System Architecture

## Overview

Grok Solanum is a distributed system with four main components communicating over HTTP and WebSocket protocols.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              INTERNET                                        │
│                                                                             │
│    ┌──────────────┐         ┌──────────────┐         ┌──────────────┐      │
│    │   Browser    │◀───────▶│   Railway    │◀───────▶│  Cloudflare  │      │
│    │   Client     │   WS    │   Backend    │  HTTP   │   Tunnel     │      │
│    └──────────────┘         └──────────────┘         └──────────────┘      │
│                                    │                        │               │
│                                    ▼                        │               │
│                             ┌──────────────┐                │               │
│                             │  PostgreSQL  │                │               │
│                             │   (Railway)  │                │               │
│                             └──────────────┘                │               │
│                                                             │               │
└─────────────────────────────────────────────────────────────┼───────────────┘
                                                              │
                                                              │
┌─────────────────────────────────────────────────────────────┼───────────────┐
│                           LOCAL NETWORK                     │               │
│                                                             ▼               │
│    ┌──────────────┐         ┌──────────────┐         ┌──────────────┐      │
│    │   Capture    │────────▶│   Backend    │◀───────▶│ Raspberry Pi │      │
│    │   Service    │  HTTP   │   (local)    │  HTTP   │   Service    │      │
│    └──────────────┘         └──────────────┘         └──────────────┘      │
│          │                                                  │               │
│          │ RTMP                                             │ GPIO          │
│          ▼                                                  ▼               │
│    ┌──────────────┐                                  ┌──────────────┐      │
│    │  Cloudflare  │                                  │   Hardware   │      │
│    │   Stream     │                                  │ Sensors/Relay│      │
│    └──────────────┘                                  └──────────────┘      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Details

### 1. Frontend (Astro + Svelte)

**Responsibilities:**
- Display real-time plant status and health score
- Render sensor data charts (temperature, humidity)
- Provide chat interface for Grok interaction
- Embed Cloudflare livestream
- Show command and analysis history

**Technology:**
- Astro 4.3 for static site generation
- Svelte 4.2 for interactive components
- Chart.js for data visualization
- Native WebSocket for real-time updates

**Key Components:**
```
src/components/
├── PlantStatus.svelte    # Health score + status display
├── Charts.svelte         # Dual sensor charts
├── GrokChat.svelte       # Chat interface
├── CommandLog.svelte     # Action history
└── SensorDisplay.svelte  # Current readings
```

---

### 2. Backend (Node.js + Fastify)

**Responsibilities:**
- REST API for all data access
- WebSocket server for real-time broadcasts
- Scheduler for periodic analysis
- Grok Vision API integration
- Pi service communication
- Database operations

**Technology:**
- Node.js with TypeScript
- Fastify web framework
- Drizzle ORM for PostgreSQL
- node-cron for scheduling
- @fastify/websocket for real-time

**Services:**
```
src/services/
├── grok.ts          # xAI Grok Vision API calls
├── scheduler.ts     # Cron jobs + action execution
└── pi-client.ts     # HTTP client for Pi service
```

---

### 3. Raspberry Pi Service (Python + Flask)

**Responsibilities:**
- Read AM2320 sensor data
- Control GPIO relays
- Expose HTTP API for backend

**Technology:**
- Python 3
- Flask web framework
- smbus2 for I2C communication
- subprocess for GPIO control

---

### 4. Capture Service (Python + FFmpeg)

**Responsibilities:**
- Capture webcam frames
- Upload to backend for analysis
- Stream to Cloudflare via RTMP

**Technology:**
- Python 3 with OpenCV
- FFmpeg for RTMP streaming
- Requests for HTTP uploads

**Flow:**
```
Webcam → OpenCV → Base64 → Backend API
           │
           └──→ FFmpeg → RTMP → Cloudflare Stream
```

---

## Data Flow

### Analysis Cycle

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│ Capture │────▶│ Backend │────▶│  Grok   │────▶│ Backend │
│ uploads │     │ stores  │     │ analyzes│     │ actions │
│ image   │     │ image   │     │ image   │     │         │
└─────────┘     └─────────┘     └─────────┘     └────┬────┘
                                                     │
     ┌───────────────────────────────────────────────┘
     │
     ▼
┌─────────┐     ┌─────────┐     ┌─────────┐
│   Pi    │────▶│ Backend │────▶│Frontend │
│ executes│     │ logs &  │     │ updates │
│ command │     │broadcast│     │   UI    │
└─────────┘     └─────────┘     └─────────┘
```

### Sensor Collection

```
Every 1 minute:

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Backend   │────▶│     Pi      │────▶│   Backend   │
│  Scheduler  │     │   Service   │     │   Stores    │
│   triggers  │     │             │     │   to DB     │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │  WebSocket  │
                                        │  Broadcast  │
                                        └─────────────┘
```

---

## Database Schema

```
┌─────────────────────────────────────────────────────────┐
│                      PostgreSQL                          │
│                                                         │
│  ┌─────────────────┐     ┌─────────────────┐           │
│  │ sensor_readings │     │  grok_analyses  │           │
│  ├─────────────────┤     ├─────────────────┤           │
│  │ id (PK)         │     │ id (PK)         │           │
│  │ temperature     │     │ health_score    │           │
│  │ humidity        │     │ observations    │           │
│  │ created_at      │     │ issues          │           │
│  └─────────────────┘     │ soil_assessment │           │
│                          │ light_assessment│           │
│                          │ actions         │           │
│  ┌─────────────────┐     │ message         │           │
│  │    commands     │     │ detailed_thoughts│          │
│  ├─────────────────┤     │ image_base64    │           │
│  │ id (PK)         │     │ created_at      │           │
│  │ command_type    │     └─────────────────┘           │
│  │ reason          │                                   │
│  │ success         │     ┌─────────────────┐           │
│  │ error           │     │  chat_messages  │           │
│  │ created_at      │     ├─────────────────┤           │
│  └─────────────────┘     │ id (PK)         │           │
│                          │ role            │           │
│                          │ content         │           │
│                          │ created_at      │           │
│                          └─────────────────┘           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Scheduling Logic

```typescript
// Timezone: UTC+2 (Europe/Vilnius)

const LIGHT_ON_HOUR = 20;   // 8 PM
const LIGHT_OFF_HOUR = 12;  // 12 PM (noon)

function isDayMode(hour: number): boolean {
  // Day: 20:00 - 12:00 (next day)
  // Night: 12:00 - 20:00
  return hour >= LIGHT_ON_HOUR || hour < LIGHT_OFF_HOUR;
}

// Analysis intervals
const DAY_INTERVAL = 10;    // minutes
const NIGHT_INTERVAL = 240; // minutes (4 hours)
```

---

## Deployment Architecture

### Production

```
┌─────────────────┐    ┌─────────────────┐
│     Railway     │    │   Cloudflare    │
│                 │    │                 │
│  ┌───────────┐  │    │  ┌───────────┐  │
│  │  Backend  │◀─┼────┼──│  Tunnel   │  │
│  │  Fastify  │  │    │  └───────────┘  │
│  └───────────┘  │    │        ▲        │
│        │        │    │        │        │
│        ▼        │    │  ┌───────────┐  │
│  ┌───────────┐  │    │  │  Stream   │  │
│  │ PostgreSQL│  │    │  │  (RTMP)   │  │
│  └───────────┘  │    │  └───────────┘  │
│                 │    │        ▲        │
└─────────────────┘    └────────┼────────┘
                                │
                       ┌────────┴────────┐
                       │  Raspberry Pi   │
                       │  (Home Network) │
                       │                 │
                       │  Flask + GPIO   │
                       │  Capture + FFmpeg│
                       └─────────────────┘
```

### Local Development

```
localhost:3000  ← Backend (Fastify)
localhost:4321  ← Frontend (Astro dev)
localhost:5432  ← PostgreSQL (Docker)
localhost:5000  ← Pi Service (Flask or mock)
```

---

## Performance Considerations

| Metric | Value | Notes |
|--------|-------|-------|
| Sensor readings | 1/min | ~525K rows/year |
| Grok analyses | 6-144/day | Depends on day/night |
| Image storage | ~500KB each | Can optimize with compression |
| WebSocket connections | ~100 concurrent | Single Node instance |
| Grok API latency | 5-10s | Main bottleneck |

---

## Failure Handling

```
┌──────────────────────────────────────────────────────┐
│                 Failure Scenarios                     │
│                                                      │
│  Pi Unreachable:                                     │
│  └── Sensors return cached/null, commands fail       │
│                                                      │
│  Grok API Down:                                      │
│  └── Analysis skipped, logged, retry next interval   │
│                                                      │
│  Database Down:                                      │
│  └── Backend returns 503, frontend shows cached      │
│                                                      │
│  Capture Service Down:                               │
│  └── No new images, analyses use last available      │
│                                                      │
│  WebSocket Disconnect:                               │
│  └── Frontend auto-reconnects with exponential       │
│      backoff, falls back to polling                  │
│                                                      │
└──────────────────────────────────────────────────────┘
```
