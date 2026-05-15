import { useRef, useState } from "react";
import type { ChannelId } from "../domain/types";
import type { CustomPdfJob } from "../domain/types";
import { autoMapColorants } from "../pdf/autoMapper";
import { buildCustomJob } from "../pdf/buildCustomJob";
import { extractSeparations } from "../pdf/extractSeparations";
import { useLocale } from "../i18n/LocaleContext";

type LayerRow = { name: string; channelId: ChannelId | "ignore" };

type Props = {
  onConfirm: (job: CustomPdfJob) => void;
  onCancel:  () => void;
};

const CHANNEL_OPTIONS: { value: string; label: string }[] = [
  { value: "C",      label: "Cyan (C)" },
  { value: "M",      label: "Magenta (M)" },
  { value: "Y",      label: "Yellow (Y)" },
  { value: "K",      label: "Black (K)" },
  { value: "orange", label: "Orange" },
  { value: "silver", label: "Silver" },
  { value: "white",  label: "White" },
  { value: "ignore", label: "Ignore" },
];

export function PdfUploadModal({ onConfirm, onCancel }: Props) {
  const { t } = useLocale();
  const [step,     setStep]     = useState<"pick" | "map">("pick");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [filename, setFilename] = useState("");
  const [rows,     setRows]     = useState<LayerRow[]>([]);
  const imagesRef = useRef<Record<string, ImageBitmap>>({});

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);
    try {
      const { names, images } = await extractSeparations(file);
      imagesRef.current = images;
      const mapping = autoMapColorants(names);
      setFilename(file.name);
      setRows(names.map(name => ({ name, channelId: mapping[name] })));
      setStep("map");
    } catch (e) {
      setError(`Failed to read PDF: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  function handleRowChange(index: number, channelId: ChannelId | "ignore") {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, channelId } : r));
  }

  function handleConfirm() {
    const mapping = Object.fromEntries(rows.map(r => [r.name, r.channelId]));
    onConfirm(buildCustomJob(filename, mapping, imagesRef.current));
  }

  const allIgnored = rows.every(r => r.channelId === "ignore");

  return (
    <div className="modal-backdrop" data-testid="pdf-upload-modal">
      <div className="modal-box">
        <div className="modal-header">
          <h2>Upload PDF Artwork</h2>
          <button type="button" className="modal-close" aria-label="Close" onClick={onCancel}>×</button>
        </div>

        {step === "pick" && (
          <div className="modal-body">
            <p>Select a PDF with color separations (one Separation color space per ink channel).</p>
            {error && <p className="modal-error" role="alert">{error}</p>}
            {loading ? (
              <p className="modal-loading">{t.readingPdf}</p>
            ) : (
              <label className="file-drop-zone">
                <span>Drop PDF here or click to browse</span>
                <input
                  type="file"
                  accept=".pdf"
                  style={{ display: "none" }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                  data-testid="pdf-file-input"
                />
              </label>
            )}
          </div>
        )}

        {step === "map" && (
          <div className="modal-body">
            <p>
              Map each color separation to an ink channel. Separations set to <em>Ignore</em> will not be printed.
            </p>
            <table className="layer-map-table" data-testid="layer-map-table">
              <thead>
                <tr>
                  <th>Separation</th>
                  <th>Maps to</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    <td>
                      <select
                        value={row.channelId}
                        aria-label={`Channel for ${row.name}`}
                        onChange={e => handleRowChange(i, e.target.value as ChannelId | "ignore")}
                      >
                        {CHANNEL_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="modal-footer">
              <button type="button" className="secondary-button" onClick={onCancel}>{t.actions.cancel}</button>
              <button
                type="button"
                className="primary-button"
                disabled={allIgnored}
                onClick={handleConfirm}
                data-testid="confirm-mapping"
              >
                Apply artwork
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
