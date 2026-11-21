# ESP32 offline dashboard

The ESP32 serves the built dashboard and motor API from the same origin. Once flashed, no internet, CORS, or HTTPS-to-HTTP cross-origin call is needed.

## Build the LittleFS data folder

GitHub Actions runs tests and builds the app, then uploads an artifact named `esp32-littlefs-data`. Download and extract it; the contents are gzip-compressed static files with matching `.gz` suffixes.

## Flash

1. In Arduino IDE, install the Espressif ESP32 board package and select the original ESP32 Dev Module / exact matching board.
2. Install an ESP32 LittleFS filesystem uploader compatible with your Arduino IDE version.
3. Open `ESP32_Car_Controller.ino` from this folder.
4. Select a partition scheme with a LittleFS partition large enough for the artifact. Compare the artifact size with the partition capacity; do not assume every board has the same flash size.
5. Place the extracted files in a folder named `data` beside the sketch.
6. Upload the filesystem image to LittleFS.
7. Upload the sketch normally over USB.
8. Join Wi-Fi `Electric-Car`, password `car12345`, and open `http://192.168.4.1`.

## API and safety

Routes: `/forward`, `/backward`, `/left`, `/right`, `/stop`, and `/speed?v=0..255`.

The sketch includes a 500 ms movement watchdog. It stops the motors if repeated movement commands stop arriving. This is a software safeguard, not a physical emergency cutoff. Test with wheels raised and keep a physical power disconnect accessible.

Pin mapping: GPIO16–19 direction, GPIO25/26 PWM enable, 1 kHz, 8-bit, default speed 180. Remove ENA/ENB jumpers and connect those enable pins to GPIO25/26 as required by the supplied firmware. One L298N pairs both right motors and both left motors; no true Mecanum strafing is supported.
