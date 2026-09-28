<a id="readme-top"></a>

<!-- PROJECT SHIELDS -->
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Status](https://img.shields.io/badge/Status-Work_in_Progress-FF8C00?style=for-the-badge)](#)
[![Data Privacy Act](https://img.shields.io/badge/DPA_2012-Compliant-2EC866?style=for-the-badge)](#)

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <h3 align="center">Holy Angel University Clinic Records Management System<br/><em>(Working Title)</em></h3>

  <p align="center">
    A secure, database-driven application designed to digitize and streamline the record-keeping process for the Holy Angel University Clinic.
    <br />
    <br />
    <strong>Tags:</strong> <code>python</code>, <code>backend</code>, <code>health-tech</code>, <code>crud</code>, <code>database-management</code>, <code>api</code>, <code>data-privacy</code>, <code>wip</code>
  </p>
</div>

> **🚧 WORK IN PROGRESS:** This repository represents an active, early-stage academic project. The project name, proposed features, database schema, and system architecture outlined below are provisional. They serve as a working foundation and are subject to change as requirements are actively gathered and finalized in coordination with the University Clinic.

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li><a href="#key-features">Key Features</a></li>
    <li><a href="#system-architecture">System Architecture</a></li>
    <li><a href="#database-schema-provisional">Database Schema</a></li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#project-structure">Project Structure</a></li>
    <li><a href="#contributors">Contributors</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->
## About The Project

This project is a final academic requirement currently in development by third-year Computer Science students from section CS-302 of Holy Angel University, under the guidance of Prof. Evicen Flores. 

The primary objective is to transition the University Clinic from a manual, paper-based system to a digitized, secure database application. By building this system, the goal is to help the clinic save time on record-keeping, reduce paperwork and potential human errors, and ensure that records can be retrieved quickly and securely. The system architecture is designed from the ground up with strict adherence to the Data Privacy Act of 2012 (Republic Act No. 10173), ensuring all voluntarily shared data is treated with utmost confidentiality.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Built With

* **Backend Engine:** Python 3.10+
* **Framework:** FastAPI / Flask *(Provisional)*
* **Database:** PostgreSQL *(Provisional)*
* **ORM:** SQLAlchemy *(Provisional)*

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- KEY FEATURES -->
## Key Features

* **Comprehensive CRUD Operations:** Authorized clinic personnel will be able to create, view, update, and delete vital clinic records.
* **Patient Information Management:** Secure storage and retrieval of student, faculty, and staff medical profiles.
* **Consultation Logs:** Digitized tracking of daily clinic visits, symptoms, diagnoses, and treatments provided.
* **Medicine Inventory Tracking:** Monitoring of clinic supplies and medication stocks to manage inventory.
* **Privacy-First Design:** Role-based access control (RBAC) ensuring no actual patient records are collected or disclosed without proper authorization.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- SYSTEM ARCHITECTURE -->
## System Architecture *(Working Draft)*

```mermaid
graph TD
    Client[Client Browser / Frontend] -->|HTTPS Requests| API[Python Backend API]
    API -->|Read/Write| Auth[Authentication Middleware]
    Auth -->|Validates| API
    API -->|Queries| DB[(Relational Database)]

    subgraph Data Modules
    DB --> P[Patients]
    DB --> C[Consultations]
    DB --> I[Inventory]
    end

````

## Database Schema *(Provisional)*

| **Table Name** | **Primary Key** | **Foreign Keys** | **Description**                                          |
| -------------- | --------------- | ---------------- | -------------------------------------------------------- |
| `users`        | `user_id`       | None             | Authorized clinic personnel credentials and role levels. |
| `patients`     | `patient_id`    | None             |                                                          |

Core patient information (demographics).   

| `consultations` | `consultation_id` | `patient_id`, `user_id` |   |
| --------------- | ----------------- | ----------------------- | - |

Logs of clinic visits and medical notes.   

| `inventory` | `item_id` | None |   |
| ----------- | --------- | ---- | - |

Tracks medicine and medical supplies stock levels.   

| `prescriptions` | `prescription_id` | `consultation_id`, `item_id` | Junction table tracking medicines dispensed during a consultation. |
| --------------- | ----------------- | ---------------------------- | ------------------------------------------------------------------ |

## Getting Started

As the project has just been initialized, follow these steps to set up the preliminary backend environment.

### Prerequisites

- Python 3.10+
- PostgreSQL server running locally or via Docker
- pip

  Bash
  ```
  python -m pip install --upgrade pip
  ```

### Installation

1. Clone the repository

   Bash
   ```
   git clone [https://github.com/HAU-CS302/clinic-records-system.git](https://github.com/HAU-CS302/clinic-records-system.git)
   ```
2. Navigate to the backend directory

   Bash
   ```
   cd clinic-records-system/backend
   ```
3. Create and activate a virtual environment

   Bash
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
4. Install dependencies

   Bash
   ```
   pip install -r requirements.txt
   ```
5. Set up your `.env` file

   Code snippet
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/hau_clinic"
   SECRET_KEY="your_secret_key"
   ```

## Roadmap

- [x] **Phase 1: Project Initialization & Approval**
  - [x] Project proposal and preliminary system architecture planning.
  - [x] Official request for support and cooperation submitted to the Holy Angel University Clinic.   
- [ ] **Phase 2: Requirements Gathering *(Current Phase)***
  - [ ] Conduct interviews with clinic personnel regarding current record-keeping processes.   
  - [ ] Analyze sample copies of forms and logbooks (de-identified)[cite: 15].
- [ ] **Phase 3: Database & API Development**
  - [ ] Construct PostgreSQL schemas for patients, consultations, and inventory[cite: 15].
  - [ ] Build secure RESTful API endpoints in Python.
- [ ] **Phase 4: Prototyping & Integration**
  - [ ] Connect frontend interface to backend endpoints.
  - [ ] Implement Data Privacy Act compliant security measures[cite: 15].
- [ ] **Phase 5: Evaluation & Testing**
  - [ ] System testing and evaluation involving participating clinic personnel[cite: 15].
  - [ ] Final deployment and turnover.

## Project Structure *(Provisional)*

Plaintext

```
clinic-records-system/
├── backend/                  # Python backend directory
│   ├── app/                  # Main application code
│   │   ├── api/              # API routers and endpoints
│   │   ├── core/             # Configuration and security (JWT, DPA compliance)
│   │   ├── models/           # SQLAlchemy database models
│   │   ├── schemas/          # Pydantic validation schemas
│   │   └── services/         # Business logic (CRUD operations)
│   ├── tests/                # Pytest unit and integration tests
│   ├── .env.example          # Environment variables template
│   ├── requirements.txt      # Python dependencies
│   ├── main.py               # Application entry point
|   └── BACKEND-README.md     # Readme documentation for backend.
├── docs/                     # Project documentation
│   ├── Clinic_Support_Letter_CS-302-1-FINAL.pdf # Official project request letter
│   ├── database_schema.md    # Detailed ERD and table structures
|   └── DOCS-README.md        # Readme documentation for docs.
├── .gitignore
└── README.md

```

## Contributors

Developed by Section CS-302 Students:

- **Sean Jarin Dela Cruz**

- **Mikko Brandon B. Panergo**

- **Bernard Rodriguez Jr.**
  
- **Gil Miranda**

- **Mclaren Ais Miranda**

- **Miguel Villanueva**


**Project Adviser:**

- **Prof. Evicen Flores**
