# BRIEFSYNC | Industrial Intelligence Platform

A high-fidelity, batch-based production tracking and industrial intelligence system designed for modern manufacturing. BRIEFSYNC provides real-time visibility, AI-driven performance synthesis, and strict governance across the production floor.

# Project Overview

BRIEFSYNC is a comprehensive manufacturing execution system (MES) designed to digitize the complete lifecycle of garment production. By tracking batches through a modular traversal system—from initial cutting to final packing—it eliminates manual paperwork and provides stakeholders with actionable data.

**Problem Solved**: Manufacturing floors often suffer from fragmented data, lack of real-time visibility, and complex quality control loops. BRIEFSYNC solves this by enforcing a strict role-based governance model and unifying all production metrics into an AI-enhanced dashboard.

**Target Users**: 
*   **Factory Owners/Admins**: Seeking executive-level intelligence and system-wide governance.
*   **Production Managers**: Managing approval workflows, team verification, and sectional throughput.
*   **Station Operators**: Logging real-time production units and quality metrics at specific workstations.

**Key Capabilities**:
*   Automated AI synthesis of daily production performance.
*   Strict quantity integrity via a specialized Quality Control Ledger.
*   Real-time factory timeline synchronization via WebSockets.
*   Professional PDF reporting for executive shareholders.

# Features

*   **Role-Based Access Control (RBAC)**: Fine-grained permissions for Admin, Manager, and Operator roles.
*   **AI Executive Summaries**: Localized LLM (Ollama) integration for generating strategic production insights.
*   **Live Production Timeline**: A real-time stream of all factory-floor activities using Socket.IO.
*   **Multi-Stage Tracking**: Structured batch traversal through Cutting, Stitching, QC, Labeling, Folding, and Packing.
*   **Quality Ledger Model**: Professional defect tracking with support for re-QC passes and rework loops.
*   **Interactive Analytics**: Responsive chart suites for stage efficiency, operator performance, and yield analysis.
*   **PDF Intelligence Reports**: One-click generation of high-fidelity production reports with embedded charts.

# System Architecture

BRIEFSYNC utilizes a modular monorepo architecture designed for scalability and high-performance data processing.

*   **Frontend**: A modern Single Page Application (SPA) built with React 19, focusing on high-density data visualization and low-latency interaction.
*   **Backend**: A RESTful API built on Express 5, implementing strict Zod validation and structured repository patterns.
*   **Database**: A relational PostgreSQL database managed through the Prisma ORM for type-safe queries and logical migrations.
*   **AI Layer**: A dedicated intelligence engine that interfaces with a local Ollama instance to perform off-line inference on production datasets.
*   **Infrastructure**: Layered monorepo with absolute path aliases (`#backend`, `#frontend`, `#infra`, `#ai`) for clean dependency management.

# Technology Stack

*   **Frontend**: React 19, Vite, Tailwind CSS 4, Framer Motion, Recharts, Lucide Icons.
*   **Backend**: Node.js, Express 5, Socket.IO, JSON Web Tokens (JWT), BcryptJS.
*   **Database**: PostgreSQL, Prisma ORM.
*   **AI / ML**: Ollama (LLM Engine), Llama 3 (Model), Zod (Schema Validation).
*   **Tools**: Axios, jsPDF, html2canvas, Nodemon.

# Project Folder Structure

```text
con-proj/
├── Backend/             # Express API, Controllers, and Business Logic
│   └── src/             # Application source code
├── Frontend/            # React Client Application
│   └── src/             # Components, Pages, and Global Context
├── AI/                  # Intelligence Engine and Inference Pipelines
│   └── inference/       # Local LLM prompting and synthesis logic
├── Infrastructure/      # Shared assets and Database configuration
│   └── database/        # Prisma Schema, Migrations, and Seeding Scripts
├── docs/                # Technical documentation and system constraints
├── package.json         # Workspace manifest and root automation scripts
└── README.md            # Project documentation
```

# Installation Guide

### Prerequisites
*   **Node.js**: v20.0.0 or higher
*   **PostgreSQL**: v14.0 or higher
*   **Ollama**: Installed and running locally (required for AI features)

