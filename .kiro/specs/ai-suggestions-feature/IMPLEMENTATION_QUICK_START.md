# Layered Context Architecture - Implementation Quick Start

## 🚀 Getting Started

### Step 1: Review Documents
1. Read `LAYERED_CONTEXT_SUMMARY.md` - Executive overview
2. Review `LAYERED_CONTEXT_ARCHITECTURE_PLAN.md` - Detailed architecture
3. Check `LAYERED_CONTEXT_TASKS.md` - Implementation tasks
4. Study `LAYERED_CONTEXT_ARCHITECTURE_DIAGRAM.md` - Visual reference

### Step 2: Set Up Development Environment
```bash
# Make sure you're on the right branch
git checkout -b feature/layered-context-architecture

# Ensure all existing tests pass
cd backend
pytest tests/

# Verify current AI suggestions work
python scripts/test_ai_suggestions.py
```

### Step 3: Start with Phase 1

## 📋 Phase 1 Checklist: Core Infrastructure

### Important: Template Alignment

**Before implementing the routing system, review the template alignment documentation:**

1. **Read Template Section Hierarchy** in `LAYERED_CONTEXT_ARCHITECTURE_PLAN.md` (Appendix - Template Alignment)
2. **Understand Template-to-Repository Mapping**:
   - ORIGINAL TS template uses human-readable headings (e.g., "Executive Summary")
   - Repository section keys use snake_case (e.g., `executive_summary`)
   - Section guidance files are named using repository keys
   - Routing map entries use repository keys
3. **Key Mapping Rules**:
   - Suppressed sections (cover, revision_history, abbreviations) have no AI buttons → no routing needed
   - Completion-excluded sections (binding_conditions, cybersecurity, disclaimer, scope_definitions) ARE in routing map
   - Technology Stack is hierarchical: tech_stack + hardware_specs + software_specs + third_party_sw
4. **Reference the Complete Section List** (29 AI-eligible sections):
   - See Task 21.1 in `LAYERED_CONTEXT_TASKS.md` for the definitive list
   - Cross-reference with `frontend/src/components/sections/predefinedSectionContent.ts` for repository keys

### Day 1: Routing System

**Task 21.1-21.2: Create section_context_map.py**

```bash
# Create the file
touch backend/app/ai_suggestions/section_context_map.py
```

Key functions to implement:
- `DEFAULT_SECTION_CONTEXT_MAP: Dict[str, List[str]]` - **MUST include all 29 AI-eligible sections**
- `get_shared_context_files(section_key) -> List[str]`
- `get_section_guidance_file(section_key) -> Optional[str]`
- `has_section_guidance(section_key) -> bool`

Routing map format (aligned with ORIGINAL TS template):
```python
DEFAULT_SECTION_CONTEXT_MAP = {
    # Executive & Introduction (template level 2-3)
    "executive_summary": ["domain_context"],
    "introduction": ["domain_context"],
    "process_flow": ["domain_context", "architecture_context"],
    "overview": ["domain_context"],
    
    # Offerings (template level 4)
    "features": ["domain_context", "implementation_context"],
    "remote_support": ["implementation_context"],
    "documentation_control": ["implementation_context"],
    "customer_training": ["implementation_context"],
    
    # Technical Configuration (template level 5)
    "system_config": ["architecture_context"],
    "fat_condition": ["implementation_context"],
    "tech_stack": ["architecture_context"],
    "hardware_specs": ["architecture_context"],
    "software_specs": ["architecture_context"],
    "third_party_sw": ["architecture_context"],
    
    # Schedule (template level 6)
    "overall_gantt": ["gantt_context"],
    "shutdown_gantt": ["gantt_context"],
    
    # Scope & Responsibilities (template level 7)
    "supervisors": ["implementation_context"],
    "scope_definitions": ["domain_context", "implementation_context"],
    "division_of_eng": ["implementation_context"],
    
    # Value & Completion (template level 8)
    "value_addition": ["implementation_context"],
    "work_completion": ["implementation_context"],
    
    # Obligations & Exclusions (template level 9)
    "buyer_obligations": ["implementation_context"],
    "exclusion_list": ["implementation_context"],
    "buyer_prerequisites": ["implementation_context"],
    
    # Legal & Compliance (template level 10)
    "binding_conditions": ["implementation_context"],
    "cybersecurity": ["cybersecurity_context"],
    "disclaimer": ["implementation_context"],
    
    # Proof of Concept (template level 11)
    "poc": ["architecture_context", "implementation_context"],
    # ... map all 31 predefined sections
}
```

**Task 21.3: JSON Override Support**

```python
# Load custom routing map from JSON if exists
custom_map_path = os.path.join(ts_type_folder, "section_context_map.json")
if os.path.exists(custom_map_path):
    with open(custom_map_path) as f:
        custom_map = json.load(f)
    # Merge: custom overrides default
    final_map = {**DEFAULT_SECTION_CONTEXT_MAP, **custom_map}
```

