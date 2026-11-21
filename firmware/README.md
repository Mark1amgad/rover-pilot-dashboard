# ESP32 offline dashboard

The ESP32 serves the built dashboard and motor API from the same origin. Once flashed, the dashboard works without internet or a cloud-hosted page.

## Target board and Arduino IDE

The supplied sketch targets the **classic ESP32 family** (commonly marked ESP32-S / ESP32-WROOM-32), not ESP32-S3. In Arduino IDE, select **ESP32 Dev Module** only if the metal module marking identifies a classic ESP32 / ESP32-WROOM-32. If the board has a different chip marking, verify the exact module before flashing.

The sketch uses `ledcAttach(pin, frequency, resolution)`, which requires Espressif Arduino-ESP32 core **3.x**.

## Build the LittleFS data folder

GitHub Actions runs tests and builds the app, then uploads an artifact named `esp32-littlefs-data`. Download and extract it; the contents are gzip-compressed static files with matching `.gz` suffixes. Keep the directory structure intact.

## Flash order

1. Install the Espressif ESP32 board package and select the verified classic ESP32 board.
2. Install a LittleFS filesystem uploader compatible with your Arduino IDE version.
3. Open `ESP32_Car_Controller.ino`.
4. Select a partition scheme with a LittleFS partition large enough for the extracted artifact. Check the artifact size against the partition capacity; do not assume every ESP32 board has the same flash size.
5. Put the extracted artifact contents in a folder named `data` beside the sketch.
6. Upload the filesystem image to LittleFS.
7. Upload the sketch normally over USB.
8. Join Wi-Fi `Electric-Car`, password `car12345`, then open `http://192.168.4.1`.

Upload the filesystem image **before** the sketch. The sketch does not download the website from Lovable or GitHub; it serves the files stored in LittleFS.

## Preserved motor configuration

The user's supplied motor-control code is retained: direction pins GPIO16–19, ENA/ENB GPIO25/26, PWM 1 kHz at 8-bit resolution, default speed 180, and the original `forward()`, `backward()`, `left()`, `right()`, `stopCar()`, and `setSpeed()` logic.

The firmware routes are `/forward`, `/backward`, `/left`, `/right`, `/stop`, and `/speed?v=0..255`. One L298N pairs the motors on each channel; the firmware provides forward, reverse, and differential turns, not independent mecanum strafing.

## Safety

Test with the wheels raised. Keep a physical power disconnect accessible. Software STOP is not a physical emergency cutoff.
