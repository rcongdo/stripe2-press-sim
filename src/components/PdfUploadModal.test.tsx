import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PdfUploadModal } from "./PdfUploadModal";

vi.mock("../pdf/extractLayers", () => ({
  extractLayers: vi.fn(),
}));

import { extractLayers } from "../pdf/extractLayers";
const mockExtractLayers = vi.mocked(extractLayers);

describe("PdfUploadModal", () => {
  const onConfirm = vi.fn();
  const onCancel  = vi.fn();

  beforeEach(() => {
    onConfirm.mockClear();
    onCancel.mockClear();
    mockExtractLayers.mockClear();
  });

  it("renders file pick step initially", () => {
    render(<PdfUploadModal onConfirm={onConfirm} onCancel={onCancel} />);
    expect(screen.getByTestId("pdf-file-input")).toBeInTheDocument();
    expect(screen.queryByTestId("layer-map-table")).not.toBeInTheDocument();
  });

  it("transitions to mapping step after file selection", async () => {
    mockExtractLayers.mockResolvedValue({
      names:  ["Cyan", "Black"],
      images: { Cyan: {} as ImageBitmap, Black: {} as ImageBitmap },
    });

    render(<PdfUploadModal onConfirm={onConfirm} onCancel={onCancel} />);
    const input = screen.getByTestId("pdf-file-input");
    const file  = new File(["pdf"], "test.pdf", { type: "application/pdf" });
    await userEvent.upload(input, file);

    await waitFor(() =>
      expect(screen.getByTestId("layer-map-table")).toBeInTheDocument()
    );
    expect(screen.getByText("Cyan")).toBeInTheDocument();
    expect(screen.getByText("Black")).toBeInTheDocument();
  });

  it("calls onConfirm with CustomPdfJob when confirmed", async () => {
    mockExtractLayers.mockResolvedValue({
      names:  ["Cyan", "Black"],
      images: { Cyan: {} as ImageBitmap, Black: {} as ImageBitmap },
    });

    render(<PdfUploadModal onConfirm={onConfirm} onCancel={onCancel} />);
    await userEvent.upload(
      screen.getByTestId("pdf-file-input"),
      new File(["pdf"], "artwork.pdf", { type: "application/pdf" }),
    );

    await waitFor(() => screen.getByTestId("confirm-mapping"));
    await userEvent.click(screen.getByTestId("confirm-mapping"));

    expect(onConfirm).toHaveBeenCalledOnce();
    const job = onConfirm.mock.calls[0][0];
    expect(job.customPdf.filename).toBe("artwork.pdf");
    expect(job.channels.some((ch: { id: string }) => ch.id === "C")).toBe(true);
  });

  it("calls onCancel when the × button is clicked", async () => {
    render(<PdfUploadModal onConfirm={onConfirm} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("shows an error alert when extractLayers rejects", async () => {
    mockExtractLayers.mockRejectedValue(new Error("Invalid PDF"));

    render(<PdfUploadModal onConfirm={onConfirm} onCancel={onCancel} />);
    await userEvent.upload(
      screen.getByTestId("pdf-file-input"),
      new File(["bad"], "bad.pdf", { type: "application/pdf" }),
    );

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Invalid PDF")
    );
    expect(screen.queryByTestId("layer-map-table")).not.toBeInTheDocument();
  });

  it("disables Confirm when all rows are mapped to ignore", async () => {
    mockExtractLayers.mockResolvedValue({
      names:  ["Spot UV"],
      images: { "Spot UV": {} as ImageBitmap },
    });

    render(<PdfUploadModal onConfirm={onConfirm} onCancel={onCancel} />);
    await userEvent.upload(
      screen.getByTestId("pdf-file-input"),
      new File(["pdf"], "spot.pdf", { type: "application/pdf" }),
    );

    await waitFor(() => screen.getByTestId("confirm-mapping"));
    // "Spot UV" auto-maps to "ignore" → button should be disabled
    expect(screen.getByTestId("confirm-mapping")).toBeDisabled();
  });
});
