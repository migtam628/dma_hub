import {useEffect,useState} from "react";
import {ArrowLeft,ArrowRight,Gamepad2,Monitor,Package,RefreshCcw,Search,ShieldCheck} from "lucide-react";
import {Button,Pill} from "@dma-hub/ui";
import {api} from "./api";
import type {PublishedCatalogItem} from "./api";
import {GAME_CATALOG,findGame} from "./gameCatalog";

type State="loading"|"ready"|"unavailable";
export function GameCheatsCatalog({gameId}:{gameId?:string}){
 const [records,setRecords]=useState<PublishedCatalogItem[]>([]);
 const [state,setState]=useState<State>("loading");
 const [query,setQuery]=useState("");
 const [revision,setRevision]=useState(0);
 const game=gameId?findGame(gameId):undefined;
 useEffect(()=>{
  let valid=true;
  setState("loading");
  api.liveCatalog().then(result=>{
   if(!valid)return;
   if(!Array.isArray(result.items)||result.items.some(p=>!Array.isArray(p.gameIds)))throw new Error("Invalid gaming catalog response");
   setRecords(result.items.filter(p=>p.category==="software"));
   setState("ready");
  }).catch(()=>{if(valid){setRecords([]);setState("unavailable")}});
  return ()=>{valid=false};
 },[revision]);
 const entries=GAME_CATALOG.filter(item=>[item.name,item.id,item.category].join(" ").toLowerCase().includes(query.toLowerCase().trim()));
 const listed=records.filter(p=>game?p.gameIds.includes(game.id):p.gameIds.length>0);
 if(gameId&&!game)return <main className="container page-pad"><h1>Game not found</h1><p>This game is not in the current planning catalog.</p><a href="#/games" className="text-link">Back to games</a></main>;
 return <main className="container page-pad game-cheats-page">
  <div className="game-cheats-hero">
   <div className="eyebrow"><Gamepad2 size={16}/> DMA HUB / GAMING</div>
   {game?<><a className="text-link" href="#/games"><ArrowLeft size={15}/>All games</a>
      <h1>{game.name}</h1><p>{game.summary}</p></>:
     <><h1>DMA Cheats for Games</h1>
      <p>Choose a game to browse dedicated software listings, documented requirements, update information and related hardware. The titles below are planning categories, not claims of active game support.</p></>}
   <div className="game-cheats-hero-foot"><span><ShieldCheck size={15}/>Verified records only</span><span><Monitor size={15}/>Hardware requirements clearly listed</span><span><Package size={15}/>No unverified downloads</span></div>
  </div>
  {game?<>
    <div className="game-catalog-title"><div><h2>Software for {game.name}</h2><p className="muted">Only administrator-published catalog records linked to this game are shown.</p></div>
      <Pill tone="neutral">{state==="ready"?listed.length+" listed":"Checking catalog"}</Pill></div>
   {state==="loading"?<p role="status" className="muted">Checking published game products…</p>:null}
   {state==="unavailable"?<div className="callout" role="status">The catalog API is offline. This website is a static preview, so no game software can be verified here.
      <Button variant="secondary" onClick={()=>setRevision(v=>v+1)}><RefreshCcw size={15}/>Retry</Button></div>:null}
   {state==="ready"&&listed.length===0?<div className="game-catalog-empty">
     <Gamepad2 size={28}/><h3>No published software yet</h3>
     <p>No game-specific DMA product has been verified and published for {game.name}. This does not imply that compatibility exists.</p>
     <a href="#/hardware" className="text-link">Explore hardware planning <ArrowRight size={15}/></a>
    </div>:null}
   {state==="ready"&&listed.length>0?<div className="product-grid">{listed.map(item=><article key={item.id} className="product-card game-product-card">
       <div className="product-copy"><div className="product-meta"><span>Game-specific software</span><Pill tone="positive">Published</Pill></div>
       <h3>{item.name}</h3><p>{item.description}</p>
       {item.requirements.length>0?<p className="muted">{item.requirements.length} documented requirements</p>:null}
       <div className="product-footer"><a className="text-link" href={"#/catalog/"+item.slug}>View product details <ArrowRight size={15}/></a></div>
       </div>
      </article>)}</div>:null}
  </>:<>
    <div className="game-catalog-title"><div><h2>Choose a game</h2><p className="muted">Browse game-specific DMA software categories and published records.</p></div>
      <label className="game-catalog-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find a game…" aria-label="Search games"/></label>
    </div>
    <div className="game-tile-grid">{entries.map((item,index)=><a key={item.id} className={"game-tile game-tile-"+index%5} href={"#/games/"+item.id}>
      <div className="game-tile-art"><span>{item.shortName}</span><Gamepad2 size={30}/></div>
      <div className="game-tile-copy"><small>{item.category}</small><h3>{item.name}</h3>
       <p>{state==="ready"?(records.filter(p=>p.gameIds.includes(item.id)).length?records.filter(p=>p.gameIds.includes(item.id)).length+" published product(s)":"No published products"):"Planning category"}</p>
       <span className="text-link">Explore game <ArrowRight size={15}/></span>
      </div>
    </a>)}</div>
    {entries.length===0?<p role="status" className="muted">No planning categories match that search.</p>:null}
    <div className="game-catalog-disclosure"><ShieldCheck size={20}/>
     <div><strong>Product status and limitations</strong><p>This is a game-focused storefront framework. Titles shown above do not have working DMA cheat modules by default. Product availability, releases, hardware compatibility, and license access require separate verification. No stealth or anti-cheat bypass guarantees are made.</p></div>
    </div>
    <div className="game-catalog-title"><div><h2>Published game software</h2><p className="muted">Actual API records, if any, are separate from the planning-game tiles.</p></div></div>
    {state==="loading"?<p role="status" className="muted">Checking the published software catalog…</p>:null}
    {state==="unavailable"?<div className="callout" role="status">Local API is unavailable on the static GitHub Pages site. No software listings can be confirmed here.
      <Button variant="secondary" onClick={()=>setRevision(v=>v+1)}>Retry API</Button></div>:null}
    {state==="ready"&&listed.length===0?<p className="muted">No game-linked software has been published in the local API.</p>:null}
    {state==="ready"&&listed.length>0?<div className="product-grid">{listed.map(p=><article className="product-card" key={p.id}>
      <div className="product-copy"><div className="product-meta"><span>Published software</span><Pill tone="neutral">{p.gameIds.length} linked game(s)</Pill></div>
       <h3>{p.name}</h3><p>{p.description}</p>
       <div className="product-footer"><a href={"#/catalog/"+p.slug} className="text-link">Product details <ArrowRight size={15}/></a></div>
      </div></article>)}</div>:null}
  </>}
 </main>
}
