// Choose the player language before insertion. Changing a connected iframe's
// src can add every video to Safari's shared browser history.
export function videoEmbedURL(id) {
  const url = new URL(`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`);
  url.searchParams.set('enablejsapi', '1');
  url.searchParams.set('playsinline', '1');
  url.searchParams.set('origin', location.origin);
  url.searchParams.set('hl', window.DennisLanguage?.current === 'en' ? 'en' : 'da');
  return url.href;
}
