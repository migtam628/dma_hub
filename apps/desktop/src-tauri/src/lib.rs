use serde::Serialize;
use serialport::SerialPortType;

/// Metadata only: no port is opened, read, written, or configured.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SerialDevice {
    port_name: String,
    kind: &'static str,
    vendor_id: Option<String>,
    product_id: Option<String>,
    manufacturer: Option<String>,
    product: Option<String>,
}

#[tauri::command]
fn list_serial_ports() -> Result<Vec<SerialDevice>, String> {
    let ports = serialport::available_ports()
        .map_err(|_| "Unable to enumerate serial ports on this Windows device".to_owned())?;
    Ok(ports
        .into_iter()
        .map(|port| {
            let (kind, vendor_id, product_id, manufacturer, product) = match port.port_type {
                SerialPortType::UsbPort(info) => (
                    "USB Serial",
                    Some(format!("{:04X}", info.vid)),
                    Some(format!("{:04X}", info.pid)),
                    info.manufacturer,
                    info.product,
                ),
                SerialPortType::BluetoothPort => ("Bluetooth Serial", None, None, None, None),
                SerialPortType::PciPort => ("PCI Serial", None, None, None, None),
                SerialPortType::Unknown => ("Serial", None, None, None, None),
            };
            SerialDevice {
                port_name: port.port_name,
                kind,
                vendor_id,
                product_id,
                manufacturer,
                product,
            }
        })
        .collect())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![list_serial_ports])
        .run(tauri::generate_context!())
        .expect("error while running DMA Hub desktop");
}
