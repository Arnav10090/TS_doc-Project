# Sidebar Button Visibility Fix

## Issue
The red "Generate Document" button at the bottom of the sidebar was not completely visible. When scrolling through the section list, the button would get cut off or hidden.

## Root Cause
The sidebar container had `overflowY: 'auto'` applied to the entire aside element, which made the entire sidebar scrollable including the button. This caused the button to be part of the scrollable content rather than being fixed at the bottom.

## Problem with Previous Layout
```tsx
<aside style={{
  height: '100vh',
  overflowY: 'auto',  // ← Made entire sidebar scrollable
}}>
  <div>Progress Indicator</div>
  <div style={{ flex: 1 }}>Section Groups</div>  // ← Scrollable with button
  <div>Generate Button</div>  // ← Gets cut off when scrolling
</aside>
```

## Solution
Changed the layout to use flexbox properly with these key changes:

1. **Container**: Changed from `height: calc(100vh - 56px)` to using `top: 56px` and `bottom: 0` for precise positioning, and changed `overflowY: 'auto'` to `overflow: 'hidden'`
2. **Progress Indicator**: Added `flexShrink: 0` to prevent it from shrinking
3. **Section Groups**: Added `minHeight: 0` and `paddingBottom: '16px'` to allow proper flex shrinking and added spacing at the bottom
4. **Missing Sections Alert**: Added `flexShrink: 0` to keep it fixed when visible
5. **Generate Button**: Added `flexShrink: 0`, `backgroundColor: '#FFFFFF'`, `position: 'relative'`, and `zIndex: 10` to keep it fixed at the bottom

## New Layout Structure
```tsx
<aside style={{
  position: 'fixed',
  top: '56px',
  bottom: 0,  // ← Uses bottom instead of calculated height
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
}}>
  <div style={{ flexShrink: 0 }}>Progress Indicator</div>  // ← Fixed at top
  <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingBottom: '16px' }}>
    Section Groups
  </div>
  <div style={{ flexShrink: 0 }}>Missing Sections Alert</div>  // ← Fixed when visible
  <div style={{ flexShrink: 0, zIndex: 10 }}>Generate Button</div>  // ← Always visible at bottom
</aside>
```

## How It Works
- The sidebar uses flexbox with `flex-direction: column`
- The progress indicator, missing sections alert, and generate button are fixed (`flexShrink: 0`)
- Only the section groups area is scrollable (`overflowY: 'auto'`)
- The `minHeight: 0` on the scrollable area allows it to shrink below its content size, enabling proper scrolling
- The button stays fixed at the bottom regardless of scroll position

## Benefits
1. **Always visible**: Generate Document button is always visible at the bottom
2. **Better UX**: Users can always access the primary action without scrolling
3. **Proper scrolling**: Only the section list scrolls, not the entire sidebar
4. **Responsive**: Layout adapts properly to different viewport heights

## Files Modified
1. `frontend/src/components/layout/SectionSidebar.tsx` - Fixed sidebar layout with proper flexbox structure

## Verification
- ✓ Generate Document button is fully visible at all times
- ✓ Section list scrolls independently
- ✓ Progress indicator stays at the top
- ✓ Missing sections alert (when visible) stays above the button
- ✓ No content gets cut off when scrolling
