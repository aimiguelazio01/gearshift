import {
  Customer, Vehicle, Part, Supplier, WorkOrder, LaborLine, PartLine,
  StockMovement, Invoice, Payment, User, WorkOrderStatus, InvoiceStatus, Lift,
  WorkshopSettings,
} from './types';
import { generateId, daysFromNow, slugify } from './utils';

// ── localStorage keys ──
const KEYS = {
  customers: 'workshop_customers',
  vehicles: 'workshop_vehicles',
  parts: 'workshop_parts',
  suppliers: 'workshop_suppliers',
  workOrders: 'workshop_work_orders',
  stockMovements: 'workshop_stock_movements',
  invoices: 'workshop_invoices',
  users: 'workshop_users',
  lifts: 'workshop_lifts',
  settings: 'workshop_settings',
  seeded: 'workshop_seeded',
} as const;

export const settings = {
  get: (): WorkshopSettings => {
    if (typeof window === 'undefined') return { publicBaseUrl: 'https://gearshift1.vercel.app', nfcStudioUrl: 'http://localhost:3001' };
    const raw = localStorage.getItem(KEYS.settings);
    if (raw) {
      try {
        const p = JSON.parse(raw);
        return {
          publicBaseUrl: p.publicBaseUrl || 'https://gearshift1.vercel.app',
          nfcStudioUrl: p.nfcStudioUrl || 'http://localhost:3001',
        };
      } catch {}
    }
    return { publicBaseUrl: 'https://gearshift1.vercel.app', nfcStudioUrl: 'http://localhost:3001' };
  },
  update: (newSettings: Partial<WorkshopSettings>): WorkshopSettings => {
    const current = settings.get();
    const updated = { ...current, ...newSettings };
    if (typeof window !== 'undefined') {
      localStorage.setItem(KEYS.settings, JSON.stringify(updated));
    }
    return updated;
  },
};

// ── Generic CRUD helpers ──
function getAll<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}

function saveAll<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items));
}

function getById<T extends { id: string }>(key: string, id: string): T | undefined {
  return getAll<T>(key).find((item) => item.id === id);
}

function create<T extends { id: string }>(key: string, item: T): T {
  const items = getAll<T>(key);
  items.push(item);
  saveAll(key, items);
  return item;
}

function update<T extends { id: string }>(key: string, id: string, updates: Partial<T>): T | undefined {
  const items = getAll<T>(key);
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return undefined;
  items[idx] = { ...items[idx], ...updates };
  saveAll(key, items);
  return items[idx];
}

function remove<T extends { id: string }>(key: string, id: string): boolean {
  const items = getAll<T>(key);
  const filtered = items.filter((i) => i.id !== id);
  if (filtered.length === items.length) return false;
  saveAll(key, filtered);
  return true;
}

// ══════════════════════════════════════════════
// PUBLIC API — Customers
// ══════════════════════════════════════════════
export const customers = {
  getAll: () => getAll<Customer>(KEYS.customers),
  getById: (id: string) => getById<Customer>(KEYS.customers, id),
  getBySlug: (slug: string) =>
    getAll<Customer>(KEYS.customers).find((c) => slugify(c.name) === slug),
  getByIdOrSlug: (idOrSlug: string) =>
    getById<Customer>(KEYS.customers, idOrSlug) ||
    getAll<Customer>(KEYS.customers).find((c) => slugify(c.name) === idOrSlug),
  create: (data: Omit<Customer, 'id' | 'created_at'>): Customer =>
    create(KEYS.customers, { ...data, id: generateId(), created_at: new Date().toISOString() } as Customer),
  update: (id: string, data: Partial<Customer>) => update<Customer>(KEYS.customers, id, data),
  delete: (id: string) => remove<Customer>(KEYS.customers, id),
};

