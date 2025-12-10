import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FileUpload from "../FileUpload";

// Mock dependencies
vi.mock("@/hooks/db/useFiles", () => ({
  useFileUpload: () => ({
    uploadFiles: vi.fn(),
    isUploading: false,
    error: null,
    clearError: vi.fn(),
  }),
}));

vi.mock("@/lib/utils/logger", () => ({
  fileLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("FileUpload Component", () => {
  const defaultProps = {
    onUploadComplete: vi.fn(),
    className: "",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders upload area correctly", () => {
    render(<FileUpload {...defaultProps} />);

    expect(screen.getByText(/drag and drop audio files/i)).toBeInTheDocument();
    expect(screen.getByText(/or click to select/i)).toBeInTheDocument();
    expect(screen.getByText(/supported formats/i)).toBeInTheDocument();
  });

  it("displays supported file formats", () => {
    render(<FileUpload {...defaultProps} />);

    expect(screen.getByText(/MP3, WAV, M4A, FLAC/i)).toBeInTheDocument();
  });

  it("shows loading state when uploading", () => {
    vi.mocked(require("@/hooks/db/useFiles")).useFileUpload.mockReturnValue({
      uploadFiles: vi.fn(),
      isUploading: true,
      error: null,
      clearError: vi.fn(),
    });

    render(<FileUpload {...defaultProps} />);

    expect(screen.getByText(/uploading/i)).toBeInTheDocument();
  });

  it("displays error message when upload fails", () => {
    const errorMessage = "Upload failed";
    vi.mocked(require("@/hooks/db/useFiles")).useFileUpload.mockReturnValue({
      uploadFiles: vi.fn(),
      isUploading: false,
      error: errorMessage,
      clearError: vi.fn(),
    });

    render(<FileUpload {...defaultProps} />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it("calls clearError when error message is clicked", async () => {
    const clearError = vi.fn();
    vi.mocked(require("@/hooks/db/useFiles")).useFileUpload.mockReturnValue({
      uploadFiles: vi.fn(),
      isUploading: false,
      error: "Upload failed",
      clearError,
    });

    render(<FileUpload {...defaultProps} />);

    const errorMessage = screen.getByText("Upload failed");
    errorMessage.click();

    expect(clearError).toHaveBeenCalled();
  });

  it("applies custom className when provided", () => {
    const customClass = "custom-upload-class";
    render(<FileUpload {...defaultProps} className={customClass} />);

    const container = screen.getByTestId("file-upload-container");
    expect(container).toHaveClass(customClass);
  });
});
