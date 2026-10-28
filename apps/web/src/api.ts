export type User={id:string;email:string;role:string;createdAt?:number};
export type Session={token:string;expiresAt:number;user:User};
export type ActiveSession={createdAt:number;expiresAt:number;current:boolean};
export type ProfileSettings={profileName:string;autoSync:boolean;notifications:boolean;density:number;accent:string;startup:string};
export type CloudProfile={id:string;name:string;data:ProfileSettings;version:number;createdAt?:number;updatedAt?:number};
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
 register:(email:string,password:string)=>request<{user:User}>("/v1/auth/register","POST",{email,password}),
 login:(email:string,password:string)=>request<Session>("/v1/auth/login","POST",{email,password}),
 logout:(token:string)=>request<{ok:boolean}>("/v1/auth/logout","POST",{},token),
 sessions:(token:string)=>request<{items:ActiveSession[]}>("/v1/auth/sessions","GET",undefined,token),
 logoutAll:(token:string)=>request<{ok:boolean}>("/v1/auth/logout-all","POST",{},token),
 changePassword:(token:string,currentPassword:string,newPassword:string)=>request<{ok:boolean;sessionsRevoked:boolean}>("/v1/auth/change-password","POST",{currentPassword,newPassword},token),
 me:(token:string)=>request<{user:User}>("/v1/me","GET",undefined,token),
 profiles:(token:string)=>request<{items:CloudProfile[]}>("/v1/profiles","GET",undefined,token),
 create:(token:string,name:string,data:ProfileSettings)=>request<CloudProfile>("/v1/profiles","POST",{name,data},token),
 update:(token:string,p:CloudProfile,data:ProfileSettings)=>request<CloudProfile>("/v1/profiles/"+p.id,"PATCH",{name:data.profileName,data},token,p.version),
 remove:(token:string,p:CloudProfile)=>request<{ok:boolean}>("/v1/profiles/"+p.id,"DELETE",undefined,token,p.version)
};
