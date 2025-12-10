import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Segment } from "@/types/db/database";
import ScrollableSubtitleDisplay from "../ScrollableSubtitleDisplay";

const mockSegments: Segment[] = [
  {
    id: 1,
    transcriptId: 1,
    start: 0,
    end: 3,
    text: "Hello world",
    wordTimestamps: [],
    normalizedText: "Hello world",
    translation: "你好世界",
    annotations: [],
    furigana: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    transcriptId: 1,
    start: 3,
    end: 6,
    text: "This is a test",
    wordTimestamps: [],
    normalizedText: "This is a test",
    translation: "这是一个测试",
    annotations: [],
    furigana: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe("ScrollableSubtitleDisplay Component", () => {
  const defaultProps = {
    segments: mockSegments,
    currentTime: 0,
    isPlaying: false,
    onSegmentClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all segments correctly", () => {
    render(<ScrollableSubtitleDisplay {...defaultProps} />);

    expect(screen.getByText("Hello world")).toBeInTheDocument();
    expect(screen.getByText("This is a test")).toBeInTheDocument();
  });

  it("highlights current segment based on currentTime", () => {
    render(<ScrollableSubtitleDisplay {...defaultProps} currentTime={4} />);

    const segments = screen.getAllByTestId(/segment-/);
    expect(segments[0]).not.toHaveClass("current");
    expect(segments[1]).toHaveClass("current");
  });

  it("does not highlight any segment when currentTime is before first segment", () => {
    render(<ScrollableSubtitleDisplay {...defaultProps} currentTime={-1} />);

    const segments = screen.getAllByTestId(/segment-/);
    segments.forEach((segment) => {
      expect(segment).not.toHaveClass("current");
    });
  });

  it("does not highlight any segment when currentTime is after last segment", () => {
    render(<ScrollableSubtitleDisplay {...defaultProps} currentTime={10} />);

    const segments = screen.allByTestId(/segment-/);
    segments.forEach((segment) => {
      expect(segment).not.toHaveClass("current");
    });
  });

  it("calls onSegmentClick when a segment is clicked", async () => {
    const user = userEvent.setup();
    const onSegmentClick = vi.fn();

    render(<ScrollableSubtitleDisplay {...defaultProps} onSegmentClick={onSegmentClick} />);

    const firstSegment = screen.getByText("Hello world");
    await user.click(firstSegment);

    expect(onSegmentClick).toHaveBeenCalledWith(mockSegments[0]);
  });

  it("displays normalized text when available", () => {
    const segmentsWithNormalized = [
      {
        ...mockSegments[0],
        normalizedText: "Normalized text",
        text: "Original text",
      },
    ];

    render(<ScrollableSubtitleDisplay {...defaultProps} segments={segmentsWithNormalized} />);

    expect(screen.getByText("Normalized text")).toBeInTheDocument();
    expect(screen.queryByText("Original text")).not.toBeInTheDocument();
  });

  it("displays translation when available", () => {
    render(<ScrollableSubtitleDisplay {...defaultProps} />);

    expect(screen.getByText("你好世界")).toBeInTheDocument();
    expect(screen.getByText("这是一个测试")).toBeInTheDocument();
  });

  it("displays furigana when available", () => {
    const segmentsWithFurigana = [
      {
        ...mockSegments[0],
        text: "日本語",
        furigana: "にほんご",
      },
    ];

    render(<ScrollableSubtitleDisplay {...defaultProps} segments={segmentsWithFurigana} />);

    expect(screen.getByText("日本語")).toBeInTheDocument();
    expect(screen.getByText("にほんご")).toBeInTheDocument();
  });

  it("displays annotations when available", () => {
    const segmentsWithAnnotations = [
      {
        ...mockSegments[0],
        annotations: [
          {
            text: "annotation",
            type: "info",
            start: 0,
            end: 5,
          },
        ],
      },
    ];

    render(<ScrollableSubtitleDisplay {...defaultProps} segments={segmentsWithAnnotations} />);

    expect(screen.getByText("annotation")).toBeInTheDocument();
  });

  it("handles empty segments array", () => {
    render(<ScrollableSubtitleDisplay {...defaultProps} segments={[]} />);

    expect(screen.getByText(/no subtitles available/i)).toBeInTheDocument();
  });

  it("auto-scrolls to current segment", () => {
    // Mock IntersectionObserver
    const mockObserve = vi.fn();
    const mockUnobserve = vi.fn();
    const mockDisconnect = vi.fn();

    global.IntersectionObserver = vi.fn(() => ({
      observe: mockObserve,
      unobserve: mockUnobserve,
      disconnect: mockDisconnect,
    })) as any;

    render(<ScrollableSubtitleDisplay {...defaultProps} currentTime={4} />);

    expect(mockObserve).toHaveBeenCalled();
  });

  it("applies playing state styling correctly", () => {
    const { rerender } = render(<ScrollableSubtitleDisplay {...defaultProps} isPlaying={false} />);

    const container = screen.getByTestId("subtitle-container");
    expect(container).not.toHaveClass("playing");

    rerender(<ScrollableSubtitleDisplay {...defaultProps} isPlaying={true} />);

    expect(container).toHaveClass("playing");
  });
});
