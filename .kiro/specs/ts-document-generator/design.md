# Design Document: TS Document Generator

## Overview

The TS Document Generator is a local MVP application that enables Hitachi India employees to create professional Technical Specification documents through a structured form-based interface. The system architecture follows a three-tier design with a React TypeScript frontend, FastAPI Python backend, and PostgreSQL database, all orchestrated via Docker Compose for local deployment.

### Core Design Principles

1. **Local-First Architecture**: No cloud dependencies, authentication, or external services required
2. **Auto-Save Everything**: 800ms debounced persistence ensures no data loss
3. **Reactive State Management**: Zustand store enables instant UI updates across all components
4. **Template-Driven Generation**: Jinja2 templating with docxtpl for Word document rendering
5. **Progressive Completion**: Visual feedback on section completion status guides users through the 31-section workflow

### Key Technical Decisions

**Why Docker Compose?**
- Single-command deployment for development and demonstration
- Consistent environment across different machines
- Isolated services with clear dependency management

**Why Zustand over Redux?**
- Minimal boilerplate for simple global state (project metadata, completion status)
- Direct store access without context providers
- Sufficient for MVP scope with 5-6 global state fields

**Why Tiptap for Rich Text?**
- Modern React-first editor with TypeScript support
- Extensible toolbar configuration
- HTML output compatible with backend processing

**Why docxtpl over python-docx?**
- Native Jinja2 template support in Word documents
- Preserves complex formatting from original template
- Enables non-technical template updates by modifying .docx file

**CRITICAL: Template Conversion Requirements**

The system requires a Jinja2-compatible Word template (`TS_Template_jinja.docx`) created from the original template (`TS_Template_original.docx`). This conversion must:

1. **Replace static text with Jinja2 variables** for all user-editable sections
2. **Preserve locked section content** (Binding Conditions, Cybersecurity, Disclaimer) as static text
3. **Use lowercase variable names** (e.g., `{{ architecture_diagram }}` not `{{ ARCHITECTURE_DIAGRAM }}`)
4. **Replace Section 3.2 (Remote Support) boilerplate** with `{{ RemoteSupportText }}` placeholder

**Known Gap:** The requirements specify a conversion script (Requirement 52) that transforms the original template, but Section 3.2 (Remote Support) contains hardcoded boilerplate text that must be manually replaced with `{{ RemoteSupportText }}` in the Jinja2 template. Without this replacement, user edits to the Remote Support section will not appear in generated documents.

**Verification:** After template conversion, search the .docx file (unzip and check document.xml) for the Remote Support boilerplate text. If found, replace it with the Jinja2 variable.

**Why Async SQLAlchemy?**
- Future-proof for potential async operations (file uploads, external integrations)
- Better performance for concurrent requests
- Aligns with FastAPI's async-first design

## Architecture

### System Context

```mermaid
graph TB
    User[Hitachi India Employee]
    Browser[Web Browser<br/>localhost:5173]
    Frontend[React Frontend<br/>Vite Dev Server]
    Backend[FastAPI Backend<br/>Port 8000]
    DB[(PostgreSQL 15<br/>Port 5432)]
    FS[File System<br/>uploads/]
    Template[Word Template<br/>TS_Template_jinja.docx]
    
    User -->|Interacts| Browser
    Browser -->|HTTP| Frontend
    Frontend -->|REST API| Backend
    Backend -->|SQL| DB
    Backend -->|Read/Write| FS
    Backend -->|Render| Template
    Backend -->|Generated .docx| Browser
```

### Container Architecture

The application consists of three Docker containers orchestrated by Docker Compose:

1. **Frontend Container** (Node 20 Alpine)
   - Vite development server with hot module replacement
   - Proxies `/api` and `/uploads` requests to backend
   - Serves React SPA on port 5173

2. **Backend Container** (Python 3.11 Slim)
   - FastAPI application with Uvicorn ASGI server
   - Runs Alembic migrations on startup
   - Exposes REST API on port 8000
   - Mounts `uploads/` volume for persistent file storage

3. **Database Container** (PostgreSQL 15 Alpine)
   - Persistent volume for data storage
   - Health check ensures backend waits for DB readiness
   - Exposes port 5432 for development access

### Component Architecture

```mermaid
graph TB
    subgraph Frontend
        Pages[Pages<br/>Home, Editor]
        Components[Components<br/>31 Section Components]
        Store[Zustand Store<br/>Project State]
        Hooks[Custom Hooks<br/>useAutoSave]
        API[API Client<br/>Axios]
    end
    
    subgraph Backend
        Router[FastAPI Routers<br/>Projects, Sections, Generation]
        Service[Service Layer<br/>Business Logic]
        Models[SQLAlchemy Models<br/>ORM]
        ContextBuilder[Context Builder<br/>Jinja2 Mapping]
        DocxGen[Document Generator<br/>docxtpl]
    end
    
    subgraph Database
        ProjectsTable[(projects)]
        SectionsTable[(section_data)]
        VersionsTable[(document_versions)]
    end
    
    Pages --> Components
    Components --> Store
    Components --> Hooks
    Hooks --> API
    API -->|HTTP| Router
    Router --> Service
    Service --> Models
    Models --> ProjectsTable
    Models --> SectionsTable
    Models --> VersionsTable
    Service --> ContextBuilder
    ContextBuilder --> DocxGen
```

### Data Flow: Document Generation

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant DB
    participant FileSystem
    
    User->>Frontend: Click "Generate Document"
    Frontend->>Backend: POST /api/v1/projects/{id}/generate
    Backend->>DB: Fetch project + all section_data
    Backend->>Backend: Validate required sections complete
    alt Missing Required Sections
        Backend-->>Frontend: HTTP 422 + missing section keys
        Frontend-->>User: Display missing sections as links
    else All Sections Complete
        Backend->>Backend: Build Jinja2 context from section data
        Backend->>FileSystem: Load TS_Template_jinja.docx
        Backend->>Backend: Render template with context
        Backend->>FileSystem: Save to uploads/versions/{project_id}/
        Backend->>DB: Create document_version record
        Backend-->>Frontend: Return .docx file as blob
        Frontend->>Frontend: Create download link
        Frontend-->>User: Trigger browser download
    end
```

### State Management Architecture

**Zustand Store Structure:**
```typescript
interface ProjectStore {
  projectId: string | null;
  solutionName: string;
  solutionFullName: string;
  clientName: string;
  clientLocation: string;
  sectionCompletion: Record<string, boolean>;
  
  setProject: (project: ProjectDetail) => void;
  setSolutionName: (name: string) => void;
  setSectionComplete: (key: string, complete: boolean) => void;
  clearProject: () => void;
}
```

**Critical State Synchronization:**
- When user updates `solution_name` in Cover Section → `setSolutionName()` → All components reading `solutionName` re-render
- Used in: section titles, table row labels, hardware specs rows 5-6, locked section bodies
- Ensures consistency across 31 sections without prop drilling



## Components and Interfaces

### Frontend Components

#### Page Components

**HomePage** (`src/pages/Home.tsx`)
- Displays project list with completion badges
- "New Project" button opens NewProjectModal
- Each project card shows: solution name, client name/location, creation date, completion percentage
- "Open →" button navigates to Editor page
- "Download Latest" button fetches most recent document version
- "Delete" button with confirmation dialog

**EditorPage** (`src/pages/Editor.tsx`)
- Two-column layout: fixed 260px sidebar + scrollable content area
- Loads project data and populates Zustand store on mount
- Renders SectionSidebar and active section component
- Handles section navigation via URL parameter

#### Layout Components

**SectionSidebar** (`src/components/layout/SectionSidebar.tsx`)
- Fixed left panel with 7 section groups
- Displays 31 sections with completion badges (✅ complete, 🟡 visited, ⚪ not started)
- Highlights active section with red border
- Progress indicator: "X / 27 sections complete" (excludes 4 auto-complete locked sections)
- "Generate Document" button at bottom
- Handles missing section validation errors by displaying clickable links

**Header** (`src/components/layout/Header.tsx`)
- Displays "HITACHI" wordmark in #E60012
- Shows current project solution name
- Back to home navigation

#### Section Components (31 Total)

All section components follow this pattern:
```typescript
interface SectionProps {
  projectId: string;
}

