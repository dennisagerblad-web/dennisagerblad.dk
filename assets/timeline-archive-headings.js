// Compact only entries explicitly marked for a single popup heading.
// The original archive documents and review article remain intact.
export function compactTimelineArchive(document, entry) {
  if (!entry?.archiveCompactHeading) return;
  // A few scanned flyers were intentionally displayed narrower than their file.
  // Preserve that owner-approved proportion without cropping the source.
  if (entry.archiveImageAspectRatio) {
    for (const image of document.body.querySelectorAll('img')) {
      image.style.setProperty('width', '100%', 'important');
      image.style.setProperty('max-width', '433px', 'important');
      image.style.setProperty('height', 'auto', 'important');
      image.style.setProperty('aspect-ratio', entry.archiveImageAspectRatio, 'important');
      image.style.setProperty('object-fit', 'fill', 'important');
    }
  }
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
