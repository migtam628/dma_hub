import {useCallback,useEffect,useState} from "react";
import type {FormEvent} from "react";
import {Activity,ArrowRight,CheckCircle2,Cloud,CloudOff,Download,KeyRound,LockKeyhole,RefreshCcw,Save,ShieldCheck,TriangleAlert,Upload,UserRound} from "lucide-react";
import {Button,Card,Empty,Pill} from "@dma-hub/ui";
import {api,ApiError} from "./api";
import type {CloudProfile,ProfileSettings,Session,ActiveSession} from "./api";

function humanError(err:unknown){if(err instanceof ApiError){if(err.code==="email_unavailable")return "This email cannot be registered.";if(err.code==="invalid_credentials")return "Incorrect email or password.";if(err.code==="rate_limited")return "Too many attempts. Try again later.";if(err.code==="version_conflict")return "Someone changed this profile since you last loaded it.";if(err.code==="invalid_or_expired_token")return "This code is expired, invalid or already used. Request a new code.";if(err.code==="mail_not_configured")return "Email delivery is not configured on this API.";return err.message.replace(/_/g," ")}return "Unexpected error. No changes were applied."}
export function AccountCenter({session,onSession}:{session:Session|null;onSession:(s:Session|null)=>void}){
 const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [mode,setMode]=useState<"signin"|"register"|"forgot"|"verify"|"reset">("signin");const [working,setWorking]=useState(false);const [message,setMessage]=useState("");
 const [authCode,setAuthCode]=useState("");
 const [passwordConfirmation,setPasswordConfirmation]=useState("");
 const [emailReady,setEmailReady]=useState(false);
 useEffect(()=>{api.capabilities().then(c=>setEmailReady(c.passwordRecoveryAvailable)).catch(()=>setEmailReady(false))},[]);
 const [sessions,setSessions]=useState<ActiveSession[]>([]);
 const [currentPassword,setCurrentPassword]=useState("");
 const [newPassword,setNewPassword]=useState("");
 const [confirmPassword,setConfirmPassword]=useState("");
 const refreshSessions=useCallback(async(token:string)=>{try{const result=await api.sessions(token);setSessions(result.items)}catch(err){setMessage(humanError(err))}},[]);
 useEffect(()=>{if(session){void refreshSessions(session.token)}else setSessions([])},[session,refreshSessions]);
 async function submit(e:FormEvent){e.preventDefault();setWorking(true);setMessage("");try{if(mode==="register"){
    const result=await api.register(email,password);
    if(result.verificationRequired){setPassword("");setMode("verify");setMessage(result.mailAccepted?"Check your email for a verification code.":"Your account was created, but email delivery failed. Request a new code.");return}
   }
   const newSession=await api.login(email,password);onSession(newSession);setPassword("");setMessage("Authenticated with the local API. Session is stored in memory only.")}catch(err){if(err instanceof ApiError&&err.code==="email_verification_required"){setMode("verify");setMessage("Email verification is required. Paste your code or request another.");}else setMessage(humanError(err))}finally{setWorking(false)}}
 async function submitCode(e:FormEvent){
  e.preventDefault();setWorking(true);setMessage("");
  try{
   if(mode==="forgot"){
    await api.forgotPassword(email);
    setMode("reset");setMessage("If your verified account exists, check your inbox for a recovery code.");
   }else if(mode==="verify"){
    await api.verifyEmail(authCode.trim());setAuthCode("");setMode("signin");
    setMessage("Email verified. Sign in with your password.");
   }else if(mode==="reset"){
    if(password!==passwordConfirmation){setMessage("Passwords do not match.");return}
    await api.resetPassword(authCode.trim(),password);setAuthCode("");setPassword("");setPasswordConfirmation("");
    setMode("signin");setMessage("Password reset. All prior sessions were revoked. Sign in again.");
   }
  }catch(err){setMessage(humanError(err))}
  finally{setWorking(false)}
 }
 async function resend(){setWorking(true);setMessage("");
  try{await api.resendVerification(email);setMessage("If this email needs verification, a new code will be sent.")}
  catch(err){setMessage(humanError(err))}finally{setWorking(false)}
 }
 async function signout(){if(!session)return;setWorking(true);setMessage("");try{await api.logout(session.token);onSession(null);setMessage("This session was revoked.")}catch(err){setMessage(humanError(err))}finally{setWorking(false)}}
 async function revokeAll(){if(!session)return;if(!window.confirm("Revoke all active sessions for this account?"))return;setWorking(true);setMessage("");try{await api.logoutAll(session.token);onSession(null);setMessage("All sessions revoked. Please sign in again.")}catch(err){setMessage(humanError(err))}finally{setWorking(false)}}
 async function changePassword(e:FormEvent){
  e.preventDefault();
  if(!session)return;
  if(newPassword!==confirmPassword){setMessage("New passwords do not match.");return}
  if(newPassword.length<12){setMessage("New password must be at least 12 characters.");return}
  setWorking(true);setMessage("");
  try{
   await api.changePassword(session.token,currentPassword,newPassword);
   setCurrentPassword("");setNewPassword("");setConfirmPassword("");
   onSession(null);
   setMessage("Password changed. All sessions were revoked. Sign in again with your new password.");
  }catch(err){setMessage(humanError(err))}finally{setWorking(false)}
 }
 return <><div className="page-head"><div><h1>My Account</h1><p>Connect to the local API for user-specific profile storage.</p></div></div><div className="callout"><ShieldCheck size={18}/>Local development only. Email verification and recovery are available only when a mail provider is connected; production security review is still pending.</div>{session?<div className="two-col"><Card title="Authenticated session"><div className="account-identity"><div className="big-symbol"><UserRound size={36}/></div><div><strong>{session.user.email}</strong><p>Role: {session.user.role}</p><Pill tone="positive">Connected to API</Pill></div></div><p className="muted">The session token is kept in page memory and will disappear on refresh. It is not saved to localStorage.</p><div className="form-actions"><Button variant="secondary" onClick={()=>void signout()} disabled={working}>Sign out</Button><Button variant="secondary" onClick={()=>void revokeAll()} disabled={working}>Sign out everywhere</Button></div></Card><Card title="Account security"><div className="checklist"><div><CheckCircle2 className="ok" size={17}/>Password hashed server-side</div><div><CheckCircle2 className="ok" size={17}/>Opaque expiring session</div><div><TriangleAlert className="warn" size={17}/>Email verification pending</div><div><TriangleAlert className="warn" size={17}/>Production security review pending</div></div><div className="form-actions"><Button variant="secondary" disabled={working} onClick={()=>void refreshSessions(session.token)}><RefreshCcw size={15}/> Refresh sessions</Button></div><div className="rows">{sessions.map((entry,i)=><div className="item-row" key={entry.createdAt+"-"+i}><div className="row-grow"><strong>{entry.current?"Current session":"Other active session"}</strong><small>Expires: {new Date(entry.expiresAt).toLocaleString()}</small></div><Pill tone={entry.current?"positive":"neutral"}>{entry.current?"This device":"Active"}</Pill></div>)}</div></Card>
<Card title="Change password"><form onSubmit={e=>void changePassword(e)} className="form-stack">
<label className="field">Current password<input required type="password" autoComplete="current-password" maxLength={128} value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}/></label>
<label className="field">New password<input required type="password" autoComplete="new-password" minLength={12} maxLength={128} value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></label>
<label className="field">Confirm new password<input required type="password" autoComplete="new-password" minLength={12} maxLength={128} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/></label>
<p className="muted">A successful change signs out every active session, including this one.</p>
<Button type="submit" disabled={working}><LockKeyhole size={15}/> Change password and sign out</Button>
</form></Card></div>:<div className="two-col"><Card title={mode==="signin"?"Sign in":mode==="register"?"Create a local account":mode==="forgot"?"Forgot password":mode==="verify"?"Verify email":"Reset password"}>
<form onSubmit={e=>void (mode==="signin"||mode==="register"?submit(e):submitCode(e))} className="form-stack">
{(mode==="signin"||mode==="register"||mode==="forgot")&&<label className="field">Email<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" maxLength={255}/></label>}
{(mode==="verify"||mode==="reset")&&<label className="field">One-time email code<input required type="text" autoComplete="one-time-code" value={authCode} onChange={e=>setAuthCode(e.target.value)} placeholder="Paste code from email" maxLength={60}/></label>}
{(mode==="signin"||mode==="register"||mode==="reset")&&<label className="field">{mode==="reset"?"New password":"Password"}<input required type="password" autoComplete={mode==="signin"?"current-password":"new-password"} minLength={mode==="signin"?1:12} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==="signin"?"Enter your password":"12 characters minimum"}/></label>}
{mode==="reset"&&<label className="field">Confirm password<input required type="password" autoComplete="new-password" minLength={12} value={passwordConfirmation} onChange={e=>setPasswordConfirmation(e.target.value)}/></label>}
<Button type="submit" disabled={working}>{working?"Working...":mode==="signin"?"Sign in":mode==="register"?"Create account":mode==="forgot"?"Request recovery code":mode==="verify"?"Verify email":"Reset password"} <ArrowRight size={15}/></Button>
</form>
<div className="form-actions">
{(mode==="signin"||mode==="register")&&<button className="text-link" onClick={()=>{setMode(mode==="signin"?"register":"signin");setMessage("")}}>{mode==="signin"?"Create a local account":"Already registered? Sign in"}</button>}
{mode==="signin"&&emailReady&&<button className="text-link" onClick={()=>{setMode("forgot");setMessage("")}}>Forgot password?</button>}
{mode==="verify"&&<button className="text-link" disabled={!emailReady||working} onClick={()=>void resend()}>Resend verification code</button>}
{(mode==="forgot"||mode==="verify"||mode==="reset")&&<button className="text-link" onClick={()=>{setMode("signin");setMessage("")}}>Back to sign in</button>}
</div>
{message?<div className="inline-message" role="status">{message}</div>:null}
</Card><Card title="Account protection"><div className="checklist"><div><KeyRound size={18}/>Long passwords and short-lived sessions.</div><div><LockKeyhole size={18}/>Single-use email verification and recovery codes.</div><div><Cloud size={18}/>Account-scoped cloud profiles.</div><div><TriangleAlert size={18}/>{emailReady?"Email provider configured for this API.":"Email provider is not connected. Recovery is unavailable."}</div></div></Card></div>}{session&&message?<div className="inline-message" role="status">{message}</div>:null}</>
}
export function CloudProfiles({session,config,setConfig,onStudio}:{session:Session|null;config:ProfileSettings;setConfig:(v:ProfileSettings)=>void;onStudio:()=>void}){
 const [items,setItems]=useState<CloudProfile[]>([]);
 const [selected,setSelected]=useState<CloudProfile|null>(null);
 const [working,setWorking]=useState(false);
 const [message,setMessage]=useState("");
 const [conflict,setConflict]=useState(false);
 const reload=useCallback(async()=>{if(!session)return;setWorking(true);try{const result=await api.profiles(session.token);setItems(result.items);setSelected(x=>x?result.items.find(p=>p.id===x.id)||null:null);setConflict(false)}catch(e){setMessage(humanError(e))}finally{setWorking(false)}},[session]);
 useEffect(()=>{if(session)void reload();else {setItems([]);setSelected(null)}},[session,reload]);
 async function create(){if(!session)return;setWorking(true);setMessage("");try{const p=await api.create(session.token,config.profileName||"Untitled profile",config);setItems(old=>[p,...old]);setSelected(p);setMessage("Profile created on your local API.")}catch(e){setMessage(humanError(e))}finally{setWorking(false)}}
 async function update(){if(!session||!selected)return;setWorking(true);setMessage("");try{const updated=await api.update(session.token,selected,config);setSelected(updated);setItems(old=>old.map(p=>p.id===updated.id?updated:p));setConflict(false);setMessage("Profile updated with version "+updated.version+".")}catch(e){if(e instanceof ApiError&&e.status===409)setConflict(true);setMessage(humanError(e))}finally{setWorking(false)}}
 async function remove(){if(!session||!selected)return;if(!window.confirm("Delete selected cloud profile? This cannot be undone."))return;setWorking(true);try{await api.remove(session.token,selected);setItems(old=>old.filter(x=>x.id!==selected.id));setSelected(null);setMessage("Profile deleted.")}catch(e){setMessage(humanError(e))}finally{setWorking(false)}}
 const selectProfile=(p:CloudProfile)=>{setSelected(p);setMessage("");setConflict(false)};
 return <><div className="page-head"><div><h1>Cloud Profiles</h1><p>Version-aware configuration storage with separate local and server copies.</p></div><div className="head-actions"><Button variant="secondary" onClick={onStudio}>Edit local profile</Button><Button variant="secondary" onClick={()=>void reload()} disabled={!session||working}><RefreshCcw size={15}/> Refresh</Button></div></div>{!session?<div className="callout"><CloudOff size={18}/>Sign in through Account to enable real API-backed profile storage. Local Studio works without an account.</div>:<div className="callout"><ShieldCheck size={18}/>Connected to the local development API. Server profiles are private to this signed-in account.</div>}{message?<div className="inline-message" role="status">{message}</div>:null}<div className="two-col"><Card title="Your cloud profile library" action={session?<Button onClick={()=>void create()} disabled={working}><Cloud size={15}/> Save new</Button>:null}>{session?(items.length?<div className="rows">{items.map(p=><button className={selected?.id===p.id?"profile-row chosen":"profile-row"} key={p.id} onClick={()=>selectProfile(p)}><div className="item-symbol"><Cloud size={18}/></div><div className="row-grow"><strong>{p.name}</strong><small>Version {p.version} · {p.updatedAt?new Date(p.updatedAt).toLocaleString():"new"}</small></div><Pill tone={selected?.id===p.id?"cyan":"neutral"}>{selected?.id===p.id?"Selected":"Cloud"}</Pill></button>)}</div>:<Empty title="No cloud profiles yet" description="Create your first versioned profile from the local Studio settings."/>):<Empty title="Authentication required" description="Open My Account to connect the local API before creating cloud profiles."/>}</Card><Card title={selected?"Selected profile":"Local vs cloud"}>{selected?<><div className="profile-tile"><div className="big-symbol"><Cloud size={33}/></div><div><h3>{selected.name}</h3><p>Server version {selected.version}</p><Pill tone="positive">Saved remotely</Pill></div></div><div className="form-actions"><Button variant="secondary" onClick={()=>{setConfig(selected.data);setMessage("Cloud settings copied to browser-local Studio.")}}><Download size={15}/>Copy to local</Button><Button onClick={()=>void update()} disabled={working}><Upload size={15}/>Overwrite cloud with local</Button><Button variant="ghost" onClick={()=>void remove()} disabled={working}>Delete</Button></div>{conflict?<div className="conflict-box"><TriangleAlert size={20}/><div><strong>Cloud version conflict</strong><p>Another version exists on the server. Your local settings have not been overwritten. Refresh the library to compare versions, or Save new to keep both copies.</p><Button variant="secondary" onClick={()=>void reload()}>Load latest version</Button><Button onClick={()=>void create()}>Save as separate profile</Button></div></div>:null}</>:<><div className="profile-tile"><div className="big-symbol">◈</div><div><h3>{config.profileName}</h3><p>Locally saved configuration · density {config.density}%</p><Pill tone="warning">Local browser</Pill></div></div><p className="muted">Choose an existing cloud profile to compare and edit it, or create a new independent cloud copy.</p></>}</Card></div></>
}
