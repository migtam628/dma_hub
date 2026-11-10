import {existsSync} from "node:fs";
import {createApp} from "./app.mjs";
import {createResendTransport} from "./mailer.mjs";
const port=Number(process.env.PORT||8787);
const host=process.env.HOST||"127.0.0.1";
// Local alpha API must never bind to public interfaces, even by accident.
const containerBind=host==="0.0.0.0"&&process.env.DMA_CONTAINER_BIND==="1"&&existsSync("/.dockerenv");
if(host!=="127.0.0.1"&&host!=="::1"&&!containerBind){
 console.error("DMA Hub API refuses non-loopback HOST; use 127.0.0.1 or ::1");
 process.exit(1);
}
const dbPath=process.env.DB_PATH||"./data/dma-hub.sqlite";
const allowedOrigin=process.env.WEB_ORIGIN||"http://localhost:5173";
const desktopOrigin=process.env.DESKTOP_ORIGIN||"http://tauri.localhost";
const mailer=createResendTransport({apiKey:process.env.RESEND_API_KEY,from:process.env.MAIL_FROM});
const requireEmailVerification=process.env.REQUIRE_EMAIL_VERIFICATION==="1";
const sandboxWebhookSecret=process.env.DMA_SANDBOX_WEBHOOK_SECRET||null;
const stripeTest={
 secretKey:process.env.STRIPE_TEST_SECRET_KEY,
 webhookSecret:process.env.STRIPE_TEST_WEBHOOK_SECRET,
 successUrl:process.env.STRIPE_TEST_SUCCESS_URL,
 cancelUrl:process.env.STRIPE_TEST_CANCEL_URL
};
const {server,db}=createApp({dbPath,allowedOrigin,desktopOrigin,sendEmail:mailer,requireEmailVerification,sandboxWebhookSecret,stripeTest});
server.listen(port,host,()=>console.info("DMA Hub API listening at http://"+host+":"+port));
const shutdown=()=>server.close(()=>{db.close();process.exit(0)});
process.on("SIGINT",shutdown);process.on("SIGTERM",shutdown);
