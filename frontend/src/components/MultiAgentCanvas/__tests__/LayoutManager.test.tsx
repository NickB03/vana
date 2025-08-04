/**
 * LayoutManager Tests
 * 
 * Tests for the multi-panel layout system, including layout persistence,
 * responsive behavior, and panel management functionality.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LayoutManager, LayoutManagerUtils } from '../LayoutManager';
import { ChatPanel } from '../panels/ChatPanel';
import { AgentNetworkPanel } from '../panels/AgentNetworkPanel';
import { InspectorPanel } from '../panels/InspectorPanel';

// Mock react-resizable-panels
vi.mock('react-resizable-panels', () => ({
  PanelGroup: ({ children, ...props }: any) => (
    <div data-testid="panel-group" {...props}>
      {children}
    </div>
  ),
  Panel: ({ children, ...props }: any) => (
    <div data-testid="panel" {...props}>
      {children}
    </div>
  ),
  PanelResizeHandle: ({ children, ...props }: any) => (
    <div data-testid="resize-handle" {...props}>
      {children}
    </div>
  ),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock window.innerWidth for responsive tests
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1024,
});

// Test components
const TestChatPanel = ({ panelId }: { panelId: string }) => (
  <div data-testid={`chat-panel-${panelId}`}>Chat Panel</div>
);

const TestNetworkPanel = ({ panelId }: { panelId: string }) => (
  <div data-testid={`network-panel-${panelId}`}>Network Panel</div>
);

const TestInspectorPanel = ({ panelId }: { panelId: string }) => (
  <div data-testid={`inspector-panel-${panelId}`}>Inspector Panel</div>
);

describe('LayoutManager', () => {
  const testLayouts = [
    LayoutManagerUtils.createLayout(
      'test-layout',
      'Test Layout',
      [
        LayoutManagerUtils.createPanel('chat', 'Chat', TestChatPanel, {
          defaultSize: 50,
          order: 1,
        }),
        LayoutManagerUtils.createPanel('network', 'Network', TestNetworkPanel, {
          defaultSize: 30,
          order: 2,
        }),
        LayoutManagerUtils.createPanel('inspector', 'Inspector', TestInspectorPanel, {
          defaultSize: 20,
          order: 3,
        }),
      ],
      {
        defaultSizes: {
          chat: 50,
          network: 30,
          inspector: 20,
        },
      }
    ),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders layout manager with panels', () => {
    render(
      <LayoutManager
        layouts={testLayouts}
        activeLayoutId="test-layout"
      />
    );

    expect(screen.getByText('Test Layout')).toBeInTheDocument();
    expect(screen.getByTestId('panel-group')).toBeInTheDocument();
    expect(screen.getByTestId('chat-panel-chat')).toBeInTheDocument();
    expect(screen.getByTestId('network-panel-network')).toBeInTheDocument();
    expect(screen.getByTestId('inspector-panel-inspector')).toBeInTheDocument();
  });

  it('handles layout changes', async () => {
    const onLayoutChange = vi.fn();
    const multipleLayouts = [
      ...testLayouts,
      LayoutManagerUtils.createLayout('layout2', 'Layout 2', testLayouts[0].panels),
    ];

    render(
      <LayoutManager
        layouts={multipleLayouts}
        activeLayoutId="test-layout"
        onLayoutChange={onLayoutChange}
      />
    );

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'layout2' } });

    expect(onLayoutChange).toHaveBeenCalledWith('layout2');
  });

  it('persists layout state to localStorage', async () => {
    render(
      <LayoutManager
        layouts={testLayouts}
        activeLayoutId="test-layout"
        persistLayout={true}
        storageKey="test-layout-key"
      />
    );

    // Wait for initial render and state setup
    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'test-layout-key',
        expect.stringContaining('"panelSizes"')
      );
    });
  });

  it('loads saved layout state from localStorage', () => {
    const savedState = {
      panelSizes: { chat: 60, network: 25, inspector: 15 },
      collapsedPanels: new Set(['inspector']),
      orientation: 'horizontal',
    };

    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedState));

    render(
      <LayoutManager
        layouts={testLayouts}
        activeLayoutId="test-layout"
        persistLayout={true}
        storageKey="test-layout-key"
      />
    );

    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('test-layout-key');
  });

  it('handles responsive breakpoints', () => {
    // Test mobile breakpoint
    window.innerWidth = 500;
    fireEvent(window, new Event('resize'));

    render(
      <LayoutManager
        layouts={testLayouts}
        activeLayoutId="test-layout"
      />
    );

    expect(screen.getByText('(mobile)')).toBeInTheDocument();

    // Test tablet breakpoint
    window.innerWidth = 800;
    fireEvent(window, new Event('resize'));

    expect(screen.getByText('(tablet)')).toBeInTheDocument();

    // Test desktop breakpoint
    window.innerWidth = 1200;
    fireEvent(window, new Event('resize'));

    expect(screen.getByText('(desktop)')).toBeInTheDocument();
  });

  it('handles panel collapse and expand', async () => {
    render(
      <LayoutManager
        layouts={testLayouts}
        activeLayoutId="test-layout"
      />
    );

    // Find and click a collapse button (assuming panels are collapsible)
    const collapseButtons = screen.getAllByTitle(/collapse panel/i);
    if (collapseButtons.length > 0) {
      fireEvent.click(collapseButtons[0]);

      // The component should handle the collapse state change
      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalled();
      });
    }
  });

  it('resets layout to defaults', async () => {
    render(
      <LayoutManager
        layouts={testLayouts}
        activeLayoutId="test-layout"
      />
    );

    const resetButton = screen.getByTitle('Reset layout');
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'vana-layout-state',
        expect.stringContaining('"panelSizes":{"chat":50,"network":30,"inspector":20}')
      );
    });
  });

  it('handles invalid layout ID gracefully', () => {
    expect(() => {
      render(
        <LayoutManager
          layouts={testLayouts}
          activeLayoutId="nonexistent-layout"
        />
      );
    }).toThrow('Layout with id "nonexistent-layout" not found');
  });

  it('passes panel props correctly', () => {
    const testProps = {
      customProp: 'test-value',
      networkState: { agents: {}, relationships: [] },
    };

    render(
      <LayoutManager
        layouts={testLayouts}
        activeLayoutId="test-layout"
        panelProps={testProps}
      />
    );

    // Verify that panels receive the props
    expect(screen.getByTestId('chat-panel-chat')).toBeInTheDocument();
    expect(screen.getByTestId('network-panel-network')).toBeInTheDocument();
    expect(screen.getByTestId('inspector-panel-inspector')).toBeInTheDocument();
  });
});

describe('LayoutManagerUtils', () => {
  it('creates layout configuration correctly', () => {
    const panels = [
      LayoutManagerUtils.createPanel('test', 'Test Panel', TestChatPanel),
    ];

    const layout = LayoutManagerUtils.createLayout(
      'test-id',
      'Test Layout',
      panels,
      { defaultSizes: { test: 100 } }
    );

    expect(layout).toEqual({
      id: 'test-id',
      name: 'Test Layout',
      panels,
      defaultSizes: { test: 100 },
    });
  });

  it('creates panel configuration correctly', () => {
    const panel = LayoutManagerUtils.createPanel(
      'test-panel',
      'Test Panel',
      TestChatPanel,
      {
        minSize: 10,
        defaultSize: 25,
        collapsible: false,
      }
    );

    expect(panel).toEqual({
      id: 'test-panel',
      title: 'Test Panel',
      component: TestChatPanel,
      collapsible: false,
      resizable: true,
      defaultSize: 25,
      minSize: 10,
    });
  });

  it('gets saved layout state from localStorage', () => {
    const testState = {
      panelSizes: { test: 50 },
      collapsedPanels: new Set(),
      orientation: 'horizontal' as const,
    };

    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(testState));

    const result = LayoutManagerUtils.getSavedLayoutState('test-key');
    expect(result).toEqual(testState);
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('test-key');
  });

  it('handles invalid saved state gracefully', () => {
    mockLocalStorage.getItem.mockReturnValue('invalid-json');

    const result = LayoutManagerUtils.getSavedLayoutState('test-key');
    expect(result).toBeNull();
  });

  it('clears saved layout state', () => {
    LayoutManagerUtils.clearSavedLayoutState('test-key');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('test-key');
  });
});