// ══════════════════════════════════════════════
// PUBLIC API — Vehicles
// ══════════════════════════════════════════════
export const vehicles = {
  getAll: () => getAll<Vehicle>(KEYS.vehicles),
  getById: (id: string) => getById<Vehicle>(KEYS.vehicles, id),
  getByCustomer: (customerId: string) =>
    getAll<Vehicle>(KEYS.vehicles).filter((v) => v.customer_id === customerId),
  create: (data: Omit<Vehicle, 'id' | 'created_at'>): Vehicle =>
    create(KEYS.vehicles, { ...data, id: generateId(), created_at: new Date().toISOString() } as Vehicle),
  update: (id: string, data: Partial<Vehicle>) => update<Vehicle>(KEYS.vehicles, id, data),
  delete: (id: string) => remove<Vehicle>(KEYS.vehicles, id),
};

// ══════════════════════════════════════════════
// PUBLIC API — Suppliers
// ══════════════════════════════════════════════
export const suppliers = {
  getAll: () => getAll<Supplier>(KEYS.suppliers),
  getById: (id: string) => getById<Supplier>(KEYS.suppliers, id),
  create: (data: Omit<Supplier, 'id'>): Supplier =>
    create(KEYS.suppliers, { ...data, id: generateId() } as Supplier),
  update: (id: string, data: Partial<Supplier>) => update<Supplier>(KEYS.suppliers, id, data),
  delete: (id: string) => remove<Supplier>(KEYS.suppliers, id),
};

// ══════════════════════════════════════════════
// PUBLIC API — Parts & Inventory
// ══════════════════════════════════════════════
export const parts = {
  getAll: () => getAll<Part>(KEYS.parts),
  getById: (id: string) => getById<Part>(KEYS.parts, id),
  getLowStock: () => getAll<Part>(KEYS.parts).filter((p) => p.qty_on_hand <= p.reorder_threshold),
  create: (data: Omit<Part, 'id'>): Part =>
    create(KEYS.parts, { ...data, id: generateId() } as Part),
  update: (id: string, data: Partial<Part>) => update<Part>(KEYS.parts, id, data),
  delete: (id: string) => remove<Part>(KEYS.parts, id),
  adjustStock: (partId: string, qtyDelta: number, reason: StockMovement['reason'], workOrderId: string | null = null) => {
    const part = getById<Part>(KEYS.parts, partId);
    if (!part) return;
    update<Part>(KEYS.parts, partId, { qty_on_hand: part.qty_on_hand + qtyDelta });
    // Always log a StockMovement — never adjust stock silently
    stockMovements.create({
      part_id: partId,
      qty_delta: qtyDelta,
      reason,
      work_order_id: workOrderId,
      created_by: 'admin',
    });
  },
};

// ══════════════════════════════════════════════
// PUBLIC API — Stock Movements
// ══════════════════════════════════════════════
export const stockMovements = {
  getAll: () => getAll<StockMovement>(KEYS.stockMovements),
  getByPart: (partId: string) =>
    getAll<StockMovement>(KEYS.stockMovements).filter((m) => m.part_id === partId),
  create: (data: Omit<StockMovement, 'id' | 'created_at'>): StockMovement =>
    create(KEYS.stockMovements, { ...data, id: generateId(), created_at: new Date().toISOString() } as StockMovement),
};

