# Grok Solanum

**AI-Powered Autonomous Potato Growing System for Mars Colonization Simulation**

An experiment combining xAI's Grok Vision with real hardware to grow potatoes autonomously - as if preparing for Mars cultivation. The AI analyzes plant health 24/7 via webcam and controls watering/lighting based on visual analysis.

> *"Potatoes on Mars aren't just science fiction anymore"*

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (Astro + Svelte)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Livestream  │  │   Charts     │  │  Grok Chat   │  │ Plant Status │ │
│  │  (Cloudflare)│  │  (Chart.js)  │  │  Interface   │  │  Dashboard   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │ WebSocket + REST
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        BACKEND (Node.js + Fastify)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Scheduler   │  │  Grok API    │  │  Pi Client   │  │  WebSocket   │ │
│  │  (node-cron) │  │  Service     │  │  Service     │  │  Broadcast   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘ │
│                              │                                           │
│                              ▼                                           │
│                    ┌──────────────────┐                                 │
│                    │   PostgreSQL     │                                 │
│                    │   (Drizzle ORM)  │                                 │
│                    └──────────────────┘                                 │
└────────────────────────────┬────────────────────────────────────────────┘
                             │ HTTP (Cloudflare Tunnel)
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       RASPBERRY PI (Python + Flask)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │   AM2320     │  │  GPIO Relay  │  │  GPIO Relay  │                   │
│  │   Sensor     │  │  (Light)     │  │  (Water)     │                   │
│  │  Temp/Humid  │  │  GPIO 23     │  │  GPIO 25     │                   │
│  └──────────────┘  └──────────────┘  └──────────────┘                   │
└─────────────────────────────────────────────────────────────────────────┘
                             │
┌─────────────────────────────────────────────────────────────────────────┐
│                     CAPTURE SERVICE (Python + FFmpeg)                    │
│  ┌──────────────┐  ┌──────────────┐                                     │
│  │   Webcam     │  │  RTMP Stream │                                     │
│  │   Capture    │──│  (Cloudflare)│                                     │
│  └──────────────┘  └──────────────┘                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Astro 4.3 + Svelte 4.2 |
| **Backend** | Node.js + Fastify (TypeScript) |
| **Database** | PostgreSQL 16 + Drizzle ORM |
| **AI** | Grok Vision (xAI API) |
| **Hardware** | Raspberry Pi 5 + BME680 + 4-Ch SSR + IR Camera |
| **Streaming** | FFmpeg + Cloudflare Stream |
| **Deployment** | Railway + Cloudflare Tunnel |

---

## Database Schema

```sql
-- Sensor readings (every 1 minute)
sensor_readings (id, temperature, humidity, pressure, air_quality, created_at)

-- Grok analysis results
grok_analyses (id, health_score, observations, issues,
               soil_assessment, light_assessment, actions,
               message, detailed_thoughts, image_base64, created_at)

-- Command execution log
commands (id, command_type, reason, success, error, created_at)

-- Chat history
chat_messages (id, role, content, created_at)
```

---

## Grok Vision Analysis

The AI receives webcam images + sensor context and returns structured analysis:

```typescript
interface GrokAnalysis {
  health_score: number;        // 1-10 scale
  observations: string[];      // What Grok sees
  issues: string[];           // Problems detected
  soil_assessment: "dry" | "moist" | "wet" | "unknown";
  light_assessment: "dark" | "low" | "adequate" | "bright";
  actions: Action[];          // Recommended actions
  message: string;            // Short status (max 100 chars)
  detailed_thoughts: string;  // Full analysis
}

interface Action {
  type: "water" | "light_on" | "light_off" | "none";
  reason: string;
  execute: boolean;           // Auto-execute flag
}
```

---

## Automation Logic

### Analysis Schedule
- **Day Mode** (20:00 - 12:00 UTC+2): Every 10 minutes
- **Night Mode** (12:00 - 20:00 UTC+2): Every 4 hours
- **Sensors**: Always every 1 minute

### Smart Controls
- **Lighting**: Scheduled 20:00-12:00, with AI override capability
- **Watering**: On-demand based on visual soil analysis (5-second pulse)
- **Black Image Detection**: Auto light recovery if camera shows darkness

---

## Data Flow

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ Webcam  │───▶│ Backend │───▶│  Grok   │───▶│ Actions │
│ Capture │    │ Server  │    │ Vision  │    │ Execute │
└─────────┘    └────┬────┘    └─────────┘    └────┬────┘
                   │                              │
                   ▼                              ▼
              ┌─────────┐                   ┌─────────┐
              │ Database│                   │   Pi    │
              │ Storage │                   │ Relays  │
              └─────────┘                   └─────────┘
                   │
                   ▼
              ┌─────────┐
              │ Frontend│
              │   (WS)  │
              └─────────┘
```

---

## Project Structure

```
grow-plant/
├── backend/           # Node.js/Fastify API (TypeScript)
│   ├── src/
│   │   ├── routes/    # API endpoints
│   │   ├── services/  # Grok, Pi client, scheduler
│   │   └── db/        # Drizzle schema & queries
│   └── package.json
├── web/               # Frontend (Astro + Svelte)
│   ├── src/
│   │   ├── pages/     # Astro pages
│   │   └── components/# Svelte components
│   └── package.json
├── pi/                # Raspberry Pi service (Python/Flask)
│   ├── app.py         # Flask API
│   ├── sensors.py     # AM2320 interface
│   └── relays.py      # GPIO control
├── capture/           # Webcam capture (Python)
│   └── capture.py     # RTMP streaming
└── docker-compose.yml # PostgreSQL for dev
```

---

## Environment Variables

```env
# Backend
XAI_API_KEY=           # Grok API key
PI_TUNNEL_URL=         # Pi service URL
DATABASE_URL=          # PostgreSQL connection
API_SECRET=            # Optional API auth
CAPTURE_API_KEY=       # Image upload key

# Frontend
PUBLIC_BACKEND_URL=    # Backend API URL
PUBLIC_STREAM_EMBED=   # Cloudflare embed

# Pi
LIGHT_ON_HOUR=20       # Light schedule
LIGHT_OFF_HOUR=12

# Capture
CLOUDFLARE_STREAM_KEY= # RTMP key
```

---

## Key Features

- **24/7 Autonomous Operation** - No human intervention needed
- **AI Vision Analysis** - Grok analyzes plant health from images
- **Real-time Dashboard** - Live sensors, charts, and status
- **Interactive Chat** - Talk to Grok about your plant
- **Smart Watering** - Visual soil moisture detection
- **Adaptive Lighting** - Schedule with AI override capability
- **Full History** - All analyses and commands logged

---

## Hardware Setup

```
Raspberry Pi 5
├── BME680 Sensor (I2C)
│   ├── VCC → 3.3V
│   ├── GND → GND
│   ├── SDA → GPIO 2
│   └── SCL → GPIO 3
├── 4-Channel SSR Relay
│   ├── CH1 (Light) → GPIO 23
│   ├── CH2 (Water) → GPIO 25
│   ├── CH3 (Reserved) → GPIO 24
│   └── CH4 (Reserved) → GPIO 26
└── IR Night Vision Camera (CSI)
```

---

## License

MIT

---

*Built for the Mars Potato Cultivation Experiment*