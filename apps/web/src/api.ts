export type User={id:string;email:string;role:string;createdAt?:number};
export type Session={token:string;expiresAt:number;user:User};
export type AuthCapabilities={emailVerificationRequired:boolean;passwordRecoveryAvailable:boolean};
export type ActiveSession={createdAt:number;expiresAt:number;current:boolean};
export type ProfileSettings={profileName:string;autoSync:boolean;notifications:boolean;density:number;accent:string;startup:string};
export type CloudProfile={id:string;name:string;data:ProfileSettings;version:number;createdAt?:number;updatedAt?:number};
export type CatalogCategory="unspecified"|"software"|"hardware"|"cloud";
export type CatalogMetadata={category:CatalogCategory;features:string[];requirements:string[];gameIds:string[]};
export type GameCompatibilityRecord={id:string;productId:string;productSlug:string;productName:string;gameId:string;gameBuild:string;platform:"Windows 10"|"Windows 11";hardware:string;evidenceRef:string;reviewedAt:number;status:"operator_reviewed"};
export type AdminGameCompatibilityRecord={id:string;productId:string;productName:string;productSlug:string;gameId:string;gameBuild:string;platform:"Windows 10"|"Windows 11";hardware:string;evidenceRef:string;state:"draft"|"reviewed"|"withdrawn";version:number;productVersion:number;currentProductVersion:number;stale:boolean;reviewedAt:number|null;createdAt:number;updatedAt:number};
export type GameCompatibilityDraft={productId:string;gameId:string;gameBuild:string;platform:"Windows 10"|"Windows 11";hardware:string;evidenceRef:string};
export type PublishedCatalogItem={id:string;slug:string;name:string;description:string;updatedAt:number}&CatalogMetadata;
export type CatalogItem=PublishedCatalogItem&{status:"draft"|"published"|"archived";version:number;createdAt:number};
export type PricingPlan={id:string;productId:string;code:string;name:string;amountMinor:number;currency:"USD";billingPeriod:"one_time"|"monthly"|"yearly";status:"draft"|"active"|"archived";version:number;createdAt:number;updatedAt:number};
export type SandboxWebhookEvent={eventId:string;orderId:string;kind:"sandbox.payment_observed"|"sandbox.payment_failed";sentAt:number;receivedAt:number};
export type StripeTestCheckout={id:string;orderId:string;state:"creating"|"open"|"test_paid_observed"|"expired";amountMinor:number;providerSessionId:string|null;createdAt:number;updatedAt:number;checkoutUrl?:string;userId?:string};
export type StripeTestEvent={eventId:string;checkoutId:string;eventType:string;receivedAt:number};
export type StripeTestObservation={id:string;checkoutId:string;providerSessionStatus:"open"|"complete"|"expired";providerPaymentStatus:"paid"|"unpaid"|"no_payment_required";testPaymentObserved:boolean;checkedAt:number;checkedBy:string;settlementVerified:false;accessGranted:false;testModeOnly:true};
export type StripeTestReconcileResult={checkoutId:string;orderId:string;providerSessionId:string;providerSessionStatus:string;providerPaymentStatus:string;testPaymentObserved:boolean;settlementVerified:false;accessGranted:false;testModeOnly:true;observationId:string;observationRecorded:boolean;observationReplay:boolean;observationFirstSeenAt:number};
export type StripeTestCapabilities={available:boolean;testModeOnly:true;automatedFulfillment:false};
export type SecurityRateScope={scope:string;windowMs:number;limit:number;activeKeys:number;attemptsInActiveWindows:number;blockedKeys:number;rejectedAttemptsInActiveWindows:number};
export type SecurityOverview={generatedAt:number;scope:"local_sqlite_database";activeWindowsOnly:true;distributedAcrossHosts:false;productionSecurityApproved:false;totalRejectedAttempts:number;totalBlockedKeys:number;scopes:SecurityRateScope[];authAuditLast24Hours:{action:string;count:number}[]};
export type AuditEvent={id:string;actorId:string|null;action:string;targetId:string|null;createdAt:number};
export type PublicPlan=PricingPlan&{productName:string;productSlug:string};
export type SandboxOrder={id:string;productId:string;planId:string;amountMinor:number;currency:"USD";billingPeriod:string;state:"pending"|"test_fulfilled"|"cancelled";createdAt:number;updatedAt:number;entitlementId:string|null;fulfilledAt:number|null;userId?:string};
export type Entitlement={id:string;userId:string;productId:string;planId:string;source:"admin_test_grant"|"sandbox_order";productName:string|null;planName:string|null;state:"active"|"revoked";startsAt:number;expiresAt:number;revokedAt?:number|null;createdAt:number;accessStatus:"active"|"scheduled"|"expired"|"revoked"|"product_unavailable";accessAllowed:boolean};
export class ApiError extends Error{constructor(public status:number,public code:string,message?:string){super(message||code)}}
const API_ROOT=(import.meta.env.VITE_API_URL||((location.hostname==="localhost"||location.hostname==="127.0.0.1")?"http://localhost:8787":location.origin)).replace(/\/$/,"");
async function request<T>(path:string,method="GET",body?:unknown,token?:string,version?:number):Promise<T>{
 const headers:Record<string,string>={"Accept":"application/json"};
 if(body!==undefined)headers["Content-Type"]="application/json";
 if(token)headers.Authorization="Bearer "+token;
 if(version!==undefined)headers["If-Match"]=String(version);
 let result:Response;
 try{result=await fetch(API_ROOT+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:"no-store"})}catch{throw new ApiError(0,"connection_unavailable","The API is not reachable. Start the local server or check its URL.")}
 const value=await result.json().catch(()=>({error:"invalid_response"}));
 if(!result.ok)throw new ApiError(result.status,value.error||"request_failed",value.message||"Request failed");
 return value as T
}
export const api={
 health:()=>request<{status:string}>("/healthz"),
 register:(email:string,password:string)=>request<{user:User;verificationRequired:boolean;mailAccepted:boolean|null}>("/v1/auth/register","POST",{email,password}),
 login:(email:string,password:string)=>request<Session>("/v1/auth/login","POST",{email,password}),
 capabilities:()=>request<AuthCapabilities>("/v1/auth/capabilities"),
 verifyEmail:(token:string)=>request<{ok:boolean}>("/v1/auth/verify-email","POST",{token}),
 resendVerification:(email:string)=>request<{ok:boolean}>("/v1/auth/request-verification","POST",{email}),
 forgotPassword:(email:string)=>request<{ok:boolean}>("/v1/auth/forgot-password","POST",{email}),
 resetPassword:(token:string,newPassword:string)=>request<{ok:boolean;sessionsRevoked:boolean}>("/v1/auth/reset-password","POST",{token,newPassword}),
 logout:(token:string)=>request<{ok:boolean}>("/v1/auth/logout","POST",{},token),
 sessions:(token:string)=>request<{items:ActiveSession[]}>("/v1/auth/sessions","GET",undefined,token),
 logoutAll:(token:string)=>request<{ok:boolean}>("/v1/auth/logout-all","POST",{},token),
 changePassword:(token:string,currentPassword:string,newPassword:string)=>request<{ok:boolean;sessionsRevoked:boolean}>("/v1/auth/change-password","POST",{currentPassword,newPassword},token),
 me:(token:string)=>request<{user:User}>("/v1/me","GET",undefined,token),
 entitlements:(token:string)=>request<{items:Entitlement[]}>("/v1/me/entitlements","GET",undefined,token),
 liveCatalog:()=>request<{items:PublishedCatalogItem[]}>("/v1/catalog/live"),
 gameCompatibility:(gameId:string)=>request<{gameId:string;items:GameCompatibilityRecord[];operatorAttestedOnly:true;noDownloads:true}>("/v1/games/"+encodeURIComponent(gameId)+"/compatibility"),
 adminGameCompatibility:(token:string)=>request<{items:AdminGameCompatibilityRecord[]}>("/v1/admin/game-compatibility","GET",undefined,token),
 createGameCompatibility:(token:string,values:GameCompatibilityDraft)=>request<{id:string;state:"draft";version:number;productVersion:number}>("/v1/admin/game-compatibility","POST",values,token),
 transitionGameCompatibility:(token:string,record:AdminGameCompatibilityRecord,state:AdminGameCompatibilityRecord["state"])=>request<{id:string;state:string;version:number;productVersion:number}>("/v1/admin/game-compatibility/"+record.id,"PATCH",{state},token,record.version),
 liveProduct:(slug:string)=>request<PublishedCatalogItem>("/v1/catalog/live/"+encodeURIComponent(slug)),
 publicPricing:()=>request<{items:PublicPlan[]}>("/v1/catalog/pricing"),
 stripeTestCapabilities:()=>request<StripeTestCapabilities>("/v1/stripe-test/capabilities"),
 stripeTestCheckouts:(token:string)=>request<{items:StripeTestCheckout[];testModeOnly:true}>("/v1/me/stripe-test-checkouts","GET",undefined,token),
 startStripeTestCheckout:(token:string,orderId:string)=>request<StripeTestCheckout&{testModeOnly:true;replayed:boolean}>("/v1/me/stripe-test-checkouts","POST",{orderId},token),
 adminStripeTestCheckouts:(token:string)=>request<{items:StripeTestCheckout[];testModeOnly:true}>("/v1/admin/stripe-test-checkouts","GET",undefined,token),
 adminStripeTestEvents:(token:string)=>request<{items:StripeTestEvent[];testModeOnly:true}>("/v1/admin/stripe-test-events","GET",undefined,token),
 adminStripeTestHistory:(token:string,id:string)=>request<{items:StripeTestObservation[];checkoutId:string;settlementVerified:false;accessGranted:false;testModeOnly:true}>("/v1/admin/stripe-test-checkouts/"+id+"/observations","GET",undefined,token),
 reconcileStripeTest:(token:string,id:string)=>request<StripeTestReconcileResult>("/v1/admin/stripe-test-checkouts/"+id+"/reconcile","POST",{},token),
 testOrders:(token:string)=>request<{items:SandboxOrder[];sandboxOnly:true}>("/v1/me/test-orders","GET",undefined,token),
 createTestOrder:(token:string,planId:string,idempotencyKey:string)=>request<SandboxOrder&{sandboxOnly:true;replayed:boolean}>("/v1/me/test-orders","POST",{planId,idempotencyKey},token),
 adminTestOrders:(token:string)=>request<{items:SandboxOrder[];sandboxOnly:true}>("/v1/admin/test-orders","GET",undefined,token),
 sandboxWebhookEvents:(token:string)=>request<{items:SandboxWebhookEvent[];sandboxOnly:true}>("/v1/admin/test-webhooks","GET",undefined,token),
 auditLog:(token:string,offset=0,limit=50)=>request<{items:AuditEvent[];nextOffset:number|null}>("/v1/admin/audit?offset="+offset+"&limit="+limit,"GET",undefined,token),
 securityOverview:(token:string)=>request<SecurityOverview>("/v1/admin/security","GET",undefined,token),
 fulfillTestOrder:(token:string,id:string)=>request<SandboxOrder&{sandboxOnly:true;replayed:boolean}>("/v1/admin/test-orders/"+id+"/fulfill","POST",{},token),
 cancelTestOrder:(token:string,id:string)=>request<SandboxOrder&{sandboxOnly:true;replayed:boolean}>("/v1/admin/test-orders/"+id+"/cancel","POST",{},token),
 adminProducts:(token:string)=>request<{items:CatalogItem[]}>("/v1/admin/products","GET",undefined,token),
 createAdminProduct:(token:string,slug:string,name:string)=>request<CatalogItem>("/v1/admin/products","POST",{slug,name,description:"",status:"draft"},token),
 updateAdminProduct:(token:string,p:CatalogItem,status:CatalogItem["status"])=>request<CatalogItem>("/v1/admin/products/"+p.id,"PATCH",{slug:p.slug,name:p.name,description:p.description,status,category:p.category,features:p.features,requirements:p.requirements,gameIds:p.gameIds},token,p.version),
 saveAdminProduct:(token:string,original:CatalogItem,values:Pick<CatalogItem,"slug"|"name"|"description"|"status"|"category"|"features"|"requirements"|"gameIds">)=>request<CatalogItem>("/v1/admin/products/"+original.id,"PATCH",values,token,original.version),
 createCatalogDraft:(token:string,values:Pick<CatalogItem,"slug"|"name"|"description"|"category"|"features"|"requirements"|"gameIds">)=>request<CatalogItem>("/v1/admin/products","POST",{...values,status:"draft"},token),
 adminPlans:(token:string,productId:string)=>request<{items:PricingPlan[]}>("/v1/admin/products/"+productId+"/plans","GET",undefined,token),
 createAdminPlan:(token:string,productId:string,p:{code:string;name:string;amountMinor:number;billingPeriod:PricingPlan["billingPeriod"]})=>request<PricingPlan>("/v1/admin/products/"+productId+"/plans","POST",{...p,currency:"USD",status:"draft"},token),
 setAdminPlanStatus:(token:string,p:PricingPlan,status:PricingPlan["status"])=>request<PricingPlan>("/v1/admin/plans/"+p.id,"PATCH",{name:p.name,status},token,p.version),
 adminGrants:(token:string)=>request<{items:Entitlement[]}>("/v1/admin/entitlements","GET",undefined,token),
 createTestGrant:(token:string,data:{userId:string;productId:string;planId:string;expiresAt:number})=>request<Entitlement>("/v1/admin/entitlements","POST",data,token),
 revokeTestGrant:(token:string,id:string)=>request<{ok:boolean;alreadyRevoked:boolean}>("/v1/admin/entitlements/"+id+"/revoke","POST",{},token),
 access:(token:string,productId:string)=>request<{productId:string;allowed:boolean;reason:string;expiresAt:number|null}>("/v1/me/access/"+productId,"GET",undefined,token),
 profiles:(token:string)=>request<{items:CloudProfile[]}>("/v1/profiles","GET",undefined,token),
 create:(token:string,name:string,data:ProfileSettings)=>request<CloudProfile>("/v1/profiles","POST",{name,data},token),
 update:(token:string,p:CloudProfile,data:ProfileSettings)=>request<CloudProfile>("/v1/profiles/"+p.id,"PATCH",{name:data.profileName,data},token,p.version),
 remove:(token:string,p:CloudProfile)=>request<{ok:boolean}>("/v1/profiles/"+p.id,"DELETE",undefined,token,p.version)
};