// ══════════════════════════════════════════════
// PUBLIC API — Work Orders
// ══════════════════════════════════════════════
export const workOrders = {
  getAll: () => getAll<WorkOrder>(KEYS.workOrders),
  getById: (id: string) => getById<WorkOrder>(KEYS.workOrders, id),
  getByVehicle: (vehicleId: string) =>
    getAll<WorkOrder>(KEYS.workOrders).filter((wo) => wo.vehicle_id === vehicleId),
  getByStatus: (status: WorkOrderStatus) =>
    getAll<WorkOrder>(KEYS.workOrders).filter((wo) => wo.status === status),
  create: (data: Omit<WorkOrder, 'id' | 'created_at' | 'labor_lines' | 'part_lines'>): WorkOrder =>
    create(KEYS.workOrders, {
      ...data,
      id: generateId(),
      created_at: new Date().toISOString(),
      labor_lines: [],
      part_lines: [],
    } as WorkOrder),
  update: (id: string, data: Partial<WorkOrder>) => update<WorkOrder>(KEYS.workOrders, id, data),
  delete: (id: string) => remove<WorkOrder>(KEYS.workOrders, id),

  addLaborLine: (workOrderId: string, line: Omit<LaborLine, 'id' | 'work_order_id'>): LaborLine | undefined => {
    const wo = getById<WorkOrder>(KEYS.workOrders, workOrderId);
    if (!wo) return undefined;
    const newLine: LaborLine = { ...line, id: generateId(), work_order_id: workOrderId };
    wo.labor_lines.push(newLine);
    update<WorkOrder>(KEYS.workOrders, workOrderId, { labor_lines: wo.labor_lines });
    return newLine;
  },

  removeLaborLine: (workOrderId: string, lineId: string) => {
    const wo = getById<WorkOrder>(KEYS.workOrders, workOrderId);
    if (!wo) return;
    wo.labor_lines = wo.labor_lines.filter((l) => l.id !== lineId);
    update<WorkOrder>(KEYS.workOrders, workOrderId, { labor_lines: wo.labor_lines });
  },

  addPartLine: (workOrderId: string, line: Omit<PartLine, 'id' | 'work_order_id'>): PartLine | undefined => {
    const wo = getById<WorkOrder>(KEYS.workOrders, workOrderId);
    if (!wo) return undefined;
    const newLine: PartLine = { ...line, id: generateId(), work_order_id: workOrderId };
    wo.part_lines.push(newLine);
    update<WorkOrder>(KEYS.workOrders, workOrderId, { part_lines: wo.part_lines });
    // Deduct from inventory and log StockMovement (reason = used_on_job)
    parts.adjustStock(line.part_id, -line.qty, 'used_on_job', workOrderId);
    return newLine;
  },

  removePartLine: (workOrderId: string, lineId: string) => {
    const wo = getById<WorkOrder>(KEYS.workOrders, workOrderId);
    if (!wo) return;
    const line = wo.part_lines.find((l) => l.id === lineId);
    if (line) {
      // Return stock
      parts.adjustStock(line.part_id, line.qty, 'returned', workOrderId);
    }
    wo.part_lines = wo.part_lines.filter((l) => l.id !== lineId);
    update<WorkOrder>(KEYS.workOrders, workOrderId, { part_lines: wo.part_lines });
  },

  getTotal: (wo: WorkOrder): { labor: number; parts: number; subtotal: number } => {
    const laborLines = wo.labor_lines || [];
    const partLines = wo.part_lines || [];
    const labor = laborLines.reduce((sum, l) => sum + l.hours * l.rate, 0);
    const partsCost = partLines.reduce((sum, l) => sum + l.qty * l.unit_price, 0);
    return { labor, parts: partsCost, subtotal: labor + partsCost };
  },
};

// ══════════════════════════════════════════════
// PUBLIC API — Invoices
// ══════════════════════════════════════════════
export const invoices = {
  getAll: () => getAll<Invoice>(KEYS.invoices),
  getById: (id: string) => getById<Invoice>(KEYS.invoices, id),
  getByWorkOrder: (workOrderId: string) =>
    getAll<Invoice>(KEYS.invoices).find((inv) => inv.work_order_id === workOrderId),
  getOverdue: () =>
    getAll<Invoice>(KEYS.invoices).filter(
      (inv) => inv.status !== 'Paid' && new Date(inv.due_date) < new Date()
    ),

  generateFromWorkOrder: (workOrderId: string, taxRate: number = 0.1): Invoice | undefined => {
    const wo = getById<WorkOrder>(KEYS.workOrders, workOrderId);
    if (!wo) return undefined;
    const totals = workOrders.getTotal(wo);
    const tax = totals.subtotal * taxRate;
    const invoice: Invoice = {
      id: generateId(),
      work_order_id: workOrderId,
      subtotal: totals.subtotal,
      tax,
      total: totals.subtotal + tax,
      status: 'Unpaid',
      paid_amount: 0,
      due_date: daysFromNow(30),
      payments: [],
      created_at: new Date().toISOString(),
    };
    create(KEYS.invoices, invoice);
    // Update work order status to Invoiced
    workOrders.update(workOrderId, { status: 'Invoiced' });
    return invoice;
  },

  addPayment: (invoiceId: string, amount: number, method: string): Payment | undefined => {
    const inv = getById<Invoice>(KEYS.invoices, invoiceId);
    if (!inv) return undefined;
    const payment: Payment = {
      id: generateId(),
      invoice_id: invoiceId,
      amount,
      method,
      paid_at: new Date().toISOString(),
    };
    const newPaidAmount = inv.paid_amount + amount;
    let newStatus: InvoiceStatus = 'Partial';
    if (newPaidAmount >= inv.total) newStatus = 'Paid';
    else if (newPaidAmount === 0) newStatus = 'Unpaid';
    inv.payments.push(payment);
    update<Invoice>(KEYS.invoices, invoiceId, {
      payments: inv.payments,
      paid_amount: newPaidAmount,
      status: newStatus,
    });
    return payment;
  },

  update: (id: string, data: Partial<Invoice>) => update<Invoice>(KEYS.invoices, id, data),
};

