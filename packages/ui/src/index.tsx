import React from "react";
import {ArrowRight, LoaderCircle} from "lucide-react";
export const palette = {background:"#07121e",surface:"#0d1a2a",panel:"#112237",edge:"#243447",cyan:"#25c2d7",violet:"#9686ff",positive:"#41d7a3",warning:"#fabf65"} as const;
export function Button({children,onClick,variant="primary",disabled=false,loading=false,type="button",className=""}:{children:React.ReactNode;onClick?:()=>void;variant?:"primary"|"secondary"|"ghost"|"danger";disabled?:boolean;loading?:boolean;type?:"button"|"submit";className?:string}) {
 return <button type={type} className={`btn btn--${variant} ${className}`} disabled={disabled||loading} onClick={onClick}>{loading?<LoaderCircle size={15} className="spin"/>:null}{children}</button>;
}
export function Pill({children,tone="neutral"}:{children:React.ReactNode;tone?:"neutral"|"positive"|"warning"|"danger"|"cyan"|"violet"}){return <span className={`pill pill--${tone}`}>{children}</span>}
export function Card({title,action,children,className=""}:{title?:React.ReactNode;action?:React.ReactNode;children:React.ReactNode;className?:string}){return <section className={`panel ${className}`}>{title?<div className="panel-heading"><h2>{title}</h2>{action}</div>:null}{children}</section>}
export function Empty({title,description,action}:{title:string;description:string;action?:React.ReactNode}){return <div className="empty-state"><div className="empty-art">◇</div><h3>{title}</h3><p>{description}</p>{action}</div>}
export function SectionHeading({eyebrow,title,description,action}:{eyebrow?:string;title:string;description?:string;action?:React.ReactNode}){return <div className="section-heading"><div>{eyebrow?<span className="eyebrow">{eyebrow}</span>:null}<h2>{title}</h2>{description?<p>{description}</p>:null}</div>{action}</div>}
export function Stat({label,value,description,children}:{label:string;value:React.ReactNode;description?:string;children?:React.ReactNode}){return <div className="stat"><span className="muted">{label}</span><strong>{value}</strong>{description?<small>{description}</small>:null}{children}</div>}
export function ArrowLink({children,onClick}:{children:React.ReactNode;onClick:()=>void}){return <button className="arrow-link" type="button" onClick={onClick}>{children}<ArrowRight size={16}/></button>}
