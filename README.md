# Rover Pilot Dashboard

Build a polished, temporary standalone web app named "Smart Car Controller" for Mark's ESP32 smart car. This is a frontend-first control dashboard. Do NOT add Supabase, authentication, database, cloud backend, Edge Functions, or any server-side motor logic. Do NOT embed the website in Arduino firmware. The ESP32 is the existing HTTP backend and runs its own Wi-Fi access point.

REAL HARDWARE / EXISTING FIRMWARE CONTRACT:
- ESP32 Wi-Fi AP SSID: ESP32-Motors
- Password: 12345678
- ESP32 local address: http://192.168.4.1
- Existing WebServer HTTP GET routes: /F (forward), /B (backward), /L (turn left), /R (turn right), /S (stop).
- Physical motor driver: one L298N. Channel A controls BOTH right-side motors together; Channel B controls BOTH left-side motors together. No independent wheel control, no true mecanum strafing/diagonal movement.
- Existing firmware has only digital direction control on GPIO 16,17,18,19. No PWM speed control has been implemented. Do NOT send a speed parameter or imply that the speed slider changes physical speed. Include a clearly disabled "Speed control — Coming soon" UI element or disabled slider, with an honest note that hardware PWM support is not yet implemented.
- The frontend must communicate directly with the ESP32 over HTTP using fetch to the routes above. Make the ESP32 base URL configurable in a small connection/settings area, defaulting to http://192.168.4.1. Do not proxy through Lovable.
- The deployed Lovable preview/hosted site may not be able to reach the ESP32 AP due to browser mixed-content, CORS, or origin/network restrictions. Architect the API client cleanly, show connection errors honestly, and provide a clear note that the phone must join the ESP32-Motors Wi-Fi network. Do not fake a connected state.

DESIGN:
Create a premium, modern robotics control dashboard, dark navy/graphite background, subtle blue/cyan accents, crisp typography, restrained glow, polished cards, excellent spacing, responsive mobile-first layout. It should look like a real robotics product, not a generic admin template. Use Lucide icons where useful. Dashboard title "SMART CAR" with small "ESP32 VEHICLE CONTROL" subtitle. Add connection status badge (Disconnected until a real health/request check succeeds), current movement state, and compact connection panel.

CONTROL UI:
1. Large touch-friendly analog joystick with circular track and draggable thumb, supporting pointer/touch and mouse. Center is STOP. Four cardinal directions only. For diagonal thumb positions, choose the dominant axis only (do not pretend mecanum diagonal movement exists). Map top=F, bottom=B, left=L, right=R. Add dead zone. On release, pointer cancel, window blur, visibility hidden, or component unmount, send /S and reset joystick.
2. Include a secondary D-pad with press-and-hold buttons for F/B/L/R. On pointer down send selected route; repeat command periodically while held to keep firmware alive; on release/cancel send /S. Avoid duplicate requests flooding.
3. Dedicated STOP button and a visually prominent emergency stop button. Both call /S. Clearly label this as software stop, not a physical power cutoff.
4. Speed control card disabled/Coming Soon; never claim speed adjustment currently works.
5. Status card should show only truthful information available: connection, selected command/movement. Do not fabricate battery %, RPM, speed, distance, sensor readings, or telemetry.
6. Provide a brief hardware limitation notice: current two-channel paired-side wiring supports forward/reverse and differential turning only, not true mecanum strafe/diagonal.
7. Add a connection test action that performs a real request to the configured base URL (use /S as harmless stop/check, or use a HEAD/root check if appropriate); update badge based on actual result. Handle fetch timeout and errors.
8. Safety: on any release or loss of control focus send /S; implement client-side request timeout and do not queue stale movement commands. Explain that firmware-side failsafe is still recommended; don't claim the website's stop is a physical safety system.

TECH:
- Use React + TypeScript + Tailwind and existing Lovable default component setup.
- Keep API logic isolated in a typed service module, movement enum/route mapping, and hooks/components separated.
- Avoid unnecessary dependencies. No external backend.
- Include an initial clean dashboard view on mobile and desktop.
- Ensure app builds without TypeScript errors.
- Add comments explaining ESP32 local-network requirement and current no-PWM limitation.
- Do not ask me questions; implement the first usable version now.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://rover-pilot-dashboard.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4044b48f-8f29-4286-810f-e04bf36bd9ef).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
