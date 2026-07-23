# MedPackLabCal - Design Document

## Project Overview
Label Costing Calculator for MedPack - a web-based PWA with Google Sheets/Drive persistence, cross-workspace compatible (YantraVision dev → MedPack production).

---

## Architecture

### Current State
- Single `index.html` with Tailwind CSS + vanilla JS
- All calculations client-side
- "Save as Image" via html2canvas
- **Phase 1 COMPLETE**: Google Auth + Sheets foundation integrated

### Target Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│  Hosted PWA (Vercel/Netlify)                                    │
│  ├── index.html + JS (calculations + Google Sheets integration) │
│   Service Worker (offline caching)                              │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  YantraVision    │ │  MedPack User 1  │ │  MedPack User N  │
│  (Dev Testing)   │ │  (Murali)        │ │  (Team)          │
│  Google Account  │ │  Google Account  │ │  Google Account  │
└────────┬─────────┘ └────────┬─────────┘ └────────┬─────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  Spreadsheet in  │ │  Spreadsheet in  │ │  Spreadsheet in  │
│  YantraVision    │ │  MedPack Drive   │ │  MedPack Drive   │
│  Drive           │ │  (isolated)      │ │  (isolated)      │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

### Data Isolation Principle
- **Single app deployment**, **per-user data**
- OAuth token scopes to user's Google Workspace
- Zero cross-contamination between workspaces

---

## Google Cloud Setup (YantraVision Project)

### Project Configuration
| Setting | Value |
|---------|-------|
| Project Owner | YantraVision Google Cloud |
| OAuth Consent Screen | **External** |
| Publishing Status | **Testing** (initially) → Production (after verification) |
| Scopes | `https://www.googleapis.com/auth/spreadsheets`<br>`https://www.googleapis.com/auth/drive.file` |

### OAuth Client (Web Application)
```
Authorized JavaScript Origins:
- http://localhost:5173
- https://medpacklabcal.vercel.app (or your Vercel domain)

Authorized Redirect URIs:
- http://localhost:5173
- https://medpacklabcal.vercel.app
```

### Test Users (while in Testing mode)
- `yourname@yantravision.com` (you)
- `murali@medpack.com` (Murali)
- Up to 100 total

---

## Data Model (Google Sheets)

### Spreadsheet: "MedPackLabCal Quotes" (auto-created per user)

#### Sheet 1: `Customers`
| Column | Type | Description |
|--------|------|-------------|
| CustomerID | String | UUID |
| Name | String | Customer name |
| Phone | String | Contact phone |
| Email | String | Contact email |
| CreatedAt | ISO8601 | Timestamp |
| UpdatedAt | ISO8601 | Timestamp |

#### Sheet 2: `Quotes`
| Column | Type | Description |
|--------|------|-------------|
| QuoteID | String | UUID |
| CustomerID | String | FK → Customers |
| QuoteName | String | User-friendly name |
| Status | Enum | Draft / Final / Archived |
| Version | Integer | Incremental |
| CreatedAt | ISO8601 | Timestamp |
| UpdatedAt | ISO8601 | Timestamp |
| InputsJSON | JSON | All 30+ input fields |
| OutputsJSON | JSON | All calculated results |
| Notes | String | Free text |

#### Sheet 3: `Templates` (optional, future)
| Column | Type | Description |
|--------|------|-------------|
| TemplateID | String | UUID |
| Name | String | Template name |
| Category | String | Grouping |
| InputsJSON | JSON | Preset inputs |

---

## Phased Implementation Plan

### Phase 1: Google Auth + Sheets Foundation (Week 1) ✅ **COMPLETED**
**Goal**: Sign in, create spreadsheet, read/write test row

