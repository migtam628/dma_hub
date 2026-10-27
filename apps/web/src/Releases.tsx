import {useEffect,useState} from "react";
import {ArrowRight,CheckCircle2,Download,ExternalLink,FileArchive,ShieldAlert} from "lucide-react";
import "./releases.css";

const OWNER = "migtam628";
const REPO = "dma_hub";
const RELEASES_URL = `https://github.com/${OWNER}/${REPO}/releases`;
const RELEASES_API = `https://api.github.com/repos/${OWNER}/${REPO}/releases?per_page=10`;

type ReleaseAsset = {name:string;browser_download_url:string;size:number};
type Release = {id:number;tag_name:string;name:string;html_url:string;published_at:string|null;prerelease:boolean;draft:boolean;assets:ReleaseAsset[]};
type ReleaseState = {loading:boolean;error:boolean;releases:Release[]};

function officialUrl(input:unknown, kind:"tag"|"asset"):input is string {
  if(typeof input!=="string")return false;
  try {
    const url=new URL(input);
    const prefix=kind==="tag"?`/${OWNER}/${REPO}/releases/tag/`:`/${OWNER}/${REPO}/releases/download/`;
    return url.protocol==="https:" && url.hostname==="github.com" && url.pathname.startsWith(prefix) && !url.username && !url.password;
  }catch{return false}
}
function validAsset(value:unknown):value is ReleaseAsset {
  if(!value||typeof value!=="object")return false;
  const asset=value as Partial<ReleaseAsset>;
  return typeof asset.name==="string" && asset.name.length>0 && officialUrl(asset.browser_download_url,"asset") && typeof asset.size==="number" && Number.isFinite(asset.size) && asset.size>=0;
}
function validRelease(value:unknown):value is Release {
  if(!value||typeof value!=="object")return false;
  const r=value as Partial<Release>;
  return typeof r.id==="number" && typeof r.tag_name==="string" && !!r.tag_name && typeof r.name==="string" &&
    officialUrl(r.html_url,"tag") && typeof r.prerelease==="boolean" && typeof r.draft==="boolean" &&
    (typeof r.published_at==="string"||r.published_at===null) && Array.isArray(r.assets);
}
function usePublishedReleases():ReleaseState {
  const [state,setState]=useState<ReleaseState>({loading:true,error:false,releases:[]});
  useEffect(()=>{
    const abort=new AbortController();
    fetch(RELEASES_API,{signal:abort.signal,headers:{Accept:"application/vnd.github+json"}})
      .then(async response=>{if(!response.ok)throw new Error("GitHub releases temporarily unavailable");return response.json()})
      .then((payload:unknown)=>{
        if(!Array.isArray(payload))throw new Error("Unexpected GitHub API response");
        const releases=payload.filter(validRelease).filter(r=>!r.draft).map(r=>({...r,assets:r.assets.filter(validAsset)}));
        if(!abort.signal.aborted)setState({loading:false,error:false,releases});
      })
      .catch(()=>{if(!abort.signal.aborted)setState({loading:false,error:true,releases:[]})});
    return ()=>abort.abort();
  },[]);
  return state;
}
function sizeLabel(bytes:number){return bytes>=1024*1024?`${(bytes/(1024*1024)).toFixed(1)} MB`:`${Math.max(1,Math.round(bytes/1024))} KB`}
function whenPublished(date:string|null){
  if(!date)return "Publication date unavailable";
  const parsed=new Date(date);
  return Number.isNaN(parsed.getTime())?"Publication date unavailable":new Intl.DateTimeFormat("en-US",{year:"numeric",month:"short",day:"numeric",timeZone:"UTC"}).format(parsed);
}
function windowsInstaller(assets:ReleaseAsset[]){return assets.find(a=>/\.exe$/i.test(a.name) && /setup|installer/i.test(a.name))??assets.find(a=>/\.(exe|msi)$/i.test(a.name))}
function checksum(assets:ReleaseAsset[]){return assets.find(a=>a.name==="SHA256SUMS-windows.txt")}
function releaseLabel(r:Release){return r.name||r.tag_name}

