// Lazy-loaded Wasm module bridge
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let wasmMod: any = null;
let initPromise: Promise<void> | null = null;

async function getWasm() {
  if (wasmMod) return wasmMod;
  if (!initPromise) {
    initPromise = (async () => {
      const mod = await import('../../wasm/pkg/dicom_wasm');
      await mod.default();
      wasmMod = mod;
    })();
  }
  await initPromise;
  return wasmMod;
}

export async function computeHistogram(data: Uint8Array): Promise<Uint32Array> {
  const mod = await getWasm();
  return mod.compute_histogram(data) as Uint32Array;
}

export async function autoWindowLevelU8(data: Uint8Array): Promise<{ wc: number; ww: number }> {
  const mod = await getWasm();
  const result = mod.auto_window_level_u8(data) as Float64Array;
  return { wc: result[0], ww: result[1] };
}

export async function autoWindowLevelI16(data: Int16Array): Promise<{ wc: number; ww: number }> {
  const mod = await getWasm();
  const result = mod.auto_window_level_i16(data) as Float64Array;
  return { wc: result[0], ww: result[1] };
}

export async function computeDiffMap(a: Uint8Array, b: Uint8Array): Promise<Uint8Array> {
  const mod = await getWasm();
  return mod.compute_diff_map(a, b) as Uint8Array;
}

export async function computeChangeMap(
  current: Uint8Array,
  previous: Uint8Array,
  width: number,
  height: number
): Promise<Uint8Array> {
  const mod = await getWasm();
  return mod.compute_change_map(current, previous, width, height) as Uint8Array;
}

export async function computeSliceImportance(
  data: Uint8Array,
  width: number,
  height: number
): Promise<number> {
  const mod = await getWasm();
  return mod.compute_slice_importance(data, width, height) as number;
}

export async function computeSliceImportanceDownsampled(
  data: Uint8Array,
  width: number,
  height: number
): Promise<number> {
  const mod = await getWasm();
  return mod.compute_slice_importance_downsampled(data, width, height) as number;
}

export async function computeSliceChange(
  current: Uint8Array,
  previous: Uint8Array,
  width: number,
  height: number
): Promise<number> {
  const mod = await getWasm();
  return mod.compute_slice_change(current, previous, width, height) as number;
}
