'use client'

import { useEffect, useState } from 'react'
import styles from './translend-shell.module.css'
import { BusinessRecord, getBusinessRecords } from '@/lib/translend/business'

function isPostedInvoice(row: BusinessRecord) {
  return ['issued', 'paid', 'overdue'].includes(String(row.status ?? ''))
}

function isActiveJob(row: BusinessRecord) {
  return !['delivered', 'cancelled'].includes(String(row.status ?? ''))
}

export default function TranslendControlTower({ organizationId, onOpen }: { organizationId: string; onOpen: (module: any) => void }) {
  const [data, setData] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    setLoading(true)
    Promise.all(['jobs', 'trips', 'deliveries', 'invoices', 'fuel', 'maintenance', 'tyres', 'expenses'].map((name) => getBusinessRecords(organizationId, name as any)))
      .then((all) => {
        if (!live) return
        const [jobs, trips, deliveries, invoices, fuel, maintenance, tyres, expenses] = all
        const sum = (rows: BusinessRecord[], key: string) => rows.reduce((total, row) => total + Number(row[key] || 0), 0)
        const postedInvoices = invoices.filter(isPostedInvoice)
        const activeJobs = jobs.filter(isActiveJob)
        setData({
          jobs: activeJobs.length,
          trips: trips.length,
          deliveries: deliveries.length,
          revenue: sum(postedInvoices, 'amount'),
          costs: sum(fuel, 'cost') + sum(maintenance, 'cost') + sum(tyres, 'cost') + expenses.filter((row) => ['approved', 'paid'].includes(String(row.status ?? ''))).reduce((total, row) => total + Number(row.amount || 0), 0),
        })
      })
      .catch((nextError) => { if (live) setError(nextError instanceof Error ? nextError.message : 'Unable to load Control Tower.') })
      .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [organizationId])

  const profit = (data.revenue || 0) - (data.costs || 0)

  return <>
    <section className={styles.pageHeader}>
      <div><span className={styles.eyebrow}>Control Tower</span><h1>Operational command.</h1><p>Live metrics derived from the company's Firestore business records. No seeded or static operational figures are used.</p></div>
      <div className={styles.headerActions}><button className={styles.secondaryButton} onClick={() => onOpen('Jobs')}>Jobs</button><button className={styles.primaryButton} onClick={() => onOpen('Exceptions')}>Exceptions</button></div>
    </section>
    {error && <div style={{ padding: 12, color: '#9b3030' }}>{error}</div>}
    {loading ? <div className={styles.panel} style={{ padding: 34, textAlign: 'center', color: '#718188' }}>Loading live operational metrics…</div> : <>
      <section className={styles.kpiGrid}>{[['Active jobs', data.jobs || 0], ['Trips', data.trips || 0], ['Deliveries', data.deliveries || 0], ['Revenue', data.revenue || 0], ['Operating cost', data.costs || 0], ['Net contribution', profit]].map(([label, value]) => <article className={styles.kpiCard} key={String(label)}><span className={styles.kpiLabel}>{label}</span><strong className={styles.kpiValue}>{typeof value === 'number' ? value.toLocaleString() : value}</strong><span className={styles.kpiNote}>Derived from real records</span></article>)}</section>
      <section className={styles.dashboardGrid}><article className={styles.panel}><div className={styles.panelHeader}><div><span className={styles.panelEyebrow}>Workflow</span><h2>Customer → Job → Trip → Delivery → Billing</h2></div></div><div className={styles.movementRows}><Movement label="Active jobs" value={String(data.jobs || 0)} /><Movement label="Trips" value={String(data.trips || 0)} /><Movement label="Deliveries" value={String(data.deliveries || 0)} /><Movement label="Posted invoice revenue" value={String(data.revenue || 0)} /></div></article><article className={styles.panel}><div className={styles.panelHeader}><div><span className={styles.panelEyebrow}>Financial signal</span><h2>Revenue versus cost</h2></div></div><div className={styles.tableWrap}><div style={{ padding: 28, textAlign: 'center' }}><strong style={{ fontSize: 28 }}>{profit.toLocaleString()}</strong><p style={{ color: '#718188' }}>Current net contribution from posted invoices less recorded operating costs.</p></div></div></article></section>
    </>}
  </>
}

function Movement({ label, value }: { label: string; value: string }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #edf2f3', fontSize: 12 }}><span>{label}</span><strong>{value}</strong></div>
}
