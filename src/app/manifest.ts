import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return { name:"Translend TMS · Truck Division", short_name:"Translend", description:"Transport management for real trucking operations.", start_url:"/", display:"standalone", background_color:"#f6f2ea", theme_color:"#0b8b85", icons:[{src:"/icons/icon-192.png",sizes:"192x192",type:"image/png"},{src:"/icons/icon-512.png",sizes:"512x512",type:"image/png"}] };
}