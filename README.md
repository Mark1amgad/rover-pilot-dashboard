# Rover Pilot Dashboard

Smart Car Controller for the ESP32 vehicle. The project has two ways to view the UI:

- **Hosted preview:** for development and design review. A browser may block a hosted HTTPS page from controlling a local HTTP ESP32.
- **Offline vehicle dashboard:** the ESP32 serves the same built UI from LittleFS at `http://192.168.4.1`. This is the intended control URL and works without internet after firmware and filesystem are flashed.

## Latest ESP32 contract

- Wi-Fi AP: `Electric-Car` / `car12345`
- Dashboard: `http://192.168.4.1`
- Routes: `/forward`, `/backward`, `/left`, `/right`, `/stop`, `/speed?v=0..255`
- Classic ESP32 / ESP32-WROOM-32 class; Arduino-ESP32 core 3.x.
- Direction pins GPIO16–19; PWM enable GPIO25/26; 1 kHz, 8-bit; default speed 180.
- The supplied motor-control functions and pin assignments are retained in the firmware sketch.

## Build and run locally

```sh
bun install
bun run dev
bun run test
bun run build
```

## Build for offline ESP32

Push to `main` or run the GitHub Actions workflow **Build offline ESP32 dashboard**. Download the artifact named `esp32-littlefs-data` from a successful workflow run and follow [firmware/README.md](firmware/README.md) to upload it to LittleFS, then flash the sketch.

The build uses a static SPA shell and relative asset paths so the dashboard is served correctly from the ESP32 root. The ESP32 firmware serves UI and control routes on the same origin, avoiding cross-origin browser restrictions.

## Safety

Test with the wheels raised and keep a physical power disconnect accessible. The software stop is not a physical emergency cutoff.
