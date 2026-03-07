# Factory Production System

A batch-based production tracking system for garment manufacturing with strict role-based access control, approval workflows, and section isolation.

## 🎯 Project Overview

This system manages the complete lifecycle of garment production batches through multiple stages (Cutting → Stitching → Quality Check → Labeling → Folding → Packing) with a hierarchical user management system and approval-gated workflows.

### Key Features

- **Role-Based Access Control**: ADMIN → MANAGER → OPERATOR hierarchy
- **Batch Start Gate**: Batches must be started by a Manager before work can begin
- **Approval Workflows**: Production logs require Manager approval before batch progression
- **Quantity Ledger**: Strict tracking of output-to-input consistency across the entire lifecycle
- **Section Isolation**: Managers and Operators are restricted to assigned production sections
- **Verification System**: Operators must be verified by their creating Manager before login
- **Audit Trails**: Complete tracking of who created, verified, and approved each action

## 🏗️ Architecture

### Tech Stack

**Backend**:
- Node.js + Express.js
- PostgreSQL with Prisma ORM
- JWT Authentication with bcrypt
- Socket.IO for real-time dashboard refreshes
- RESTful API

**Frontend**:
- React 18 + Vite
- React Router for routing
- Axios for API calls
- Lucide React for iconography
- Context API for state management

### Database Schema

**Core Models**:
- `User` - ADMIN, MANAGER, OPERATOR with verification status
- `SectionAssignment` - Maps users to production stages
- `Batch` - Production batches with stage tracking and ledger pools
- `ProductionLog` - Work records with approval status
- `ReworkRecord` - Defect correction tracking with approval
- `DefectRecord` - Quality issues tracking
- `Machine` - Production equipment
- `Box` - Final product packaging (Internal)

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL (v14+)
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd con-proj
```

2. **Install dependencies**
```bash
# Backend
cd apps/backend
npm install

# Frontend
cd ../frontend
npm install
```

3. **Configure environment variables**

Create `apps/backend/.env`:
```env
DATABASE_URL="postgresql://factory_user:1234@localhost:5432/briefs_factory_db"
JWT_SECRET=your-super-secret-key-here
JWT_EXPIRES_IN=8h
PORT=5000
```

4. **Set up the database**
```bash
cd apps/backend

# Run migrations
npx prisma migrate dev

# Seed initial ADMIN account
npm run prisma:seed
```

5. **Start the development servers**
```bash
# Terminal 1 - Backend
cd apps/backend
npm run dev

