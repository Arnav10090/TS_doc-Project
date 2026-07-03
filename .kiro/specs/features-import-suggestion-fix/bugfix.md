# Bugfix Requirements Document

## Introduction

The "Import Suggestion" feature in the Features section of the TS Document Generator is not correctly populating the Items table (marked "Required", with columns: brief / title / description). When a user clicks **AI Suggestions → Import Suggestion** in the Features section editor, the system creates a new, separate **Rows** table in the sidebar while leaving the **Items** table empty.

This bug causes the document preview to continue showing placeholder text `[Enter feature description]` even after a successful AI import and Save operation, because the document generator only reads the `items` array from the section data.

**Impact:**
- Users cannot successfully import AI-generated feature suggestions
- The preview remains broken with placeholder text
- Imported content is stored in the wrong data structure (`rows` instead of `items`)
- The bug becomes self-perpetuating: once a `rows` key exists on the draft, all future imports fail

**Root Causes:**

Two compounding bugs combine to create this failure:

**Bug A - Frontend routing bug (primary symptom):**
- Location: `frontend/src/utils/aiSuggestionImport.ts`
- The fast-path routing logic for items-based sections (line ~214) checks `!Array.isArray(draft.rows)` to decide whether to route to Family D (items) handler
- This check only works if the draft doesn't have a `rows` key at all
- However, `mergeSectionContent()`/`mergeDefaults()` in `frontend/src/components/sections/predefinedSectionContent.ts` intentionally preserves any key present on saved content that isn't part of the default schema
- Once a `rows` key is ever written onto a features draft, every future import permanently skips the fast-path and falls through to the generic tabular handler (`importFamilyB`)
- This writes AI items into a new `rows` array instead of `items`, creating a self-perpetuating bug

**Bug B - Backend prompt lacks field guidance for Family D sections:**
- Location: `backend/app/ai_suggestions/builders.py`, function `_format_output_instructions()` (lines ~460-495)
- Builds field guidance for families A, B, and C from SECTION_SCHEMAS
- Has no branch for family "D" (features, documentation_control, buyer_obligations, exclusion_list, buyer_prerequisites)
- `backend/app/ai_suggestions/section_schemas.py` already defines `"item_fields": ["id", "title", "brief", "description"]` for the features section
- Without field-name guidance, the LLM invents its own keys (e.g., a spurious `feature` key instead of `title`)
- This is the same failure mode already correctly fixed for `division_of_eng` in the same file

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user clicks "Import Suggestion" in the Features section editor AND a `rows` key exists on the draft (even if empty) THEN the system writes the imported AI items into a new `rows` array instead of the `items` array

1.2 WHEN the LLM generates suggestions for Family D sections (features, documentation_control, buyer_obligations, exclusion_list, buyer_prerequisites) THEN the LLM invents its own field names (e.g., `feature` instead of `title`) because the prompt does not include field guidance

1.3 WHEN the document preview renders after an import THEN the preview shows placeholder text `[Enter feature description]` because the `items` array remains empty

1.4 WHEN a user saves a draft that has a spurious `rows` key THEN all future imports for that section will fail because the routing logic permanently routes to the wrong handler

### Expected Behavior (Correct)

2.1 WHEN a user clicks "Import Suggestion" in the Features section editor THEN the system SHALL populate the `items` array with AI-generated feature items, regardless of whether a `rows` key exists on the draft

2.2 WHEN the LLM generates suggestions for Family D sections THEN the LLM SHALL use the canonical field names defined in SECTION_SCHEMAS (`id`, `title`, `brief`, `description` for features)

2.3 WHEN the document preview renders after a successful import THEN the preview SHALL display the imported feature content instead of placeholder text

2.4 WHEN a user saves a draft that has imported feature items THEN the saved content SHALL contain only the `items` array without spurious `rows` keys

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user imports suggestions for Family A sections (rich text) THEN the system SHALL CONTINUE TO populate the appropriate text fields (e.g., `paragraphs`, `text`, `html`)

