# Factory Production Tracking System – Constraints
(Batch-Based, Hierarchical, Section-Isolated)

This document is the SINGLE SOURCE OF TRUTH.
All implementations MUST strictly follow these constraints.
Any violation must be rejected.

---

## 1. Architecture Constraints

- Frontend: React + Vite (UI only)
- Backend: Node.js + Express + Prisma
- AI Service: Python FastAPI (STRICTLY READ-ONLY)
- Database: PostgreSQL
- Communication: REST APIs only

Rules:
- Frontend must NEVER access the database directly
- AI service must NEVER write to the database
- Backend is the ONLY layer allowed to mutate data

---

## 2. Core Production Model

- The system tracks **BATCHES**, not individual briefs
- A batch represents:
  - One cloth input
  - One brief type
  - A fixed quantity
- All items in a batch move together through production stages

NO per-brief tracking in the core workflow.

---

## 3. Production Workflow (STRICT ORDER)

CUTTING → STITCHING → QUALITY_CHECK → LABELING → FOLDING → PACKING

Rules:
- No stage skipping
- No backward movement in the main workflow
- A batch can be in ONLY ONE stage at a time

---

## 4. Batch Rules

- Each batch has:
  - currentStage
  - status (PENDING, IN_PROGRESS, COMPLETED, CANCELLED)
- Quantity must NEVER increase
- Batch is COMPLETED only after PACKING
- Usable + Defective + Scrapped = Total quantity

---

## 5. User Hierarchy & Roles (CRITICAL)

### Global Roles
- ADMIN
- MANAGER
- OPERATOR

Each user has exactly ONE role.

---

## 6. User Creation Rules (NO PUBLIC REGISTRATION)

- There is NO public signup or registration.
- Users are created ONLY by authorized roles:
  - ADMIN → creates MANAGER
  - MANAGER → creates OPERATOR
- ADMIN accounts are created manually in the database.

---

## 7. User Verification Rules (CRITICAL)

- MANAGERS created by ADMIN are auto-verified.
- OPERATORS created by MANAGER start as PENDING.
- An OPERATOR must be VERIFIED by a MANAGER before login.
- Verification rules:
  - Only ADMIN can verify MANAGERS.
  - Only the SAME MANAGER who created an OPERATOR can verify that OPERATOR.
  - Operators cannot verify anyone.
  - Self-verification is forbidden.
- Login must be denied if verificationStatus ≠ VERIFIED.

---

## 8. Manager–Operator Ownership (CRITICAL)

- Every OPERATOR has exactly ONE owning MANAGER.
- This ownership is defined at creation time.
- An OPERATOR:
  - Works only under their owning MANAGER
  - Cannot be verified, reassigned, or managed by another MANAGER
- Cross-manager access to operators is strictly forbidden.

---

## 9. Section Assignment & Isolation (CRITICAL)

- ADMIN must assign section(s) when creating a MANAGER.
- A MANAGER can operate ONLY within their assigned section(s).
- OPERATORS inherit section(s) from their owning MANAGER.
- Non-admin users MUST NOT:
  - View
  - Modify
  - Log
  data from unassigned sections.

---

## 10. Operator & Machine Rules

- Operators must:
  - Exist
  - Be VERIFIED
  - Be assigned to the batch’s current stage
- Machines must:
  - Exist
  - Be OPERATIONAL
- OUT_OF_ORDER machines cannot be used
- One production log may reference at most ONE machine

---

## 11. Production Logging

- Every stage start/end MUST create a production log
- Logs must include:
  - Batch
  - Stage
  - Operator (User with OPERATOR role)
  - Start time
  - End time
- End time ≥ start time

---

## 12. Quality & Defects (Quantity-Based)

- Quality check ONLY at QUALITY_CHECK stage
- Defects are recorded as quantities
- Defective quantity ≤ batch quantity

---

## 13. Rework / Return Flow (CRITICAL)

- Rework applies ONLY to defective quantities
- Rework is a sub-flow, NOT backward batch movement

Rework rules:
- Target stage: CUTTING or STITCHING only
- Rework quantity ≤ defective quantity
- Batch stage does NOT change
- Rework outcome:
  - CURED
  - SCRAPPED
- CURED + SCRAPPED = rework quantity
- Only CURED quantity rejoins the batch
- Only operators assigned to the rework stage may perform rework

---

## 14. Labeling Rules

- Labeling happens AFTER quality check and rework
- Only usable quantity enters labeling
- Quantity must NOT change during labeling
- Labeling has its own operators, logs, and access control

---

## 15. Packing & Export

- Only PACKING-stage batches can be packed
- Packing is quantity-based
- One box contains items from ONLY ONE batch
- Total boxed quantity ≤ usable batch quantity

---

## 16. Data Integrity & Audit

- No orphan records
- Foreign keys must be enforced
- All timestamps must be logical
- Historical logs must NEVER be deleted
- All critical actions must be auditable

---

## 17. AI System Rules

- AI service is STRICTLY READ-ONLY
- AI may analyze:
  - Production delays
  - Defects
  - Rework frequency
  - Performance
- AI may ONLY return:
  - Predictions
  - Alerts
  - Recommendations
- Backend decides whether to apply AI outputs

---

## 18. Enforcement

- Constraints must be checked BEFORE any database mutation
- Any violation → reject request
- No shortcuts or silent fixes are allowed