# Native Windows Serial Device Discovery — Alpha

The Device Center now includes an initial **read-only serial-port enumerator** for the Tauri Windows companion.

## Scope

- The browser version does not enumerate devices and clearly says a native companion is required.
- The Windows desktop app only calls `list_serial_ports` after the user clicks **Scan serial ports**.
- The Rust command invokes `serialport::available_ports()`, enumerates COM ports, and displays the port name, type, USB VID/PID, manufacturer, and product name where available.
- It intentionally omits unique serial numbers and never opens, reads from, writes to, or configures a serial port.
- This adapter does **not** discover HID-only, DMA, PCI memory, or arbitrary USB devices; it is strictly for OS-exposed serial interfaces.

## Build verification

Windows GitHub Actions compiles the Tauri Rust command and bundles the NSIS installer. CI validates type checking, script tests and compilation, but a physical Windows device must still be tested independently.

## Manual acceptance tests

1. Install a trusted test USB-to-serial board on Windows.
2. Launch the Windows alpha. Navigate to **Device Center**.
3. Verify there is no background enumeration; press **Scan serial ports**.
4. Compare the reported COM port and USB VID/PID with Windows Device Manager.
5. Unplug the device, scan again, verify the list updates.
6. Disconnect all supported serial devices; expect a helpful empty state.
7. Open the same route in an ordinary browser; scanning must be disabled.

## Privacy and security

Only metadata the OS makes available is shown locally. No data is uploaded to the server. Future hardware adapters must be reviewed individually, require explicit authorization, and use documented interfaces. No protected game-memory access, stealth hardware behavior, or anti-cheat evasion is part of this implementation.
