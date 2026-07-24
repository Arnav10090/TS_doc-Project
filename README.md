<div align="center">

# 📄 AI-Powered TS Document Generator

### *Intelligent Technical Specification Authoring for Hitachi India*

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

*Transform the way you create Technical Specification documents with AI-powered assistance, structured editing, and automated Word generation.*

[Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Architecture](#-architecture)

</div>

---

## 🌟 Overview

The **TS Document Generator** is a sophisticated web application designed for Hitachi India's engineering teams to streamline the creation of Technical Specification documents. Built with modern technologies and powered by AI, it replaces manual Word authoring with a guided, intelligent, and consistent document creation workflow.

### Why This Matters

- **⏱️ Save Time**: Reduce document creation time by 60% with AI-powered content suggestions
- **📋 Ensure Consistency**: Standardized structure across all TS documents
- **?? AI-Assisted**: Provider-backed suggestions grounded in historical TS documents
- **🎯 Category-Aware**: AI suggestions tailored to specific solution types (Data Analysis, OT Cybersecurity, Level 2, etc.)
- **📊 Rich Content**: Support for tables, diagrams, Gantt charts, and custom sections
- **🔄 Version Control**: Built-in revision history and document versioning

---

## ✨ Features

### 🎨 **Intelligent Document Authoring**

- **31 Pre-structured Sections**: From Executive Summary to Appendices
- **AI Content Suggestions**: Click a button to get category-specific, context-aware content
- **Custom Sections**: Add unlimited custom sections and subsections
- **Rich Text Editing**: Bullet points, tables, and formatted prose
- **Real-time Preview**: Live Word-style document preview with automatic Table of Contents

### 🤖 **AI-Powered Assistance**

- **Historical Knowledge Base**: Grounded in your organization's previous TS documents
- **Category-Specific Context**: Suggestions tailored to solution types (Historian, EMS, HSM, etc.)
- **Section-Aware Generation**: Understands the purpose of each section
- **Draw.io Integration**: Generate Gantt charts ready for draw.io import
- **Provider-Based AI Support**: Local Ollama by default, with Groq retained through configuration

### 📊 **Professional Output**

- **Word Export**: Generate polished `.docx` documents from templates
- **Automatic TOC**: Dynamic Table of Contents generation
- **List of Figures/Tables**: Automatically compiled and numbered
- **Revision History**: Auto-tracked changes with session management
- **Image Upload**: Architecture diagrams, Gantt charts, and custom visuals

### 🔧 **Developer-Friendly**

- **Modern Stack**: React 18 + TypeScript + FastAPI + PostgreSQL
- **Docker Compose**: One-command setup
- **REST API**: Well-documented FastAPI endpoints
- **Type Safety**: Full TypeScript on frontend, Pydantic on backend

---

## 🚀 Quick Start

### Prerequisites

Ensure you have the following installed:

- **Docker Desktop** (running) - [Download](https://www.docker.com/products/docker-desktop)
- **Git** - [Download](https://git-scm.com/downloads)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Arnav10090/TS_doc-Project.git
cd TS_doc-Project

# 2. Verify the template file exists
ls backend/templates/TS_Template_original.docx

# 3. Start all services (first time)
docker-compose up --build

# 4. In a new terminal, convert the Word template
docker-compose exec backend python scripts/convert_template.py

# 5. Open the application
# Frontend: http://localhost:5173
# API Docs: http://localhost:8000/docs
```

### Daily Usage

After initial setup, simply run:

```bash
docker-compose up
```

### Reset Database

To start fresh (⚠️ deletes all data):

```bash
docker-compose down -v && docker-compose up --build
```

---

## 🎯 How It Works

### 1️⃣ **Create a Project**

Select your TS type (e.g., *Data Analysis → Historian*) and enter project metadata. The system auto-populates standard sections.

### 2️⃣ **Author with AI**

Click **✨ AI Suggestions** in any section. The AI generates content grounded in:
- Your project metadata
- Historical TS documents from the same category
- Category-specific context files
- Current draft content

### 3️⃣ **Customize & Refine**

- Import AI suggestions with one click
- Edit content in a rich text editor
- Add custom sections where needed
- Upload diagrams and charts

### 4️⃣ **Generate Document**

Export a professional Word document that mirrors your organization's template, complete with TOC, revision history, and all custom content.

---

## 📚 Documentation

Comprehensive documentation is available in the `/docs` folder:

| Document | Description |
|----------|-------------|
| **[AI Suggestions API](docs/ai-suggestions-api.md)** | API endpoints and request/response schemas |
| **[AI Suggestions User Guide](docs/ai-suggestions-user-guide.md)** | End-user workflow and best practices |
| **[Deployment Guide](docs/ai-suggestions-deployment.md)** | Production deployment instructions |
| **[Migration Guide](docs/MIGRATION_GUIDE.md)** | Version migration procedures |
| **[Template Mapping](docs/TEMPLATE_SECTION_MAPPING.md)** | Section-to-template field mapping |

---

## 🏗️ Architecture

### System Overview

```
┌─────────────────┐
│   React + TS    │  ← Frontend (Port 5173)
│   + Vite        │
└────────┬────────┘
         │ REST API
┌────────▼────────┐
│    FastAPI      │  ← Backend (Port 8000)
│   + Pydantic    │
└────────┬────────┘
         │ SQLAlchemy ORM
┌────────▼────────┐
│   PostgreSQL    │  ← Database (Port 5432)
└─────────────────┘
```

### Technology Stack

**Frontend**
- React 18 with TypeScript
- Vite for blazing-fast builds
- TipTap for rich text editing
- Zustand for state management
- TailwindCSS for styling

**Backend**
- FastAPI (Python 3.11)
- SQLAlchemy ORM with async support
- Pydantic for validation
- python-docx + Jinja2 for Word generation
- Ollama for local AI assistance, or Groq when `AI_PROVIDER=groq`

**Infrastructure**
- PostgreSQL 15 database
- Docker Compose orchestration
- Volume persistence for uploads and documents

### Key Directories

```
TS-Doc_Project/
├── backend/
│   ├── app/
│   │   ├── ai_suggestions/    # AI feature module
│   │   ├── projects/          # Project management
│   │   ├── sections/          # Section CRUD
│   │   └── generation/        # DOCX generation
│   ├── templates/             # Word templates
│   └── uploads/               # User-uploaded images
├── frontend/
│   └── src/
│       ├── components/        # React components
│       ├── pages/             # Main pages
│       ├── api/               # API client
│       └── utils/             # Helpers and stores
├── ts_documents/              # Historical TS knowledge base
├── ts_context_files/          # Category-specific AI context
└── docs/                      # Documentation
```

---

## 🔑 Environment Setup

### Backend Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/ts_generator

# AI Suggestions Configuration
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma3:4b
OLLAMA_TIMEOUT=120
OLLAMA_KEEP_ALIVE=30m
OLLAMA_NUM_CTX=32768
OLLAMA_TEMPERATURE=0.2
OLLAMA_NUM_PREDICT=2048

# Optional: switch with AI_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
# Application
TS_DOCUMENTS_PATH=/app/ts_documents
TS_CONTEXT_PATH=/app/ts_context_files
UPLOAD_DIR=/app/uploads
```

> ⚠️ **Security Note**: Never commit `.env` files to version control. The `.gitignore` is configured to exclude them.

---

## 🧪 Testing

### Backend Tests

```bash
# Run all tests with coverage
docker-compose exec backend pytest

# Run specific test file
docker-compose exec backend pytest tests/test_ai_suggestions.py

# Run with verbose output
docker-compose exec backend pytest -v
```

### Frontend Tests

```bash
# Run unit tests
cd frontend && npm test

# Run E2E tests with Playwright
npm run test:e2e
```

---

## 📊 TS Type Categories

The AI suggestions are category-aware. Select from these TS types during project creation:

### **Data Analysis**
- Advanced Analysis → AutoML Platform
- Data Centralization → Historian, UGS
- Data Monitoring → EMS, HPMS, RAS

### **Level 2**
- Level 2 control systems

### **OT Cybersecurity**
- OT security solutions

### **OT Upgrades**
- HMI upgrades
- L2 upgrades  
- POC upgrades

### **Yard Management**
- HSM (Hot Strip Mill)
- Plate Mill

Each category has its own historical documents and context files that ground AI suggestions.

---

## 🛠️ Development

### Adding a New Section

1. **Backend**: Update `predefinedSectionContent.ts` with section schema
2. **Backend**: Add section handler in `sections/router.py`
3. **Frontend**: Create section editor component
4. **Template**: Add merge field to `TS_Template_original.docx`

### Extending AI Suggestions

1. **Context Files**: Add `context.txt` to category folders in `ts_context_files/`
2. **Prompts**: Customize prompts in `backend/app/ai_suggestions/builders.py`
3. **Historical Docs**: Place example documents in appropriate `ts_documents/` subfolder

---

## 🐛 Troubleshooting

### Issue: Docker containers won't start

**Solution**: Ensure Docker Desktop is running and ports 5173, 8000, 5432 are available.

```bash
docker-compose down
docker system prune
docker-compose up --build
```

### Issue: AI suggestions fail

**Solution**: Verify API keys are set correctly in `.env` and the key has sufficient quota.

### Issue: Template conversion errors

**Solution**: Ensure `TS_Template_original.docx` exists and manually verify Jinja2 tags after conversion.

Refer to `KIRO_REQUIREMENTS.md` section 4 for detailed template requirements.

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards

- **TypeScript**: Follow ESLint rules configured in `.eslintrc.cjs`
- **Python**: Follow PEP 8, use Black formatter
- **Commits**: Use conventional commit messages

---

## 📜 License

This project is proprietary software developed for Hitachi India. All rights reserved.

---

## 🙏 Acknowledgments

- **Hitachi India Engineering Team** for requirements and domain expertise
- **Ollama/Groq provider support** for powering AI suggestions
- **FastAPI** and **React** communities for excellent frameworks

---

## 📞 Support

For issues, questions, or feature requests:

- **GitHub Issues**: [Create an issue](https://github.com/Arnav10090/TS_doc-Project/issues)
- **Email**: arnavt292@gmail.com
- **Documentation**: Check the `/docs` folder first

---

<div align="center">

**[⬆ Back to Top](#-ai-powered-ts-document-generator)**

Made with ❤️ for Hitachi India

</div>