const SectionComponent: React.FC<SectionProps> = ({ projectId }) => {
  const [content, setContent] = useState<SectionContentType>({});
  const { save, status } = useAutoSave(projectId, 'section_key', 800);
  
  useEffect(() => {
    // Load section data from API
  }, [projectId]);
  
  const handleChange = (field: string, value: any) => {
    const updated = { ...content, [field]: value };
    setContent(updated);
    save(updated);
  };
  
  return (
    <div className="section-card">
      {/* Section-specific UI */}
      <AutoSaveIndicator status={status} />
    </div>
  );
};
```

**Key Section Components:**

- **CoverSection**: Global project fields (solution_full_name, client_name, client_location, ref_number, doc_date, doc_version)
- **RevisionHistory**: Editable table with add/remove rows
- **ExecutiveSummary**: Locked boilerplate + rich text editor for project-specific paragraph
- **AbbreviationsSection**: 14 default rows (13 locked, 1 editable for solution abbreviation) + dynamic rows
- **FeaturesSection**: Dynamic list with drag-drop reordering using @dnd-kit/sortable
- **SystemConfigSection**: AI prompt generator + image upload for architecture diagram
- **TechStackSection**: 6 fixed rows with locked component names, editable technology fields
- **HardwareSpecsSection**: 6 fixed rows with dynamic solution name in rows 5-6
- **OverallGanttSection**: AI prompt generator + image upload
- **BindingConditionsSection**: Locked read-only content with 🔒 badge

#### Shared Components

**RichTextEditor** (`src/components/shared/RichTextEditor.tsx`)
```typescript
interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}
```
- Tiptap editor with toolbar: Bold, Italic, Underline, Bullet List, Ordered List, Clear Formatting
- Outputs HTML string
- Minimal styling with Hitachi color scheme

**EditableTable** (`src/components/shared/EditableTable.tsx`)
```typescript
interface EditableTableProps {
  columns: Array<{
    key: string;
    label: string;
    locked?: boolean;
    multiline?: boolean;
  }>;
  rows: Array<Record<string, any>>;
  onChange: (rows: Array<Record<string, any>>) => void;
  onAddRow?: () => void;
  onDeleteRow?: (index: number) => void;
  lockedRows?: number[];
}
```
- Renders table with locked/editable cells
- Grey background for locked cells with 🔒 icon
- Add/delete row buttons
- Text inputs for editable cells

**DynamicList** (`src/components/shared/DynamicList.tsx`)
```typescript
interface DynamicListProps {
  items: string[];
  onChange: (items: string[]) => void;
  addButtonLabel?: string;
  minItems?: number;
}
```
- Renders list of text inputs
- "Add Item" button appends new input
- Delete ✕ button for each item (respects minItems)
- Used for buyer prerequisites, custom documentation items, etc.

**DiagramUpload** (`src/components/shared/DiagramUpload.tsx`)
```typescript
interface DiagramUploadProps {
  projectId: string;
  imageType: 'architecture' | 'gantt_overall' | 'gantt_shutdown';
  onUploadSuccess?: () => void;
}
```
- react-dropzone for drag-drop file upload
- Validates PNG/JPG, max 10MB
- Displays thumbnail with "Change" and "Remove" buttons
- Calls POST /api/v1/projects/{id}/images/{imageType}

**AiPromptModal** (`src/components/shared/AiPromptModal.tsx`)
```typescript
interface AiPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: string;
  recommendedTools: Array<{
    name: string;
    url: string;
    note: string;
  }>;
}
```
- Modal overlay with prompt text in scrollable textarea
- "Copy Prompt" button
- Recommended tools section with clickable links
- Step-by-step instructions

**LockedSection** (`src/components/shared/LockedSection.tsx`)
```typescript
interface LockedSectionProps {
  content: string;
  sectionKey: string;
}
```
- Displays read-only formatted text
- Top banner: "🔒 This section is fixed and cannot be edited."
- Grey background (#F9FAFB)
- Resolves {{placeholders}} from Zustand store

**Locked Section Content Source:**

Content strings for the three locked sections (Binding Conditions, Cybersecurity, Disclaimer) are hardcoded constants extracted from `TS_Template_original.docx`. These sections contain legal and compliance text that must remain unchanged across all generated documents.

**BindingConditionsSection.tsx:**
```typescript
const BINDING_CONDITIONS_CONTENT = `
1. The prices quoted are valid for 90 days from the date of this proposal.
2. Payment terms: 30% advance, 40% on delivery, 30% after successful commissioning.
3. Delivery timeline is subject to timely receipt of advance payment and technical clarifications.
4. Any changes to scope after proposal acceptance will be subject to change orders.
5. Client shall provide necessary infrastructure including network, power, and workspace.
6. Hitachi India reserves the right to modify specifications with equivalent or better alternatives.
7. All intellectual property rights remain with Hitachi India.
8. Warranty period: 12 months from date of go-live or 18 months from delivery, whichever is earlier.
9. This proposal supersedes all previous communications and constitutes the entire agreement.
10. Disputes shall be subject to jurisdiction of courts in Bangalore, India.
`;

const BindingConditionsSection: React.FC<SectionProps> = ({ projectId }) => {
  return <LockedSection content={BINDING_CONDITIONS_CONTENT} sectionKey="binding_conditions" />;
};
```

**CybersecuritySection.tsx:**
```typescript
const CYBERSECURITY_CONTENT = `
Hitachi India follows industry-standard cybersecurity practices:

1. All software components are scanned for known vulnerabilities before deployment.
2. Secure coding practices are followed as per OWASP guidelines.
3. Data encryption in transit using TLS 1.2 or higher.
4. Database access is restricted with role-based access control.
5. Regular security patches and updates are provided during warranty period.
6. Audit logs are maintained for all critical operations.
7. Password policies enforce minimum 8 characters with complexity requirements.
8. Session timeouts are implemented to prevent unauthorized access.
9. Client is responsible for network security, firewall configuration, and physical access control.
10. Penetration testing and security audits are available as optional services.
`;

const CybersecuritySection: React.FC<SectionProps> = ({ projectId }) => {
  return <LockedSection content={CYBERSECURITY_CONTENT} sectionKey="cybersecurity" />;
};
```

**DisclaimerSection.tsx:**
```typescript
const DISCLAIMER_CONTENT = `
DISCLAIMER

This Technical Specification document is provided for informational purposes only. While Hitachi India has made every effort to ensure accuracy, we make no warranties or representations regarding the completeness or accuracy of the information contained herein.

1. The specifications are subject to change without notice.
2. Actual implementation may vary based on site conditions and client requirements.
3. Performance metrics are estimates based on typical conditions and may vary.
4. Third-party software and hardware specifications are subject to vendor terms.
5. Hitachi India is not liable for any indirect, incidental, or consequential damages.
6. Client acceptance of this proposal constitutes agreement to these terms.
7. All trademarks and brand names are property of their respective owners.

For questions or clarifications, please contact the Hitachi India sales team.
`;

const DisclaimerSection: React.FC<SectionProps> = ({ projectId }) => {
  return <LockedSection content={DISCLAIMER_CONTENT} sectionKey="disclaimer" />;
};
```

**Note:** The actual content should be extracted from the original Word template to ensure legal accuracy. The above examples are placeholders for illustration.

**CompletionBadge** (`src/components/shared/CompletionBadge.tsx`)
```typescript
interface CompletionBadgeProps {
  status: 'complete' | 'visited' | 'not_started';
}
```
- Renders ✅ (complete), 🟡 (visited), or ⚪ (not started)
- Used in sidebar section list

### Backend API Endpoints

#### Projects Router (`app/projects/router.py`)

```python
GET /api/v1/projects
Response: List[ProjectSummary]
# Returns all projects with summary fields

POST /api/v1/projects
Request: ProjectCreate
Response: ProjectDetail
# Creates new project with UUID

GET /api/v1/projects/{id}
Response: ProjectDetail
# Returns project with completion_summary and section_completion map

PATCH /api/v1/projects/{id}
Request: ProjectUpdate
Response: ProjectDetail
# Updates global project fields

DELETE /api/v1/projects/{id}
Response: 204 No Content
# Deletes project and cascades to section_data and document_versions
```

#### Sections Router (`app/sections/router.py`)

```python
GET /api/v1/projects/{id}/sections
Response: List[SectionData]
# Returns all section_data records for project

GET /api/v1/projects/{id}/sections/{section_key}
Response: SectionData
# Returns single section_data record or empty content

PUT /api/v1/projects/{id}/sections/{section_key}
Request: { content: dict }
Response: SectionData
# Upserts section_data with unique constraint on (project_id, section_key)
```

#### Generation Router (`app/generation/router.py`)

```python
POST /api/v1/projects/{id}/generate
Response: FileResponse (application/vnd.openxmlformats-officedocument.wordprocessingml.document)
# Validates required sections, builds context, renders template, saves version, returns file

GET /api/v1/projects/{id}/versions
Response: List[DocumentVersion]
# Returns all document versions ordered by version_number desc

GET /api/v1/versions/{version_id}/download
Response: FileResponse
# Returns document file from stored file_path
```

#### Images Router (`app/images/router.py`)

```python
POST /api/v1/projects/{id}/images/{image_type}
Request: multipart/form-data (file)
Response: { url: str }
# Validates PNG/JPG max 10MB, saves to uploads/images/{project_id}/{image_type}.png

GET /api/v1/projects/{id}/images
Response: List[{ type: str, url: str }]
# Returns list of uploaded images

DELETE /api/v1/projects/{id}/images/{image_type}
Response: 204 No Content
# Removes image file from disk
```

#### AI Prompts Router (`app/ai_prompts/router.py`)

```python
POST /api/v1/projects/{id}/ai-prompt/{prompt_type}
Response: { prompt: str, recommended_tools: List[dict] }
# Generates AI prompt for architecture, gantt_overall, or gantt_shutdown
```

### Database Schema

**IMPORTANT:** These tables are created via Alembic migrations, not manual SQL. The SQLAlchemy models in `app/projects/models.py`, `app/sections/models.py`, and `app/generation/models.py` define the schema. Alembic's autogenerate feature creates migrations by comparing the models to the database state. See the "CRITICAL: Alembic Configuration for Autogenerate" section in Error Handling for the required `alembic/env.py` setup.

```sql
-- Projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solution_name VARCHAR NOT NULL,
    solution_full_name VARCHAR NOT NULL,
    solution_abbreviation VARCHAR,
    client_name VARCHAR NOT NULL,
    client_location VARCHAR NOT NULL,
    client_abbreviation VARCHAR,
    ref_number VARCHAR,
    doc_date VARCHAR,
    doc_version VARCHAR DEFAULT '0',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Section data table
CREATE TABLE section_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    section_key VARCHAR NOT NULL,
    content JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(project_id, section_key)
);

-- Document versions table
CREATE TABLE document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    filename VARCHAR NOT NULL,
    file_path VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Custom Hooks

