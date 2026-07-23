# Label Costing Calculator - Application Analysis

## Overview
This is a **single-page web application** (`index.html`) for calculating label printing costs. It's a self-contained HTML file with embedded CSS (Tailwind via CDN) and JavaScript that performs real-time cost calculations for label manufacturing.

---

## Application Purpose
A **Label Costing Calculator** for printing/packaging businesses to:
- Calculate material requirements based on label dimensions and order quantity
- Compute all cost components (raw material, production, plates, dies, transport, etc.)
- Determine selling price with margin
- Generate a detailed breakdown table for cylinder optimization
- Save the complete cost sheet as an image

---

## Technology Stack
| Component | Technology |
|-----------|------------|
| Structure | HTML5 (single file) |
| Styling | Tailwind CSS (CDN) + Custom CSS |
| Calculations | Vanilla JavaScript (ES6) |
| Image Export | html2canvas (CDN) |
| Fonts | Inter (Google Fonts) |
| Dependencies | Zero build step - runs directly in browser |

---

## Input Fields (User-Editable)

### Job Parameters
| Field | ID | Type | Description |
|-------|-----|------|-------------|
| Order Quantity | `orderQuantity` | number | Number of labels to produce |
| Label Size Across | `labelSizeAcross` | number (mm) | Label width |
| Label Size Around | `labelSizeAround` | number (mm) | Label height/repeat direction |
| Cylinder Teeth | `cylinderTeeth` | select | Predefined cylinder sizes (73-182 teeth) |
| Gap Across | `gapAcrossMM` | number (mm) | Horizontal gap between labels |
| No. of Labels In (N) | `inputNForAround` | number | Labels around cylinder |
| Label Gap Around | `inputLabelGapAroundMM` | number (mm) | Vertical gap between labels |
| Label Ups in Across | `labelNosAcross` | number | Auto-calculated or manual override |
| Material Width | `materialWidthMM` | number (mm) | Auto-calculated or manual |
| Material Margin | `materialMarginMM` | number (mm) | Extra margin for substrate |

### Material & Production
| Field | ID | Type | Description |
|-------|-----|------|-------------|
| Wastage % | `wastagePercentage` | number | Material wastage percentage |
| Raw Material Price | `rawMaterialPrice` | number (INR/sqm) | Base material cost |
| Production Rate | `productionRate` | number (m/hr) | Press speed |
| Setup Time | `setupTimeHours` | number (hrs) | Machine setup time |
| Production Cost/hr | `productionCostPerHour` | number (INR) | Hourly production cost |
| Total GSM | `totalGSM` | number | Material weight (grams/sqm) |

### Additional Cost Components
| Field | ID | Type | Description |
|-------|-----|------|-------------|
| Varnish Cost | `varnishCost` | number (INR/sqm) | Special release varnish |
| Cold Foil Cost | `foilCost` | number (INR/sqm) | Cold foil stamping |
| Cold Lamination | `coldLaminationCost` | number (INR/sqm) | Cold lamination |
| SA Lamination | `saLaminationCost` | number (INR/sqm) | Self-adhesive lamination |
| Ink % | `inkPricePercentage` | number (%) | % of raw material value |
| Number of Plates | `numPlates` | number | Printing plates count |
| Total Plate Cost | `totalPlateCost` | number (INR) | Plate making cost |
| Die Quantity | `dieQuantity` | number | Cutting dies count |
| Total Die Cost | `totalDieCost` | number (INR) | Die making cost |
| Transport % | `transportCostPercentage` | number (%) | % of raw material cost |
| Transport Direct | `transportCostDirect` | number (INR) | Fixed transport cost (overrides %) |
| Slitting Cost | `slittingCostPerLabel` | number (INR/label) | Slitting & numbering |
| Digital Printing | `digitalPrintingCost` | number (INR/sqm) | Digital print cost |
| Packing % | `packingCostPercentage` | number (%) | % of raw material cost |
| Margin % | `marginPercentage` | number (%) | Profit margin on cost |

---

## Output Fields (Calculated/Read-Only)

### Cylinder Info
- **Cylinder Size (Inches)** - `cylinderSizeInches` = teeth / 8
- **Cylinder Size (MM)** - `cylinderSizeMM` = teeth × 3.175

### Material Calculations
- **Total Material Required (Meters)** - Based on order qty, N-across, label around + gap
- **Total Square Meters Required** - Including wastage
- **Raw Material Cost (Total)** - sqm × price/sqm
- **Wastage in Meters** - wastage% × material meters

### Cost Breakdown
- **Production Time (Hours)** - (material + wastage) / rate + setup
- **Production Cost** - time × cost/hr
- **Varnish/Foil/Lamination Costs** - per sqm × total sqm
- **Ink Cost (Calculated)** - ink% × raw material cost
- **Ink Cost (Rs/SQM)** - ink cost / total sqm
- **Plate Cost** - direct input
- **Die Cost** - direct input
- **Transport Cost** - direct OR % of raw material
- **Slitting Cost** - per label × order qty
- **Digital Printing Cost** - per sqm × total sqm
- **Packing Cost** - packing% × raw material cost
- **Weight (KGs)** - total sqm × GSM / 1000

