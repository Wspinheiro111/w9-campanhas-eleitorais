import { describe, expect, it, vi } from "vitest";
import { getSignedTranscriptionAudioUrl } from "./transcriptionStorage";

describe("getSignedTranscriptionAudioUrl", () => {
  it("usa a chave privada no signer e não devolve o proxy autenticado", async () => {
    const signer = vi.fn().mockResolvedValue("https://s3.example/signed-audio");

    const result = await getSignedTranscriptionAudioUrl("campaigns/11/audio-crm/recording.webm", signer);

    expect(signer).toHaveBeenCalledWith("campaigns/11/audio-crm/recording.webm");
    expect(result).toBe("https://s3.example/signed-audio");
    expect(result).not.toContain("/manus-storage/");
  });
});
