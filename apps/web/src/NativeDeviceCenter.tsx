import {useState} from "react";
import {invoke,isTauri} from "@tauri-apps/api/core";
import {RefreshCcw,ShieldCheck,Usb,AlertTriangle} from "lucide-react";
import {Button,Card,Empty,Pill} from "@dma-hub/ui";

type SerialDevice={
  portName:string;
  kind:string;
  vendorId?:string|null;
  productId?:string|null;
  manufacturer?:string|null;
  product?:string|null;
};

export function NativeDeviceCenter(){
  const [ports,setPorts]=useState<SerialDevice[]>([]);
  const [stage,setStage]=useState<"idle"|"scanning"|"complete"|"error">("idle");
  const [error,setError]=useState("");
  const native=isTauri();
  async function scan(){
    if(!native)return;
    setStage("scanning");setError("");
    try{
      const found=await invoke<SerialDevice[]>("list_serial_ports");
      setPorts(found);setStage("complete");
    }catch(err){
      setPorts([]);setStage("error");
      setError(err instanceof Error?err.message:String(err));
    }
  }
  return <div className="native-device-center">
    <div className="page-head">
      <div><h1>Device Center</h1><p>Read-only discovery of local serial and USB-to-serial ports.</p></div>
      <Button disabled={!native||stage==="scanning"} onClick={()=>void scan()}>
        <RefreshCcw size={16}/> {stage==="scanning"?"Scanning...":"Scan serial ports"}
      </Button>
    </div>
    <div className="callout"><ShieldCheck size={18}/>
      This screen lists port metadata only after you press Scan. It does not open any port, change firmware, read serial data, or operate other applications.
    </div>
    {!native?<Card title="Windows companion required">
      <Empty title="Native scanning is unavailable in a web browser" description="Install the Windows desktop alpha to inspect serial devices on your own PC. Browser demo records are not actual hardware."/>
    </Card>:stage==="idle"?<Card title="Ready to discover">
      <Empty title="No scan has been run" description="Click Scan serial ports to enumerate available Windows COM ports. No automatic discovery runs in the background."/>
    </Card>:stage==="error"?<Card title="Scan failed"><div className="callout"><AlertTriangle size={18}/>{error||"Unable to list ports."}</div>
      <p className="muted">Check that Windows recognizes the device, then try again. No state was changed on your hardware.</p>
    </Card>:stage==="scanning"?<Card title="Scanning"><p className="muted">Querying Windows for available serial port metadata...</p></Card>:
    <Card title={`Detected ports (${ports.length})`} action={<Pill tone="positive">Local scan complete</Pill>}>
      {ports.length===0?<Empty title="No serial ports reported" description="Connect a supported USB-to-serial or serial device and scan again. HID-only devices are not detected by this adapter."/>:
      <div className="rows">{ports.map(p=><div className="item-row" key={p.portName}>
        <div className="item-symbol"><Usb size={21}/></div>
        <div className="row-grow">
          <strong>{p.portName} — {p.product||p.kind}</strong>
          <small>{p.manufacturer||"Manufacturer unknown"}{p.vendorId&&p.productId?` · USB ${p.vendorId}:${p.productId}`:""}</small>
        </div>
        <Pill tone="cyan">{p.kind}</Pill>
      </div>)}</div>}
    </Card>}
  </div>;
}
