export const EDIT_METADATA_KEY = "__editMetadata";

export type EditMarkerType = "new" | "updated";

export interface EditMarker {
  path: string;
  updatedAt: string;
  editor?: string;
  type?: EditMarkerType;
}

export interface EditMetadata {
  version: 1;
  sectionUpdatedAt?: string;
  markers: Record<string, EditMarker>;
}

export const getMarkerType = (marker: EditMarker): EditMarkerType =>
  marker.type ?? "updated";

const IGNORED_ROW_KEYS = new Set(["locked", "locked_specs_line1"]);

const isPlainObject = (value: unknown): value is Record<string, any> =>
  Boolean(value) &&
  typeof value === "object" &&
  !Array.isArray(value);

export const stripEditMetadata = <T extends Record<string, any> | undefined>(
  content: T,
): T => {
  if (!content) {
    return content;
  }

  const { [EDIT_METADATA_KEY]: _metadata, ...rest } = content;
  return rest as T;
};

export const getEditMetadata = (
  content: Record<string, any> | undefined,
): EditMetadata | undefined => {
  const metadata = content?.[EDIT_METADATA_KEY];

  if (!isPlainObject(metadata) || !isPlainObject(metadata.markers)) {
    return undefined;
  }

  return metadata as EditMetadata;
};

const normalizeValue = (value: unknown): unknown => {
  if (typeof value === "string") {
    return value.trim();
  }

  return value;
};

const isEqualContentValue = (previous: unknown, next: unknown): boolean =>
  JSON.stringify(normalizeValue(previous)) === JSON.stringify(normalizeValue(next));

const getChildKeys = (previous: Record<string, any>, next: Record<string, any>) =>
  Array.from(new Set([...Object.keys(previous), ...Object.keys(next)])).filter(
    (key) => key !== EDIT_METADATA_KEY && !IGNORED_ROW_KEYS.has(key),
  );

interface ChangedPath {
  path: string;
  operation: EditMarkerType;
}

const isAbsent = (value: unknown): boolean =>
  value === undefined || value === null || value === "";

const collectChangedPathsWithOperation = (
  previous: unknown,
  next: unknown,
  currentPath = "",
): ChangedPath[] => {
  if (Array.isArray(previous) || Array.isArray(next)) {
    const previousArray = Array.isArray(previous) ? previous : [];
    const nextArray = Array.isArray(next) ? next : [];
    const maxLength = Math.max(previousArray.length, nextArray.length);

    return Array.from({ length: maxLength }).flatMap((_, index) =>
      collectChangedPathsWithOperation(
        previousArray[index],
        nextArray[index],
        currentPath ? `${currentPath}.${index}` : `${index}`,
      ),
    );
  }

  if (isPlainObject(previous) || isPlainObject(next)) {
    const previousObject = isPlainObject(previous) ? previous : {};
    const nextObject = isPlainObject(next) ? next : {};

    return getChildKeys(previousObject, nextObject).flatMap((key) =>
      collectChangedPathsWithOperation(
        previousObject[key],
        nextObject[key],
        currentPath ? `${currentPath}.${key}` : key,
      ),
    );
  }

  if (!currentPath || isEqualContentValue(previous, next)) {
    return [];
  }

  // If next is absent (deletion), don't create a marker
  if (isAbsent(next)) {
    return [];
  }

  const operation: EditMarkerType = isAbsent(previous) ? "new" : "updated";

  return [{ path: currentPath, operation }];
};

export const buildContentWithEditMetadata = (
  previousContent: Record<string, any> | undefined,
  nextContent: Record<string, any>,
  editor?: string,
): Record<string, any> => {
  const previousClean = stripEditMetadata(previousContent || {}) || {};
  const nextClean = stripEditMetadata(nextContent || {}) || {};
  const existingMetadata = getEditMetadata(previousContent);

  const changedPaths = collectChangedPathsWithOperation(previousClean, nextClean);

  if (changedPaths.length === 0) {
    return {
      ...nextClean,
      ...(existingMetadata ? { [EDIT_METADATA_KEY]: existingMetadata } : {}),
    };
  }

  const updatedAt = new Date().toISOString();
  const history = existingMetadata?.markers || {};
  const markers: Record<string, EditMarker> = {};

  changedPaths.forEach(({ path, operation }) => {
    // Rule 5: If a path was previously "new" and is edited again, it becomes "updated"
    const previousMarker = history[path];
    const resolvedType: EditMarkerType =
      previousMarker?.type === "new" ? "updated" : operation;

    markers[path] = {
      path,
      updatedAt,
      type: resolvedType,
      ...(editor ? { editor } : {}),
    };
  });

  return {
    ...nextClean,
    [EDIT_METADATA_KEY]: {
      version: 1,
      sectionUpdatedAt: updatedAt,
      markers: {
        ...history,
        ...markers,
      },
    } satisfies EditMetadata,
  };
};

export const hasEditedPath = (
  metadata: EditMetadata | undefined,
  path: string,
): boolean => Boolean(metadata?.markers[path]);

export const hasEditedDescendant = (
  metadata: EditMetadata | undefined,
  path: string,
): boolean =>
  Boolean(
    metadata &&
      Object.keys(metadata.markers).some(
        (markerPath) => markerPath === path || markerPath.startsWith(`${path}.`),
      ),
  );