**useAutoSave** (`src/hooks/useAutoSave.ts`)
```typescript
interface UseAutoSaveReturn {
  save: (content: any) => void;
  status: 'idle' | 'saving' | 'saved' | 'error';
}

function useAutoSave(
  projectId: string,
  sectionKey: string,
  delay: number = 800
): UseAutoSaveReturn
```
- Debounces save requests with configurable delay
- Updates status state for UI feedback
- Calls PUT /api/v1/projects/{projectId}/sections/{sectionKey}
- Resets to 'idle' after 2 seconds in 'saved' state

**useGenerationPolling** (`src/hooks/useGenerationPolling.ts`)

**Note:** This hook is reserved for future async generation support. The MVP implementation uses synchronous document generation (the backend blocks until the .docx file is ready and returns it directly). This hook is included in the repository structure for future enhancement but is currently unused.

```typescript
/**
 * useGenerationPolling - Reserved for future async generation support
 * 
 * MVP Implementation: Document generation is synchronous.
 * The backend generates the .docx file and returns it immediately.
 * This hook is a stub for future enhancement when generation becomes async.
 * 
 * DO NOT call this hook from any component in the MVP.
 */
export function useGenerationPolling() {
  return { 
    status: 'idle' as const,
    progress: 0,
    error: null
  };
}

export type GenerationStatus = 'idle' | 'generating' | 'complete' | 'error';
```

### Type Definitions

**Core Types** (`src/types/index.ts`)
```typescript
interface Project {
  id: string;
  solution_name: string;
  solution_full_name: string;
  solution_abbreviation?: string;
  client_name: string;
  client_location: string;
  client_abbreviation?: string;
  ref_number?: string;
  doc_date?: string;
  doc_version?: string;
  created_at: string;
  updated_at: string;
}

interface ProjectDetail extends Project {
  completion_summary: {
    total: number;
    completed: number;
    percentage: number;
  };
  section_completion: Record<string, boolean>;
}

interface SectionData {
  id: string;
  project_id: string;
  section_key: string;
  content: Record<string, any>;
  updated_at: string;
}

interface DocumentVersion {
  id: string;
  project_id: string;
  version_number: number;
  filename: string;
  file_path: string;
  created_at: string;
}
```

**Section Content Types** (examples)
```typescript
interface CoverContent {
  solution_full_name?: string;
  client_name?: string;
  client_location?: string;
  ref_number?: string;
  doc_date?: string;
  doc_version?: string;
}

interface FeaturesContent {
  items: Array<{
    id: string;
    title: string;
    brief: string;
    description: string;
  }>;
}

interface AbbreviationsContent {
  rows: Array<{
    sr_no: number;
    abbreviation: string;
    description: string;
    locked: boolean;
  }>;
}
```



## Data Models

### SQLAlchemy Models

**Project Model** (`app/projects/models.py`)
```python
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    solution_name = Column(String, nullable=False)
    solution_full_name = Column(String, nullable=False)
    solution_abbreviation = Column(String, nullable=True)
    client_name = Column(String, nullable=False)
    client_location = Column(String, nullable=False)
    client_abbreviation = Column(String, nullable=True)
    ref_number = Column(String, nullable=True)
    doc_date = Column(String, nullable=True)
    doc_version = Column(String, default="0")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    sections = relationship("SectionData", back_populates="project", cascade="all, delete-orphan")
    versions = relationship("DocumentVersion", back_populates="project", cascade="all, delete-orphan")
```

**SectionData Model** (`app/sections/models.py`)
```python
from sqlalchemy import Column, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

class SectionData(Base):
    __tablename__ = "section_data"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    section_key = Column(String, nullable=False)
    content = Column(JSONB, nullable=False, default={})
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    project = relationship("Project", back_populates="sections")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('project_id', 'section_key', name='uq_project_section'),
    )
```

**DocumentVersion Model** (`app/generation/models.py`)
```python
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

class DocumentVersion(Base):
    __tablename__ = "document_versions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    version_number = Column(Integer, nullable=False)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    project = relationship("Project", back_populates="versions")
```

### Pydantic Schemas

**Project Schemas** (`app/projects/schemas.py`)
```python
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict

class ProjectCreate(BaseModel):
    solution_name: str
    solution_full_name: str
    solution_abbreviation: Optional[str] = None
    client_name: str
    client_location: str
    client_abbreviation: Optional[str] = None
    ref_number: Optional[str] = None
    doc_date: Optional[str] = None
    doc_version: Optional[str] = "0"

class ProjectUpdate(BaseModel):
    solution_name: Optional[str] = None
    solution_full_name: Optional[str] = None
    solution_abbreviation: Optional[str] = None
    client_name: Optional[str] = None
    client_location: Optional[str] = None
    client_abbreviation: Optional[str] = None
    ref_number: Optional[str] = None
    doc_date: Optional[str] = None
    doc_version: Optional[str] = None

class ProjectSummary(BaseModel):
    id: str
    solution_name: str
    client_name: str
    client_location: str
    created_at: datetime
    completion_percentage: int
    
    class Config:
        from_attributes = True

class CompletionSummary(BaseModel):
    total: int  # Total number of completable sections (27 in MVP)
    completed: int
    percentage: int

class ProjectDetail(BaseModel):
    id: str
    solution_name: str
    solution_full_name: str
    solution_abbreviation: Optional[str]
    client_name: str
    client_location: str
    client_abbreviation: Optional[str]
    ref_number: Optional[str]
    doc_date: Optional[str]
    doc_version: Optional[str]
    created_at: datetime
    updated_at: datetime
    completion_summary: CompletionSummary
    section_completion: Dict[str, bool]
    
    class Config:
        from_attributes = True
```

**Section Schemas** (`app/sections/schemas.py`)
```python
from pydantic import BaseModel
from datetime import datetime
from typing import Dict, Any

class SectionDataCreate(BaseModel):
    content: Dict[str, Any]

class SectionDataResponse(BaseModel):
    id: str
    project_id: str
    section_key: str
    content: Dict[str, Any]
    updated_at: datetime
    
    class Config:
        from_attributes = True
```

**Generation Schemas** (`app/generation/schemas.py`)
```python
from pydantic import BaseModel
from datetime import datetime
from typing import List

class DocumentVersionResponse(BaseModel):
    id: str
    project_id: str
    version_number: int
    filename: str
    file_path: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class GenerationError(BaseModel):
    message: str
    missing_sections: List[str]
```

### Section Content Schemas

The `content` JSONB field in `section_data` table stores different structures per section:

**Cover Section**
```json
{
  "solution_full_name": "Plate Mill Yard Management System",
  "client_name": "Jindal Steel & Power Ltd.",
  "client_location": "Angul, Odisha",
  "ref_number": "JSPL/2024/001",
  "doc_date": "23-01-2026",
  "doc_version": "1"
}
```

**Revision History Section**
```json
{
  "rows": [
    {
      "sr_no": 1,
      "revised_by": "John Doe",
      "checked_by": "Jane Smith",
      "approved_by": "Manager",
      "details": "First issue",
      "date": "23-01-2026",
      "rev_no": "0"
    }
  ]
}
```

**Features Section**
```json
{
  "items": [
    {
      "id": "feat-1",
      "title": "Real-time Tracking",
      "brief": "Track all yard movements in real-time",
      "description": "<p>The system provides <strong>real-time visibility</strong> of all material movements...</p>"
    }
  ]
}
```

**Abbreviations Section**
```json
{
  "rows": [
    {
      "sr_no": 1,
      "abbreviation": "JSPL",
      "description": "Jindal Steel & Power Ltd.",
      "locked": true
    },
    {
      "sr_no": 13,
      "abbreviation": "PMYMS",
      "description": "Plate Mill Yard Management System",
      "locked": false
    }
  ]
}
```

**Technology Stack Section**
```json
{
  "rows": [
    {
      "sr_no": 1,
      "component": "Frontend Application",
      "technology": "React 18 with TypeScript",
      "note": "Application can be viewed on a standard web browser like Chrome, Edge & Mozilla"
    }
  ]
}
```

**Hardware Specifications Section**
```json
{
  "rows": [
    {
      "sr_no": 1,
      "name": "Server (Tower Based)",
      "specs_line1": "Intel Xeon processor",
      "specs_line2": "32GB RAM",
      "specs_line3": "1TB SSD",
      "specs_line4": "Windows Server 2022",
      "maker": "Dell",
      "qty": "2"
    }
  ]
}
```

**Documentation Control Section**
```json
{
  "custom_items": [
    "User Training Manual",
    "API Integration Guide"
  ]
}
```

**Buyer Prerequisites Section**
```json
{
  "items": [
    "Network infrastructure ready",
    "Server room with cooling",
    "Dedicated internet connection"
  ]
}
```

**Rich Text Sections** (Executive Summary, Process Flow, Overview fields, etc.)
```json
{
  "text": "<p>This is <strong>formatted</strong> text with <em>emphasis</em>.</p><ul><li>Bullet point 1</li><li>Bullet point 2</li></ul>"
}
```

### Completion Logic

The backend calculates section completion status based on these rules:

```python
def calculate_section_completion(project: Project, all_sections: Dict[str, dict]) -> Dict[str, bool]:
    """
    Returns completion status for all 31 sections.
    27 sections require user input, 4 auto-complete when visited.
    """
    completion = {}
    
    # Helper to get section content
    def s(key: str) -> dict:
        return all_sections.get(key, {}).get("content", {})
    
    # Helper to strip HTML tags
    def strip_html(html: str) -> str:
        return re.sub(r'<[^>]+>', '', html or '').strip()
    
    # Cover: requires 3 fields
    completion['cover'] = bool(
        project.solution_full_name and 
        project.client_name and 
        project.client_location
    )
    
    # Revision History: requires at least 1 row with details
    rows = s('revision_history').get('rows', [])
    completion['revision_history'] = any(row.get('details') for row in rows)
    
    # Executive Summary: requires para1 with content
    para1 = s('executive_summary').get('para1', '')
    completion['executive_summary'] = bool(strip_html(para1))
    
    # Introduction: requires both fields
    intro = s('introduction')
    completion['introduction'] = bool(
        intro.get('tender_reference') and 
        intro.get('tender_date')
    )
    
    # Abbreviations: requires row 13 abbreviation
    abbr_rows = s('abbreviations').get('rows', [])
    row_13 = next((r for r in abbr_rows if r.get('sr_no') == 13), {})
    completion['abbreviations'] = bool(row_13.get('abbreviation'))
    
    # Process Flow: requires text content
    pf_text = s('process_flow').get('text', '')
    completion['process_flow'] = bool(strip_html(pf_text))
    
    # Overview: requires 2 fields
    overview = s('overview')
    completion['overview'] = bool(
        strip_html(overview.get('system_objective', '')) and
        strip_html(overview.get('existing_system', ''))
    )
    
    # Features: requires at least 1 item with title and description
    features = s('features').get('items', [])
    completion['features'] = any(
        item.get('title') and item.get('description')
        for item in features
    )
    
    # Remote Support: requires text
    rs_text = s('remote_support').get('text', '')
    completion['remote_support'] = bool(strip_html(rs_text))
    
    # Documentation Control: auto-complete when visited
    completion['documentation_control'] = 'documentation_control' in all_sections
    
    # Customer Training: requires 2 fields
    training = s('customer_training')
    completion['customer_training'] = bool(
        training.get('persons') and 
        training.get('days')
    )
    
    # System Config: auto-complete when visited
    completion['system_config'] = 'system_config' in all_sections
    
    # FAT Condition: requires text
    fat_text = s('fat_condition').get('text', '')
    completion['fat_condition'] = bool(strip_html(fat_text))
    
    # Tech Stack: requires first row component and technology
    ts_rows = s('tech_stack').get('rows', [])
    first_row = ts_rows[0] if ts_rows else {}
    completion['tech_stack'] = bool(
        first_row.get('component') and 
        first_row.get('technology')
    )
    
    # Hardware Specs: requires first row specs_line1 and maker
    hw_rows = s('hardware_specs').get('rows', [])
    first_hw = hw_rows[0] if hw_rows else {}
    completion['hardware_specs'] = bool(
        first_hw.get('specs_line1') and 
        first_hw.get('maker')
    )
    
    # Software Specs: requires first row name
    sw_rows = s('software_specs').get('rows', [])
    first_sw = sw_rows[0] if sw_rows else {}
    completion['software_specs'] = bool(first_sw.get('name'))
    
    # Third Party SW: requires sw4_name
    completion['third_party_sw'] = bool(s('third_party_sw').get('sw4_name'))
    
    # Gantt charts: auto-complete when visited
    completion['overall_gantt'] = 'overall_gantt' in all_sections
    completion['shutdown_gantt'] = 'shutdown_gantt' in all_sections
    
    # Supervisors: requires 4 fields
    supervisors = s('supervisors')
    completion['supervisors'] = bool(
        supervisors.get('pm_days') and
        supervisors.get('dev_days') and
        supervisors.get('comm_days') and
        supervisors.get('total_man_days')
    )
    
    # Auto-complete sections (visited = complete)
    for key in ['scope_definitions', 'division_of_eng', 'work_completion', 
                'buyer_obligations', 'exclusion_list']:
        completion[key] = key in all_sections
    
    # Buyer Prerequisites: requires at least 1 non-empty item
    prereqs = s('buyer_prerequisites').get('items', [])
    completion['buyer_prerequisites'] = any(item.strip() for item in prereqs if item)
    
    # Locked sections: auto-complete when visited
    for key in ['binding_conditions', 'cybersecurity', 'disclaimer']:
        completion[key] = key in all_sections
    
    # Value Addition: requires text
    va_text = s('value_addition').get('text', '')
    completion['value_addition'] = bool(strip_html(va_text))
    
    # PoC: requires name and description
    poc = s('poc')
    completion['poc'] = bool(
        poc.get('name') and 
        poc.get('description')
    )
    
    return completion
```

### File System Structure

```
uploads/
├── images/
│   └── {project_id}/
│       ├── architecture.png
│       ├── gantt_overall.png
│       └── gantt_shutdown.png
└── versions/
    └── {project_id}/
        ├── TS_ClientName_SolutionName_v0.docx
        ├── TS_ClientName_SolutionName_v1.docx
        └── TS_ClientName_SolutionName_v2.docx
```



## Error Handling

### Frontend Error Handling

#### API Error Handling Strategy

All API calls use a centralized error handler in the Axios client:

```typescript
// src/api/client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 30000,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data;
      
      switch (status) {
        case 400:
          console.error('Bad Request:', data.detail);
          return Promise.reject(new Error(data.detail || 'Invalid request'));
        case 404:
          console.error('Not Found:', data.detail);
          return Promise.reject(new Error('Resource not found'));
        case 422:
          // Validation error (missing sections during generation)
          // Backend returns: { detail: { message: "...", missing_sections: [...] } }
          const detail = data.detail;
          if (typeof detail === 'object' && detail.missing_sections) {
            return Promise.reject({
              type: 'validation',
              missing_sections: detail.missing_sections,
              message: detail.message || 'Validation error'
            });
          }
          // Fallback for other 422 errors
          return Promise.reject(new Error(typeof detail === 'string' ? detail : 'Validation error'));
        case 500:
          console.error('Server Error:', data.detail);
          return Promise.reject(new Error('Server error. Please try again.'));
        default:
          return Promise.reject(new Error('An unexpected error occurred'));
      }
    } else if (error.request) {
      // Request made but no response
      console.error('Network Error:', error.message);
      return Promise.reject(new Error('Network error. Check your connection.'));
    } else {
      // Error setting up request
      console.error('Request Error:', error.message);
      return Promise.reject(new Error('Failed to make request'));
    }
  }
);
```

#### Component-Level Error Handling

**Auto-Save Error Recovery:**
```typescript
const { save, status } = useAutoSave(projectId, sectionKey);

// Status can be: 'idle' | 'saving' | 'saved' | 'error'
// On error, display red indicator but don't block user input
// User can continue editing, next save attempt will retry
```

**Document Generation Error Handling:**
```typescript
const handleGenerate = async () => {
  try {
    const response = await generateDocument(projectId);
    // Trigger download
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TS_${projectId}.docx`;
    link.click();
    link.remove();
    toast.success('Document generated successfully!');
  } catch (error) {
    if (error.type === 'validation') {
      // Display missing sections as clickable links
      setMissingSections(error.missing_sections);
      toast.error('Please complete all required sections');
    } else {
      toast.error(error.message || 'Failed to generate document');
    }
  }
};
```

**CRITICAL: Missing Sections Response Structure**

The backend MUST return missing sections in the JSON body, NOT in HTTP headers:

```python
# WRONG - Frontend cannot access HTTP headers in error responses
raise HTTPException(
    status_code=422,
    detail="Required sections incomplete",
    headers={"X-Missing-Sections": ",".join(missing)}  # ❌ Lost in headers
)

# CORRECT - Frontend can access nested detail object
raise HTTPException(
    status_code=422,
    detail={
        "message": "Required sections incomplete",
        "missing_sections": missing  # ✅ Accessible in response body
    }
)
```

The frontend error handler extracts `missing_sections` from `error.response.data.detail.missing_sections` to display clickable section links. If the data is in headers, the UI will show a generic error without the helpful navigation links.

**Image Upload Error Handling:**
```typescript
const handleImageUpload = async (file: File) => {
  // Validate file type
  if (!['image/png', 'image/jpeg'].includes(file.type)) {
    toast.error('Only PNG and JPG files are supported');
    return;
  }
  
  // Validate file size
  if (file.size > 10 * 1024 * 1024) {
    toast.error('File size must be less than 10MB');
    return;
  }
  
  try {
    const formData = new FormData();
    formData.append('file', file);
    const response = await uploadImage(projectId, imageType, formData);
    setImageUrl(response.url);
    toast.success('Image uploaded successfully');
  } catch (error) {
    toast.error(error.message || 'Failed to upload image');
  }
};
```

### Backend Error Handling

#### FastAPI Exception Handlers

```python
# app/main.py
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import IntegrityError

app = FastAPI()

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Validation error",
            "errors": exc.errors()
        }
    )

@app.exception_handler(IntegrityError)
async def integrity_exception_handler(request: Request, exc: IntegrityError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "detail": "Database integrity error. This may be a duplicate entry."
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An unexpected error occurred. Please try again."
        }
    )
```

#### Service Layer Error Handling

**Project Not Found:**
```python
# app/projects/service.py
from fastapi import HTTPException, status

async def get_project(db: AsyncSession, project_id: str) -> Project:
    result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with id {project_id} not found"
        )
    
    return project
```

**Section Key Validation:**
```python
# app/sections/router.py
VALID_SECTION_KEYS = [
    'cover', 'revision_history', 'executive_summary', 'introduction',
    'abbreviations', 'process_flow', 'overview', 'features',
    'remote_support', 'documentation_control', 'customer_training',
    'system_config', 'fat_condition', 'tech_stack', 'hardware_specs',
    'software_specs', 'third_party_sw', 'overall_gantt', 'shutdown_gantt',
    'supervisors', 'scope_definitions', 'division_of_eng', 'value_addition',
    'work_completion', 'buyer_obligations', 'exclusion_list',
    'buyer_prerequisites', 'binding_conditions', 'cybersecurity',
    'disclaimer', 'poc'
]