export function ReleaseSpotlight({compact=false}:{compact?:boolean}){
  const {loading,error,releases}=usePublishedReleases();
  const current=releases.find(r=>windowsInstaller(r.assets))??releases[0];
  const installer=current?windowsInstaller(current.assets):undefined;
  const digest=current?checksum(current.assets):undefined;
  const webBundle=current?.assets.find(a=>/dma-hub-web.*\.zip$/i.test(a.name));
  return <section className={compact?"releases-spotlight releases-spotlight--compact":"releases-spotlight"} aria-label="Official DMA Hub releases">
    <div className="releases-topline"><span className="eyebrow">OFFICIAL GITHUB RELEASES</span><span className="release-channel"><span className="live-dot"/>PUBLIC ALPHA</span></div>
    <div className="releases-layout">
      <div className="release-copy">
        <h2>{compact?"Get the Windows alpha.":"Download DMA Hub."}</h2>
        <p>Access the experimental Windows launcher and release details directly from our GitHub repository. No third-party mirrors.</p>
        <div className="release-status" aria-live="polite">
          {loading?<span>Checking published releases…</span>:error?<span>Live release details are temporarily unavailable. Use the official Releases page.</span>:!current?<span>No published release was returned. Check GitHub for availability.</span>:<><CheckCircle2 size={16}/><span>{releaseLabel(current)} · {whenPublished(current.published_at)}{current.prerelease?" · Prerelease":""}</span></>}
        </div>
      </div>
      <div className="release-action-panel">
        {installer && current ? <>
          <a className="release-download" href={installer.browser_download_url} target="_blank" rel="noopener noreferrer"><Download size={19}/><span><strong>Download Windows installer</strong><small>{installer.name} · {sizeLabel(installer.size)}</small></span><ArrowRight size={18}/></a>
          <div className="release-asset-links">
            {digest?<a href={digest.browser_download_url} target="_blank" rel="noopener noreferrer"><FileArchive size={15}/> SHA-256 checksum</a>:<span>Checksum unavailable — verify provenance before running</span>}
            <a href={current.html_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/> Release notes</a>
          </div>
        </>:<a className="release-download release-download--fallback" href={RELEASES_URL} target="_blank" rel="noopener noreferrer"><ExternalLink size={19}/><span><strong>Browse official releases</strong><small>{loading?"Loading installer details":"Latest assets and notes on GitHub"}</small></span><ArrowRight size={18}/></a>}
        <div className="release-safety"><ShieldAlert size={17}/><span><strong>Unsigned alpha software.</strong> Windows may warn about an unknown publisher. Review release notes, verify the published checksum, and install only if you trust the build. Hardware integrations and automatic updates are not production-ready.</span></div>
      </div>
    </div>
    {!compact&&<div className="release-history">
      <div><h3>Release history</h3><p>Publication and files are retrieved from the official GitHub API.</p></div>
      {releases.length>0?<ul>{releases.slice(0,4).map(r=><li key={r.id}><a href={r.html_url} target="_blank" rel="noopener noreferrer"><span>{releaseLabel(r)}</span><small>{whenPublished(r.published_at)} · {r.prerelease?"Alpha":"Release"}</small><ExternalLink size={15}/></a></li>)}</ul>:<a href={RELEASES_URL} target="_blank" rel="noopener noreferrer">View release history on GitHub <ExternalLink size={15}/></a>}
      {webBundle&&<p className="release-web-bundle">Need the static web preview package? <a href={webBundle.browser_download_url} target="_blank" rel="noopener noreferrer">Download web ZIP ({sizeLabel(webBundle.size)})</a>.</p>}
    </div>}
  </section>
}
export function ReleasesPage(){return <main className="container page-pad releases-page"><div className="releases-intro"><span className="eyebrow">DOWNLOAD CENTER</span><h1>Built in public. Shipped with care.</h1><p>Explore alpha builds, verify downloaded files, and follow release milestones. The website is a functional preview; desktop software is still in active development.</p></div><ReleaseSpotlight/><div className="releases-notes"><div><h3>Before you install</h3><p>Windows 10/11 · unsigned preview. No live billing, licensing, hardware scanning or certified updates. Downloads originate from the official project release assets.</p></div><a href={RELEASES_URL} target="_blank" rel="noopener noreferrer">View all GitHub Releases <ArrowRight size={17}/></a></div></main>}