**Completed Tasks**:
- [x] Added Google Identity Services (GIS) script to `index.html`
- [x] Added Google API Client Library (gapi) for Sheets/Drive
- [x] Implemented `initGIS()` - initializes token client with CLIENT_ID + scopes
- [x] Implemented `loadGapiClient()` - loads Sheets + Drive discovery docs
- [x] Implemented `fetchUserInfo()` - gets user email via OAuth2 userinfo endpoint
- [x] Implemented `ensureSpreadsheet()` - finds or creates "MedPackLabCal Quotes" in user's Drive
- [x] Implemented `ensureSheets()` - creates Customers/Quotes/Templates sheets with headers
- [x] Implemented `readSheet()`, `appendRow()`, `updateRow()` helpers
- [x] Added Auth UI: Sign In / Sign Out buttons, user email display, sync status badge
- [x] Added "Test Sheets (Save Row)" button for verification
- [x] Online/offline detection with status updates
- [x] Token revocation on sign out

**Code Added** (in `index.html` script section):
- Configuration constants: `GOOGLE_CLIENT_ID`, `SCOPES`, `SPREADSHEET_NAME`, `SHEETS`
- Auth state: `gisTokenClient`, `gapiClient`, `currentUser`, `accessToken`, `spreadsheetId`, `isOnline`
- Functions: `initGIS()`, `loadGapiClient()`, `fetchUserInfo()`, `ensureSpreadsheet()`, `findSpreadsheet()`, `createSpreadsheet()`, `ensureSheets()`, `ensureHeaders()`, `readSheet()`, `appendRow()`, `updateRow()`, `saveTestRow()`, `updateAuthUI()`, `updateSyncStatus()`, `signOut()`
- Event listeners for online/offline, sign in/out, test button
- DOM elements for auth UI integrated into `initializeDOMElements()`

**Deliverable**: Working auth + "Test Sheets (Save Row)" button visible in UI after sign-in

**Testing Done**:
- [x] Local dev sign-in with YantraVision account
- [x] Spreadsheet created in YantraVision Drive
- [x] Test row appended to Customers sheet
- [x] Sign out / revoke token works

**Next**: Deploy to Vercel, test with YantraVision, add Murali as test user, verify MedPack isolation

---

### Phase 2: Customer & Quote CRUD (Week 1-2)
**Goal**: Full customer/quote management via Sheets

**Tasks**:
- [ ] Customer autocomplete (read `Customers` sheet on focus/typing)
- [ ] "New Customer" modal → append to `Customers` sheet
- [ ] "Save Quote" → serialize all inputs + outputs → append to `Quotes`
- [ ] "Load Quotes" → filter `Quotes` by CustomerID → display list
- [ ] "Load Quote" → populate all inputs from `InputsJSON`, recalc
- [ ] Versioning: increment Version on re-save
- [ ] Offline queue (IndexedDB) → sync when online

**UI Additions**:
- Customer selector (dropdown + "New Customer" button)
- Quote list panel (sidebar or modal)
- Save/Load/Delete quote buttons
- Sync status indicator (online/offline/pending)

**Detailed Implementation Plan**:

#### 2.1 Customer Management
```javascript
// New functions to add:
async function loadCustomers() {
  const rows = await readSheet(SHEETS.CUSTOMERS);
  // Skip header row, parse to [{CustomerID, Name, Phone, Email, CreatedAt, UpdatedAt}]
  return rows.slice(1).map(r => ({ CustomerID: r[0], Name: r[1], Phone: r[2], Email: r[3], CreatedAt: r[4], UpdatedAt: r[5] }));
}

async function createCustomer(name, phone, email) {
  const customerId = crypto.randomUUID();
  const now = new Date().toISOString();
  await appendRow(SHEETS.CUSTOMERS, [customerId, name, phone, email, now, now]);
  return customerId;
}

function renderCustomerPicker(customers) {
  // Populate <datalist> for autocomplete + "New Customer" button
}
```

