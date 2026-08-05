import * as XLSX from 'xlsx';

// localStorage Keys matching store.ts
const KEYS = {
  customers: 'workshop_customers',
  vehicles: 'workshop_vehicles',
  suppliers: 'workshop_suppliers',
  parts: 'workshop_parts',
  workOrders: 'workshop_work_orders',
  stockMovements: 'workshop_stock_movements',
  invoices: 'workshop_invoices',
  users: 'workshop_users',
  lifts: 'workshop_lifts',
  seeded: 'workshop_seeded',
} as const;

export function exportBackupToXLS(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const wb = XLSX.utils.book_new();

    // 1. Prepare raw JSON backup map
    const rawDataMap: Record<string, any[]> = {};
    const jsonRows: { key: string; data_json: string }[] = [];

    (Object.keys(KEYS) as (keyof typeof KEYS)[]).forEach((key) => {
      const storageKey = KEYS[key];
      const raw = localStorage.getItem(storageKey);
      const items = raw ? JSON.parse(raw) : [];
      rawDataMap[key] = items;
      jsonRows.push({ key: storageKey, data_json: JSON.stringify(items) });
    });

    // 2. Add SYSTEM_DATA_JSON sheet for 100% lossless structural recovery
    const jsonSheet = XLSX.utils.json_to_sheet(jsonRows);
    XLSX.utils.book_append_sheet(wb, jsonSheet, 'SYSTEM_DATA_JSON');

    // 3. Add human-readable sheets for each entity
    if (rawDataMap.customers?.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rawDataMap.customers), 'Customers');
    }
    if (rawDataMap.vehicles?.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rawDataMap.vehicles), 'Vehicles');
    }
    if (rawDataMap.workOrders?.length) {
      const formattedWOs = rawDataMap.workOrders.map(wo => ({
        ...wo,
        labor_lines_json: JSON.stringify(wo.labor_lines || []),
        part_lines_json: JSON.stringify(wo.part_lines || []),
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(formattedWOs), 'WorkOrders');
    }
    if (rawDataMap.parts?.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rawDataMap.parts), 'Parts');
    }
    if (rawDataMap.suppliers?.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rawDataMap.suppliers), 'Suppliers');
    }
    if (rawDataMap.invoices?.length) {
      const formattedInvoices = rawDataMap.invoices.map(inv => ({
        ...inv,
        payments_json: JSON.stringify(inv.payments || []),
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(formattedInvoices), 'Invoices');
    }
    if (rawDataMap.lifts?.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rawDataMap.lifts), 'Lifts');
    }
    if (rawDataMap.users?.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rawDataMap.users), 'Users');
    }
    if (rawDataMap.stockMovements?.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rawDataMap.stockMovements), 'StockMovements');
    }

    // 4. Generate filename and trigger download
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `Gearshift_Automotive_Backup_${dateStr}.xlsx`;
    XLSX.writeFile(wb, filename);
    return true;
  } catch (err) {
    console.error('Backup XLS export failed:', err);
    return false;
  }
}

export async function importBackupFromXLS(file: File): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        let restoredCount = 0;

        // Strategy 1: Lossless Recovery via SYSTEM_DATA_JSON sheet if present
        if (workbook.SheetNames.includes('SYSTEM_DATA_JSON')) {
          const jsonSheet = workbook.Sheets['SYSTEM_DATA_JSON'];
          const jsonRows: { key: string; data_json: string }[] = XLSX.utils.sheet_to_json(jsonSheet);

          jsonRows.forEach((row) => {
            if (row.key && row.data_json) {
              localStorage.setItem(row.key, row.data_json);
              restoredCount++;
            }
          });

          localStorage.setItem(KEYS.seeded, 'true');
        } else {
          // Strategy 2: Restore from individual sheet tables if SYSTEM_DATA_JSON is absent
          const sheetMap: Record<string, string> = {
            'Customers': KEYS.customers,
            'Vehicles': KEYS.vehicles,
            'WorkOrders': KEYS.workOrders,
            'Parts': KEYS.parts,
            'Suppliers': KEYS.suppliers,
            'Invoices': KEYS.invoices,
            'Lifts': KEYS.lifts,
            'Users': KEYS.users,
            'StockMovements': KEYS.stockMovements,
          };

          Object.entries(sheetMap).forEach(([sheetName, storageKey]) => {
            if (workbook.SheetNames.includes(sheetName)) {
              const sheet = workbook.Sheets[sheetName];
              const rawRows: any[] = XLSX.utils.sheet_to_json(sheet);

              // Parse nested JSON strings if any
              const parsedRows = rawRows.map((row) => {
                const cleaned = { ...row };
                if (cleaned.labor_lines_json) {
                  try { cleaned.labor_lines = JSON.parse(cleaned.labor_lines_json); } catch {}
                  delete cleaned.labor_lines_json;
                }
                if (cleaned.part_lines_json) {
                  try { cleaned.part_lines = JSON.parse(cleaned.part_lines_json); } catch {}
                  delete cleaned.part_lines_json;
                }
                if (cleaned.payments_json) {
                  try { cleaned.payments = JSON.parse(cleaned.payments_json); } catch {}
                  delete cleaned.payments_json;
                }
                return cleaned;
              });

              localStorage.setItem(storageKey, JSON.stringify(parsedRows));
              restoredCount++;
            }
          });

          if (restoredCount > 0) {
            localStorage.setItem(KEYS.seeded, 'true');
          }
        }

        if (restoredCount > 0) {
          setTimeout(() => {
            window.location.reload();
          }, 400);
          resolve(true);
        } else {
          resolve(false);
        }
      } catch (err) {
        console.error('Recover XLS import failed:', err);
        resolve(false);
      }
    };

    reader.onerror = () => resolve(false);
    reader.readAsArrayBuffer(file);
  });
}
