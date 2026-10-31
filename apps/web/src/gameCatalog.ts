export type GameInfo={
 id:string;name:string;shortName:string;category:string;summary:string;
};
export const GAME_CATALOG:ReadonlyArray<GameInfo>=[
 {id:"counter-strike-2",name:"Counter-Strike 2",shortName:"CS2",category:"Tactical FPS",summary:"Planned catalog category for Counter-Strike 2 software and documented compatibility."},
 {id:"fortnite",name:"Fortnite",shortName:"FN",category:"Battle Royale",summary:"Planned category for Fortnite-related DMA software listings and setup requirements."},
 {id:"rust",name:"Rust",shortName:"RUST",category:"Survival",summary:"Planned Rust software catalog with versioned product information."},
 {id:"apex-legends",name:"Apex Legends",shortName:"APEX",category:"Battle Royale",summary:"Planned Apex Legends catalog and supported-platform documentation."},
 {id:"call-of-duty",name:"Call of Duty / Warzone",shortName:"COD",category:"FPS",summary:"Planned catalog category. Individual game editions and versions must be verified before listing."},
 {id:"valorant",name:"Valorant",shortName:"VAL",category:"Tactical FPS",summary:"Planned catalog category; no integration, bypass or functionality is claimed."},
 {id:"escape-from-tarkov",name:"Escape from Tarkov",shortName:"EFT",category:"Extraction",summary:"Planned title page with supported-build verification as a future requirement."},
 {id:"rainbow-six-siege",name:"Rainbow Six Siege",shortName:"R6",category:"Tactical FPS",summary:"Planned game category; compatibility has not been tested."},
 {id:"pubg",name:"PUBG: Battlegrounds",shortName:"PUBG",category:"Battle Royale",summary:"Planned game category with dedicated product and documentation slots."},
 {id:"arc-raiders",name:"ARC Raiders",shortName:"ARC",category:"Extraction",summary:"Planned game category for title-specific software catalog records."}
];
export function findGame(id:string){return GAME_CATALOG.find(game=>game.id===id)}