@router.put("/projects/{project_id}/sections/{section_key}")
async def upsert_section(
    project_id: str,
    section_key: str,
    content: dict,
    db: AsyncSession = Depends(get_db)
):
    if section_key not in VALID_SECTION_KEYS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid section_key. Must be one of: {', '.join(VALID_SECTION_KEYS)}"
        )
    
    # ... rest of implementation
```

**Document Generation Validation:**
```python
# app/generation/service.py
from app.generation.docx_generator import generate_document as generate_docx
from app.generation.models import DocumentVersion
from pathlib import Path

async def generate_document(db: AsyncSession, project_id: str) -> tuple[str, str]:
    """
    Generate Word document for a project.
    
    Returns:
        tuple[str, str]: (file_path, filename) for the generated document
    """
    # Load project and all sections
    project = await get_project(db, project_id)
    all_sections = await get_all_sections(db, project_id)
    
    # Calculate completion
    completion = calculate_section_completion(project, all_sections)
    
    # Identify missing required sections
    required_sections = [
        'cover', 'revision_history', 'executive_summary', 'introduction',
        'abbreviations', 'process_flow', 'overview', 'features',
        'remote_support', 'customer_training', 'fat_condition',
        'tech_stack', 'hardware_specs', 'software_specs', 'third_party_sw',
        'supervisors', 'value_addition', 'buyer_prerequisites', 'poc'
    ]
    
    missing = [key for key in required_sections if not completion.get(key, False)]
    
    if missing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "message": "Required sections incomplete",
                "missing_sections": missing
            }
        )
    
    # Generate document using docx_generator
    template_path = Path("backend/templates/TS_Template_jinja.docx")
    upload_dir = Path("uploads")
    
    file_path, filename = generate_docx(
        project=project,
        all_sections=all_sections,
        template_path=str(template_path),
        upload_dir=str(upload_dir)
    )
    
    # Get next version number
    result = await db.execute(
        select(func.max(DocumentVersion.version_number))
        .where(DocumentVersion.project_id == project_id)
    )
    max_version = result.scalar() or 0
    next_version = max_version + 1
    
    # Create document version record
    doc_version = DocumentVersion(
        project_id=project_id,
        version_number=next_version,
        filename=filename,
        file_path=file_path
    )
    db.add(doc_version)
    await db.commit()
    
    return file_path, filename
```

**Document Generator** (`app/generation/docx_generator.py`)
```python
from docxtpl import DocxTemplate, InlineImage
from pathlib import Path
from docx.shared import Cm
import re

def generate_document(
    project,
    all_sections: dict,
    template_path: str,
    upload_dir: str
) -> tuple[str, str]:
    """
    Generate Word document from template and project data.
    
    Args:
        project: Project model instance
        all_sections: Dict mapping section_key to section data
        template_path: Path to Jinja2 Word template
        upload_dir: Base directory for uploads
    
    Returns:
        tuple[str, str]: (file_path, filename) of generated document
    """
    # Load template
    template = DocxTemplate(template_path)
    
    # Build context (see context_builder.py for full implementation)
    context = build_context(project, all_sections, template, upload_dir)
    
    # Render template
    template.render(context)
    
    # Generate filename
    filename = generate_safe_filename(
        project.client_name,
        project.solution_name,
        project.doc_version or "0"
    )
    
    # Save to uploads/versions/{project_id}/
    output_dir = Path(upload_dir) / "versions" / str(project.id)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = output_dir / filename
    template.save(str(file_path))
    
    return str(file_path), filename

def generate_safe_filename(client_name: str, solution_name: str, version: str) -> str:
    """Generate safe filename from project details."""
    # Replace spaces with underscores, slashes with hyphens
    safe_client = re.sub(r'[/\\]', '-', client_name.replace(' ', '_'))
    safe_solution = re.sub(r'[/\\]', '-', solution_name.replace(' ', '_'))
    
    # Truncate if too long
    safe_client = safe_client[:30]
    safe_solution = safe_solution[:30]
    
    return f"TS_{safe_client}_{safe_solution}_v{version}.docx"
```

**Image Upload Validation:**
```python
# app/images/service.py
from fastapi import UploadFile, HTTPException, status

ALLOWED_TYPES = ['image/png', 'image/jpeg']
MAX_SIZE = 10 * 1024 * 1024  # 10MB

async def validate_image(file: UploadFile):
    # Check content type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PNG and JPG files are supported"
        )
    
    # Check file size
    file.file.seek(0, 2)  # Seek to end
    size = file.file.tell()
    file.file.seek(0)  # Reset to beginning
    
    if size > MAX_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size must be less than 10MB"
        )
```

**Template File Missing:**
```python
# app/generation/docx_generator.py
from pathlib import Path

def generate_document(project, all_sections, template_path, upload_dir):
    template_file = Path(template_path)
    
    if not template_file.exists():
        raise FileNotFoundError(
            f"Template file not found at {template_path}. "
            "Please ensure TS_Template_jinja.docx exists in backend/templates/"
        )
    
    # ... proceed with generation
```

**Context Variable Name Mismatch (Silent Failure):**

This is a critical error mode that produces NO exception but causes diagram placeholders to disappear from generated documents:

```python
# WRONG - Will cause silent failure
context['ARCHITECTURE_DIAGRAM'] = InlineImage(...)  # Uppercase key

# Template after conversion contains: {{ architecture_diagram }}  # Lowercase
# Result: docxtpl renders empty string, no error raised

# CORRECT - Matches template variable names
context['architecture_diagram'] = InlineImage(...)  # Lowercase key
context['overall_gantt'] = InlineImage(...)
context['shutdown_gantt'] = InlineImage(...)
```

**Prevention:**
- Context builder MUST use lowercase keys: `architecture_diagram`, `overall_gantt`, `shutdown_gantt`
- Unit tests MUST verify exact key names match template variables
- Integration tests MUST verify generated documents contain diagram placeholders or images

### Database Error Handling

**Connection Errors:**
```python
# app/database.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import logging

logger = logging.getLogger(__name__)

# Note: pool_pre_ping=True can cause MissingGreenlet errors with asyncpg
# For local MVP, connection pooling defaults are sufficient
engine = create_async_engine(
    DATABASE_URL,
    echo=True,
    pool_recycle=3600,   # Recycle connections after 1 hour
    pool_size=5,         # Maximum number of connections
    max_overflow=10      # Maximum overflow connections
)

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error(f"Database error: {e}")
            raise
        finally:
            await session.close()
```

**Migration Errors:**
```python
# app/main.py
import subprocess
import sys

@app.on_event("startup")
async def run_migrations():
    try:
        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            capture_output=True,
            text=True,
            check=True
        )
        logger.info("Database migrations completed successfully")
    except subprocess.CalledProcessError as e:
        logger.error(f"Migration failed: {e.stderr}")
        sys.exit(1)
```

**CRITICAL: Alembic Configuration for Autogenerate**

The `alembic/env.py` file MUST import all model modules to register them with SQLAlchemy's metadata. Without these imports, `alembic revision --autogenerate` will generate empty migrations and `alembic upgrade head` will create zero tables, causing all API calls to fail with "relation does not exist" errors.

```python
# alembic/env.py
from logging.config import fileConfig
from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Import Base and all models
from app.database import Base

# CRITICAL: Import all model modules to register them with Base.metadata
import app.projects.models  # noqa: F401 - registers Project
import app.sections.models  # noqa: F401 - registers SectionData
import app.generation.models  # noqa: F401 - registers DocumentVersion

# this is the Alembic Config object
config = context.config

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set target metadata for autogenerate support
target_metadata = Base.metadata

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

**Alembic Configuration File** (`alembic.ini`)
```ini
[alembic]
script_location = alembic
prepend_sys_path = .
sqlalchemy.url = postgresql+asyncpg://postgres:postgres@db:5432/ts_generator

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualname =

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
```

**Creating Initial Migration:**
```bash
# Inside backend container
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

**Common Migration Issues:**

1. **Empty migration generated**: Missing model imports in `env.py`
2. **"relation does not exist" errors**: Migrations not run on startup
3. **Import errors in env.py**: Incorrect sys.path configuration
4. **Connection refused**: Database container not ready (add health check to docker-compose)

### File System Error Handling

**Directory Creation:**
```python
# app/generation/docx_generator.py
from pathlib import Path

def generate_document(project, all_sections, template_path, upload_dir):
    output_dir = Path(upload_dir) / "versions" / str(project.id)
    
    try:
        output_dir.mkdir(parents=True, exist_ok=True)
    except PermissionError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Permission denied: Cannot create output directory"
        )
    except OSError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"File system error: {str(e)}"
        )
```

**File Write Errors:**
```python
try:
    template.save(str(output_path))
except Exception as e:
    logger.error(f"Failed to save document: {e}")
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Failed to save generated document"
    )
