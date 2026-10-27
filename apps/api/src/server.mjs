import {createApp} from "./app.mjs";
const port=Number(process.env.PORT||8787);
const host=process.env.HOST||"127.0.0.1";
const dbPath=process.env.DB_PATH||"./data/dma-hub.sqlite";
const allowedOrigin=process.env.WEB_ORIGIN||"http://localhost:5173";
const {server,db}=createApp({dbPath,allowedOrigin});
server.listen(port,host,()=>console.info("DMA Hub API listening at http://"+host+":"+port));
const shutdown=()=>server.close(()=>{db.close();process.exit(0)});
process.on("SIGINT",shutdown);process.on("SIGTERM",shutdown);
