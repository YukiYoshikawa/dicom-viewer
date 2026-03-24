// GPU capability detection for performance optimization

export interface GpuCaps {
  webgpu: boolean;
  webgl2: boolean;
  webgl: boolean;
  maxTextureSize: number;
  vendor: string;
  renderer: string;
}

export async function detectGpuCaps(): Promise<GpuCaps> {
  const caps: GpuCaps = {
    webgpu: false,
    webgl2: false,
    webgl: false,
    maxTextureSize: 0,
    vendor: '',
    renderer: '',
  };

  // Check WebGPU
  try {
    if ('gpu' in navigator) {
      const adapter = await (navigator as unknown as { gpu: { requestAdapter: () => Promise<unknown> } }).gpu.requestAdapter();
      if (adapter) {
        caps.webgpu = true;
      }
    }
  } catch {
    // WebGPU not available
  }

  // Check WebGL2 / WebGL and get texture size + vendor/renderer
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;

  let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;

  try {
    gl = canvas.getContext('webgl2') as WebGL2RenderingContext | null;
    if (gl) {
      caps.webgl2 = true;
    }
  } catch {
    // WebGL2 not available
  }

  if (!gl) {
    try {
      gl = canvas.getContext('webgl') as WebGLRenderingContext | null;
      if (gl) {
        caps.webgl = true;
      }
    } catch {
      // WebGL not available
    }
  }

  if (gl) {
    caps.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;

    // Try to get vendor/renderer info
    try {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        caps.vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) as string;
        caps.renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string;
      }
    } catch {
      // Debug info not available
    }
  }

  // Clean up temporary canvas/context
  if (gl) {
    const loseContext = gl.getExtension('WEBGL_lose_context');
    if (loseContext) {
      loseContext.loseContext();
    }
  }

  return caps;
}

export function getRecommendedMaxSlices(caps: GpuCaps): number {
  if (caps.webgpu) return 512;
  if (caps.maxTextureSize >= 8192) return 256;
  if (caps.maxTextureSize >= 4096) return 128;
  return 64;
}