// ══════════════════════════════════════════════
// PUBLIC API — Users / Staff
// ══════════════════════════════════════════════
export const users = {
  getAll: () => getAll<User>(KEYS.users),
  getById: (id: string) => getById<User>(KEYS.users, id),
  getTechnicians: () => getAll<User>(KEYS.users).filter((u) => u.role === 'Technician'),
};

// ══════════════════════════════════════════════
// PUBLIC API — Car Lifts / Bays
// ══════════════════════════════════════════════
const DEFAULT_LIFTS: Lift[] = [
  { id: 'lift-1', name: 'Elevador 1 (2 Colunas)', type: '2-Post Lift (4.0T)', max_weight_kg: 4000, status: 'Occupied', current_work_order_id: 'wo1' },
  { id: 'lift-2', name: 'Elevador 2 (Tesoura)', type: 'Scissor Lift (3.5T)', max_weight_kg: 3500, status: 'Available', current_work_order_id: null },
  { id: 'lift-3', name: 'Elevador 3 (4 Colunas - Alinhamento)', type: '4-Post Alignment (5.0T)', max_weight_kg: 5000, status: 'Occupied', current_work_order_id: 'wo3' },
];

export const lifts = {
  getAll: (): Lift[] => {
    const list = getAll<Lift>(KEYS.lifts);
    if (!list || list.length === 0) {
      saveAll(KEYS.lifts, DEFAULT_LIFTS);
      return DEFAULT_LIFTS;
    }
    return list;
  },
  getById: (id: string) => lifts.getAll().find((item) => item.id === id),
  create: (lift: Omit<Lift, 'id'>) => create<Lift>(KEYS.lifts, { ...lift, id: generateId() }),
  update: (id: string, data: Partial<Lift>) => update<Lift>(KEYS.lifts, id, data),
  delete: (id: string) => remove<Lift>(KEYS.lifts, id),
  assignWorkOrder: (liftId: string, workOrderId: string | null) => {
    const lift = lifts.getById(liftId);
    if (!lift) return;
    // Unassign previous WO from this lift if any
    const allWOs = getAll<WorkOrder>(KEYS.workOrders);
    allWOs.forEach(wo => {
      if (wo.lift_id === liftId && wo.id !== workOrderId) {
        update<WorkOrder>(KEYS.workOrders, wo.id, { lift_id: null });
      }
    });
    update<Lift>(KEYS.lifts, liftId, {
      status: workOrderId ? 'Occupied' : 'Available',
      current_work_order_id: workOrderId,
    });
    if (workOrderId) {
      update<WorkOrder>(KEYS.workOrders, workOrderId, { lift_id: liftId });
    }
  },
};

