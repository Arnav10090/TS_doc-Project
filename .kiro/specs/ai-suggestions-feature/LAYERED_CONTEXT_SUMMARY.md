# Layered Context Architecture - Executive Summary

## What This Refactoring Does

Transforms the AI Suggestions context system from **monolithic** to **layered**, dramatically improving relevance and reducing token waste.

### Before (Current)
```
UGS/
└── context.txt  (4000+ chars, truncated to 2000)
    ├─ Domain knowledge
    ├─ Architecture details
    ├─ Implementation phases
    ├─ Cybersecurity policies
    ├─ Gantt scheduling
    └─ Buyer obligations

Problem: hardware_specs loads ALL of this (60% irrelevant)
```

### After (New Architecture)
```
UGS/
├── context.txt  [kept as fallback, not loaded if new files exist]
├── domain_context.txt (800 chars)
├── architecture_context.txt (600 chars)
├── implementation_context.txt (1000 chars)
├── cybersecurity_context.txt (500 chars)
├── gantt_context.txt (400 chars)
└── section_guidance/
    ├── hardware_specs.txt (250 chars)
    ├── software_specs.txt (250 chars)
    ├── cybersecurity.txt (250 chars)
    └── ... (30+ section-specific files)

hardware_specs loads: architecture_context + section_guidance/hardware_specs
Total: 850 chars (vs 2000 before), 95% relevant (vs 40% before)
```

## Key Benefits

1. **60-70% Token Reduction** for most sections
2. **90%+ Context Relevance** (vs 40% with monolithic)
3. **Scalable** - Easy to add new TS types without massive files
4. **Maintainable** - Update one context type without affecting others
5. **Zero Breaking Changes** - Falls back to old context.txt if new files missing

## How It Works

### Context Routing System
```python
SECTION_CONTEXT_MAP = {
    "hardware_specs": ["architecture_context"],
    "overall_gantt": ["gantt_context"],
    "cybersecurity": ["cybersecurity_context"],
    # ... etc
}
```

- System looks up section key in map
- Loads only the specified shared context files
- Loads section-specific guidance file if exists
- Falls back to legacy context.txt if no new files

### Prompt Assembly (Layer 5 of 7-layer hierarchy)
```
## 5. Category Context (layered - loaded for hardware_specs)
Loaded context files: architecture_context, section_guidance/hardware_specs.txt

### Architecture Context
[architecture_context.txt content - 600 chars]

### Section-Specific Guidance
[section_guidance/hardware_specs.txt content - 250 chars]
```

## Implementation Plan

### 6 Phases, 14 Tasks, ~85 Subtasks, 3-4 weeks

**Phase 1: Core Infrastructure** (5 days)
- Create routing map system
- Create layered context schema
- Implement layered retrieval function
- Update prompt builder
- Wire into service layer

**Phase 2: UGS Pilot Migration** (4 days)
- Split UGS context.txt into 5 shared files
- Create 12+ section guidance files
- Validate improvements (token usage, relevance, quality)

**Phase 3: Testing** (2 days)
- Unit tests (routing, retrieval, prompt building)
- Integration tests (end-to-end suggestions)
- Performance tests (token usage, cache hit rates)

**Phase 4: Migration Tools & Docs** (3 days)
- Build automated migration script
- Create context file templates
- Write migration guide and troubleshooting docs

**Phase 5: Rollout to Other TS Types** (4 days)
- Migrate Level 2, OT Cybersecurity, OT Upgrades, Yard Management
- Validate each migration
- Document TS-type-specific considerations

**Phase 6: Cleanup & Optimization** (2.5 days)
- Remove legacy code paths
- Optimize caching and performance
- Final documentation updates
- Production readiness checklist

## Success Metrics

| Metric | Before | After (Target) |
|--------|--------|----------------|
| Token usage (technical sections) | 2000 chars | 800 chars (60% reduction) |
| Token usage (overall) | 2000 chars | 1200 chars (40% reduction) |
| Context relevance | 40% | 90%+ |
| Output quality | Baseline | Equal or better |
| Scalability | Poor (4000+ char files) | Excellent (small focused files) |

## Risk Mitigation

- **Legacy Fallback:** Old context.txt always available as backup
- **Gradual Rollout:** UGS pilot first, then others
- **Comprehensive Testing:** 90%+ test coverage
- **Rollback Plan:** Remove new files → automatic fallback to legacy
- **Validation:** A/B comparison before/after for each TS type

## Files Created

### Implementation Files
- `backend/app/ai_suggestions/section_context_map.py` (NEW)
- `backend/app/ai_suggestions/retrieval.py` (MAJOR CHANGES)
- `backend/app/ai_suggestions/builders.py` (MODERATE CHANGES)
- `backend/app/ai_suggestions/service.py` (MINOR CHANGES)

### Content Files (Per TS Type)
- `domain_context.txt`
- `architecture_context.txt`
- `implementation_context.txt`
- `cybersecurity_context.txt`
- `gantt_context.txt`
- `section_guidance/{section_key}.txt` (30+ files)

### Migration Tools
- `scripts/migrate_context_to_layered.py` (NEW)
- Context file templates
- Migration guide
- Troubleshooting guide

## Next Steps

1. **Review this plan** with team
2. **Approve architecture** and approach
3. **Start Phase 1** (core infrastructure)
4. **Pilot with UGS** and validate improvements
5. **Iterate** based on pilot results
6. **Roll out** to other TS types
7. **Monitor** production metrics

## Questions for Discussion

1. Should we support JSON overrides for custom routing per TS type?
2. What metrics should we track in production?
3. Should we build AI-assisted context splitting tool?
4. Timeline: Can we allocate 3-4 weeks for this refactoring?
5. Priority: Should this be done before or after other planned features?

---

**Status:** Architecture design complete, ready for review and approval  
**Next:** Obtain stakeholder sign-off → Begin Phase 1 implementation
