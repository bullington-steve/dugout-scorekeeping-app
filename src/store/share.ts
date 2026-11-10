/*
 * Hand a backup file to the iOS share sheet: the file ALONE. Passing a
 * title or text with it makes iOS offer "Save as 2 Items" with no file name
 * (LESSONS 8). Where sharing files isn't possible, download it instead.
 */
export type ShareOutcome = 'shared' | 'cancelled' | 'downloaded';

interface ShareNav {
  canShare?: (data: ShareData) => boolean;
  share?: (data: ShareData) => Promise<void>;
}

export async function shareFile(
  name: string,
  text: string,
  nav: ShareNav = navigator,
  download: (file: File) => void = downloadFile,
): Promise<ShareOutcome> {
  const file = new File([text], name, { type: 'application/json' });
  const data: ShareData = { files: [file] };
  if (nav.share && nav.canShare?.(data)) {
    try {
      await nav.share(data);
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
    }
  }
  download(file);
  return 'downloaded';
}

function downloadFile(file: File): void {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
