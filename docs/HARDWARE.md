# Hardware Setup Guide

## Components

| Component | Model | Purpose |
|-----------|-------|---------|
| Single Board Computer | Raspberry Pi 5 (8GB) | Main controller |
| Temperature/Humidity Sensor | AM2320 | Environmental monitoring |
| Relay Module | 2-channel 5V | Light & pump control |
| Grow Light | 12V LED panel | Plant lighting |
| Water Pump | 12V submersible | Automated watering |
| Webcam | Logitech C920 | Visual monitoring |
| Power Supply | 12V 5A | Lights & pump |

---

## Wiring Diagram

```
                    Raspberry Pi 4
                   ┌──────────────┐
                   │              │
    AM2320         │   GPIO 2 ────┼──── SDA
    Sensor         │   GPIO 3 ────┼──── SCL
                   │   3.3V   ────┼──── VCC
                   │   GND    ────┼──── GND
                   │              │
    Relay          │   GPIO 23 ───┼──── IN1 (Light)
    Module         │   GPIO 25 ───┼──── IN2 (Water)
                   │   5V     ────┼──── VCC
                   │   GND    ────┼──── GND
                   │              │
                   │   USB    ────┼──── Webcam
                   │              │
                   └──────────────┘


    Relay Module                    12V Devices
   ┌────────────┐                  ┌────────────┐
   │            │                  │            │
   │  COM1  ────┼──────────────────┼──── +12V   │
   │  NO1   ────┼──── Grow Light ──┼──── Light  │
   │            │                  │            │
   │  COM2  ────┼──────────────────┼──── +12V   │
   │  NO2   ────┼──── Water Pump ──┼──── Pump   │
   │            │                  │            │
   └────────────┘                  └────────────┘
```

---

## GPIO Pin Configuration

| GPIO | Function | Active Level |
|------|----------|--------------|
| GPIO 2 | I2C SDA | - |
| GPIO 3 | I2C SCL | - |
| GPIO 23 | Light Relay | LOW (active-low relay) |
| GPIO 25 | Water Relay | LOW (active-low relay) |

---

## AM2320 Sensor

The AM2320 uses I2C communication protocol.

**Enable I2C on Pi:**
```bash
sudo raspi-config
# Interface Options -> I2C -> Enable
```

**Verify connection:**
```bash
sudo i2cdetect -y 1
# Should show address 0x5c
```

---

## Relay Control

Using `pinctrl` for GPIO control (modern Pi OS):

**Turn relay ON (active-low):**
```bash
pinctrl set 23 op dl  # Light ON
pinctrl set 25 op dl  # Water ON
```

**Turn relay OFF:**
```bash
pinctrl set 23 op dh  # Light OFF
pinctrl set 25 op dh  # Water OFF
```

---

## Water Pump Safety

The water pump is controlled with a 5-second pulse to prevent overwatering:

```python
def water_plant():
    # Turn pump ON
    set_relay("water", True)

    # Wait 5 seconds
    time.sleep(5)

    # Turn pump OFF
    set_relay("water", False)
```

---

## Camera Setup

**Check webcam:**
```bash
v4l2-ctl --list-devices
```

**Test capture:**
```bash
ffmpeg -f v4l2 -i /dev/video0 -frames:v 1 test.jpg
```

**Rotate 180 degrees (if mounted upside-down):**
```python
# In capture script
frame = cv2.rotate(frame, cv2.ROTATE_180)
```

---

## Network Setup

### Option 1: Local Network
Pi and backend on same network:
```env
PI_TUNNEL_URL=http://raspberrypi.local:5000
```

### Option 2: Cloudflare Tunnel
For remote access:

```bash
# On Pi
cloudflared tunnel --url http://localhost:5000
```

Then use the generated URL:
```env
PI_TUNNEL_URL=https://xxx-xxx-xxx.trycloudflare.com
```

---

## Systemd Services

### Pi Flask Service

`/etc/systemd/system/grok-pi.service`:
```ini
[Unit]
Description=Grok Solanum Pi Service
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/grok-solanum/pi
ExecStart=/usr/bin/python3 app.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### Capture Service

`/etc/systemd/system/grok-capture.service`:
```ini
[Unit]
Description=Grok Solanum Capture Service
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/grok-solanum/capture
ExecStart=/usr/bin/python3 capture.py
Restart=always
RestartSec=10
Environment=BACKEND_URL=http://localhost:3000

[Install]
WantedBy=multi-user.target
```

**Enable services:**
```bash
sudo systemctl enable grok-pi grok-capture
sudo systemctl start grok-pi grok-capture
```

---

## Troubleshooting

### Sensor not detected
```bash
# Check I2C is enabled
ls /dev/i2c*

# Check sensor address
sudo i2cdetect -y 1
```

### Relay not switching
```bash
# Test GPIO directly
pinctrl set 23 op dl  # Should click
pinctrl set 23 op dh  # Should click again
```

### Camera not found
```bash
# List video devices
ls /dev/video*

# Check permissions
sudo usermod -a -G video $USER
```

### Network issues
```bash
# Test Pi service
curl http://localhost:5000/sensors

# Test from backend
curl http://raspberrypi.local:5000/sensors
```