**Task 21.4: Unit Tests**

```bash
touch backend/tests/unit/test_section_context_map.py
```

Test cases:
- All predefined sections have mappings
- Custom sections fall back to ["domain_context"]
- Invalid sections return safe default
- JSON override merging works
- get_section_guidance_file() returns correct filename

### Day 2: Layered Context Schema

**Task 22.1: Define LayeredCategoryContext**

```python
# In backend/app/ai_suggestions/retrieval.py

class LayeredCategoryContext(BaseModel):
    """Layered context with separate shared and section-specific files."""
    
    # Shared context files
    domain_context: Optional[str] = None
    architecture_context: Optional[str] = None
    implementation_context: Optional[str] = None
    cybersecurity_context: Optional[str] = None
    gantt_context: Optional[str] = None
    
    # Section-specific guidance
    section_guidance: Optional[str] = None
    
    # Historical documents (unchanged)
    historical_documents: List[HistoricalDoc]
    
    # Metadata
    folder_path: str
    historical_context_available: bool
    loaded_shared_contexts: List[str]
    section_guidance_available: bool
    
    # Legacy fallback
    legacy_context_txt: Optional[str] = None
```

**Task 22.2-22.3: Type Aliases**

```python
# For migration compatibility
LegacyCategoryContext = CategoryContext  # Old type
ModernCategoryContext = LayeredCategoryContext  # New type
```

### Day 3-4: Implement Layered Context Loader

**Task 23.1-23.6: Implement load_layered_context()**

Key algorithm:
```python
def load_layered_context(
    ts_type: str,
    ts_documents_dir: str,
    section_key: str,
    max_docs: int = 5
) -> LayeredCategoryContext:
    # 1. Resolve and validate path
    folder = resolve_ts_type_folder(ts_type, ts_documents_dir)
    
    # 2. Check for layered files
    if not has_layered_files(folder):
        # Fall back to legacy context.txt
        return load_legacy_fallback(folder, max_docs)
    
    # 3. Get routing for this section
    shared_files = get_shared_context_files(section_key)
    guidance_file = get_section_guidance_file(section_key)
    
    # 4. Load shared context files
    contexts = {}
    for context_name in shared_files:
        path = os.path.join(folder, f"{context_name}.txt")
        if os.path.exists(path):
            contexts[context_name] = read_and_normalize(path, max_chars=1000)
    
    # 5. Load section guidance
    guidance = None
    if guidance_file:
        path = os.path.join(folder, "section_guidance", guidance_file)
        if os.path.exists(path):
            guidance = read_and_normalize(path, max_chars=500)
    
    # 6. Load historical documents (unchanged)
    historical_docs = load_historical_documents(folder, max_docs)
    
    # 7. Return layered context
    return LayeredCategoryContext(
        domain_context=contexts.get("domain_context"),
        architecture_context=contexts.get("architecture_context"),
        # ... other fields
        section_guidance=guidance,
        historical_documents=historical_docs,
        loaded_shared_contexts=list(contexts.keys()),
        # ... metadata
    )
```

**Task 23.7: Comprehensive Tests**

```bash
touch backend/tests/unit/test_layered_retrieval.py
```

Test matrix:
- All layered files present
- Some layered files missing
- No layered files (legacy fallback)
- Path traversal attempt (security)
- File read errors (corrupt, encoding)
- Cache hit/miss scenarios
- Section routing integration

### Day 5: Update Prompt Builder

**Task 24.1: Create _format_layered_context()**

```python
def _format_layered_context(
    context: LayeredCategoryContext,
    section_key: str
) -> str:
    """Format layered context into prompt."""
    
    parts = []
    header = f"## 5. Category Context (layered - loaded for {section_key})\n"
    
    # Metadata about what was loaded
    loaded = context.loaded_shared_contexts.copy()
    if context.section_guidance_available:
        loaded.append(f"section_guidance/{section_key}.txt")
    metadata = f"Loaded context files: {', '.join(loaded)}\n\n"
    
    parts.append(header + metadata)
    
    # Add each present context type
    if context.domain_context:
        parts.append(f"### Domain Context\n{context.domain_context}\n\n")
    
    if context.architecture_context:
        parts.append(f"### Architecture Context\n{context.architecture_context}\n\n")
    
    # ... other context types
    
    if context.section_guidance:
        parts.append(f"### Section-Specific Guidance\n{context.section_guidance}\n\n")
    
    # Legacy fallback
    if not any([context.domain_context, context.architecture_context, ...]):
        if context.legacy_context_txt:
            parts.append(f"### Legacy Context\n{context.legacy_context_txt}\n\n")
        else:
            parts.append("(No context available)\n\n")
    
    return "".join(parts)
```

