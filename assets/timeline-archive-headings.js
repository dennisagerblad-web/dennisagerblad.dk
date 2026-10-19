// Compact only entries explicitly marked for a single popup heading.
// The original archive documents and review article remain intact.
export function compactTimelineArchive(document, entry) {
  if (!entry?.archiveCompactHeading) return;
  const heading = document.body.querySelector('h1');
  if (heading) (heading.closest('table') || heading).remove();
  if (!entry.archiveSummary) return;
  const table = document.body.querySelector('table');
  if (!table) return;
  const links = [...table.querySelectorAll('a[href]')].map(link => link.cloneNode(true));
  const summary = document.createElement('p');
  summary.textContent = entry.archiveSummary;
  const section = document.createElement('section');
  section.append(summary);
  for (const link of links) {
    const paragraph = document.createElement('p');
    paragraph.append(link);
    section.append(paragraph);
  }
  table.replaceWith(section);
}
