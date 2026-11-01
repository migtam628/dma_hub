import {useMemo,useState} from "react";
import {ArrowLeft,Check,ExternalLink,Gamepad2,Info,Monitor,ShieldAlert,Video} from "lucide-react";
import {Pill} from "@dma-hub/ui";
import {
 COD_PLATFORMS_REVIEWED,COD_TITLE_PLATFORMS,evaluateXboxDMAHubCapabilities,resolveCODTitlePlatform
} from "./cod-platform-matrix.mjs";
import type {CODConsoleFamily} from "./cod-platform-matrix.mjs";

const labels={
 officially_listed:"Officially listed",not_listed:"Not supported",
 end_of_service_announced:"End of service announced",announced_ended_recheck:"Service end announced — verify"
} as const;
const stateTone=(state:string)=>state==="officially_listed"?"positive":"warning";
const familyNames={series:"Xbox Series X|S",one:"Xbox One"} as const;
export function CODPlatformMatrix(){
 const [consoleFamily,setConsoleFamily]=useState<CODConsoleFamily>("series");
 const capabilities=useMemo(()=>evaluateXboxDMAHubCapabilities(consoleFamily),[consoleFamily]);
 return <main className="container page-pad cod-platform-page">
  <a href="#/games/call-of-duty" className="text-link"><ArrowLeft size={15}/>Back to Call of Duty</a>
  <section className="cod-platform-hero">
   <div className="eyebrow"><Gamepad2 size={16}/> DMA HUB / CALL OF DUTY / PLATFORM COVERAGE</div>
   <h1>PC and Xbox, with clear boundaries.</h1>
   <p>Track where official Call of Duty editions are available and which DMA Hub services can be used alongside an Xbox. These are distinct questions: a game being available on Xbox does not mean Windows software, DMA hardware, or a cheat is compatible with it.</p>
   <div className="cod-platform-hero-points"><span><Check size={15}/>Official listing references</span><span><ShieldAlert size={15}/>No unverified console software</span><span><Monitor size={15}/>Separate PC and Xbox testing</span></div>
  </section>
  <section className="cod-platform-panel">
   <div className="cod-platform-head"><div><h2>Modern Call of Duty title coverage</h2><p>Official Xbox and Activision availability, reviewed {COD_PLATFORMS_REVIEWED}. Actual game build, purchased edition, live service and installation must still be verified.</p></div></div>
   <div className="cod-platform-scroll"><table className="cod-platform-table"><thead><tr>
    <th>Game edition</th><th>Windows PC</th><th>Xbox Series X|S</th><th>Xbox One</th><th>Xbox Play Anywhere</th><th>Official source</th>
   </tr></thead><tbody>{COD_TITLE_PLATFORMS.map(item=><tr key={item.id}>
    <td><strong>{item.title}</strong><small>{item.releaseYear}</small></td>
    {(["pc","series","one"] as const).map(p=>{
     const result=resolveCODTitlePlatform(item.id,p);
     return <td key={p}><Pill tone={stateTone(result.state)}>{labels[result.state]}</Pill></td>;
    })}
    <td>{item.playAnywhere==="yes"?"Confirmed": "Not verified"}</td>
    <td><a href={item.source} target="_blank" rel="noopener noreferrer">Publisher listing <ExternalLink size={12}/></a></td>
   </tr>)}</tbody></table></div>
   <p className="cod-platform-table-note">Warzone on Xbox One is a time-sensitive exception: Activision announced it will stop working with Modern Warfare 4 Season 1 (November 2026). The schedule is not a live availability test. Modern Warfare 4 itself does not support Xbox One.</p>
  </section>
  <div className="cod-platform-layout">
   <section className="cod-platform-panel">
    <div className="cod-platform-head"><div><h2>What can DMA Hub do with an Xbox?</h2><p>Select the console family to see the planning and integration boundary.</p></div></div>
    <div className="cod-platform-select" role="group" aria-label="Xbox model family">{(["series","one"] as const).map(p=>
     <button type="button" key={p} aria-pressed={consoleFamily===p} className={consoleFamily===p?"selected":""} onClick={()=>setConsoleFamily(p)}>{familyNames[p]}</button>
    )}</div>
    <div className="cod-platform-capabilities">{capabilities.items.map(item=><article key={item.id}>
     <div><strong>{item.label}</strong><small>{item.notes}</small></div>
     <Pill tone={["unsupported","not_supported"].includes(item.status)?"warning":"neutral"}>{item.status.replaceAll("_"," ")}</Pill>
    </article>)}</div>
   </section>
   <aside className="cod-platform-side">
    <section className="cod-platform-panel">
     <div className="eyebrow"><Video size={14}/> Companion-PC architecture</div>
     <h3>Use Xbox for gameplay; use PC for supported companion tools.</h3>
     <div className="cod-platform-diagram"><div>Xbox Series X|S<br/><small>Authorized Call of Duty game</small></div><span>→</span><div>TV or optional capture device<br/><small>Standard game recording / streaming</small></div></div>
     <div className="cod-platform-diagram"><div>Xbox Microsoft Edge<br/><small>DMA Hub website</small></div><span>→</span><div>HTTPS website / future API<br/><small>Guides, inventory, support</small></div></div>
     <p>Xbox Remote Play can stream gameplay to a Windows PC while the game still executes on the console. It does not grant a Windows game process or console memory access.</p>
     <a href="https://www.xbox.com/en-US/consoles/remote-play" target="_blank" rel="noopener noreferrer">Official Xbox Remote Play <ExternalLink size={12}/></a>
    </section>
    <section className="cod-platform-panel cod-platform-warning">
     <div className="eyebrow"><ShieldAlert size={14}/> Security and product policy</div>
     <h3>No direct console game manipulation</h3>
     <p>No Xbox DMA memory access, unauthorized input automation, hardware spoofing or anti-cheat circumvention is implemented or approved. Activision explicitly prohibits cheating and unauthorized peripheral devices.</p>
     <a href="https://support.activision.com/articles/call-of-duty-security-and-enforcement-policy" target="_blank" rel="noopener noreferrer">Activision enforcement policy <ExternalLink size={12}/></a>
    </section>
    <section className="cod-platform-panel">
     <div className="eyebrow"><Info size={14}/> Next test milestone</div>
     <h3>Record real game + platform evidence</h3>
     <p>For each title record the exact installed build, Xbox model, controller/peripherals, current game service status, test date, and only the features actually exercised. Don't mark any capability as verified from an official store listing alone.</p>
     <div className="xbox-qa-links"><a href="#/games/call-of-duty/xbox-qa">Open Xbox physical-console QA workbook</a><a href="#/games/call-of-duty/pilot">Open the Windows Warzone pilot</a></div>
    </section>
   </aside>
  </div>
 </main>;
}