### Step-by-Step Setup

1.  **Clone the Repository**
    ```bash
    git clone <repository-url>
    cd con-proj
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Environment Configuration**
    Create a `.env` file in the root directory (and specifically in `Backend/` if required):
    ```env
    DATABASE_URL="postgresql://user:password@localhost:5432/briefsync_db"
    JWT_SECRET="your_secure_secret"
    OLLAMA_HOST="http://localhost:11434"
    PORT=5000
    ```

4.  **Database Initialization**
    ```bash
    # Generate Prisma Client
    npm run prisma:generate
    
    # Run Migrations
    npm run prisma:migrate
    
    # Seed Initial Data (Admin Account + Sections)
    npm run prisma:seed:rich
    ```

5.  **Running the Platform**
    
    *   **Terminal 1 (Backend)**:
        ```bash
        npm run dev:backend
        ```
    *   **Terminal 2 (Frontend)**:
        ```bash
        npm run dev:frontend
        ```

# Usage

After installation, access the platform at `http://localhost:5173`.

*   **Administrators**: Use the Admin Hub to create Manager partitions and view factory-wide executive intelligence.
*   **Managers**: Access the Operations Center to approve operator logs, verify new team members, and monitor active batches.
*   **Operators**: Access the Production Terminal to log work, track personal history, and view workstation assignments.

# API Endpoints

| Endpoint | Method | Purpose |
| :--- | :--- | :--- |
| `/api/auth/login` | POST | Authenticate user via Employee Code |
| `/api/dashboard/admin` | GET | Comprehensive factory statistics (Admin) |
| `/api/ai/report` | POST | Generate/Regenerate AI synthesis using Ollama |
| `/api/approvals/production/:id/approve` | PATCH | Approve an operator's production submission |
| `/api/analytics/summary` | GET | Aggregated throughput and defect metrics |
| `/api/users/operator` | POST | Create a new production operator (Manager) |

# AI / ML Components

BRIEFSYNC leverages a local **Ollama** engine to maintain data privacy while providing enterprise-grade insights.

*   **Model**: Llama 3 (8B) optimized for high-speed local inference.
*   **Workflow**: The backend aggregates raw production records into a structured CSV/JSON summary, which is then passed to the AI engine with a specific "Industrial Analyst" prompt.
*   **Optimization**: Implements a deterministic hashing mechanism for report caching to avoid redundant LLM invocations for identical datasets.
*   **Validation**: All AI outputs are validated against a strict Zod schema to ensure JSON structure integrity before UI rendering.

# Deployment

### Containerization
A production-ready `Dockerfile` (to be added) can be used to wrap the Node.js backend. The frontend should be built and served as static assets.

### Cloud Configuration
*   **Database**: AWS RDS (PostgreSQL) or similar.
*   **Storage**: S3 for persistent PDF storage if necessary.
*   **Inference**: A dedicated EC2 instance with GPU support is recommended for Ollama if running in the cloud.

# Screenshots or Demo

*   **Live UI Preview**: [Insert Screenshot URL Here]
*   **Interactive Demo**: [Insert Link to Staging/Demo Environment]

# Future Improvements

*   **IoT Integration**: Direct machine-to-cloud logging via MQTT/ESP32.
*   **Mobile App**: Dedicated Flutter or React Native app for floor supervisors.
*   **Predictive Maintenance**: Using production logs to predict machine failure points.
*   **Inventory Tracking**: Integration with raw material procurement (WMS).

# Contributing

1.  Fork the repository.
2.  Create a feature branch (`git checkout -b feature/NewFeature`).
3.  Commit your changes (`git commit -m 'Add some NewFeature'`).
4.  Push to the branch (`git push origin feature/NewFeature`).
5.  Open a Pull Request.

# License

Proprietary - All rights reserved. Registered to BRIEFSYNC Industrial Systems.

# Author / Credits

*   **Lead Architect**: Project Team
*   **Core Contributors**: BRIEFSYNC Development Partners

---
*Last Protocol Update: March 2026*
