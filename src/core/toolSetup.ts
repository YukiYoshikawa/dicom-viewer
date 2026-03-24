import {
  addTool,
  ToolGroupManager,
  WindowLevelTool,
  ZoomTool,
  PanTool,
  TrackballRotateTool,
  StackScrollTool,
  LengthTool,
  AngleTool,
  ArrowAnnotateTool,
  CircleROITool,
  EllipticalROITool,
  RectangleROITool,
  PlanarFreehandROITool,
  ProbeTool,
  BidirectionalTool,
  Enums as csToolsEnums,
} from '@cornerstonejs/tools';

const TOOL_GROUP_ID = 'dicomViewerToolGroup';

let toolGroupCreated = false;

export function setupTools(): void {
  if (toolGroupCreated) return;

  addTool(WindowLevelTool);
  addTool(ZoomTool);
  addTool(PanTool);
  addTool(TrackballRotateTool);
  addTool(StackScrollTool);
  addTool(LengthTool);
  addTool(AngleTool);
  addTool(ArrowAnnotateTool);
  addTool(CircleROITool);
  addTool(EllipticalROITool);
  addTool(RectangleROITool);
  addTool(PlanarFreehandROITool);
  addTool(ProbeTool);
  addTool(BidirectionalTool);

  toolGroupCreated = true;
}

export function createToolGroup(
  viewportId: string,
  renderingEngineId: string,
): void {
  const existing = ToolGroupManager.getToolGroup(TOOL_GROUP_ID);
  if (existing) {
    existing.addViewport(viewportId, renderingEngineId);
    return;
  }

  const toolGroup = ToolGroupManager.createToolGroup(TOOL_GROUP_ID);
  if (!toolGroup) return;

  toolGroup.addTool(WindowLevelTool.toolName);
  toolGroup.addTool(ZoomTool.toolName);
  toolGroup.addTool(PanTool.toolName);
  toolGroup.addTool(TrackballRotateTool.toolName);
  toolGroup.addTool(StackScrollTool.toolName);
  toolGroup.addTool(LengthTool.toolName);
  toolGroup.addTool(AngleTool.toolName);
  toolGroup.addTool(ArrowAnnotateTool.toolName);
  toolGroup.addTool(CircleROITool.toolName);
  toolGroup.addTool(EllipticalROITool.toolName);
  toolGroup.addTool(RectangleROITool.toolName);
  toolGroup.addTool(PlanarFreehandROITool.toolName);
  toolGroup.addTool(ProbeTool.toolName);
  toolGroup.addTool(BidirectionalTool.toolName);

  toolGroup.addViewport(viewportId, renderingEngineId);

  // Per spec: right-drag = WL/WW, scroll = Zoom, middle-drag = Pan, Shift+left = Rotate
  toolGroup.setToolActive(WindowLevelTool.toolName, {
    bindings: [{ mouseButton: csToolsEnums.MouseBindings.Secondary }],
  });
  toolGroup.setToolActive(PanTool.toolName, {
    bindings: [{ mouseButton: csToolsEnums.MouseBindings.Auxiliary }],
  });
  toolGroup.setToolActive(ZoomTool.toolName, {
    bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }],
  });
  // Shift+left-drag for rotation per spec
  toolGroup.setToolActive(TrackballRotateTool.toolName, {
    bindings: [{
      mouseButton: csToolsEnums.MouseBindings.Primary,
      modifierKey: csToolsEnums.KeyboardBindings.Shift,
    }],
  });
  // Mouse wheel for stack scroll (StackScrollTool replaces StackScrollMouseWheelTool in v4.x)
  toolGroup.setToolActive(StackScrollTool.toolName, {
    bindings: [{ mouseButton: csToolsEnums.MouseBindings.Wheel }],
  });
}

export function setActiveTool(toolName: string): void {
  const toolGroup = ToolGroupManager.getToolGroup(TOOL_GROUP_ID);
  if (!toolGroup) return;

  const tools = [
    WindowLevelTool.toolName,
    ZoomTool.toolName,
    PanTool.toolName,
    TrackballRotateTool.toolName,
    LengthTool.toolName,
    AngleTool.toolName,
    ArrowAnnotateTool.toolName,
    CircleROITool.toolName,
    EllipticalROITool.toolName,
    RectangleROITool.toolName,
    PlanarFreehandROITool.toolName,
    ProbeTool.toolName,
    BidirectionalTool.toolName,
  ];

  for (const name of tools) {
    if (name === toolName) {
      toolGroup.setToolActive(name, {
        bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }],
      });
    } else {
      toolGroup.setToolPassive(name);
    }
  }
}

export { TOOL_GROUP_ID };
