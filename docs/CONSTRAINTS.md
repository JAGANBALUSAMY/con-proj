# Factory Production Tracking System – Constraints
**(Batch-Based · Hierarchical · Section-Isolated · Approval-Gated)**

This document is the **SINGLE SOURCE OF TRUTH**.  
All implementations **MUST strictly follow these constraints**.  
Any violation **MUST be rejected**.

---

## 1. Architecture Constraints

- Frontend: React + Vite (UI only)
- Backend: Node.js + Express + Prisma
- AI Service: Python FastAPI (**STRICTLY READ-ONLY**)
- Database: PostgreSQL
- Communication: REST APIs only

### Rules
- Frontend must **NEVER** access the database directly
- AI service must **NEVER** write to the database
- Backend is the **ONLY** layer allowed to mutate data

---

## 2. Core Production Model

- The system tracks **BATCHES**, not individual briefs
- A batch represents:
  - One cloth input
  - One brief type
  - A fixed quantity
- All items in a batch move together through production stages

❌ **No per-brief tracking** in the core workflow.

---

## 3. Production Workflow (STRICT ORDER)

CUTTING → STITCHING → QUALITY_CHECK → LABELING → FOLDING → PACKING


### Rules
- No stage skipping
- No backward movement in the **main workflow**
- A batch can be in **ONLY ONE stage at a time**
- Stage transition is **NOT automatic** (see Approval Rules)

---

## 4. Batch Rules

- Each batch has:
  - `currentStage`
  - `status` (PENDING, IN_PROGRESS, COMPLETED, CANCELLED)
- Quantity must **NEVER increase**
- Batch is **COMPLETED only after PACKING**
- Quantity integrity must always hold:

usableQuantity + defectiveQuantity + scrappedQuantity = totalQuantity


---

## 5. User Hierarchy & Roles (CRITICAL)

### Global Roles
- ADMIN
- MANAGER
- OPERATOR

Each user has **exactly ONE role**.

---

## 6. User Creation Rules (NO PUBLIC REGISTRATION)

- There is **NO public signup or registration**
- Users are created ONLY by authorized roles:
  - ADMIN → creates MANAGER
  - MANAGER → creates OPERATOR
- ADMIN accounts are created **manually in the database**

---

## 7. User Verification Rules (CRITICAL)

- MANAGERS created by ADMIN are **auto-verified**
- OPERATORS created by MANAGER start as **PENDING**
- An OPERATOR must be **VERIFIED by a MANAGER** before login

### Verification Rules
- Only ADMIN can verify MANAGERS
- Only the **SAME MANAGER who created an OPERATOR** can verify that OPERATOR
- Operators **cannot verify anyone**
- Self-verification is **forbidden**
- Login must be denied if `verificationStatus ≠ VERIFIED`

---

## 8. Manager–Operator Ownership (CRITICAL)

- Every OPERATOR has **exactly ONE owning MANAGER**
- Ownership is defined at creation time
- An OPERATOR:
  - Works only under their owning MANAGER
  - Cannot be verified, approved, reassigned, or managed by another MANAGER
- Cross-manager access to operators is **STRICTLY FORBIDDEN**

---

## 9. Section Assignment & Isolation (CRITICAL)

- ADMIN must assign section(s) when creating a MANAGER
- A MANAGER can operate ONLY within their assigned section(s)
- OPERATORS inherit section(s) from their owning MANAGER

### Non-admin users MUST NOT
- View
- Modify
- Log  
data from unassigned sections

---

## 10. Operator & Machine Rules

### Operators must
- Exist
- Be VERIFIED
- Belong to the batch’s current stage
- Belong to the correct manager

### Machines must
- Exist
- Be OPERATIONAL

### Rules
- OUT_OF_ORDER machines cannot be used
- One production log may reference **at most ONE machine**

---

## 11. Production Logging (MANDATORY)

- Every stage **start and completion** MUST create a ProductionLog
- Logs must include:
  - Batch
  - Stage
  - Operator
  - Start time
  - End time
- End time ≥ start time
- Logs are **immutable after approval**

