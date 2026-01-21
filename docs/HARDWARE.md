# Hardware Setup Guide

## Components

| Component | Model | Purpose |
|-----------|-------|---------|
| Single Board Computer | Raspberry Pi 5 (8GB) | Main controller |
| Environmental Sensor | BME680 | Temperature, humidity, pressure, air quality |
| Relay Module | 4-Channel SSR (Solid State) | Light, pump & future expansion |
| Camera | IR Night Vision Camera | 24/7 visual monitoring (day/night) |
| Grow Light | 12V LED panel | Plant lighting |
| Water Pump | 12V submersible | Automated watering |
| Power Supply | 12V 5A | Lights & pump |

---

## Wiring Diagram

```
                    Raspberry Pi 5
                   ┌──────────────┐
                   │              │
    BME680         │   GPIO 2 ────┼──── SDA
    Sensor         │   GPIO 3 ────┼──── SCL
                   │   3.3V   ────┼──── VCC
                   │   GND    ────┼──── GND
                   │              │
    4-Ch SSR       │   GPIO 23 ───┼──── CH1 (Light)
    Relay          │   GPIO 25 ───┼──── CH2 (Water)
                   │   GPIO 24 ───┼──── CH3 (Reserved)
                   │   GPIO 26 ───┼──── CH4 (Reserved)
                   │   5V     ────┼──── VCC
                   │   GND    ────┼──── GND
                   │              │
                   │   CSI    ────┼──── IR Night Cam (ribbon cable)
                   │              │
                   └──────────────┘


    SSR Relay Module                12V Devices
   ┌────────────┐                  ┌────────────┐
   │            │                  │            │
   │  CH1   ────┼──── Grow Light ──┼──── Light  │
   │  CH2   ────┼──── Water Pump ──┼──── Pump   │
   │  CH3   ────┼──── (Reserved) ──┼──── Fan    │
   │  CH4   ────┼──── (Reserved) ──┼──── Heater │
   │            │                  │            │
   └────────────┘                  └────────────┘
```

---

## GPIO Pin Configuration

| GPIO | Function | Active Level |
|------|----------|--------------|
| GPIO 2 | I2C SDA | - |
| GPIO 3 | I2C SCL | - |
| GPIO 23 | Light Relay (SSR CH1) | HIGH |
| GPIO 24 | Reserved (SSR CH3) | HIGH |
| GPIO 25 | Water Relay (SSR CH2) | HIGH |
| GPIO 26 | Reserved (SSR CH4) | HIGH |

---

## BME680 Environmental Sensor

The BME680 is a multi-function sensor providing:
- **Temperature** (°C)
- **Humidity** (%)
- **Barometric Pressure** (hPa)
- **Air Quality / Gas Resistance** (Ohms)

Uses I2C communication via Adafruit CircuitPython library.

**Enable I2C on Pi:**
```bash
sudo raspi-config
# Interface Options -> I2C -> Enable
```

**Verify connection:**
```bash
sudo i2cdetect -y 1
# Should show address 0x77 (or 0x76)
```

---

## SSR Relay Control

Solid State Relays (SSR) provide silent, reliable switching with no mechanical wear.

Using `pinctrl` for GPIO control (modern Pi OS):

**Turn relay ON (active HIGH for SSR):**
```bash
pinctrl set 23 op dh  # Light ON
pinctrl set 25 op dh  # Water ON
```

**Turn relay OFF:**
```bash
pinctrl set 23 op dl  # Light OFF
pinctrl set 25 op dl  # Water OFF
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

## IR Night Vision Camera Setup

The IR camera connects via CSI ribbon cable and provides 24/7 monitoring capability (visible light during day, infrared at night).

**Check camera:**
```bash
libcamera-hello --list-cameras
```

**Test capture:**
```bash
libcamera-still -o test.jpg
```

**Using picamera2 in Python:**
```python
from picamera2 import Picamera2
picam2 = Picamera2()
picam2.start()
frame = picam2.capture_array()
```

**Rotate 180 degrees (if mounted upside-down):**
```python
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

### SSR Relay not switching
```bash
# Test GPIO directly (SSR is silent, use multimeter or check device)
pinctrl set 23 op dh  # Should turn ON
pinctrl set 23 op dl  # Should turn OFF
```

### Camera not found
```bash
# List CSI cameras
libcamera-hello --list-cameras

# Check if camera module is enabled
sudo raspi-config
# Interface Options -> Camera -> Enable
```

### Network issues
```bash
# Test Pi service
curl http://localhost:5000/sensors

# Test from backend
curl http://raspberrypi.local:5000/sensors
```
