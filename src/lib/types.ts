// Canonical Data Model — field names match data-model.md exactly.
// Do NOT introduce synonyms (e.g. never use stock_count for qty_on_hand).

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  tags: string[]; // e.g. "VIP", "Fleet"
  created_at: string;
}

export interface Vehicle {
  id: string;
  customer_id: string; // FK -> Customer
  vin: string;
  make: string;
  model: string;
  year: number;
  plate: string;
  mileage: number;
  next_service_mileage?: number | null; // Next service/inspection target mileage (km)
  color: string;
  engine_type: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_info: string;
  lead_time_days: number;
}

export interface Part {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  supplier_id: string; // FK -> Supplier
  cost_price: number;
  sale_price: number;
  qty_on_hand: number;
  reorder_threshold: number;
  location: string; // bin/location (optional)
}

export interface StockMovement {
  id: string;
  part_id: string; // FK -> Part
  qty_delta: number;
  reason: 'received' | 'used_on_job' | 'adjusted' | 'returned';
  work_order_id: string | null; // FK -> WorkOrder, nullable
  created_at: string;
  created_by: string; // FK -> User
}

export type WorkOrderStatus =
  | 'Estimate'
  | 'Approved'
  | 'In Progress'
  | 'Waiting on Parts'
  | 'QA/Complete'
  | 'Invoiced'
  | 'Closed';

export interface LaborLine {
  id: string;
  work_order_id: string; // FK -> WorkOrder
  description: string;
  hours: number;
  rate: number;
}

export interface PartLine {
  id: string;
  work_order_id: string; // FK -> WorkOrder
  part_id: string; // FK -> Part
  qty: number;
  unit_price: number;
}

export interface Lift {
  id: string; // e.g. 'lift-1', 'lift-2', 'lift-3'
  name: string; // e.g. 'Elevador 1 (2 Colunas)'
  status: 'Available' | 'Occupied' | 'Maintenance';
  type: string; // e.g. '2-Post Lift', '4-Post Alignment', 'Scissor Lift'
  max_weight_kg: number;
  current_work_order_id?: string | null;
}

export interface WorkOrder {
  id: string;
  customer_id: string; // FK -> Customer
  vehicle_id: string; // FK -> Vehicle
  status: WorkOrderStatus;
  created_at: string;
  assigned_technician_id: string; // FK -> User
  lift_id?: string | null; // FK -> Lift (optional)
  scheduled_start?: string | null; // ISO datetime
  scheduled_end?: string | null; // ISO datetime
  estimated_hours?: number;
  internal_notes: string;
  customer_notes: string;
  labor_lines: LaborLine[];
  part_lines: PartLine[];
}

export type InvoiceStatus = 'Unpaid' | 'Partial' | 'Paid';

export interface Payment {
  id: string;
  invoice_id: string; // FK -> Invoice
  amount: number;
  method: string;
  paid_at: string;
}

export interface Invoice {
  id: string;
  work_order_id: string; // FK -> WorkOrder
  subtotal: number;
  tax: number;
  total: number;
  status: InvoiceStatus;
  paid_amount: number;
  due_date: string;
  payments: Payment[];
  created_at: string;
}

export type UserRole = 'Admin' | 'Service Advisor' | 'Technician';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  hourly_rate: number | null; // technicians only
}

// Status pipeline order — use for Kanban column ordering & validation
export const WORK_ORDER_STATUSES: WorkOrderStatus[] = [
  'Estimate',
  'Approved',
  'In Progress',
  'Waiting on Parts',
  'QA/Complete',
  'Invoiced',
  'Closed',
];