# Terminal 2 - Frontend
cd apps/frontend
npm run dev
```

6. **Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

### Default Credentials

**Admin Account** (created by seed):
- Employee Code: `ADMIN001`
- Password: `admin123`

**Demo Manager** (if created):
- Employee Code: `EMP001`
- Password: `1234`

## 📁 Project Structure

```
con-proj/
├── apps/
│   ├── backend/
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── seed.js
│   │   │   └── migrations/
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   │   ├── authController.js
│   │   │   │   ├── userController.js
│   │   │   │   ├── dashboardController.js
│   │   │   │   └── approvalController.js
│   │   │   ├── middleware/
│   │   │   │   └── authMiddleware.js
│   │   │   ├── routes/
│   │   │   │   ├── authRoutes.js
│   │   │   │   ├── userRoutes.js
│   │   │   │   ├── dashboardRoutes.js
│   │   │   │   └── approvalRoutes.js
│   │   │   ├── utils/
│   │   │   │   ├── jwt.js
│   │   │   │   └── prisma.js
│   │   │   └── app.js
│   │   └── package.json
│   └── frontend/
│       ├── src/
│       │   ├── components/
│       │   │   ├── Layout/
│       │   │   ├── ProtectedRoute/
│       │   │   └── DashboardRedirect/
│       │   ├── context/
│       │   │   └── AuthContext.jsx
│       │   ├── pages/
│       │   │   ├── Login/
│       │   │   ├── AdminDashboard/
│       │   │   ├── ManagerDashboard/
│       │   │   └── OperatorDashboard/
│       │   ├── utils/
│       │   │   └── api.js
│       │   ├── App.jsx
│       │   └── main.jsx
│       └── package.json
├── docs/
│   ├── CONSTRAINTS.md
│   ├── PROJECT_TRACKER.md
│   └── AUTHORIZATION_EXAMPLES.md
└── README.md
```

## 🔐 User Roles & Permissions

### ADMIN
- **Capabilities**:
  - Create Manager accounts
  - Assign Managers to production sections
  - View global factory statistics (read-only)
  - Access system health logs
- **Restrictions**:
  - Cannot approve production work (governance-only role)

### MANAGER
- **Capabilities**:
  - Create Operator accounts (inherit Manager's sections)
  - Verify Operators (PENDING → VERIFIED)
  - Approve/Reject production logs
  - Approve/Reject rework records (for defects originating in their section)
  - View team members and their work
  - View active batches in assigned sections
- **Restrictions**:
  - Can only manage Operators they created
  - Limited to assigned production sections
  - Cannot approve work from other Managers' operators

### OPERATOR
- **Capabilities**:
  - Log production work (PENDING status)
  - Record defects and rework
  - View personal work history
  - View batches in assigned section
- **Restrictions**:
  - Must be VERIFIED to log in
  - Limited to assigned production sections
  - Cannot approve own work

## 🎨 Current Features

### ✅ Fully Implemented

- **Authentication System**
  - Employee code-based login
  - JWT token management
  - Password hashing with bcrypt
  - Auto-logout on token expiration

- **Admin Dashboard**
  - System statistics (users, batches, sections)
  - Create Manager accounts with section assignment
  - Create new batches (cloth intake planning)
  - System health monitoring

- **Manager Dashboard**
  - Production approval queue
  - Rework approval queue
  - Team overview with verification status
  - Create Operator accounts
  - Verify Operators (one-click)
  - Create new batches (section isolation enforced)
  - Active batches in assigned sections

- **Operator Dashboard**
  - View batches in assigned section (section isolation enforced)
  - Log production work with time tracking
  - Work log modal with validation (endTime >= startTime)
  - Personal work history with approval status
  - All logs created with PENDING status (requires Manager approval)

- **User Management**
  - Hierarchical user creation (ADMIN → MANAGER → OPERATOR)
  - Section inheritance (Operators inherit Manager's sections)
  - Verification workflow (PENDING → VERIFIED)
  - Ownership tracking and enforcement

- **Authorization**
  - Role-based middleware
  - Section isolation
  - Ownership checks
  - Admin governance bypass (read-only)

- **Production Workflow**
  - Batch creation (ADMIN/MANAGER with section isolation)
  - **Batch Start Gate**: Manager must explicitly start a batch before operators see it
  - **Work Isolation**: Operators only see batches active in their station that aren't pending approval
  - Manager approval workflow with automated stage advancement
  - Section-based batch filtering and real-time dashboard refreshes (Socket.IO)

- **Operator Section Transfer**
  - Select operator → Target section → Target Manager workflow
  - Approval-gated mobility (Constraint 12)
  - Auto-cleanup of stale assignments (Constraint 9)
  - Ownership preservation (Constraint 8)

- **Rework Management (Direct-Fix Model)**
  - Direct Sectional routing (Cutting/Stitching handle their own fixes)
  - Manager approval workflow locked to origin section
  - Dynamic "Log Rework" actions on Operator Dashboard
  - Static rework stage assignment (No mediator dropdown)

- **Advanced Production Stages**
  - **Labeling, Folding, Packing**: Strict quantity gating (Input = Output = Usable).
  - **Packing & Export**: Box creation and batch completion on approval.
  - **Quality Check (Ledger Model)**: Strict tracking of Cleared, Defective, Cured, and Scrapped quantities. Pool-based inspection (Initial vs Re-QC).
  - **Quantity Integrity**: Mid-flow quantity fixes ensure "Previous Out = Current In" consistency (e.g., Stitching receives exactly what Cutting produced).

### ❌ Not Yet Implemented

- *None - All core functional requirements are satisfied.*

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - Login with employee code and password

### User Management
- `POST /api/users/manager` - Create Manager (Admin only)
- `POST /api/users/operator` - Create Operator (Manager only)
- `PATCH /api/users/:id/verify` - Verify Operator (Manager only)
- `GET /api/users` - Get all users (Admin only)

### Dashboards
- `GET /api/dashboard/admin` - Admin statistics
- `GET /api/dashboard/manager` - Manager data (team, approvals, batches)
- `GET /api/dashboard/operator` - Operator data (batches, logs)

### Approvals
- `PATCH /api/approvals/production/:id/approve` - Approve production log
- `PATCH /api/approvals/production/:id/reject` - Reject production log
- `PATCH /api/approvals/rework/:id/approve` - Approve rework record

## 🧪 Testing the System

### API-Based End-to-End Verification (NEW)
The system includes a robust E2E test suite that simulates a complete 100-unit batch lifecycle.

**Run the E2E Test Suite:**
```bash
cd apps/backend
npm run test:e2e
```

**What the E2E test verifies:**
1. High-fidelity batch creation and user setup.
2. Full 9-stage production traversal (Cutting → Packing).
3. Complex Quality Check ledger balancing (Initial QC vs Re-QC).
4. Sectional Rework routing and cross-section approval authority.
5. Final Batch Completion with 100% quantity integrity.

### Manual End-to-End Workflow

1. **Login as Admin** (`ADMIN001` / `admin123`)
   - Create a Manager with sections (e.g., CUTTING, STITCHING)

2. **Login as Manager** (use credentials you created)
   - Create an Operator
   - Verify the Operator (click "Verify" button)

3. **Login as Operator** (use credentials you created)
   - View assigned section
   - (Work logging UI coming soon)

4. **Back to Manager**
   - View approval queue
   - Approve/Reject work

## 📊 Database Migrations

All migrations are in `apps/backend/prisma/migrations/`:

1. `20260204083945_init` - Initial schema
2. `20260206034554_approval_and_audit_final` - Approval fields for ProductionLog
3. `20260207090611_sync_rework_approval_fields` - Approval fields for ReworkRecord

To reset the database:
```bash
cd apps/backend
npx prisma migrate reset
npm run prisma:seed
```

## 🐛 Known Issues & Fixes

All critical issues have been resolved:
- ✅ JWT_SECRET configuration
- ✅ Manager Dashboard 500 error (ReworkRecord schema sync)
- ✅ Login case sensitivity (normalized to uppercase)
- ✅ Admin bypass for read operations

## 🛣️ Roadmap

### 🎉 Phase 1: Completed
- [x] Hierarchical RBAC & Governance
- [x] Full Production Workflow (Cutting → Packing)
- [x] Direct Sectional Rework Model
- [x] Quality Control & Defect Tracking
- [x] Automated Time Capture & Hardening
- [x] Production Analytics Dashboard
- [x] QC Ledger Model (Quantity Integrity & Re-QC)
- [x] API-Based E2E Production Lifecycle Test
- [x] Batch Start Approval Gate
- [x] Shipment Removal & Dashboard Consolidation

## 📝 Documentation

- `docs/CONSTRAINTS.md` - Business rules and data integrity requirements
- `docs/PROJECT_TRACKER.md` - Complete development timeline and daily logs
- `docs/AUTHORIZATION_EXAMPLES.md` - Middleware usage examples

## 🤝 Contributing

This is a private factory management system. For questions or issues, contact the development team.

## 📄 License

Proprietary - All rights reserved

---

**Current Status**: 100% Complete | **Last Updated**: March 06, 2026