```

### User-Facing Error Messages

**Error Message Guidelines:**
1. Be specific but not technical for end users
2. Provide actionable guidance when possible
3. Log detailed errors server-side for debugging
4. Never expose sensitive information (file paths, stack traces)

**Examples:**

| Error Type | User Message | Log Message |
|------------|--------------|-------------|
| Network failure | "Network error. Check your connection." | "Failed to connect to backend at http://localhost:8000" |
| Missing sections | "Please complete all required sections" + clickable links | "Generation failed: missing sections [cover, features]" |
| File too large | "File size must be less than 10MB" | "Upload rejected: file size 15728640 bytes exceeds limit" |
| Invalid file type | "Only PNG and JPG files are supported" | "Upload rejected: content-type image/gif not in allowed types" |
| Server error | "Server error. Please try again." | "Unhandled exception in generate_document: [stack trace]" |



## Testing Strategy

### Overview

This application does not use property-based testing because it is primarily a UI-driven CRUD application with document generation. The testing strategy focuses on:

1. **Unit Tests**: Specific examples, edge cases, and business logic
2. **Integration Tests**: API endpoints with database interactions
3. **End-to-End Tests**: Critical user workflows

**Why No Property-Based Testing?**

Property-based testing (PBT) is not appropriate for this feature because:
- The application is primarily UI rendering and layout (React components)
- Most operations are simple CRUD with no complex transformation logic
- Document generation is template-based with side effects (file I/O)
- There are no pure functions with universal properties that would benefit from randomized input testing

Instead, we use example-based unit tests for specific scenarios and integration tests for end-to-end workflows.

### Backend Testing

#### Testing Infrastructure

**pytest.ini** (project root)
```ini
[pytest]
asyncio_mode = auto
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = 
    --strict-markers
    --tb=short
    --disable-warnings
markers =
    asyncio: mark test as async
    integration: mark test as integration test
    unit: mark test as unit test
```

**conftest.py** (`tests/conftest.py`)
```python
import pytest
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from httpx import AsyncClient
from app.main import app
from app.database import Base, get_db

# Test database URL
TEST_DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/ts_generator_test"

# Create test engine
test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = sessionmaker(
    test_engine, class_=AsyncSession, expire_on_commit=False
)

