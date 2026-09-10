'use client'

import { useEffect, useState } from 'react'
import styles from './translend-shell.module.css'
import { BusinessCollection, BusinessRecord, getBusinessRecords } from '@/lib/translend/business'

function isPostedInvoice(row: BusinessRecord) {
  return ['issued', 'paid', 'overdue'].includes(String(row.status ?? ''))
}

function isPostedExpense(row: BusinessRecord) {
  return ['approved', 'paid'].includes(String(row.status ?? ''))
}

export default function TranslendIntelligence({ kind, organizationId }: { kind: 'profitability' | 'operationalPnl'; organizationId: string }) {
  const [rows, setRows] = useState<BusinessRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    async function load() {
      setLoading(true)
      setError('')
      try {
        const names: BusinessCollection[] = ['jobs', 'trips', 'deliveries', 'invoices', 'fuel', 'maintenance', 'tyres', 'expenses']
        const all = await Promise.all(names.map((name) => getBusinessRecords(organizationId, name)))
        if (!live) return
        const [jobs, trips, deliveries, invoices, fuel, maintenance, tyres, expenses] = all
        const postedInvoices = invoices.filter(isPostedInvoice)
        const postedExpenses = expenses.filter(isPostedExpense)
        const revenue = postedInvoices.reduce((sum, row) => sum + Number(row.amount || 0), 0)
        const fuelCost = fuel.reduce((sum, row) => sum + Number(row.cost || 0), 0)
        const maintenanceCost = maintenance.reduce((sum, row) => sum + Number(row.cost || 0), 0)
        const tyreCost = tyres.reduce((sum, row) => sum + Number(row.cost || 0), 0)
        const expenseCost = postedExpenses.reduce((sum, row) => sum + Number(row.amount || 0), 0)
        const costs = fuelCost + maintenanceCost + tyreCost + expenseCost
        const profit = revenue - costs
        const margin = revenue ? profit / revenue * 100 : 0

        setRows(kind === 'profitability'
          ? [{ id: 'derived', jobCount: jobs.length, tripCount: trips.length, deliveryCount: deliveries.length, revenue, costs, profit, margin } as BusinessRecord]
          : [{ id: 'derived', jobs: jobs.length, trips: trips.length, deliveries: deliveries.length, revenue, fuel: fuelCost, maintenance: maintenanceCost, tyres: tyreCost, expenses: expenseCost, net: profit } as BusinessRecord])
      } catch (err) {
        if (live) setError(err instanceof Error ? err.message : 'Unable to calculate intelligence.')
      } finally {
        if (live) setLoading(false)
      }
    }
    void load()
    return () => { live = false }
  }, [kind, organizationId])

  const row = rows[0] || {}
  const metrics = kind === 'profitability'
    ? [['Jobs', row.jobCount], ['Revenue', row.revenue], ['Costs', row.costs], ['Profit', row.profit], ['Margin', `${Number(row.margin || 0).toFixed(1)}%`]]
    : [['Jobs', row.jobs], ['Trips', row.trips], ['Deliveries', row.deliveries], ['Revenue', row.revenue], ['Fuel', row.fuel], ['Maintenance', row.maintenance], ['Tyres', row.tyres], ['Expenses', row.expenses], ['Net', row.net]]

  return <section className={styles.panel}>
    <div className={styles.panelHeader}>
      <div>
        <span className={styles.panelEyebrow}>Derived from live records</span>
        <h2>{kind === 'profitability' ? 'Profitability' : 'Operational P&L'}</h2>
        <p style={{ marginTop: 5, color: '#718188', fontSize: 11 }}>Read-only intelligence calculated from the organization's operational, cost and commercial collections. Draft and void invoices are excluded from revenue; draft expenses are excluded from costs.</p>
      </div>
    </div>
    {error && <div style={{ margin: '0 18px 14px', padding: 10, color: '#9b3030', background: '#fff1f1' }}>{error}</div>}
    {loading ? <div style={{ padding: 32, textAlign: 'center' }}>Calculating from live records…</div> : <div className={styles.kpiGrid} style={{ padding: 18 }}>{metrics.map(([label, value]) => <article className={styles.kpiCard} key={String(label)}><span className={styles.kpiLabel}>{label}</span><strong className={styles.kpiValue}>{typeof value === 'number' ? value.toLocaleString() : String(value ?? 0)}</strong></article>)}</div>}
  </section>
}