---

## 12. Operator Work Approval (CRITICAL)

⚠️ **NO operator work is final until approved by a Manager**

### Approval Rules
- Every operator-completed action creates a record with:
  - `approvalStatus = PENDING`
- A batch stage MUST NOT advance while approvalStatus = PENDING
- Only MANAGER can approve or reject operator work
- Manager must be the **owning manager** of the operator
- Operators **CANNOT approve** any work
- Admin approval is optional and **read-only**

### Approval Outcomes
- APPROVED → batch may move to next stage
- REJECTED → batch remains in same stage

---

## 13. Quality & Defects (Quantity-Based)

- Quality check ONLY at QUALITY_CHECK stage
- Defects are recorded as quantities
- Defective quantity ≤ batch quantity
- Quality completion requires **manager approval**

---

## 14. Rework / Return Flow (CRITICAL)

- Rework applies ONLY to defective quantities
- Rework is a **sub-flow**, NOT backward batch movement

### Rework Rules
- **Direct Routing**: Target stage must be the origin section: CUTTING or STITCHING only.
- **Sectional Accountability**: Rework is performed by operators and approved by managers of the origin section. There is no separate "REWORK" department.
- Rework quantity ≤ defective quantity
- Batch stage does NOT change during rework
- Rework outcome:
  - CURED
  - SCRAPPED
- CURED + SCRAPPED = rework quantity
- Only CURED quantity rejoins the batch
- Rework execution and completion require **manager approval** from the origin section.

---

## 15. Labeling Rules

- Labeling happens AFTER:
  - Quality check
  - Rework (if any)
- Only usable quantity enters labeling
- Quantity must NOT change during labeling
- Labeling actions require **manager approval**

---

## 16. Folding Rules

- Folding happens ONLY after labeling
- Quantity must remain unchanged
- Folding actions require **manager approval**

---

## 17. Packing & Export

- Only PACKING-stage batches can be packed
- Packing is quantity-based
- One box contains items from ONLY ONE batch
- Total boxed quantity ≤ usable batch quantity

### Box Lifecycle
PACKED → SHIPPED → DELIVERED


---

## 18. Data Integrity & Audit

- No orphan records
- Foreign keys must be enforced
- All timestamps must be logical
- Historical logs must **NEVER** be deleted
- All approvals, rejections, and actions must be auditable

---

## 19. AI System Rules

- AI service is **STRICTLY READ-ONLY**
- AI may analyze:
  - Production delays
  - Defects
  - Rework frequency
  - Approval bottlenecks
  - Performance metrics
- AI may ONLY return:
  - Predictions
  - Alerts
  - Recommendations
- Backend decides whether to apply AI outputs

---

---

## 21. Operator Section Mobility (CRITICAL)

- Operators may be transferred between production sections.
- **Approval Gate**: Section transfer MUST be requested by the current owning manager and accepted by the manager of the target section.
- **Independence**: On acceptance, the operator's section assignment is updated, but their **ownership** (`createdByUserId`) remains with the original manager.
- **Historical Integrity**: Completed production logs and historical batch associations must NOT be modified during a transfer.

---

## 22. Single Active Section Isolation (STRICT)

- An operator must be assigned to **exactly ONE** active production section at any given time.
- The system must prevent "dual section access" to maintain data isolation.
- **Enforcement**: Accepting a section transfer must automatically terminate all previous section assignments before activating the new one.

---

## 23. Hybrid Visibility & Governance Separation

- **Visibility**: Managers have full visibility and approval authority over **ALL** work performed in their assigned sections, regardless of which manager created the operator.
- **Governance**: Only the **OWING MANAGER** (creator) can perform account-level actions (verify, reset password, force logout, update account status).
- **Approval Delegation**: When an operator is working in a section not managed by their owner, the resident section manager becomes the primary authority for their production logs and rework approvals.

---

## 24. Enforcement (MANDATORY)

- Constraints must be checked **BEFORE any database mutation**
- Any violation → **reject request**
- No shortcuts
- No silent fixes
- No bypassing approval or hierarchy rules