@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="function")
async def db_session():
    """Create test database session."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with TestSessionLocal() as session:
        yield session
    
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture(scope="function")
async def client(db_session):
    """Create test client with test database."""
    async def override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()

@pytest.fixture
async def create_test_project(client):
    """Helper fixture to create a test project."""
    async def _create_project(**kwargs):
        data = {
            "solution_name": kwargs.get("solution_name", "Test Solution"),
            "solution_full_name": kwargs.get("solution_full_name", "Test Solution Full"),
            "client_name": kwargs.get("client_name", "Test Client"),
            "client_location": kwargs.get("client_location", "Test Location"),
        }
        response = await client.post("/api/v1/projects", json=data)
        return response.json()
    
    return _create_project

@pytest.fixture
async def create_complete_project(client, create_test_project):
    """Helper fixture to create a project with all required sections complete."""
    project = await create_test_project()
    
    # Add all required section data
    required_sections = {
        'cover': {'solution_full_name': 'Test', 'client_name': 'Test', 'client_location': 'Test'},
        'revision_history': {'rows': [{'details': 'Initial'}]},
        'executive_summary': {'para1': '<p>Summary text</p>'},
        'introduction': {'tender_reference': 'REF001', 'tender_date': '2024-01-01'},
        'abbreviations': {'rows': [{'sr_no': 13, 'abbreviation': 'TEST'}]},
        'process_flow': {'text': '<p>Process flow</p>'},
        'overview': {'system_objective': '<p>Objective</p>', 'existing_system': '<p>Existing</p>'},
        'features': {'items': [{'title': 'Feature 1', 'description': 'Description'}]},
        'remote_support': {'text': '<p>Remote support</p>'},
        'customer_training': {'persons': '5', 'days': '3'},
        'fat_condition': {'text': '<p>FAT conditions</p>'},
        'tech_stack': {'rows': [{'component': 'Frontend', 'technology': 'React'}]},
        'hardware_specs': {'rows': [{'specs_line1': 'Spec', 'maker': 'Dell'}]},
        'software_specs': {'rows': [{'name': 'Windows'}]},
        'third_party_sw': {'sw4_name': 'PostgreSQL'},
        'supervisors': {'pm_days': '10', 'dev_days': '20', 'comm_days': '5', 'total_man_days': '35'},
        'value_addition': {'text': '<p>Value addition</p>'},
        'buyer_prerequisites': {'items': ['Prerequisite 1']},
        'poc': {'name': 'John Doe', 'description': 'Project Manager'}
    }
    
    for section_key, content in required_sections.items():
        await client.put(
            f"/api/v1/projects/{project['id']}/sections/{section_key}",
            json={"content": content}
        )
    
    return project
```

#### Unit Tests

**Completion Logic Tests** (`tests/test_completion.py`)
```python
import pytest
from app.generation.completion import calculate_section_completion
from app.projects.models import Project

def test_cover_section_complete_when_all_fields_present():
    project = Project(
        solution_full_name="Test Solution",
        client_name="Test Client",
        client_location="Test Location"
    )
    all_sections = {}
    
    completion = calculate_section_completion(project, all_sections)
    
    assert completion['cover'] is True

def test_cover_section_incomplete_when_missing_client_name():
    project = Project(
        solution_full_name="Test Solution",
        client_name="",
        client_location="Test Location"
    )
    all_sections = {}
    
    completion = calculate_section_completion(project, all_sections)
    
    assert completion['cover'] is False

def test_features_section_complete_with_valid_item():
    project = Project(solution_full_name="Test", client_name="Test", client_location="Test")
    all_sections = {
        'features': {
            'content': {
                'items': [
                    {'title': 'Feature 1', 'description': 'Description 1'}
                ]
            }
        }
    }
    
    completion = calculate_section_completion(project, all_sections)
    
    assert completion['features'] is True

def test_features_section_incomplete_with_empty_title():
    project = Project(solution_full_name="Test", client_name="Test", client_location="Test")
    all_sections = {
        'features': {
            'content': {
                'items': [
                    {'title': '', 'description': 'Description 1'}
                ]
            }
        }
    }
    
    completion = calculate_section_completion(project, all_sections)
    
    assert completion['features'] is False

def test_html_stripping_in_rich_text_fields():
    project = Project(solution_full_name="Test", client_name="Test", client_location="Test")
    all_sections = {
        'executive_summary': {
            'content': {
                'para1': '<p>This is <strong>formatted</strong> text.</p>'
            }
        }
    }
    
    completion = calculate_section_completion(project, all_sections)
    
    assert completion['executive_summary'] is True

def test_empty_html_tags_mark_section_incomplete():
    project = Project(solution_full_name="Test", client_name="Test", client_location="Test")
    all_sections = {
        'executive_summary': {
            'content': {
                'para1': '<p></p>'
            }
        }
    }
    
    completion = calculate_section_completion(project, all_sections)
    
    assert completion['executive_summary'] is False

def test_locked_sections_auto_complete_when_visited():
    project = Project(solution_full_name="Test", client_name="Test", client_location="Test")
    all_sections = {
        'binding_conditions': {'content': {}},
        'cybersecurity': {'content': {}},
        'disclaimer': {'content': {}}
    }
    
    completion = calculate_section_completion(project, all_sections)
    
    assert completion['binding_conditions'] is True
    assert completion['cybersecurity'] is True
    assert completion['disclaimer'] is True

def test_completion_summary_counts_27_sections():
    project = Project(solution_full_name="Test", client_name="Test", client_location="Test")
    all_sections = {}
    
    completion = calculate_section_completion(project, all_sections)
    
    # Should have exactly 31 section keys
    assert len(completion) == 31
    
    # 27 completable sections (excludes 4 auto-complete: binding_conditions, 
    # cybersecurity, disclaimer, and sections that auto-complete on visit)
```

**Context Builder Tests** (`tests/test_context_builder.py`)

**CRITICAL: Image Variable Naming Convention**

The context builder MUST use lowercase variable names for image placeholders to match the Jinja2 template after conversion:
- `context['architecture_diagram']` (NOT `ARCHITECTURE_DIAGRAM`)
- `context['overall_gantt']` (NOT `OVERALL_GANTT`)
- `context['shutdown_gantt']` (NOT `SHUTDOWN_GANTT`)

The original Word template uses `{{ARCHITECTURE_DIAGRAM}}` (uppercase), but the conversion script transforms this to `{{ architecture_diagram }}` (lowercase) in the Jinja2 template. If the context builder outputs uppercase keys, docxtpl will silently render empty strings with no error message, causing diagram placeholders to disappear from generated documents.

```python
import pytest
from app.generation.context_builder import build_context
from app.projects.models import Project

def test_context_builder_maps_project_fields():
    project = Project(
        solution_name="PMYMS",
        solution_full_name="Plate Mill Yard Management System",
        client_name="JSPL",
        client_location="Angul"
    )
    all_sections = {}
    
    context = build_context(project, all_sections, None, "/uploads")
    
    assert context['SolutionName'] == "PMYMS"
    assert context['SolutionFullName'] == "Plate Mill Yard Management System"
    assert context['ClientName'] == "JSPL"
    assert context['ClientLocation'] == "Angul"

def test_context_builder_pads_tech_stack_to_6_rows():
    project = Project(solution_name="Test", solution_full_name="Test", 
                     client_name="Test", client_location="Test")
    all_sections = {
        'tech_stack': {
            'content': {
                'rows': [
                    {'component': 'Frontend', 'technology': 'React'},
                    {'component': 'Backend', 'technology': 'FastAPI'}
                ]
            }
        }
    }
    
    context = build_context(project, all_sections, None, "/uploads")
    
    assert len(context['ts_rows']) == 6
    assert context['ts_rows'][0]['component'] == 'Frontend'
    assert context['ts_rows'][2]['component'] == ''
    assert context['ts_rows'][2]['technology'] == ''

def test_context_builder_handles_missing_sections():
    project = Project(solution_name="Test", solution_full_name="Test",
                     client_name="Test", client_location="Test")
    all_sections = {}
    
    context = build_context(project, all_sections, None, "/uploads")
    
    # Should use empty defaults
    assert context['ExecutiveSummaryPara1'] == ''
    assert context['TenderReference'] == ''
    assert context['features'] == []

def test_context_builder_creates_inline_image_when_file_exists(tmp_path):
    project = Project(id="test-id", solution_name="Test", solution_full_name="Test",
                     client_name="Test", client_location="Test")
    
    # Create mock image file
    upload_dir = tmp_path / "uploads"
    image_dir = upload_dir / "images" / "test-id"
    image_dir.mkdir(parents=True)
    (image_dir / "architecture.png").write_bytes(b"fake image data")
    
    all_sections = {'system_config': {'content': {}}}
    
    context = build_context(project, all_sections, None, str(upload_dir))
    
    # Should create InlineImage object (not placeholder text)
    assert context['architecture_diagram'] is not None
    assert not isinstance(context['architecture_diagram'], str)

def test_context_builder_uses_placeholder_when_image_missing():
    project = Project(id="test-id", solution_name="Test", solution_full_name="Test",
                     client_name="Test", client_location="Test")
    all_sections = {'system_config': {'content': {}}}
    
    context = build_context(project, all_sections, None, "/nonexistent")
    
    assert context['architecture_diagram'] == "[Architecture Diagram — To Be Inserted]"

def test_context_builder_creates_gantt_images_when_files_exist(tmp_path):
    project = Project(id="test-id", solution_name="Test", solution_full_name="Test",
                     client_name="Test", client_location="Test")
    
    # Create mock Gantt chart files
    upload_dir = tmp_path / "uploads"
    image_dir = upload_dir / "images" / "test-id"
    image_dir.mkdir(parents=True)
    (image_dir / "gantt_overall.png").write_bytes(b"fake gantt data")
    (image_dir / "gantt_shutdown.png").write_bytes(b"fake gantt data")
    
    all_sections = {
        'overall_gantt': {'content': {}},
        'shutdown_gantt': {'content': {}}
    }
    
    context = build_context(project, all_sections, None, str(upload_dir))
    
    # Should create InlineImage objects (not placeholder text)
    assert context['overall_gantt'] is not None
    assert not isinstance(context['overall_gantt'], str)
    assert context['shutdown_gantt'] is not None
    assert not isinstance(context['shutdown_gantt'], str)

def test_context_builder_uses_placeholders_for_missing_gantt_images():
    project = Project(id="test-id", solution_name="Test", solution_full_name="Test",
                     client_name="Test", client_location="Test")
    all_sections = {
        'overall_gantt': {'content': {}},
        'shutdown_gantt': {'content': {}}
    }
    
    context = build_context(project, all_sections, None, "/nonexistent")
    
    assert context['overall_gantt'] == "[Overall Gantt Chart — To Be Inserted]"
    assert context['shutdown_gantt'] == "[Shutdown Gantt Chart — To Be Inserted]"
```

**Filename Generation Tests** (`tests/test_filename.py`)
```python
import pytest
from app.generation.docx_generator import generate_safe_filename

def test_filename_replaces_spaces_with_underscores():
    filename = generate_safe_filename("Test Client", "Test Solution", "1")
    assert " " not in filename
    assert "_" in filename

def test_filename_replaces_slashes_with_hyphens():
    filename = generate_safe_filename("Client/Location", "Solution", "1")
    assert "/" not in filename
    assert "-" in filename

def test_filename_truncates_long_names():
    long_client = "A" * 50
    long_solution = "B" * 50
    filename = generate_safe_filename(long_client, long_solution, "1")
    
    # Should be truncated to reasonable length
    assert len(filename) < 100

def test_filename_format():
    filename = generate_safe_filename("JSPL", "PMYMS", "2")
    assert filename == "TS_JSPL_PMYMS_v2.docx"
```

#### Integration Tests

**Project API Tests** (`tests/integration/test_projects_api.py`)
```python
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_create_project():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post("/api/v1/projects", json={
            "solution_name": "PMYMS",
            "solution_full_name": "Plate Mill Yard Management System",
            "client_name": "JSPL",
            "client_location": "Angul"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data['solution_name'] == "PMYMS"
        assert 'id' in data
        assert 'created_at' in data

@pytest.mark.asyncio
async def test_get_project_with_completion():
    # Create project first
    async with AsyncClient(app=app, base_url="http://test") as client:
        create_response = await client.post("/api/v1/projects", json={
            "solution_name": "Test",
            "solution_full_name": "Test Solution",
            "client_name": "Test Client",
            "client_location": "Test Location"
        })
        project_id = create_response.json()['id']
        
        # Get project details
        response = await client.get(f"/api/v1/projects/{project_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert 'completion_summary' in data
        assert 'section_completion' in data
        assert data['completion_summary']['total'] == 27

@pytest.mark.asyncio
async def test_update_project():
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Create project
        create_response = await client.post("/api/v1/projects", json={
            "solution_name": "Test",
            "solution_full_name": "Test Solution",
            "client_name": "Test Client",
            "client_location": "Test Location"
        })
        project_id = create_response.json()['id']
        
        # Update project
        response = await client.patch(f"/api/v1/projects/{project_id}", json={
            "solution_name": "Updated Name"
        })
        
        assert response.status_code == 200
        assert response.json()['solution_name'] == "Updated Name"

@pytest.mark.asyncio
async def test_delete_project_cascades_to_sections():
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Create project
        create_response = await client.post("/api/v1/projects", json={
            "solution_name": "Test",
            "solution_full_name": "Test Solution",
            "client_name": "Test Client",
            "client_location": "Test Location"
        })
        project_id = create_response.json()['id']
        
        # Create section data
        await client.put(
            f"/api/v1/projects/{project_id}/sections/cover",
            json={"content": {"test": "data"}}
        )
        
        # Delete project
        delete_response = await client.delete(f"/api/v1/projects/{project_id}")
        assert delete_response.status_code == 204
        
        # Verify section data also deleted
        section_response = await client.get(f"/api/v1/projects/{project_id}/sections/cover")
        assert section_response.status_code == 404
```

**Section API Tests** (`tests/integration/test_sections_api.py`)
```python
@pytest.mark.asyncio
async def test_upsert_section_creates_new():
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Create project
        project = await create_test_project(client)
        
        # Upsert section
        response = await client.put(
            f"/api/v1/projects/{project['id']}/sections/cover",
            json={"content": {"solution_full_name": "Test"}}
        )
        
        assert response.status_code == 200
        assert response.json()['content']['solution_full_name'] == "Test"

@pytest.mark.asyncio
async def test_upsert_section_updates_existing():
    async with AsyncClient(app=app, base_url="http://test") as client:
        project = await create_test_project(client)
        
        # Create section
        await client.put(
            f"/api/v1/projects/{project['id']}/sections/cover",
            json={"content": {"solution_full_name": "Original"}}
        )
        
        # Update section
        response = await client.put(
            f"/api/v1/projects/{project['id']}/sections/cover",
            json={"content": {"solution_full_name": "Updated"}}
        )
        
        assert response.status_code == 200
        assert response.json()['content']['solution_full_name'] == "Updated"

@pytest.mark.asyncio
async def test_invalid_section_key_returns_400():
    async with AsyncClient(app=app, base_url="http://test") as client:
        project = await create_test_project(client)
        
        response = await client.put(
            f"/api/v1/projects/{project['id']}/sections/invalid_key",
            json={"content": {}}
        )
        
        assert response.status_code == 400
        assert "Invalid section_key" in response.json()['detail']
```

**Generation API Tests** (`tests/integration/test_generation_api.py`)
```python
@pytest.mark.asyncio
async def test_generate_document_with_complete_sections():
    async with AsyncClient(app=app, base_url="http://test") as client:
        project = await create_complete_project(client)
        
        response = await client.post(f"/api/v1/projects/{project['id']}/generate")
        
        assert response.status_code == 200
        assert response.headers['content-type'] == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        assert 'content-disposition' in response.headers

@pytest.mark.asyncio
async def test_generate_document_with_missing_sections_returns_422():
    async with AsyncClient(app=app, base_url="http://test") as client:
        project = await create_test_project(client)
        
        response = await client.post(f"/api/v1/projects/{project['id']}/generate")
        
        assert response.status_code == 422
        data = response.json()
        # Backend returns: { detail: { message: "...", missing_sections: [...] } }
        assert 'detail' in data
        assert isinstance(data['detail'], dict)
        assert 'missing_sections' in data['detail']
        assert 'message' in data['detail']
        assert len(data['detail']['missing_sections']) > 0
        assert data['detail']['message'] == "Required sections incomplete"

@pytest.mark.asyncio
async def test_generate_document_increments_version():
    async with AsyncClient(app=app, base_url="http://test") as client:
        project = await create_complete_project(client)
        
        # Generate first version
        await client.post(f"/api/v1/projects/{project['id']}/generate")
        
        # Generate second version
        await client.post(f"/api/v1/projects/{project['id']}/generate")
        
        # Check versions
        versions_response = await client.get(f"/api/v1/projects/{project['id']}/versions")
        versions = versions_response.json()
        
        assert len(versions) == 2
        assert versions[0]['version_number'] == 2
        assert versions[1]['version_number'] == 1
```

**Image Upload Tests** (`tests/integration/test_images_api.py`)
```python
@pytest.mark.asyncio
async def test_upload_valid_image():
    async with AsyncClient(app=app, base_url="http://test") as client:
        project = await create_test_project(client)
        
        # Create fake PNG file
        files = {'file': ('test.png', b'fake png data', 'image/png')}
        response = await client.post(
            f"/api/v1/projects/{project['id']}/images/architecture",
            files=files
        )
        
        assert response.status_code == 200
        assert 'url' in response.json()

@pytest.mark.asyncio
async def test_upload_invalid_file_type_returns_400():
    async with AsyncClient(app=app, base_url="http://test") as client:
        project = await create_test_project(client)
        
        files = {'file': ('test.gif', b'fake gif data', 'image/gif')}
        response = await client.post(
            f"/api/v1/projects/{project['id']}/images/architecture",
            files=files
        )
        
        assert response.status_code == 400
        assert "PNG and JPG" in response.json()['detail']

@pytest.mark.asyncio
async def test_upload_oversized_file_returns_400():
    async with AsyncClient(app=app, base_url="http://test") as client:
        project = await create_test_project(client)
        
        # Create 11MB file
        large_data = b'x' * (11 * 1024 * 1024)
        files = {'file': ('large.png', large_data, 'image/png')}
        response = await client.post(
            f"/api/v1/projects/{project['id']}/images/architecture",
            files=files
        )
        
        assert response.status_code == 400
        assert "10MB" in response.json()['detail']
```

**Database and Migration Tests** (`tests/integration/test_database.py`)
```python
import pytest
from sqlalchemy import inspect
from app.database import engine

@pytest.mark.asyncio
async def test_all_tables_exist():
    """Verify that Alembic migrations created all required tables."""
    async with engine.connect() as conn:
        inspector = inspect(conn)
        tables = await conn.run_sync(lambda sync_conn: inspector.get_table_names())
        
        # All three tables must exist
        assert 'projects' in tables, "projects table missing - check alembic/env.py imports"
        assert 'section_data' in tables, "section_data table missing - check alembic/env.py imports"
        assert 'document_versions' in tables, "document_versions table missing - check alembic/env.py imports"

@pytest.mark.asyncio
async def test_projects_table_schema():
    """Verify projects table has correct columns."""
    async with engine.connect() as conn:
        inspector = inspect(conn)
        columns = await conn.run_sync(
            lambda sync_conn: [col['name'] for col in inspector.get_columns('projects')]
        )
        
        required_columns = [
            'id', 'solution_name', 'solution_full_name', 'client_name',
            'client_location', 'created_at', 'updated_at'
        ]
        
        for col in required_columns:
            assert col in columns, f"Column {col} missing from projects table"

@pytest.mark.asyncio
async def test_section_data_unique_constraint():
    """Verify section_data has unique constraint on (project_id, section_key)."""
    async with engine.connect() as conn:
        inspector = inspect(conn)
        constraints = await conn.run_sync(
            lambda sync_conn: inspector.get_unique_constraints('section_data')
        )
        
        # Should have unique constraint on project_id + section_key
        constraint_columns = [set(c['column_names']) for c in constraints]
        assert {'project_id', 'section_key'} in constraint_columns

@pytest.mark.asyncio
async def test_cascade_delete():
    """Verify that deleting a project cascades to section_data and document_versions."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Create project with section data
        project = await create_test_project(client)
        await client.put(
            f"/api/v1/projects/{project['id']}/sections/cover",
            json={"content": {"test": "data"}}
        )
        
        # Delete project
        await client.delete(f"/api/v1/projects/{project['id']}")
        
        # Verify section data also deleted (should return 404)
        response = await client.get(f"/api/v1/projects/{project['id']}/sections/cover")
        assert response.status_code == 404
