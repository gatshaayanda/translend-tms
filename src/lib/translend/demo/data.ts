export type JobStatus = 'Scheduled' | 'Dispatched' | 'In transit' | 'Delivered' | 'Attention'

export type DemoJob = {
  id: string
  customer: string
  route: string
  truck: string
  driver: string
  status: JobStatus
  updated: string
  amount: number
  issue?: string
}

export const demoJobs: DemoJob[] = [
  { id: 'JOB-1044', customer: 'Metsi Materials', route: 'Gaborone → Palapye', truck: 'TRK-021', driver: 'K. Molefe', status: 'In transit', updated: '4 min ago', amount: 18400 },
  { id: 'JOB-1043', customer: 'Kalahari Aggregates', route: 'Lobatse → Gaborone', truck: 'TRK-014', driver: 'T. Baebele', status: 'Delivered', updated: '18 min ago', amount: 12600 },
  { id: 'JOB-1042', customer: 'Delta Build', route: 'Tlokweng → Molepolole', truck: 'TRK-009', driver: 'B. Kgosi', status: 'Attention', updated: '42 min ago', amount: 9800, issue: 'Proof of delivery missing' },
  { id: 'JOB-1041', customer: 'Metsi Materials', route: 'Gaborone → Francistown', truck: 'TRK-018', driver: 'M. Dube', status: 'Attention', updated: '1 hr ago', amount: 21200, issue: 'Vehicle inspection due' },
  { id: 'JOB-1040', customer: 'Northstar Retail', route: 'Gaborone → Kanye', truck: 'TRK-006', driver: 'P. Rantao', status: 'Scheduled', updated: '2 hrs ago', amount: 7400 },
]

export const demoTrucks = [
  { id: 'TRK-021', status: 'On road', driver: 'K. Molefe', location: 'A1 northbound' },
  { id: 'TRK-018', status: 'Attention', driver: 'M. Dube', location: 'Gaborone depot' },
  { id: 'TRK-014', status: 'Available', driver: 'T. Baebele', location: 'Gaborone depot' },
  { id: 'TRK-009', status: 'On road', driver: 'B. Kgosi', location: 'Molepolole' },
]

export const demoCustomers = [
  { name: 'Metsi Materials', activeJobs: 7, balance: 38600 },
  { name: 'Kalahari Aggregates', activeJobs: 4, balance: 21400 },
  { name: 'Delta Build', activeJobs: 3, balance: 9800 },
  { name: 'Northstar Retail', activeJobs: 2, balance: 7400 },
]