// ══════════════════════════════════════════════
// SEED DATA — called once on first load
// ══════════════════════════════════════════════
export function seedIfNeeded(): void {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(KEYS.seeded)) return;

  // ── Users ──
  const usersList: User[] = [
    { id: 'u1', name: 'Carlos Admin', role: 'Admin', email: 'carlos@workshop.com', hourly_rate: null },
    { id: 'u2', name: 'Maria Santos', role: 'Service Advisor', email: 'maria@workshop.com', hourly_rate: null },
    { id: 'u3', name: 'Pedro Silva', role: 'Technician', email: 'pedro@workshop.com', hourly_rate: 75 },
    { id: 'u4', name: 'Ana Costa', role: 'Technician', email: 'ana@workshop.com', hourly_rate: 80 },
    { id: 'u5', name: 'Rui Oliveira', role: 'Technician', email: 'rui@workshop.com', hourly_rate: 70 },
  ];
  saveAll(KEYS.users, usersList);

  // ── Suppliers ──
  const suppliersList: Supplier[] = [
    { id: 's1', name: 'AutoParts Pro', contact_info: 'orders@autopartspro.com | +1-555-0100', lead_time_days: 3 },
    { id: 's2', name: 'BrakeMasters Inc.', contact_info: 'sales@brakemasters.com | +1-555-0200', lead_time_days: 5 },
    { id: 's3', name: 'FilterWorld', contact_info: 'supply@filterworld.com | +1-555-0300', lead_time_days: 2 },
  ];
  saveAll(KEYS.suppliers, suppliersList);

  // ── Parts ──
  const partsList: Part[] = [
    { id: 'p1', sku: 'BRK-PAD-001', name: 'Ceramic Brake Pads (Front)', description: 'Premium ceramic front brake pad set', category: 'Brakes', supplier_id: 's2', cost_price: 35, sale_price: 75, qty_on_hand: 24, reorder_threshold: 8, location: 'A1-02' },
    { id: 'p2', sku: 'BRK-ROT-001', name: 'Brake Rotor (Front)', description: 'Ventilated front brake rotor', category: 'Brakes', supplier_id: 's2', cost_price: 45, sale_price: 95, qty_on_hand: 12, reorder_threshold: 4, location: 'A1-03' },
    { id: 'p3', sku: 'FLT-OIL-001', name: 'Oil Filter', description: 'Standard spin-on oil filter', category: 'Filters', supplier_id: 's3', cost_price: 5, sale_price: 15, qty_on_hand: 50, reorder_threshold: 15, location: 'B2-01' },
    { id: 'p4', sku: 'FLT-AIR-001', name: 'Air Filter', description: 'Engine air filter element', category: 'Filters', supplier_id: 's3', cost_price: 8, sale_price: 22, qty_on_hand: 30, reorder_threshold: 10, location: 'B2-02' },
    { id: 'p5', sku: 'FLD-OIL-5W30', name: 'Synthetic Oil 5W-30 (5L)', description: 'Full synthetic engine oil 5W-30, 5 liter jug', category: 'Fluids & Lubricants', supplier_id: 's1', cost_price: 22, sale_price: 45, qty_on_hand: 18, reorder_threshold: 6, location: 'C1-01' },
    { id: 'p6', sku: 'ENG-SPK-001', name: 'Spark Plug (Iridium)', description: 'Long-life iridium spark plug', category: 'Engine', supplier_id: 's1', cost_price: 8, sale_price: 18, qty_on_hand: 40, reorder_threshold: 12, location: 'A3-01' },
    { id: 'p7', sku: 'SUS-STRUT-F', name: 'Front Strut Assembly', description: 'Complete front strut with spring', category: 'Suspension', supplier_id: 's1', cost_price: 120, sale_price: 250, qty_on_hand: 6, reorder_threshold: 2, location: 'D1-01' },
    { id: 'p8', sku: 'BLT-SERP-001', name: 'Serpentine Belt', description: 'Multi-rib serpentine drive belt', category: 'Belts & Hoses', supplier_id: 's1', cost_price: 18, sale_price: 42, qty_on_hand: 3, reorder_threshold: 4, location: 'B3-02' },
    { id: 'p9', sku: 'CLG-THERM-01', name: 'Thermostat', description: 'Engine coolant thermostat', category: 'Cooling', supplier_id: 's1', cost_price: 12, sale_price: 35, qty_on_hand: 8, reorder_threshold: 3, location: 'A2-04' },
    { id: 'p10', sku: 'ELC-BAT-001', name: 'Car Battery 12V 60Ah', description: 'Maintenance-free lead-acid battery', category: 'Electrical', supplier_id: 's1', cost_price: 80, sale_price: 160, qty_on_hand: 5, reorder_threshold: 2, location: 'D2-01' },
  ];
  saveAll(KEYS.parts, partsList);

  // ── Customers ──
  const customersList: Customer[] = [
    { id: 'c1', name: 'João Ferreira', phone: '+351 912 345 678', email: 'joao@email.com', address: 'Rua da Liberdade 42, Lisboa', notes: 'Preferred customer, always on time', tags: ['VIP'], created_at: '2024-01-15T10:00:00Z' },
    { id: 'c2', name: 'Sofia Mendes', phone: '+351 923 456 789', email: 'sofia@email.com', address: 'Av. República 128, Porto', notes: '', tags: [], created_at: '2024-03-20T14:30:00Z' },
    { id: 'c3', name: 'TransLogis Lda.', phone: '+351 934 567 890', email: 'fleet@translogis.pt', address: 'Zona Industrial Norte, Lote 5', notes: 'Fleet account — 12 vehicles', tags: ['Fleet'], created_at: '2024-02-10T09:00:00Z' },
    { id: 'c4', name: 'Miguel Almeida', phone: '+351 945 678 901', email: 'miguel.a@email.com', address: 'Travessa do Carmo 7, Coimbra', notes: 'Usually brings vehicle quarterly for service', tags: [], created_at: '2024-06-05T11:20:00Z' },
    { id: 'c5', name: 'Empresa ABC S.A.', phone: '+351 956 789 012', email: 'frota@empresaabc.pt', address: 'Parque Empresarial, Ed. 3', notes: 'Corporate fleet, monthly billing', tags: ['Fleet', 'VIP'], created_at: '2024-04-18T08:45:00Z' },
  ];
  saveAll(KEYS.customers, customersList);

  // ── Vehicles ──
  const vehiclesList: Vehicle[] = [
    { id: 'v1', customer_id: 'c1', vin: 'WVWZZZ3CZWE123456', make: 'Volkswagen', model: 'Golf', year: 2022, plate: 'AA-12-BB', mileage: 45000, next_service_mileage: 50000, color: 'White', engine_type: '1.5 TSI', created_at: '2024-01-15T10:05:00Z' },
    { id: 'v2', customer_id: 'c1', vin: 'WBAPH5C55BA237890', make: 'BMW', model: '320d', year: 2020, plate: 'CC-34-DD', mileage: 82000, next_service_mileage: 90000, color: 'Black', engine_type: '2.0 Diesel', created_at: '2024-01-15T10:10:00Z' },
    { id: 'v3', customer_id: 'c2', vin: 'VF1RFB00X56789012', make: 'Renault', model: 'Clio', year: 2021, plate: 'EE-56-FF', mileage: 38000, next_service_mileage: 40000, color: 'Red', engine_type: '1.0 TCe', created_at: '2024-03-20T14:35:00Z' },
    { id: 'v4', customer_id: 'c3', vin: 'WF0XXXGCDX1234567', make: 'Ford', model: 'Transit', year: 2023, plate: 'GG-78-HH', mileage: 120000, next_service_mileage: 125000, color: 'White', engine_type: '2.0 EcoBlue', created_at: '2024-02-10T09:05:00Z' },
    { id: 'v5', customer_id: 'c3', vin: 'JTDKN3DU5A0345678', make: 'Mercedes', model: 'Sprinter', year: 2022, plate: 'II-90-JJ', mileage: 95000, next_service_mileage: 93000, color: 'Silver', engine_type: '2.1 CDI', created_at: '2024-02-10T09:10:00Z' },
    { id: 'v6', customer_id: 'c4', vin: 'TMBJG7NE1J0456789', make: 'Skoda', model: 'Octavia', year: 2019, plate: 'KK-12-LL', mileage: 110000, next_service_mileage: 120000, color: 'Gray', engine_type: '1.6 TDI', created_at: '2024-06-05T11:25:00Z' },
  ];
  saveAll(KEYS.vehicles, vehiclesList);

  // ── Car Lifts (3 Elevadores) ──
  const liftsList: Lift[] = [
    { id: 'lift-1', name: 'Elevador 1 (2 Colunas)', type: '2-Post Lift (4.0T)', max_weight_kg: 4000, status: 'Occupied', current_work_order_id: 'wo1' },
    { id: 'lift-2', name: 'Elevador 2 (Tesoura)', type: 'Scissor Lift (3.5T)', max_weight_kg: 3500, status: 'Available', current_work_order_id: null },
    { id: 'lift-3', name: 'Elevador 3 (4 Colunas - Alinhamento)', type: '4-Post Alignment (5.0T)', max_weight_kg: 5000, status: 'Occupied', current_work_order_id: 'wo3' },
  ];
  saveAll(KEYS.lifts, liftsList);

  // ── Work Orders ──
  const todayStr = new Date().toISOString().split('T')[0];
  const woList: WorkOrder[] = [
    {
      id: 'wo1', customer_id: 'c1', vehicle_id: 'v1', status: 'In Progress',
      created_at: '2024-11-01T08:00:00Z', assigned_technician_id: 'u3',
      lift_id: 'lift-1', scheduled_start: `${todayStr}T09:00:00`, scheduled_end: `${todayStr}T11:30:00`, estimated_hours: 2.5,
      internal_notes: 'Check for uneven brake wear, customer complained of vibration.',
      customer_notes: 'Front brake service with pad and rotor replacement.',
      labor_lines: [
        { id: 'll1', work_order_id: 'wo1', description: 'Front brake pad replacement', hours: 1.5, rate: 75 },
        { id: 'll2', work_order_id: 'wo1', description: 'Brake rotor replacement (both sides)', hours: 1, rate: 75 },
      ],
      part_lines: [
        { id: 'pl1', work_order_id: 'wo1', part_id: 'p1', qty: 1, unit_price: 75 },
        { id: 'pl2', work_order_id: 'wo1', part_id: 'p2', qty: 2, unit_price: 95 },
      ],
    },
    {
      id: 'wo2', customer_id: 'c2', vehicle_id: 'v3', status: 'Approved',
      created_at: '2024-11-10T09:30:00Z', assigned_technician_id: 'u4',
      lift_id: 'lift-2', scheduled_start: `${todayStr}T14:00:00`, scheduled_end: `${todayStr}T16:00:00`, estimated_hours: 2.0,
      internal_notes: '', customer_notes: 'Full service: oil change, filters, general inspection.',
      labor_lines: [
        { id: 'll3', work_order_id: 'wo2', description: 'Full service (oil, filters, inspection)', hours: 2, rate: 80 },
      ],
      part_lines: [
        { id: 'pl3', work_order_id: 'wo2', part_id: 'p3', qty: 1, unit_price: 15 },
        { id: 'pl4', work_order_id: 'wo2', part_id: 'p4', qty: 1, unit_price: 22 },
        { id: 'pl5', work_order_id: 'wo2', part_id: 'p5', qty: 1, unit_price: 45 },
      ],
    },
    {
      id: 'wo3', customer_id: 'c3', vehicle_id: 'v4', status: 'Waiting on Parts',
      created_at: '2024-11-05T07:00:00Z', assigned_technician_id: 'u5',
      lift_id: 'lift-3', scheduled_start: `${todayStr}T10:00:00`, scheduled_end: `${todayStr}T12:15:00`, estimated_hours: 2.25,
      internal_notes: 'Belt shows heavy cracking. Thermostat stuck open — coolant not reaching operating temp.',
      customer_notes: 'Serpentine belt replacement and cooling system check.',
      labor_lines: [
        { id: 'll4', work_order_id: 'wo3', description: 'Serpentine belt replacement', hours: 0.75, rate: 70 },
        { id: 'll5', work_order_id: 'wo3', description: 'Thermostat replacement + coolant flush', hours: 1.5, rate: 70 },
      ],
      part_lines: [
        { id: 'pl6', work_order_id: 'wo3', part_id: 'p8', qty: 1, unit_price: 42 },
        { id: 'pl7', work_order_id: 'wo3', part_id: 'p9', qty: 1, unit_price: 35 },
      ],
    },
    {
      id: 'wo4', customer_id: 'c4', vehicle_id: 'v6', status: 'QA/Complete',
      created_at: '2024-10-28T10:00:00Z', assigned_technician_id: 'u3',
      internal_notes: 'All 4 spark plugs replaced. Runs smooth now.',
      customer_notes: 'Engine tune-up — spark plug replacement.',
      labor_lines: [
        { id: 'll6', work_order_id: 'wo4', description: 'Spark plug replacement (4 cyl)', hours: 1, rate: 75 },
      ],
      part_lines: [
        { id: 'pl8', work_order_id: 'wo4', part_id: 'p6', qty: 4, unit_price: 18 },
      ],
    },
    {
      id: 'wo5', customer_id: 'c1', vehicle_id: 'v2', status: 'Approved',
      created_at: '2024-11-12T14:00:00Z', assigned_technician_id: 'u4',
      internal_notes: '', customer_notes: 'Oil change and general inspection.',
      labor_lines: [
        { id: 'll7', work_order_id: 'wo5', description: 'Oil change & inspection', hours: 1, rate: 80 },
      ],
      part_lines: [
        { id: 'pl9', work_order_id: 'wo5', part_id: 'p3', qty: 1, unit_price: 15 },
        { id: 'pl10', work_order_id: 'wo5', part_id: 'p5', qty: 1, unit_price: 45 },
      ],
    },
  ];
  saveAll(KEYS.workOrders, woList);

  // ── Invoices ──
  const invoicesList: Invoice[] = [
    {
      id: 'inv1', work_order_id: 'wo_old_1', subtotal: 520, tax: 52, total: 572,
      status: 'Paid', paid_amount: 572, due_date: '2024-10-15T00:00:00Z',
      payments: [{ id: 'pay1', invoice_id: 'inv1', amount: 572, method: 'Credit Card', paid_at: '2024-10-12T16:00:00Z' }],
      created_at: '2024-09-28T10:00:00Z',
    },
    {
      id: 'inv2', work_order_id: 'wo_old_2', subtotal: 280, tax: 28, total: 308,
      status: 'Partial', paid_amount: 150, due_date: '2024-11-01T00:00:00Z',
      payments: [{ id: 'pay2', invoice_id: 'inv2', amount: 150, method: 'Cash', paid_at: '2024-10-25T14:30:00Z' }],
      created_at: '2024-10-15T11:00:00Z',
    },
    {
      id: 'inv3', work_order_id: 'wo_old_3', subtotal: 890, tax: 89, total: 979,
      status: 'Unpaid', paid_amount: 0, due_date: '2024-10-20T00:00:00Z',
      payments: [],
      created_at: '2024-10-01T09:00:00Z',
    },
  ];
  saveAll(KEYS.invoices, invoicesList);

  // ── Stock Movements (for seed parts used in WOs) ──
  const movements: StockMovement[] = [
    { id: 'sm1', part_id: 'p1', qty_delta: -1, reason: 'used_on_job', work_order_id: 'wo1', created_at: '2024-11-01T09:00:00Z', created_by: 'u3' },
    { id: 'sm2', part_id: 'p2', qty_delta: -2, reason: 'used_on_job', work_order_id: 'wo1', created_at: '2024-11-01T09:05:00Z', created_by: 'u3' },
    { id: 'sm3', part_id: 'p6', qty_delta: -4, reason: 'used_on_job', work_order_id: 'wo4', created_at: '2024-10-28T11:00:00Z', created_by: 'u3' },
    { id: 'sm4', part_id: 'p3', qty_delta: 20, reason: 'received', work_order_id: null, created_at: '2024-10-20T08:00:00Z', created_by: 'u1' },
  ];
  saveAll(KEYS.stockMovements, movements);

  localStorage.setItem(KEYS.seeded, 'true');
}

// ── Reset all data (for debugging) ──
export function resetAllData(): void {
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
  seedIfNeeded();
}