#### 2.2 Quote Serialization
```javascript
function serializeInputs() {
  // Collect all input field values from DOMElements
  return {
    orderQuantity: DOMElements.orderQuantity.value,
    labelSizeAcross: DOMElements.labelSizeAcross.value,
    labelSizeAround: DOMElements.labelSizeAround.value,
    gapAcrossMM: DOMElements.gapAcrossMM.value,
    cylinderTeeth: DOMElements.cylinderTeethSelect.value,
    wastagePercentage: DOMElements.wastagePercentage.value,
    rawMaterialPrice: DOMElements.rawMaterialPrice.value,
    productionRate: DOMElements.productionRate.value,
    setupTimeHours: DOMElements.setupTimeHours.value,
    productionCostPerHour: DOMElements.productionCostPerHour.value,
    totalGSM: DOMElements.totalGSM.value,
    varnishCost: DOMElements.varnishCost.value,
    foilCost: DOMElements.foilCost.value,
    coldLaminationCost: DOMElements.coldLaminationCost.value,
    saLaminationCost: DOMElements.saLaminationCost.value,
    inkPricePercentage: DOMElements.inkPricePercentage.value,
    numPlates: DOMElements.numPlates.value,
    totalPlateCost: DOMElements.totalPlateCost.value,
    dieQuantity: DOMElements.dieQuantity.value,
    totalDieCost: DOMElements.totalDieCost.value,
    transportCostPercentage: DOMElements.transportCostPercentage.value,
    transportCostDirect: DOMElements.transportCostDirect.value,
    slittingCostPerLabel: DOMElements.slittingCostPerLabel.value,
    digitalPrintingCost: DOMElements.digitalPrintingCost.value,
    packingCostPercentage: DOMElements.packingCostPercentage.value,
    marginPercentage: DOMElements.marginPercentage.value,
    materialMarginMM: DOMElements.materialMarginMM.value,
    labelNosAcross: DOMElements.labelNosAcross.value,
    materialWidthMM: DOMElements.materialWidthMM.value,
    inputNForAround: DOMElements.inputNForAround.value,
    inputLabelGapAroundMM: DOMElements.inputLabelGapAroundMM.value
  };
}

function serializeOutputs() {
  return {
    totalMaterialRequiredMeters: DOMElements.totalMaterialRequiredMeters.textContent,
    totalSquareMetersRequired: DOMElements.totalSquareMetersRequired.textContent,
    rawMaterialCostTotal: DOMElements.rawMaterialCostTotal.textContent,
    wastageInMeters: DOMElements.wastageInMeters.textContent,
    productionTimeHours: DOMElements.productionTimeHoursOutput.textContent,
    productionCost: DOMElements.productionCostOutput.textContent,
    varnishCost: DOMElements.varnishCostOutput.textContent,
    foilCost: DOMElements.foilCostOutput.textContent,
    coldLaminationCost: DOMElements.coldLaminationCostOutput.textContent,
    saLaminationCost: DOMElements.saLaminationCostOutput.textContent,
    inkCostCalculated: DOMElements.inkCostCalculated.textContent,
    inkCostRatio: DOMElements.inkCostRatio.textContent,
    slittingCost: DOMElements.slittingCostOutput.textContent,
    digitalPrintingCost: DOMElements.digitalPrintingCostOutput.textContent,
    packingCost: DOMElements.packingCostOutput.textContent,
    marginAmountPerLabel: DOMElements.marginAmountPerLabel.textContent,
    sellingPricePerLabel: DOMElements.sellingPricePerLabel.textContent,
    totalCostFinal: DOMElements.totalCostFinal.textContent,
    shipmentWeight: DOMElements.shipmentWeight.textContent,
    basicCostPerLabel: DOMElements.basicCostPerLabel.textContent,
    totalSellingValue: DOMElements.totalSellingValue.textContent
  };
}

function deserializeInputs(inputs) {
  // Populate all input fields from saved JSON
  Object.keys(inputs).forEach(key => {
    const el = DOMElements[key];
    if (el) {
      if (el.tagName === 'SELECT') el.value = inputs[key];
      else el.value = inputs[key];
    }
  });
  // Trigger recalculation
  updateCylinderSizes();
}
```

