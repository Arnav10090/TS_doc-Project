# TS Document Generator — Local Setup

A local MVP application for Hitachi India that enables users to create professional Technical Specification documents through a structured form-based interface.

## Prerequisites

- **Docker Desktop** (running)
- **Git**

## Setup (First Time)

Follow these steps to set up the TS Document Generator for the first time:

### 1. Clone repository and navigate to directory

```bash
git clone <repository-url>
cd ts-generator
```

### 2. Ensure template file is in place

Verify that `TS_Template.docx` is located at:
```
backend/templates/TS_Template_original.docx
```

### 3. Start all services

Run the following command to build and start all Docker containers:

```bash
docker-compose up --build
```

This will start:
- PostgreSQL database (port 5432)
- FastAPI backend (port 8000)
- React frontend (port 5173)

### 4. Convert the Word template

In a new terminal window, run the template conversion script:

```bash
docker-compose exec backend python scripts/convert_template.py
```

**IMPORTANT:** After running the conversion script, you must manually verify that `TS_Template_jinja.docx` has the correct `{%tr for %}` tags in the features table.

**Reference:** See `KIRO_REQUIREMENTS.md` section 4 for detailed information about template conversion requirements.

### 5. Open the application

Navigate to:
```
http://localhost:5173
```

## Daily Use

To start the application after initial setup:

```bash
docker-compose up
```

## Reset Database

To reset the database and start fresh:

```bash
docker-compose down -v && docker-compose up --build
```

**Warning:** This will delete all projects, sections, and generated documents.

## API Documentation

FastAPI provides interactive API documentation at:
```
http://localhost:8000/docs
```

## Architecture

- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** FastAPI + Python 3.11
- **Database:** PostgreSQL 15
- **Orchestration:** Docker Compose

## Features

- 31 structured document sections
- Auto-save functionality (800ms debounce)
- Real-time completion tracking
- Image upload for diagrams
- AI prompt generation for diagrams
- Document version history
- Word document generation with Jinja2 templates

## Support

For issues or questions, please contact the Hitachi India development team.
