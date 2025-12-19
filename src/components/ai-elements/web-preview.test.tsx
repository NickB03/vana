import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { WebPreview, WebPreviewBody } from "./web-preview";

describe("WebPreviewBody", () => {
  it("renders loading overlay above the iframe", () => {
    render(
      <WebPreview defaultUrl="about:blank">
        <WebPreviewBody loading={<div>Loading preview</div>} />
      </WebPreview>
    );

    const loadingContent = screen.getByText("Loading preview");
    expect(loadingContent).toBeInTheDocument();
    expect(loadingContent.parentElement).toHaveClass(
      "absolute",
      "inset-0",
      "z-10"
    );

    const iframe = screen.getByTitle("Preview");
    expect(iframe).toBeInTheDocument();
  });

  it("does not render overlay when loading is undefined", () => {
    render(
      <WebPreview defaultUrl="about:blank">
        <WebPreviewBody />
      </WebPreview>
    );

    expect(screen.queryByText("Loading preview")).not.toBeInTheDocument();
    const iframe = screen.getByTitle("Preview");
    expect(iframe).toBeInTheDocument();
  });
});