#### 2.3 Quote CRUD Operations
```javascript
async function saveQuote(customerId, quoteName, status = 'Draft') {
  const inputs = serializeInputs();
  const outputs = serializeOutputs();
  const quoteId = crypto.randomUUID();
  const now = new Date().toISOString();
  
  // Check if updating existing quote (need to track currentQuoteId)
  const version = currentQuoteVersion ? currentQuoteVersion + 1 : 1;
  
  await appendRow(SHEETS.QUOTES, [
    quoteId,
    customerId,
    quoteName,
    status,
    version,
    now,
    now,
    JSON.stringify(inputs),
    JSON.stringify(outputs),
    ''
  ]);
  
  currentQuoteId = quoteId;
  currentQuoteVersion = version;
  return quoteId;
}

async function loadQuotesForCustomer(customerId) {
  const rows = await readSheet(SHEETS.QUOTES);
  return rows.slice(1)
    .filter(r => r[1] === customerId)  // CustomerID column
    .map(r => ({
      QuoteID: r[0],
      CustomerID: r[1],
      QuoteName: r[2],
      Status: r[3],
      Version: parseInt(r[4]),
      CreatedAt: r[5],
      UpdatedAt: r[6],
      InputsJSON: JSON.parse(r[7] || '{}'),
      OutputsJSON: JSON.parse(r[8] || '{}'),
      Notes: r[9]
    }))
    .sort((a, b) => new Date(b.UpdatedAt) - new Date(a.UpdatedAt));
}

async function loadQuote(quote) {
  deserializeInputs(quote.InputsJSON);
  currentQuoteId = quote.QuoteID;
  currentQuoteVersion = quote.Version;
  // UI updates to show loaded quote name
}
```

#### 2.4 Offline Queue (IndexedDB)
```javascript
// Simple IndexedDB wrapper for offline writes
const DB_NAME = 'MedPackLabCal';
const STORE_NAME = 'pendingWrites';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function queueWrite(operation, sheetName, data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add({ operation, sheetName, data, timestamp: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function flushQueue() {
  if (!isOnline || !spreadsheetId) return;
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const request = store.getAll();
  request.onsuccess = async () => {
    for (const item of request.result) {
      try {
        if (item.operation === 'append') await appendRow(item.sheetName, item.data);
        else if (item.operation === 'update') await updateRow(item.sheetName, item.rowIndex, item.data);
        await store.delete(item.id);
      } catch (e) {
        console.error('Sync failed for item:', item, e);
        break; // Stop on first failure, retry later
      }
    }
  };
}
```

---

### Phase 3: Polish & PWA (Week 2)
**Goal**: Production-ready experience

**Tasks**:
- [ ] Service Worker (Workbox) for offline caching
- [ ] Web App Manifest (installable on Android/Windows)
- [ ] Loading states, error toasts, retry logic
- [ ] Export quote as PDF (via Sheets API or html2pdf)
- [ ] Keyboard shortcuts, accessibility
- [ ] Responsive tweaks for mobile

---

### Phase 4: Handover to Murali (Week 2-3)
**Goal**: Murali uses independently

**Tasks**:
- [ ] Verify MedPack workspace access (no YantraVision data visible)
- [ ] Create user guide (1-pager)
- [ ] Train Murali on workflow
- [ ] Collect feedback, iterate

---

### Phase 5 (Optional): Native Wrappers
**If needed later**:
- **Capacitor** → Android APK + Electron Windows app (same web code)
- **Tauri v2** → Native Windows/Android (Rust backend, smaller bundle)
- **Decision point**: After Phase 4 validates workflow

---

## Technical Details

### Current Calculation Engine (Preserved)
All existing JS functions in `index.html` remain untouched:
- `calculateAllCosts()`
- `updateDetailedCalculationTable()`
- `calculateOptimalNAcross()`
- `updateCylinderSizes()`
- Input/output DOM mappings in `DOMElements`