**Task 24.2-24.4: Integration**

Replace in `build_section_prompt()`:
```python
# OLD:
# parts.append(_format_context_txt(category_context.context_txt))

# NEW:
parts.append(_format_layered_context(category_context, section_key))
```

Update function signatures:
- `build_section_prompt(..., category_context: LayeredCategoryContext, ...)`
- `build_custom_section_prompt(..., category_context: LayeredCategoryContext, ...)`
- `build_gantt_prompt(..., category_context: LayeredCategoryContext, ...)`

**Task 24.5: Tests**

```bash
touch backend/tests/unit/test_layered_builders.py
```

### Day 6: Wire into Service Layer

**Task 25.1-25.4: Update service.py**

```python
# In generate_suggestion():

# OLD:
# category_context = load_category_context(
#     project.ts_type, 
#     settings.TS_DOCUMENTS_DIR
# )

# NEW:
category_context = load_layered_context(
    project.ts_type,
    settings.TS_DOCUMENTS_DIR,
    section_key,  # ← NEW PARAMETER
    max_docs=5
)

# Update prompt builder calls to pass LayeredCategoryContext
prompt = build_section_prompt(
    section_key=section_key,
    project=project,
    all_sections=all_sections,
    draft_content=request.draft_content,
    category_context=category_context,  # ← LayeredCategoryContext now
    project_context_md=""  # Deprecated
)
```

Update response metadata:
```python
return SuggestionResponse(
    # ... existing fields
    context_sources=[doc.filename for doc in category_context.historical_documents],
    context_txt_used=len(category_context.loaded_shared_contexts) > 0,
    # Add new field:
    section_guidance_used=category_context.section_guidance_available
)
```

---

## 🧪 Testing After Phase 1

### Run All Tests
```bash
cd backend
pytest tests/ -v
```

### Manual Test
```bash
# Test with existing TS type (should use legacy fallback)
python -c "
from app.ai_suggestions.retrieval import load_layered_context
ctx = load_layered_context('Level 2', './ts_documents', 'hardware_specs')
print('Legacy fallback:', ctx.legacy_context_txt is not None)
print('Layered files:', ctx.loaded_shared_contexts)
"

# Should print:
# Legacy fallback: True
# Layered files: []
```

### Checkpoint: Phase 1 Complete ✅
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Legacy fallback works (no breaking changes)
- [ ] Code review completed
- [ ] Documentation updated

---

## 📦 Phase 2 Preview: UGS Pilot

### What You'll Do
1. Split UGS context.txt into 5 shared files
2. Create 30+ section guidance files
3. Run A/B comparison (before/after metrics)
4. Validate improvements

### Expected Results
- 50-60% token reduction
- 90%+ context relevance
- Equal or better output quality

### Time Estimate
4 days

---

## 🎯 Key Files Reference

### New Files Created
```
backend/app/ai_suggestions/
├── section_context_map.py  ← NEW
└── retrieval.py  ← MAJOR CHANGES

backend/tests/unit/
├── test_section_context_map.py  ← NEW
├── test_layered_retrieval.py  ← NEW
└── test_layered_builders.py  ← NEW

ts_documents/{TS_Type}/
├── domain_context.txt  ← NEW
├── architecture_context.txt  ← NEW
├── implementation_context.txt  ← NEW
├── cybersecurity_context.txt  ← NEW
├── gantt_context.txt  ← NEW
└── section_guidance/  ← NEW DIRECTORY
    ├── hardware_specs.txt
    ├── software_specs.txt
    └── ... (30+ files)
```

### Modified Files
```
backend/app/ai_suggestions/
├── builders.py  ← MODERATE CHANGES
└── service.py  ← MINOR CHANGES

backend/app/ai_suggestions/schemas.py  ← Add section_guidance_used field
```

---

## 🐛 Common Issues & Solutions

### Issue: "Path traversal detected"
**Solution:** Ensure ts_type doesn't contain `..` or absolute paths

### Issue: "Legacy fallback always used"
**Solution:** Check layered files exist and have correct names

### Issue: "Wrong context loaded for section"
**Solution:** Verify routing map entry for that section

### Issue: "Tests failing after changes"
**Solution:** Update test fixtures to use LayeredCategoryContext

### Issue: "Cache not invalidating"
**Solution:** Check folder modification time detection logic

---

## 📞 Need Help?

1. Check existing tests for examples
2. Review architecture plan for details
3. Read prompt builder comments for layer explanations
4. Ask team for architecture review

---

## ✅ Phase 1 Success Criteria

- [ ] Routing system works for all 31 sections
- [ ] Layered context loads correctly
- [ ] Legacy fallback works (backward compatible)
- [ ] All tests pass (90%+ coverage)
- [ ] No regressions in existing functionality
- [ ] Code reviewed and approved

**When all checked:** Move to Phase 2 (UGS Pilot)

