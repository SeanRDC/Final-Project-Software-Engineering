<a id="readme-top"></a>

<!-- PROJECT SHIELDS -->
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Status](https://img.shields.io/badge/Status-Work_in_Progress-FF8C00?style=for-the-badge)](#)

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <h3 align="center">Backend API | HAU Clinic Records Management System</h3>

  <p align="center">
    The secure, RESTful backend engine powering the Holy Angel University Clinic Records Management System[cite: 15].
    <br />
    <br />
    <strong>Tags:</strong> <code>python</code>, <code>fastapi</code>, <code>postgresql</code>, <code>sqlalchemy</code>, <code>api</code>, <code>backend</code>, <code>jwt-auth</code>
  </p>
</div>

> **🚧 WORK IN PROGRESS:** This backend directory is actively under development as part of an ongoing CS-302 academic project. API routes, ORM models, and validation schemas are provisional and subject to change based on ongoing requirements gathering with the University Clinic[cite: 15].

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-backend">About The Backend</a>
      <ul>
        <li><a href="#tech-stack">Tech Stack</a></li>
      </ul>
    </li>
    <li><a href="#api-architecture">API Architecture</a></li>
    <li><a href="#directory-structure">Directory Structure</a></li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#environment-setup">Environment Setup</a></li>
        <li><a href="#running-the-server">Running the Server</a></li>
      </ul>
    </li>
  </ol>
</details>

<!-- ABOUT THE BACKEND -->
## About The Backend

This directory contains the Python-based backend infrastructure for the Clinic Records Management System. It exposes a secure REST API designed to handle create, view, update, and delete (CRUD) operations for patient information, consultation logs, and medicine inventory. All data processing and storage logic strictly adheres to the Data Privacy Act of 2012 to ensure confidentiality.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Tech Stack

* **Language:** Python 3.10+
* **Framework:** FastAPI *(Provisional)*
* **Database:** PostgreSQL
* **ORM:** SQLAlchemy
* **Validation:** Pydantic
* **Authentication:** JWT (JSON Web Tokens) with Role-Based Access Control (RBAC)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- API ARCHITECTURE -->
## API Architecture

The backend follows a standard multi-layer architecture to separate concerns, making it highly testable and scalable:
1. **Routers (`api/`):** Define the API endpoints and HTTP methods.
2. **Schemas (`schemas/`):** Pydantic models that validate incoming request payloads and serialize outgoing responses.
3. **Services (`services/`):** Contain the core business logic, preventing fat controllers.
4. **Models (`models/`):** SQLAlchemy classes mapping directly to the PostgreSQL database tables.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- DIRECTORY STRUCTURE -->
## Directory Structure

```text
backend/
├── app/                      # Main application module
│   ├── api/                  # API route handlers (e.g., patients.py, inventory.py)
│   ├── core/                 # App config, security, and DPA compliance middleware
│   ├── db/                   # Database session initialization and connection pooling
│   ├── models/               # SQLAlchemy ORM models
│   ├── schemas/              # Pydantic validation schemas
│   └── services/             # Business logic and database operations
├── tests/                    # Pytest suite (Unit & Integration tests)
├── .env.example              # Template for required environment variables
├── main.py                   # Application entry point / Server instantiation
└── requirements.txt          # Python dependency list

````

## Getting Started

Follow these instructions to set up the backend development environment locally.

### Prerequisites

- Python 3.10 or higher
- PostgreSQL
- `pip`

### Environment Setup

1. **Navigate to the backend directory:**

   Bash
   ```
   cd backend
   ```

2. **Create a virtual environment:**

   Bash
   ```
   python -m venv venv
   ```

3. **Activate the virtual environment:**
   - **Windows:**

     Bash
     ```
     venv\Scripts\activate
     ```
   - **macOS/Linux:**

     Bash
     ```
     source venv/bin/activate
     ```

4. **Install dependencies:**

   Bash
   ```
   pip install -r requirements.txt
   ```

5. **Configure environment variables:** Duplicate `.env.example` and rename it to `.env`. Update the placeholder values with your local database credentials:

   Code snippet
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/hau_clinic"
   SECRET_KEY="your_development_secret_key"
   DEBUG=True
   ```

### Running the Server

1. **Apply database migrations** (using Alembic, if initialized):

   Bash
   ```
   alembic upgrade head
   ```

2. **Start the development server** (assuming FastAPI with Uvicorn):

   Bash
   ```
   uvicorn main:app --reload
   ```

3. **Access API Documentation:** Open your browser and navigate to `http://localhost:8000/docs` to interact with the auto-generated Swagger UI.
