import '@testing-library/jest-dom';

// Mock WebGL context for Cornerstone3D in tests
HTMLCanvasElement.prototype.getContext = function (contextType: string) {
  if (contextType === 'webgl2' || contextType === 'webgl') {
    return {
      canvas: this,
      getExtension: () => null,
      getParameter: () => 0,
      createShader: () => ({}),
      createProgram: () => ({}),
      viewport: () => {},
      clearColor: () => {},
      clear: () => {},
      enable: () => {},
      disable: () => {},
    } as unknown as WebGLRenderingContext;
  }
  return null;
} as typeof HTMLCanvasElement.prototype.getContext;