### Final Summary
- **Total Cost** - Sum of all cost components
- **Basic Cost per Label** - Total Cost / Order Quantity
- **Margin Amount per Label** - Basic Cost × Margin%
- **Selling Price per Label** - Basic Cost + Margin
- **Total Selling Value** - Selling Price × Order Quantity

---

## Detailed Calculation Table
A dynamic table showing cylinder optimization for N = 1 to 20:
| Column | Description |
|--------|-------------|
| Label size Across | Input value |
| Label size Around | Input value |
| Cylinder Repeat (Teeth) | Selected cylinder |
| Nearest Teeth | Calculated: ((labelAround + 3) × N) / 3.175 |
| Label Gap Around (MM) | (cylinderMM - labelAround×N) / N |
| No of Labels In (N) | Row number 1-20 |
| Cylinder Repeat (Inches) | teeth / 8 |
| Cylinder Repeat (MM) | teeth × 3.175 |
| No. of Labels Across | Max fitting in 320mm machine width |
| Width of Substrate | Calculated width + margin |

**Highlighting**: Rows with label gap 2.5-5mm are highlighted green (suitable)

---

## Key Calculation Logic

### Optimal N-Across Calculation
```javascript
// Finds max labels across within 320mm machine limit
for (nAcross = 1 to 10) {
  baseWidth = (labelSizeAcross × nAcross) + (gapAcross × (nAcross - 1))
  if (baseWidth <= 320) optimalNAcross = nAcross
}
materialWidth = (optimalNAcross × labelSizeAcross) + ((optimalNAcross - 1) × gapAcross) + materialMargin
```

### Material Meters
```
totalMaterialMeters = (orderQty / optimalNAcross) × ((labelSizeAround + gapAround) / 1000)
totalSqM = (totalMaterialMeters + wastageMeters) × (materialWidth / 1000)
```

### Cost Aggregation
```
totalCost = rawMaterial + varnish + foil + coldLam + saLam + ink + plates + dies + 
            transport + production + slitting + digitalPrint + packing
basicCostPerLabel = totalCost / orderQty
sellingPrice = basicCostPerLabel × (1 + margin%/100)
```

---

## Event Flow
1. **DOMContentLoaded** → `attachEventListeners()`
2. Populate cylinder dropdown (default: 88 teeth)
3. Attach `input` listeners to all number inputs & selects
4. **On cylinder/label size change** → `updateCylinderSizes()` → `calculateAllCosts()` + `updateDetailedCalculationTable()`
5. **On other inputs** → `calculateAllCosts()`
6. **Save as Image** → html2canvas captures `#capture` div → downloads PNG

---

## Data Persistence
**Currently: NONE** - All data is in-memory only. Refreshing the page loses all inputs.

---

## UI/UX Characteristics
- **Responsive**: Grid layouts adapt from 1-col (mobile) to 3-col (desktop)
- **Visual distinction**: Yellow boxes = inputs, Green boxes = outputs
- **Real-time**: Calculations update on every keystroke
- **Print-ready**: "Save as Image" creates a clean PNG of the cost sheet
- **Table highlighting**: Green rows indicate optimal cylinder configurations

---

## File Structure
```
/MedPackLabCal/
├── index.html          # Complete application (842 lines)
└── APP_ANALYSIS.md     # This file
```

---

## Potential Enhancement Areas for Desktop/Mobile App

### Data Persistence Needs
1. **Customer Management** - Save/load quotes per customer
2. **Quote History** - Track revisions, versions
3. **Template System** - Reusable material/cost presets
4. **Export Options** - PDF, Excel, JSON, print

### Platform Considerations
| Platform | Approach | Pros | Cons |
|----------|----------|------|------|
| **PWA** | Wrap current HTML + Service Worker + IndexedDB | Zero code change, works offline, installable | Limited native APIs |
| **Electron** | Package as desktop app + SQLite/IndexedDB | Full Node.js access, native menus, auto-updates | Larger bundle (~100MB+) |
| **Tauri** | Rust backend + Web frontend + SQLite | Small bundle (~10MB), secure, native performance | Rust learning curve |
| **Capacitor/Ionic** | Mobile app (iOS/Android) + SQLite | True native mobile, app store distribution | More complex build |
| **Flutter/React Native** | Rewrite in Dart/React Native | Best mobile UX, native performance | Complete rewrite |

### Recommended Architecture for Customer Data
```
Customer
  └── Quotes (multiple per customer)
        ├── Quote Metadata (name, date, status, version)
        ├── Inputs Snapshot (all form values as JSON)
        ├── Calculated Outputs (all results as JSON)
        └── Notes/Attachments
```

### Storage Options
- **Local-first**: IndexedDB (browser), SQLite (desktop/mobile), AsyncStorage (React Native)
- **Sync**: Firebase, Supabase, or custom backend for multi-device
- **Export/Import**: JSON backup/restore for portability

---

## Next Steps Discussion Points
1. **Target platform(s)**: Desktop only? Mobile? Both? PWA first?
2. **Data model**: How many customers? Quotes per customer? Revision history needed?
3. **Sync requirements**: Single device? Multi-device? Team sharing?
4. **Migration path**: Keep current HTML as-is? Gradual enhancement? Full rewrite?
5. **Budget/timeline**: Quick PWA wrapper (days) vs native apps (weeks)