import {useEffect,useState} from "react";
import type {FormEvent} from "react";
import {AlertTriangle,KeyRound,Plus,RefreshCcw,ShieldCheck} from "lucide-react";
import {Button,Card,Empty,Pill} from "@dma-hub/ui";
import {api} from "./api";
import type {CatalogItem,Entitlement,PricingPlan,Session} from "./api";

function messageOf(e:unknown){return e instanceof Error?e.message:"The operation failed."}
export function AdminCommerceCenter({session}:{session:Session|null}){
 const [products,setProducts]=useState<CatalogItem[]>([]);
 const [plans,setPlans]=useState<PricingPlan[]>([]);
 const [grants,setGrants]=useState<Entitlement[]>([]);
 const [selected,setSelected]=useState("");
 const [slug,setSlug]=useState("");
 const [productName,setProductName]=useState("");
 const [code,setCode]=useState("");
 const [planName,setPlanName]=useState("");
 const [minor,setMinor]=useState("1299");
 const [period,setPeriod]=useState<PricingPlan["billingPeriod"]>("monthly");
 const [targetUser,setTargetUser]=useState("");
 const [selectedPlan,setSelectedPlan]=useState("");
 const [duration,setDuration]=useState("30");
 const [loading,setLoading]=useState(false);
 const [message,setMessage]=useState("");
 const token=session?.token||"";
 const admin=session?.user.role==="admin";
 const currentProduct=products.find(x=>x.id===selected);
 const activePlans=plans.filter(x=>x.status==="active");
 async function reload(){
  if(!admin)return;
  setLoading(true);setMessage("");
  try{
   const [p,g]=await Promise.all([api.adminProducts(token),api.adminGrants(token)]);
   setProducts(p.items);setGrants(g.items);
   setSelected(old=>p.items.some(x=>x.id===old)?old:p.items[0]?.id||"");
  }catch(e){setMessage("Unable to load admin data: "+messageOf(e))}
  finally{setLoading(false)}
 }
 useEffect(()=>{if(admin)void reload();else{setProducts([]);setPlans([]);setGrants([])}},[token,admin]);
 useEffect(()=>{
  if(!selected||!admin){setPlans([]);return}
  let valid=true;
  api.adminPlans(token,selected).then(v=>{if(valid){setPlans(v.items);setSelectedPlan(old=>v.items.some(x=>x.id===old)?old:v.items.find(x=>x.status==="active")?.id||"")}})
   .catch(e=>{if(valid){setPlans([]);setMessage(messageOf(e))}});
  return()=>{valid=false}
 },[selected,token,admin]);
 async function run(action:()=>Promise<unknown>,success:string){
  setLoading(true);setMessage("");
  try{await action();await reload();setMessage(success)}
  catch(e){setMessage(messageOf(e))}
  finally{setLoading(false)}
 }
 async function addProduct(e:FormEvent){
  e.preventDefault();
  await run(async()=>{const item=await api.createAdminProduct(token,slug,productName);setSelected(item.id);setSlug("");setProductName("")},"Draft product created. Publish it only after review.");
 }
 async function changeProductStatus(status:CatalogItem["status"]){
  if(!currentProduct)return;
  await run(()=>api.updateAdminProduct(token,currentProduct,status),"Product status saved.");
 }
 async function addPlan(e:FormEvent){
  e.preventDefault();if(!selected)return;
  const amountMinor=Number(minor);
  if(!Number.isSafeInteger(amountMinor)||amountMinor<0){setMessage("Enter a valid nonnegative amount in cents.");return}
  await run(async()=>{
   const p=await api.createAdminPlan(token,selected,{code,name:planName,amountMinor,billingPeriod:period});
   setCode("");setPlanName("");setPlans(old=>[p,...old]);setSelectedPlan(p.id);
  },"Draft pricing plan created. Activate only after review.");
 }
 async function activatePlan(p:PricingPlan){
  setLoading(true);setMessage("");
  try{
   await api.setAdminPlanStatus(token,p,p.status==="active"?"archived":"active");
   const result=await api.adminPlans(token,selected);setPlans(result.items);
   setMessage("Plan status updated; existing entitlements are managed separately.");
  }catch(e){setMessage(messageOf(e))}finally{setLoading(false)}
 }
 async function grant(e:FormEvent){
  e.preventDefault();
  const days=Number(duration);
  if(!Number.isSafeInteger(days)||days<1||days>365){setMessage("Choose 1–365 days.");return}
  await run(()=>api.createTestGrant(token,{userId:targetUser.trim(),productId:selected,planId:selectedPlan,expiresAt:Date.now()+days*86400000}),"Expiring TEST access granted. No money collected or license issued.");
 }
 async function revoke(id:string){
  if(!window.confirm("Revoke this test grant immediately?"))return;
  await run(()=>api.revokeTestGrant(token,id),"Test grant revoked.");
 }
 return <div className="admin-commerce">
  <div className="page-head"><div><h1>Pricing & Test Access</h1><p>Local API operator tools — no checkout, payment, subscription or production licensing.</p></div>
    <Button variant="secondary" disabled={!admin||loading} onClick={()=>void reload()}><RefreshCcw size={15}/>Refresh</Button></div>
  <div className="callout"><ShieldCheck size={18}/>This is an internal development console. All changes require a valid server-issued admin session and are recorded in the API audit log.</div>
  {!session?<Card title="Authentication required"><Empty title="Sign in first" description="Open Account to sign in with an admin-provisioned local API account."/></Card>:
   !admin?<Card title="Admin access required"><Empty title="Not authorized" description="Your current account has no administrator role. Roles cannot be assigned through public registration."/></Card>:
   <>
    {message&&<div className="inline-message" role="status">{message}</div>}
    <div className="two-col"><Card title="Catalog products"><form onSubmit={e=>void addProduct(e)} className="form-stack">
      <label className="field">URL slug<input required value={slug} onChange={e=>setSlug(e.target.value)} placeholder="sample-product" minLength={3} maxLength={60}/></label>
      <label className="field">Product name<input required value={productName} onChange={e=>setProductName(e.target.value)} placeholder="Product name" maxLength={100}/></label>
      <Button type="submit" disabled={loading}><Plus size={15}/>Create draft</Button>
    </form>
    {products.length===0?<Empty title="No products" description="Create the first draft product. Demo products are separate."/>:
     <div className="form-stack"><label className="field">Edit product<select value={selected} onChange={e=>setSelected(e.target.value)}>
       {products.map(p=><option value={p.id} key={p.id}>{p.name} ({p.status})</option>)}
      </select></label>
      {currentProduct&&<div className="form-actions"><Pill tone={currentProduct.status==="published"?"positive":"warning"}>{currentProduct.status}</Pill>
        <Button variant="secondary" disabled={loading||currentProduct.status==="published"} onClick={()=>void changeProductStatus("published")}>Publish</Button>
        <Button variant="secondary" disabled={loading||currentProduct.status==="archived"} onClick={()=>void changeProductStatus("archived")}>Archive</Button>
      </div>}</div>}</Card>
      <Card title="Plan setup">
        {!selected?<Empty title="Choose a product" description="Create or select a product first."/>:<>
        <form className="form-stack" onSubmit={e=>void addPlan(e)}>
         <label className="field">Plan code<input required value={code} maxLength={40} placeholder="monthly-standard" onChange={e=>setCode(e.target.value)}/></label>
         <label className="field">Plan name<input required value={planName} maxLength={80} placeholder="Standard" onChange={e=>setPlanName(e.target.value)}/></label>
         <label className="field">USD cents (immutable)<input required type="number" min={0} max={100000000} step={1} value={minor} onChange={e=>setMinor(e.target.value)}/></label>
         <label className="field">Billing interval (metadata)<select value={period} onChange={e=>setPeriod(e.target.value as PricingPlan["billingPeriod"])}><option value="one_time">One time</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></label>
         <Button type="submit" disabled={loading}><Plus size={15}/>Create draft plan</Button>
        </form>
        <div className="rows">{plans.map(p=><div className="item-row" key={p.id}>
         <div className="row-grow"><strong>{p.name}</strong><small>{p.currency} {(p.amountMinor/100).toFixed(2)} · {p.billingPeriod} · v{p.version}</small></div>
         <Button variant="secondary" disabled={loading||p.status==="archived"} onClick={()=>void activatePlan(p)}>{p.status==="active"?"Archive":"Activate"}</Button>
        </div>)}</div>
        </>}
      </Card></div>
    <div className="two-col"><Card title="Issue manual TEST access">
       <form className="form-stack" onSubmit={e=>void grant(e)}>
        <label className="field">Customer account UUID<input required value={targetUser} placeholder="00000000-0000-0000-0000-000000000000" onChange={e=>setTargetUser(e.target.value)}/></label>
        <label className="field">Active plan<select required value={selectedPlan} onChange={e=>setSelectedPlan(e.target.value)}>
         <option value="">Choose active plan</option>{activePlans.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label className="field">Access duration (days)<input type="number" required min={1} max={365} value={duration} onChange={e=>setDuration(e.target.value)}/></label>
        <div className="callout"><AlertTriangle size={16}/>Grant is for internal testing only. This action does not prove a purchase.</div>
        <Button type="submit" disabled={loading||!selected||!selectedPlan||activePlans.every(p=>p.id!==selectedPlan)}><KeyRound size={15}/>Grant test access</Button>
       </form>
      </Card>
      <Card title="Recent test grants">
       {grants.length===0?<Empty title="No test access records" description="Grants appear here after an admin creates them."/>:
        <div className="rows">{grants.slice(0,40).map(g=><div className="item-row" key={g.id}>
         <div className="row-grow"><strong>{g.userId.slice(0,8)} · Product {g.productId.slice(0,8)}</strong>
           <small>{g.accessStatus} · Expires {new Date(g.expiresAt).toLocaleString()}</small></div>
         {g.state==="active"?<Button variant="secondary" disabled={loading} onClick={()=>void revoke(g.id)}>Revoke</Button>:<Pill tone="warning">Revoked</Pill>}
        </div>)}</div>}
      </Card></div>
   </>
  }
 </div>;
}