```

### Frontend Testing

#### Component Unit Tests

**useAutoSave Hook Tests** (`src/hooks/__tests__/useAutoSave.test.ts`)
```typescript
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAutoSave } from '../useAutoSave';
import * as api from '../../api/sections';

jest.mock('../../api/sections');

describe('useAutoSave', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should debounce save calls', async () => {
    const mockUpsert = jest.spyOn(api, 'upsertSection').mockResolvedValue({});
    const { result } = renderHook(() => useAutoSave('project-1', 'cover', 100));

    act(() => {
      result.current.save({ test: 'data1' });
      result.current.save({ test: 'data2' });
      result.current.save({ test: 'data3' });
    });

    // Should only call API once after debounce
    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalledTimes(1);
      expect(mockUpsert).toHaveBeenCalledWith('project-1', 'cover', { test: 'data3' });
    });
  });

  it('should update status to saving then saved', async () => {
    jest.spyOn(api, 'upsertSection').mockResolvedValue({});
    const { result } = renderHook(() => useAutoSave('project-1', 'cover', 100));

    expect(result.current.status).toBe('idle');

    act(() => {
      result.current.save({ test: 'data' });
    });

    expect(result.current.status).toBe('saving');

    await waitFor(() => {
      expect(result.current.status).toBe('saved');
    });
  });

  it('should update status to error on API failure', async () => {
    jest.spyOn(api, 'upsertSection').mockRejectedValue(new Error('API Error'));
    const { result } = renderHook(() => useAutoSave('project-1', 'cover', 100));

    act(() => {
      result.current.save({ test: 'data' });
    });

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });
  });
});
```

**CompletionBadge Component Tests** (`src/components/shared/__tests__/CompletionBadge.test.tsx`)
```typescript
import { render, screen } from '@testing-library/react';
import CompletionBadge from '../CompletionBadge';

describe('CompletionBadge', () => {
  it('should render checkmark for complete status', () => {
    render(<CompletionBadge status="complete" />);
    expect(screen.getByText('✅')).toBeInTheDocument();
  });

  it('should render yellow circle for visited status', () => {
    render(<CompletionBadge status="visited" />);
    expect(screen.getByText('🟡')).toBeInTheDocument();
  });

  it('should render white circle for not_started status', () => {
    render(<CompletionBadge status="not_started" />);
    expect(screen.getByText('⚪')).toBeInTheDocument();
  });
});
```

#### End-to-End Tests

**Critical User Workflows** (`e2e/workflows.spec.ts`)
```typescript
import { test, expect } from '@playwright/test';

test.describe('Project Creation and Editing', () => {
  test('should create new project and navigate to editor', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Click New Project button
    await page.click('text=New Project');
    
    // Fill form
    await page.fill('input[name="solution_name"]', 'PMYMS');
    await page.fill('input[name="solution_full_name"]', 'Plate Mill Yard Management System');
    await page.fill('input[name="client_name"]', 'JSPL');
    await page.fill('input[name="client_location"]', 'Angul');
    
    // Submit
    await page.click('text=Create Project');
    
    // Should navigate to editor
    await expect(page).toHaveURL(/\/editor\/.+/);
    await expect(page.locator('text=Cover Page')).toBeVisible();
  });

  test('should auto-save section changes', async ({ page }) => {
    // Navigate to existing project
    await page.goto('http://localhost:5173/editor/test-project-id');
    
    // Click Cover Page section
    await page.click('text=Cover Page');
    
    // Edit field
    await page.fill('input[name="solution_full_name"]', 'Updated Solution Name');
    
    // Wait for auto-save indicator
    await expect(page.locator('text=Saving...')).toBeVisible();
    await expect(page.locator('text=Saved ✓')).toBeVisible({ timeout: 2000 });
  });

  test('should update solution name across all sections', async ({ page }) => {
    await page.goto('http://localhost:5173/editor/test-project-id');
    
    // Update solution name in cover
    await page.click('text=Cover Page');
    await page.fill('input[name="solution_name"]', 'NewName');
    
    // Navigate to hardware specs
    await page.click('text=Hardware Specifications');
    
    // Should see updated name in row 5
    const row5 = page.locator('table tr:nth-child(5)');
    await expect(row5).toContainText('NewName Client Desktop');
  });
});

test.describe('Document Generation', () => {
  test('should generate document when all sections complete', async ({ page }) => {
    // Navigate to complete project
    await page.goto('http://localhost:5173/editor/complete-project-id');
    
    // Click Generate Document
    const downloadPromise = page.waitForEvent('download');
    await page.click('text=Generate Document');
    
    // Should trigger download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/TS_.+\.docx/);
  });

  test('should show missing sections on incomplete project', async ({ page }) => {
    await page.goto('http://localhost:5173/editor/incomplete-project-id');
    
    // Click Generate Document
    await page.click('text=Generate Document');
    
    // Should show error with missing sections
    await expect(page.locator('text=Please complete all required sections')).toBeVisible();
    await expect(page.locator('text=Cover Page')).toBeVisible();
    await expect(page.locator('text=Features')).toBeVisible();
  });
});

test.describe('Image Upload', () => {
  test('should upload architecture diagram', async ({ page }) => {
    await page.goto('http://localhost:5173/editor/test-project-id');
    
    // Navigate to System Configuration
    await page.click('text=System Configuration');
    
    // Upload image
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/fixtures/architecture.png');
    
    // Should show success message
    await expect(page.locator('text=Image uploaded successfully')).toBeVisible();
    
    // Should display thumbnail
    await expect(page.locator('img[alt="Architecture diagram"]')).toBeVisible();
  });
});
```

### Test Coverage Goals

- **Backend Unit Tests**: 80% code coverage
- **Backend Integration Tests**: All API endpoints covered
- **Frontend Component Tests**: 70% coverage for shared components
- **End-to-End Tests**: All critical user workflows covered

### Running Tests

**Backend:**
```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_completion.py

# Run integration tests only
pytest tests/integration/
```

**Frontend:**
```bash
# Run unit tests
npm test

# Run with coverage
npm test -- --coverage

# Run E2E tests
npm run test:e2e

# Run E2E tests in headed mode
npm run test:e2e -- --headed
```

