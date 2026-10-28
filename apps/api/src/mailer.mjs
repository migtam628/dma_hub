// Mail is sent only when an explicit provider configuration is present.
// Never log raw tokens, provider credentials, or complete email payloads.
export function createResendTransport({apiKey,from,fetchImpl=fetch}={}){
 if(!apiKey&&!from)return null;
 if(typeof apiKey!=="string"||apiKey.length<10||typeof from!=="string"||!from.includes("@")){
  throw new Error("Configure both RESEND_API_KEY and MAIL_FROM or neither");
 }
 return async function sendAccountEmail({kind,to,token,expiresAt}){
  if(!["verify_email","reset_password"].includes(kind))throw new Error("Unsupported mail template");
  const verification=kind==="verify_email";
  const subject=verification?"Verify your DMA Hub email":"Reset your DMA Hub password";
  const action=verification?"verify your email":"reset your password";
  const text=`A request was made to ${action} for DMA Hub.\n\nOne-time code:\n${token}\n\nThis code expires at ${new Date(expiresAt).toISOString()}.\n\nOpen your local DMA Hub Account screen and paste the code. If you did not request this, ignore the message.\n`;
  const response=await fetchImpl("https://api.resend.com/emails",{
   method:"POST",
   headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json","User-Agent":"DMA-Hub/0.3"},
   body:JSON.stringify({from,to:[to],subject,text}),
   signal:AbortSignal.timeout(10000)
  });
  if(!response.ok)throw new Error("Email delivery was rejected by provider");
  return true;
 };
}
