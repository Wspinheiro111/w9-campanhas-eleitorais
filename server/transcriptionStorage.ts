import { storageGetSignedUrl } from "./storage";

export async function getSignedTranscriptionAudioUrl(
  storageKey: string,
  signer: (key: string) => Promise<string> = storageGetSignedUrl,
) {
  return signer(storageKey);
}
