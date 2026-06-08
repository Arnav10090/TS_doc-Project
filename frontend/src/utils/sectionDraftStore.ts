type SectionDraftKey = `${string}::${string}`;

const sectionDrafts = new Map<SectionDraftKey, Record<string, any>>();

const getDraftKey = (projectId: string, sectionKey: string): SectionDraftKey =>
  `${projectId}::${sectionKey}`;

export const setSectionDraft = (
  projectId: string,
  sectionKey: string,
  content: Record<string, any>,
) => {
  sectionDrafts.set(getDraftKey(projectId, sectionKey), content);
};

export const getSectionDraft = (
  projectId: string,
  sectionKey: string,
): Record<string, any> | undefined => sectionDrafts.get(getDraftKey(projectId, sectionKey));

export const clearSectionDraft = (projectId: string, sectionKey: string) => {
  sectionDrafts.delete(getDraftKey(projectId, sectionKey));
};

export const clearProjectSectionDrafts = (projectId: string) => {
  const prefix = `${projectId}::`;

  Array.from(sectionDrafts.keys()).forEach((key) => {
    if (key.startsWith(prefix)) {
      sectionDrafts.delete(key);
    }
  });
};
