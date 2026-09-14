// Browser-side upload helper. Mirrors the reference client's
//   dbTwig.callRestAPI('dgBunker', 'uploadFiles', formData, progressCB)
// but posts to our own /api/upload, which adds the session and forwards to DbTwig.
// Runs in the browser only (uses XMLHttpRequest for upload progress).

export type UploadResultT = {
  ok: boolean;
  httpStatus: number;
  jsonData: Record<string, unknown>;
};

export type UploadOptionsT = {
  /** Upload as a new version of an existing bunker object. */
  newVersionOf?: string;
  onProgress?: (percent: number, loaded: number, total: number) => void;
  signal?: AbortSignal;
};

export function buildUploadFormData(file: File, options: UploadOptionsT = {}): FormData {
  const formData = new FormData();
  formData.append("name", file.name);
  formData.append("lastModified", String(file.lastModified));
  if (options.newVersionOf) {
    formData.append("newVersion", "Y");
    formData.append("objectId", options.newVersionOf);
  } else {
    formData.append("newVersion", "N");
  }
  formData.append("size", String(file.size));
  formData.append("file", file);
  return formData;
}

export function uploadFile(file: File, options: UploadOptionsT = {}): Promise<UploadResultT> {
  const formData = buildUploadFormData(file, options);

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.responseType = "text";

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) options.onProgress?.(Math.round((e.loaded / e.total) * 100), e.loaded, e.total);
    };

    const finish = (httpStatus: number, raw: string) => {
      let jsonData: Record<string, unknown> = {};
      try {
        jsonData = raw ? JSON.parse(raw) : {};
      } catch {
        jsonData = { errorMessage: raw.slice(0, 300) };
      }
      resolve({ ok: httpStatus >= 200 && httpStatus < 300, httpStatus, jsonData });
    };

    xhr.onload = () => finish(xhr.status, xhr.responseText);
    xhr.onerror = () => finish(0, JSON.stringify({ errorMessage: "Upload failed before reaching the server." }));
    xhr.onabort = () => finish(0, JSON.stringify({ errorMessage: "Upload cancelled." }));
    options.signal?.addEventListener("abort", () => xhr.abort());

    console.log("[upload →] dgBunker/uploadFiles", { name: file.name, size: file.size, newVersionOf: options.newVersionOf ?? null });
    xhr.send(formData);
  });
}
