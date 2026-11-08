/** Reading and sending files from the browser, for the New and Edit task form. */

/** A video's length in seconds, or `undefined` if the browser can't tell. */
export function videoDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    const finish = (seconds?: number) => {
      clearTimeout(timeout);
      // Stop the probe reading the file before its URL goes away.
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
      resolve(seconds !== undefined && Number.isFinite(seconds) ? seconds : undefined);
    };
    const timeout = setTimeout(() => finish(), 5000);
    video.preload = "metadata";
    video.onloadedmetadata = () => finish(video.duration);
    video.onerror = () => finish();
    video.src = url;
  });
}

/** Uploads one file, reporting how much has been sent; resolves its id or rejects with what to tell people. */
export function uploadFile(file: File, onProgress: (sent: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", "/api/upload");
    request.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    request.upload.onload = () => onProgress(1);
    request.onload = () => {
      let body: { id?: string; error?: string } = {};
      try {
        body = JSON.parse(request.responseText);
      } catch {}
      if (request.status < 300 && body.id) resolve(body.id);
      else if (request.status === 401) reject(new Error("Сесията ви е изтекла. Влезте отново и опитайте пак."));
      else reject(new Error(body.error ?? "Възникна грешка при качването. Опитайте отново."));
    };
    request.onerror = () => reject(new Error("Връзката прекъсна. Проверете интернета и опитайте отново."));
    const data = new FormData();
    data.append("file", file);
    request.send(data);
  });
}
