"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { driversRepo, tripsRepo } from "@/lib/firebase/modules";
import { enqueueDriverAction } from "@/lib/offline/driverActionQueue";
import type { Driver, Trip, TripStatus } from "@/types/core";
import { LocationCapturePanel } from "@/components/location/LocationCapturePanel";
import { DriverDeliveryPanel } from "@/components/v19/DriverDeliveryPanel";
import { DriverVehiclePanel } from "@/components/v19/DriverVehiclePanel";

const FLOW: TripStatus[] = ["planned", "en_route_pickup", "loading", "in_transit", "unloading", "completed"];
const LABELS: Record<TripStatus, string> = { planned: "Planned", en_route_pickup: "En route to pickup", loading: "Loading", in_transit: "In transit", unloading: "Unloading", completed: "Completed", exception: "Exception" };
const ACTIONS: Record<TripStatus, string> = { planned: "Start trip", en_route_pickup: "Mark pickup arrived", loading: "Mark loading complete", in_transit: "Mark delivery arrived", unloading: "Confirm delivery", completed: "Trip complete", exception: "Resolve exception" };

function ErrorNotice({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="notice" style={{ borderColor: "#F3C3C3", background: "var(--red-100)", color: "#902323" }}><strong>Driver data could not be loaded.</strong><br />{message}<br /><button className="btn-secondary" style={{ marginTop: 10 }} onClick={onRetry}>Try again</button></div>;
}

export default function MyTripPage() {
  const { activeOrg } = useWorkspace(); const { user } = useAuth();
  const [driver, setDriver] = useState<Driver | null>(null); const [trips, setTrips] = useState<Trip[]>([]); const [selectedTripId, setSelectedTripId] = useState<string | null>(null); const [message, setMessage] = useState<string | null>(null); const [loading, setLoading] = useState(false); const [actionBusy, setActionBusy] = useState(false); const [online, setOnline] = useState(true);
  useEffect(() => { setOnline(navigator.onLine); const on=()=>setOnline(true); const off=()=>setOnline(false); window.addEventListener("online",on); window.addEventListener("offline",off); return()=>{window.removeEventListener("online",on);window.removeEventListener("offline",off)}; }, []);
  useEffect(() => { if (!activeOrg || !user) return; let alive=true; setLoading(true); setMessage(null); Promise.all([driversRepo.list(activeOrg.id,{environment:"LIVE"}),tripsRepo.list(activeOrg.id,{environment:"LIVE"})]).then(([ds,ts])=>{if(!alive)return; const linked=ds.find(d=>d.linkedUid===user.uid)??null; const assigned=linked?ts.filter(t=>t.driverId===linked.id&&t.status!=="completed"):[]; setDriver(linked);setTrips(assigned);setSelectedTripId(c=>c&&assigned.some(t=>t.id===c)?c:assigned[0]?.id??null)}).catch(e=>alive&&setMessage(e instanceof Error?e.message:"Unable to load your trip.")).finally(()=>alive&&setLoading(false)); return()=>{alive=false}; },[activeOrg,user]);
  const trip=useMemo(()=>trips.find(t=>t.id===selectedTripId)??trips.find(t=>t.status!=="exception")??trips[0]??null,[selectedTripId,trips]);
  const next=trip?FLOW[FLOW.indexOf(trip.status)+1]:undefined; const nextAction=trip?ACTIONS[trip.status]:null;
  const advance=async()=>{
    if(!activeOrg||!user||!trip||!next||actionBusy)return;
    setMessage(null); setActionBusy(true);
    try{
      const payload={orgId:activeOrg.id,tripId:trip.id,status:next};
      if(!navigator.onLine){
        await enqueueDriverAction({orgId:activeOrg.id,endpoint:"/api/driver/trip-status",payload});
        setOnline(false);
        setTrips(c=>c.map(i=>i.id===trip.id?{...i,status:next}:i));
        setMessage("Saved offline. This trip status will sync automatically when the connection returns.");
        return;
      }
      const token=await user.getIdToken();
      const r=await fetch("/api/driver/trip-status",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify(payload)});
      const d=await r.json();if(!r.ok)throw new Error(d.error??"Trip update failed.");
      if(d.status==="completed"){setTrips(c=>c.filter(i=>i.id!==trip.id));setSelectedTripId(c=>c===trip.id?null:c);setMessage("Trip completed successfully")}else{setTrips(c=>c.map(i=>i.id===trip.id?{...i,status:d.status}:i));setMessage(`Trip updated to ${LABELS[d.status as TripStatus]}.`)}
    }catch(e){setMessage(e instanceof Error?e.message:"Trip update failed.")}finally{setActionBusy(false)}
  };
  if(!activeOrg)return null;
  if(!driver)return <div className="space-y-6"><header className="page-header"><div><h1 className="page-title">My Trip</h1><p className="page-subtitle">Your driver workspace on Translend.</p></div><span className="badge">DRIVER APP</span></header>{!online&&<div className="notice">Offline — saved driver actions will sync when you reconnect.</div>}{loading&&<div className="notice blue">Loading your driver profile…</div>}{message&&<ErrorNotice message={message} onRetry={()=>window.location.reload()}/>} {!loading&&!message&&<div className="notice blue">Your account is signed in, but it is not linked to a Translend driver record yet. Ask the fleet manager to link your driver profile.</div>}</div>;
  if(!trip)return <div className="space-y-6"><header className="page-header"><div><h1 className="page-title">My Trip</h1><p className="page-subtitle">Your assigned movements and next action.</p></div><span className="badge green">READY</span></header>{!online&&<div className="notice">Offline — saved driver actions will sync when you reconnect.</div>}{message&&<ErrorNotice message={message} onRetry={()=>window.location.reload()}/>} {!message&&<div className="panel"><h2 className="section-title">No active trip</h2><p className="section-sub">You are linked as {driver.fullName}. When dispatch assigns you a live trip, it will appear here.</p></div>}</div>;
  return <div className="space-y-6"><header className="page-header"><div><h1 className="page-title">My Trip</h1><p className="page-subtitle">Your next action, delivery, vehicle condition and tools in one driver-first view.</p></div><span className="badge green">{LABELS[trip.status]}</span></header>
    {!online&&<div className="notice" style={{borderColor:"#E6B94A",background:"#FFF8E1"}}><strong>Offline.</strong> Driver trip changes are saved locally and will sync when the connection returns.</div>}{message&&<div className="notice blue">{message}</div>}
    {trips.length>1&&<section className="panel"><div className="section-header"><div><h2 className="section-title">Today&apos;s assigned trips</h2><p className="section-sub">Select a trip to work on it.</p></div></div><div className="space-y-2">{trips.map(item=><button key={item.id} type="button" className="w-full text-left rounded-xl border p-3" style={{borderColor:item.id===trip.id?"var(--blue-500)":"var(--border)",background:item.id===trip.id?"var(--blue-50)":"var(--surface)"}} onClick={()=>setSelectedTripId(item.id)}><div className="flex items-center justify-between gap-3"><strong>{item.jobNumber}</strong><span className="badge">{LABELS[item.status]}</span></div><div className="text-sm opacity-70">{item.truckRegistration} · {item.currentLocation??"Assigned route"}</div></button>)}</div></section>}
    <section className="panel"><div className="section-header"><div><h2 className="section-title">{trip.jobNumber}</h2><p className="section-sub">Truck {trip.truckRegistration} · {trip.driverName}</p></div><span className="badge">{nextAction??LABELS[trip.status]}</span></div><div className="kpi-grid"><div className="kpi-card"><div className="kpi-label">Next action</div><div className="kpi-value" style={{fontSize:18}}>{nextAction??"Trip complete"}</div><div className="kpi-sub">Record the milestone only when it has happened.</div></div><div className="kpi-card"><div className="kpi-label">Current location</div><div className="kpi-value" style={{fontSize:18}}>{trip.currentLocation??"Assigned route"}</div><div className="kpi-sub">Live trip field</div></div><div className="kpi-card"><div className="kpi-label">Trip status</div><div className="kpi-value" style={{fontSize:18}}>{LABELS[trip.status]}</div><div className="kpi-sub">Live operational state</div></div></div>{next&&<button className="btn-primary" onClick={advance} disabled={actionBusy}>{actionBusy?"Saving…":`${nextAction} →`}</button>}</section>
    <LocationCapturePanel orgId={activeOrg.id} truckId={trip.truckId} tripId={trip.id}/><DriverDeliveryPanel orgId={activeOrg.id} tripId={trip.id}/><DriverVehiclePanel orgId={activeOrg.id} truckId={trip.truckId}/>
    <section className="panel"><div className="section-header"><div><h2 className="section-title">Vehicle tools</h2><p className="section-sub">Open the existing fuel/workshop workflow with this truck and trip pre-filled.</p></div><Link className="btn-secondary" href={`/${activeOrg.id}/fuel-workshop?truckId=${encodeURIComponent(trip.truckId)}&tripId=${encodeURIComponent(trip.id)}`}>Fuel & workshop</Link></div></section>
    <div className="notice blue">Location capture requires explicit permission and the app must remain active for browser GPS capture. Background location tracking is not claimed.</div>
  </div>;
}