3.2 WHEN a user imports suggestions for Family B sections (tabular, e.g., tech_stack, hardware_specs) THEN the system SHALL CONTINUE TO populate the `rows` array correctly

3.3 WHEN a user imports suggestions for Family C sections (mixed-field, e.g., overview, customer_training) THEN the system SHALL CONTINUE TO perform shallow merge of named fields

3.4 WHEN a user imports suggestions for Family D sections OTHER than features (documentation_control, buyer_obligations, exclusion_list, buyer_prerequisites) THEN the system SHALL CONTINUE TO populate the `items` array correctly

3.5 WHEN a user imports suggestions for Family E sections (image-backed, e.g., system_config, overall_gantt) THEN the system SHALL CONTINUE TO populate description fields while preserving image data

3.6 WHEN a user imports suggestions for the division_of_eng section (Family B with matrix_rows) THEN the system SHALL CONTINUE TO populate the `matrix_rows` array correctly using the existing `_format_division_of_eng_output_instructions()` function

3.7 WHEN `mergeSectionContent()` merges saved content with defaults THEN the system SHALL CONTINUE TO preserve keys from saved content that aren't in the default schema (this is intentional design)

3.8 WHEN the backend parser receives a response with a `{"rows": [...]}` envelope shape THEN the system SHALL parse it as a fallback for Family B sections

---

## Bug Condition and Property Specification

### Bug Condition Function

**Bug Condition C(X)** - Identifies inputs that trigger the bug:

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type {sectionKey: string, draft: object, importedContent: any}
  OUTPUT: boolean
  
  // Returns true when the bug condition is met:
  // - The section is a Family D (items-based) section
  // - The draft has a `rows` key (even if empty or null)
  // - The imported content is an array of items OR an object with `items` key
  RETURN (
    X.sectionKey IN ["features", "documentation_control", "buyer_obligations", "exclusion_list", "buyer_prerequisites"]
    AND "rows" IN keys(X.draft)
    AND (isArray(X.importedContent) OR ("items" IN keys(X.importedContent)))
  )
END FUNCTION
```

**Counterexample:**
```typescript
// Bug triggers when:
const X = {
  sectionKey: "features",
  draft: { items: [], rows: [] },  // has a rows key
  importedContent: [
    { id: "1", title: "Feature A", brief: "Brief A", description: "Desc A" }
  ]
}
// Current behavior: writes to draft.rows instead of draft.items
// Expected behavior: writes to draft.items
```

### Property Specification

**Property: Fix Checking** - Defines correct behavior for buggy inputs:

```pascal
// Property: Fix Checking - Features Import Routes to Items
FOR ALL X WHERE isBugCondition(X) DO
  result ← importSuggestion'(X.projectId, X.sectionKey, X.suggestion, X.draft)
  ASSERT (
    isArray(result.items) AND
    result.items.length > 0 AND
    result.items = X.importedContent
  )
END FOR
```

**Key Definitions:**
- **F (original function)**: `importSuggestion()` in `aiSuggestionImport.ts` before the fix - routes to `importFamilyB()` when `draft.rows` exists
- **F' (fixed function)**: `importSuggestion()` after the fix - routes to `importFamilyD()` based on section key lookup, ignoring presence of `rows` key

### Preservation Goal

**Property: Preservation Checking** - Ensures non-buggy inputs remain unchanged:

```pascal
// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT F(X) = F'(X)
END FOR
```

**Non-buggy inputs (¬C(X)):**
- Family A sections (executive_summary, introduction, process_flow, etc.)
- Family B sections (tech_stack, hardware_specs, software_specs, division_of_eng)
- Family C sections (overview, customer_training, third_party_sw, etc.)
- Family D sections WITHOUT a spurious `rows` key in the draft
- Family E sections (system_config, overall_gantt, shutdown_gantt)
- Custom sections with subsection suggestions