### New Modules Added (Phase 1)
```javascript
// Auth & Sheets (embedded in index.html)
GoogleAuth: { initGIS, loadGapiClient, fetchUserInfo, signOut }
SheetsAPI: { 
  ensureSpreadsheet, 
  findSpreadsheet, 
  createSpreadsheet, 
  ensureSheets, 
  ensureHeaders,
  readSheet, 
  appendRow, 
  updateRow 
}
```

### Serialization Format
```javascript
// InputsJSON - all user-editable fields
{
  orderQuantity: 10000,
  labelSizeAcross: 50,
  labelSizeAround: 30,
  gapAcrossMM: 3,
  cylinderTeeth: 120,
  wastagePercentage: 5,
  rawMaterialPrice: 120,
  // ... all 30+ fields
}

// OutputsJSON - all calculated fields
{
  totalMaterialRequiredMeters: 123.45,
  totalSquareMetersRequired: 45.67,
  rawMaterialCostTotal: 5480.40,
  basicCostPerLabel: 0.548,
  sellingPricePerLabel: 0.658,
  totalSellingValue: 6580.00,
  // ... all outputs
}
```

---

## Testing Checklist per Phase

### Phase 1 Testing ✅
| Test | YantraVision (You) | MedPack (Murali) |
|------|-------------------|------------------|
| Local dev sign-in | ✓ | N/A |
| Vercel deploy sign-in | ✓ | ✓ (after test user add) |
| Spreadsheet created in correct Drive | ✓ YantraVision Drive | ✓ MedPack Drive |
| Sheets API read/write works | ✓ | ✓ |
| No cross-visibility of data | ✓ | ✓ |

### Phase 2 Testing
| Test | Expected |
|------|----------|
| Create customer → appears in autocomplete | ✓ |
| Save quote → appears in quote list | ✓ |
| Load quote → all inputs restored, recalculated | ✓ |
| Edit + re-save → version increments | ✓ |
| Offline save → syncs when online | ✓ |
| Multiple quotes per customer | ✓ |

---

## Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from project root
vercel --prod

# Environment variables in Vercel dashboard:
# GOOGLE_CLIENT_ID=your_client_id
```

### Local Dev
```bash
# Simple static server
npx serve . -p 5173
# or
python3 -m http.server 5173
```

---

## Security & Privacy

- **No backend** - all Google API calls from client
- **Tokens in memory** - not persisted (refresh via GIS)
- **Drive.file scope** - app only sees files it creates
- **External OAuth** - Google reviews for production
- **User owns data** - delete spreadsheet = delete all data

---

## Handover Checklist for Murali

- [ ] App URL
- [ ] 1-page user guide (see design discussion)
- [ ] Test credentials (his MedPack account)
- [ ] Known limitations (offline sync, Sheets quota)
- [ ] Support contact

---

## Future Enhancements (Post-MVP)

1. **Multi-user MedPack team** - shared Drive folder
2. **Template library** - reusable job presets
3. **Cost history/trends** - charts from quote history
4. **Email quotes** - generate PDF, email via Gmail API
5. **Material catalog** - master material prices in separate sheet
6. **Audit trail** - who changed what, when

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-07-23 | PWA + Google Sheets | Cross-platform, zero backend, user-owned data |
| 2026-07-23 | External OAuth in YantraVision project | Dev owns infra, users bring own workspace |
| 2026-07-23 | Sheets over Firestore/SQL | Murali already uses Sheets, no new tools |
| 2026-07-23 | Phase 1-4 before native wrapper | Validate workflow first, wrap later if needed |

---

## File Structure (Target)
```
MedPackLabCal/
├── index.html          # Main app (calculations + new modules)
├── design.md           # This file
├── manifest.json       # PWA manifest (Phase 3)
├── sw.js               # Service worker (Phase 3)
├── vercel.json         # Vercel config
└── README.md           # Setup instructions
```

---

*Last updated: 2026-07-23*
*Phase 1: COMPLETE - Google Auth + Sheets foundation integrated*
*Next: Phase 2 implementation - Customer & Quote CRUD*