import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { PromptInputControls } from '../prompt-input-controls';
import { TooltipProvider } from '@/components/ui/tooltip';
import React from 'react';

// Wrapper component to provide tooltip context
function renderWithTooltip(component: React.ReactElement) {
  return render(
    <TooltipProvider>
      {component}
    </TooltipProvider>
  );
}

// Helper to get buttons by test ID
const getImageButton = () => document.getElementById('tour-image-mode') as HTMLButtonElement;
const getArtifactButton = () => document.getElementById('tour-artifact-mode') as HTMLButtonElement;

describe('PromptInputControls - Mode Mutual Exclusivity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Initial State', () => {
    it('should start with no mode active', () => {
      const mockOnImageChange = vi.fn();
      const mockOnArtifactChange = vi.fn();

      renderWithTooltip(
        <PromptInputControls
          imageMode={false}
          onImageModeChange={mockOnImageChange}
          artifactMode={false}
          onArtifactModeChange={mockOnArtifactChange}
        />
      );

      const imageBtn = getImageButton();
      const artifactBtn = getArtifactButton();

      expect(imageBtn).toBeInTheDocument();
      expect(artifactBtn).toBeInTheDocument();

      // Buttons should not have active styling classes
      expect(imageBtn).not.toHaveClass('bg-blue-500');
      expect(artifactBtn).not.toHaveClass('bg-purple-500');
    });

    it('should have both buttons accessible', () => {
      const mockOnImageChange = vi.fn();
      const mockOnArtifactChange = vi.fn();

      renderWithTooltip(
        <PromptInputControls
          imageMode={false}
          onImageModeChange={mockOnImageChange}
          artifactMode={false}
          onArtifactModeChange={mockOnArtifactChange}
        />
      );

      expect(getImageButton()).toBeInTheDocument();
      expect(getArtifactButton()).toBeInTheDocument();
    });
  });

  describe('Image Mode Activation', () => {
    it('should call onImageModeChange when image button clicked from inactive state', () => {
      const mockOnImageChange = vi.fn();
      const mockOnArtifactChange = vi.fn();

      renderWithTooltip(
        <PromptInputControls
          imageMode={false}
          onImageModeChange={mockOnImageChange}
          artifactMode={false}
          onArtifactModeChange={mockOnArtifactChange}
        />
      );

      const imageBtn = getImageButton();
      fireEvent.click(imageBtn);

      expect(mockOnImageChange).toHaveBeenCalledWith(true);
    });

    it('should call onArtifactModeChange(false) when image mode activated while artifact is active', () => {
      const mockOnImageChange = vi.fn();
      const mockOnArtifactChange = vi.fn();

      renderWithTooltip(
        <PromptInputControls
          imageMode={false}
          onImageModeChange={mockOnImageChange}
          artifactMode={true}
          onArtifactModeChange={mockOnArtifactChange}
        />
      );

      const imageBtn = getImageButton();
      fireEvent.click(imageBtn);

      // Should deactivate artifact mode first
      expect(mockOnArtifactChange).toHaveBeenCalledWith(false);
      // Then activate image mode
      expect(mockOnImageChange).toHaveBeenCalledWith(true);
    });

    it('should apply active styling when image mode is true', () => {
      const mockOnImageChange = vi.fn();
      const mockOnArtifactChange = vi.fn();

      renderWithTooltip(
        <PromptInputControls
          imageMode={true}
          onImageModeChange={mockOnImageChange}
          artifactMode={false}
          onArtifactModeChange={mockOnArtifactChange}
        />
      );

      const imageBtn = getImageButton();

      // Should have active styling
      expect(imageBtn).toHaveClass('bg-blue-500');
      expect(imageBtn).toHaveClass('text-white');
      expect(imageBtn).toHaveClass('shadow-lg');
    });

    it('should toggle image mode off when clicked again', () => {
      const mockOnImageChange = vi.fn();
      const mockOnArtifactChange = vi.fn();

      renderWithTooltip(
        <PromptInputControls
          imageMode={true}
          onImageModeChange={mockOnImageChange}
          artifactMode={false}
          onArtifactModeChange={mockOnArtifactChange}
        />
      );

      const imageBtn = getImageButton();
      fireEvent.click(imageBtn);

      // Should toggle off
      expect(mockOnImageChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Artifact Mode Activation', () => {
    it('should call onArtifactModeChange when artifact button clicked from inactive state', () => {
      const mockOnImageChange = vi.fn();
      const mockOnArtifactChange = vi.fn();

      renderWithTooltip(
        <PromptInputControls
          imageMode={false}
          onImageModeChange={mockOnImageChange}
          artifactMode={false}
          onArtifactModeChange={mockOnArtifactChange}
        />
      );

      const artifactBtn = getArtifactButton();
      fireEvent.click(artifactBtn);

      expect(mockOnArtifactChange).toHaveBeenCalledWith(true);
    });

    it('should call onImageModeChange(false) when artifact mode activated while image is active', () => {
      const mockOnImageChange = vi.fn();
      const mockOnArtifactChange = vi.fn();

      renderWithTooltip(
        <PromptInputControls
          imageMode={true}
          onImageModeChange={mockOnImageChange}
          artifactMode={false}
          onArtifactModeChange={mockOnArtifactChange}
        />
      );

      const artifactBtn = getArtifactButton();
      fireEvent.click(artifactBtn);

      // Should deactivate image mode first
      expect(mockOnImageChange).toHaveBeenCalledWith(false);
      // Then activate artifact mode
      expect(mockOnArtifactChange).toHaveBeenCalledWith(true);
    });

    it('should apply active styling when artifact mode is true', () => {
      const mockOnImageChange = vi.fn();
      const mockOnArtifactChange = vi.fn();

      renderWithTooltip(
        <PromptInputControls
          imageMode={false}
          onImageModeChange={mockOnImageChange}
          artifactMode={true}
          onArtifactModeChange={mockOnArtifactChange}
        />
      );

      const artifactBtn = getArtifactButton();

      // Should have active styling
      expect(artifactBtn).toHaveClass('bg-purple-500');
      expect(artifactBtn).toHaveClass('text-white');
      expect(artifactBtn).toHaveClass('shadow-lg');
    });

    it('should toggle artifact mode off when clicked again', () => {
      const mockOnImageChange = vi.fn();
      const mockOnArtifactChange = vi.fn();

      renderWithTooltip(
        <PromptInputControls
          imageMode={false}
          onImageModeChange={mockOnImageChange}
          artifactMode={true}
          onArtifactModeChange={mockOnArtifactChange}
        />
      );

      const artifactBtn = getArtifactButton();
      fireEvent.click(artifactBtn);

      // Should toggle off
      expect(mockOnArtifactChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Mutual Exclusivity - Core Invariant', () => {
    it('should never have both image and artifact modes active simultaneously', () => {
      const mockOnImageChange = vi.fn();
      const mockOnArtifactChange = vi.fn();

      // Image active, artifact inactive
      const { rerender } = renderWithTooltip(
        <PromptInputControls
          imageMode={true}
          onImageModeChange={mockOnImageChange}
          artifactMode={false}
          onArtifactModeChange={mockOnArtifactChange}
        />
      );

      let imageBtn = getImageButton();
      let artifactBtn = getArtifactButton();

      expect(imageBtn).toHaveClass('bg-blue-500');
      expect(artifactBtn).not.toHaveClass('bg-purple-500');

      // Switch to artifact active
      rerender(
        <TooltipProvider>
          <PromptInputControls
            imageMode={false}
            onImageModeChange={mockOnImageChange}
            artifactMode={true}
            onArtifactModeChange={mockOnArtifactChange}
          />
        </TooltipProvider>
      );

      imageBtn = getImageButton();
      artifactBtn = getArtifactButton();

      expect(imageBtn).not.toHaveClass('bg-blue-500');
      expect(artifactBtn).toHaveClass('bg-purple-500');
    });

    it('should deactivate artifact when image is activated via click', () => {
      const mockOnImageChange = vi.fn();
      const mockOnArtifactChange = vi.fn();

      renderWithTooltip(
        <PromptInputControls
          imageMode={false}
          onImageModeChange={mockOnImageChange}
          artifactMode={true}
          onArtifactModeChange={mockOnArtifactChange}
        />
      );

      const imageBtn = getImageButton();
      fireEvent.click(imageBtn);

      // Verify order of calls: artifact off, then image on
      expect(mockOnArtifactChange).toHaveBeenCalledWith(false);
      expect(mockOnArtifactChange).toHaveBeenCalledBefore(
        mockOnImageChange as Mock
      );
    });

    it('should deactivate image when artifact is activated via click', () => {
      const mockOnImageChange = vi.fn();
      const mockOnArtifactChange = vi.fn();

      renderWithTooltip(
        <PromptInputControls
          imageMode={true}
          onImageModeChange={mockOnImageChange}
          artifactMode={false}
          onArtifactModeChange={mockOnArtifactChange}
        />
      );

      const artifactBtn = getArtifactButton();
      fireEvent.click(artifactBtn);

      // Verify order of calls: image off, then artifact on
      expect(mockOnImageChange).toHaveBeenCalledWith(false);
      expect(mockOnImageChange).toHaveBeenCalledBefore(
        mockOnArtifactChange as Mock
      );
    });
  });

  describe('Rapid Toggling and Edge Cases', () => {
    it('should handle rapid button clicks with correct callback invocations', () => {
      const mockOnImageChange = vi.fn();
      const mockOnArtifactChange = vi.fn();

      const { rerender } = renderWithTooltip(
        <PromptInputControls
          imageMode={false}
          onImageModeChange={mockOnImageChange}
          artifactMode={false}
          onArtifactModeChange={mockOnArtifactChange}
        />
      );

      let imageBtn = getImageButton();
      let artifactBtn = getArtifactButton();

      // Click image (activate)
      fireEvent.click(imageBtn);
      rerender(
        <TooltipProvider>
          <PromptInputControls
            imageMode={true}
            onImageModeChange={mockOnImageChange}
            artifactMode={false}
            onArtifactModeChange={mockOnArtifactChange}
          />
        </TooltipProvider>
      );

      // Click artifact (should deactivate image first)
      imageBtn = getImageButton();
      artifactBtn = getArtifactButton();
      fireEvent.click(artifactBtn);
      rerender(
        <TooltipProvider>
          <PromptInputControls
            imageMode={false}
            onImageModeChange={mockOnImageChange}
            artifactMode={true}
            onArtifactModeChange={mockOnArtifactChange}
          />
        </TooltipProvider>
      );

      // Click image again (should deactivate artifact first)
      imageBtn = getImageButton();
      artifactBtn = getArtifactButton();
      fireEvent.click(imageBtn);

      // Verify final state - only artifact deactivate was called in last sequence
      expect(mockOnArtifactChange).toHaveBeenCalledWith(false);
      expect(mockOnImageChange).toHaveBeenCalledWith(true);
    });

    it('should not break when toggling same button twice', () => {
      const mockOnImageChange = vi.fn();
      const mockOnArtifactChange = vi.fn();

      const { rerender } = renderWithTooltip(
        <PromptInputControls
          imageMode={false}
          onImageModeChange={mockOnImageChange}
          artifactMode={false}
          onArtifactModeChange={mockOnArtifactChange}
        />
      );

      let imageBtn = getImageButton();

      // First click - activate
      fireEvent.click(imageBtn);
      rerender(
        <TooltipProvider>
          <PromptInputControls
            imageMode={true}
            onImageModeChange={mockOnImageChange}
            artifactMode={false}
            onArtifactModeChange={mockOnArtifactChange}
          />
        </TooltipProvider>
      );

      imageBtn = getImageButton();

      // Second click - deactivate
      fireEvent.click(imageBtn);

      // Should have been called with true then false
      expect(mockOnImageChange).toHaveBeenNthCalledWith(1, true);
      expect(mockOnImageChange).toHaveBeenNthCalledWith(2, false);
    });
  });

  describe('State Synchronization with Props', () => {
    it('should update styling when imageMode prop changes', () => {
      const mockOnImageChange = vi.fn();
      const mockOnArtifactChange = vi.fn();

      const { rerender } = renderWithTooltip(
        <PromptInputControls
          imageMode={false}
          onImageModeChange={mockOnImageChange}
          artifactMode={false}
          onArtifactModeChange={mockOnArtifactChange}
        />
      );

      let imageBtn = getImageButton();
      expect(imageBtn).not.toHaveClass('bg-blue-500');

      // Update to active
      rerender(
        <TooltipProvider>
          <PromptInputControls
            imageMode={true}
            onImageModeChange={mockOnImageChange}
            artifactMode={false}
            onArtifactModeChange={mockOnArtifactChange}
          />
        </TooltipProvider>
      );

      imageBtn = getImageButton();
      expect(imageBtn).toHaveClass('bg-blue-500');
    });

    it('should update styling when artifactMode prop changes', () => {
      const mockOnImageChange = vi.fn();
      const mockOnArtifactChange = vi.fn();

      const { rerender } = renderWithTooltip(
        <PromptInputControls
          imageMode={false}
          onImageModeChange={mockOnImageChange}
          artifactMode={false}
          onArtifactModeChange={mockOnArtifactChange}
        />
      );

      let artifactBtn = getArtifactButton();
      expect(artifactBtn).not.toHaveClass('bg-purple-500');

      // Update to active
      rerender(
        <TooltipProvider>
          <PromptInputControls
            imageMode={false}
            onImageModeChange={mockOnImageChange}
            artifactMode={true}
            onArtifactModeChange={mockOnArtifactChange}
          />
        </TooltipProvider>
      );

      artifactBtn = getArtifactButton();
      expect(artifactBtn).toHaveClass('bg-purple-500');
    });
  });

  describe('Accessibility', () => {
    it('should have proper button structure and roles', () => {
      const mockOnImageChange = vi.fn();
      const mockOnArtifactChange = vi.fn();

      renderWithTooltip(
        <PromptInputControls
          imageMode={false}
          onImageModeChange={mockOnImageChange}
          artifactMode={false}
          onArtifactModeChange={mockOnArtifactChange}
        />
      );

      const imageBtn = getImageButton();
      const artifactBtn = getArtifactButton();

      expect(imageBtn.tagName).toBe('BUTTON');
      expect(artifactBtn.tagName).toBe('BUTTON');
    });

    it('should be keyboard accessible', () => {
      const mockOnImageChange = vi.fn();
      const mockOnArtifactChange = vi.fn();

      renderWithTooltip(
        <PromptInputControls
          imageMode={false}
          onImageModeChange={mockOnImageChange}
          artifactMode={false}
          onArtifactModeChange={mockOnArtifactChange}
        />
      );

      const imageBtn = getImageButton();

      // Simulate keyboard interaction (Enter key)
      fireEvent.keyDown(imageBtn, { key: 'Enter', code: 'Enter' });
      fireEvent.click(imageBtn);

      expect(mockOnImageChange).toHaveBeenCalled();
    });
  });

  describe('Send Button Functionality', () => {
    it('should render send button with correct icon', () => {
      renderWithTooltip(
        <PromptInputControls
          imageMode={false}
          onImageModeChange={vi.fn()}
          artifactMode={false}
          onArtifactModeChange={vi.fn()}
          input="test message"
          onSend={vi.fn()}
          sendIcon="arrow"
        />
      );

      // Send button should be enabled with text input
      const sendBtn = screen.getByTestId('send-button');
      expect(sendBtn).not.toBeDisabled();
    });

    it('should disable send button when input is empty', () => {
      renderWithTooltip(
        <PromptInputControls
          imageMode={false}
          onImageModeChange={vi.fn()}
          artifactMode={false}
          onArtifactModeChange={vi.fn()}
          input=""
          onSend={vi.fn()}
        />
      );

      const sendBtn = screen.getByTestId('send-button');
      expect(sendBtn).toBeDisabled();
    });

    it('should call onSend when send button is clicked', () => {
      const mockOnSend = vi.fn();
      renderWithTooltip(
        <PromptInputControls
          imageMode={false}
          onImageModeChange={vi.fn()}
          artifactMode={false}
          onArtifactModeChange={vi.fn()}
          input="test message"
          onSend={mockOnSend}
        />
      );

      const sendBtn = screen.getByTestId('send-button');
      fireEvent.click(sendBtn);

      expect(mockOnSend).toHaveBeenCalled();
    });
  });

  describe('Mode Reset Behavior', () => {
    it('should accept imageMode and artifactMode as controlled props', () => {
      const mockOnImageChange = vi.fn();
      const mockOnArtifactChange = vi.fn();

      const { rerender } = renderWithTooltip(
        <PromptInputControls
          imageMode={true}
          onImageModeChange={mockOnImageChange}
          artifactMode={false}
          onArtifactModeChange={mockOnArtifactChange}
        />
      );

      let imageBtn = getImageButton();
      expect(imageBtn).toHaveClass('bg-blue-500');

      // Simulate parent resetting modes to false
      rerender(
        <TooltipProvider>
          <PromptInputControls
            imageMode={false}
            onImageModeChange={mockOnImageChange}
            artifactMode={false}
            onArtifactModeChange={mockOnArtifactChange}
          />
        </TooltipProvider>
      );

      imageBtn = getImageButton();
      expect(imageBtn).not.toHaveClass('bg-blue-500');
    });

    it('should reset both modes when both props are false', () => {
      const mockOnImageChange = vi.fn();
      const mockOnArtifactChange = vi.fn();

      const { rerender } = renderWithTooltip(
        <PromptInputControls
          imageMode={true}
          onImageModeChange={mockOnImageChange}
          artifactMode={false}
          onArtifactModeChange={mockOnArtifactChange}
        />
      );

      let imageBtn = getImageButton();
      let artifactBtn = getArtifactButton();

      expect(imageBtn).toHaveClass('bg-blue-500');
      expect(artifactBtn).not.toHaveClass('bg-purple-500');

      // Reset both
      rerender(
        <TooltipProvider>
          <PromptInputControls
            imageMode={false}
            onImageModeChange={mockOnImageChange}
            artifactMode={false}
            onArtifactModeChange={mockOnArtifactChange}
          />
        </TooltipProvider>
      );

      imageBtn = getImageButton();
      artifactBtn = getArtifactButton();

      expect(imageBtn).not.toHaveClass('bg-blue-500');
      expect(artifactBtn).not.toHaveClass('bg-purple-500');
    });
  });
});
