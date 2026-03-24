use wasm_bindgen::prelude::*;

/// Compute histogram of u8 pixel data (256 bins)
#[wasm_bindgen]
pub fn compute_histogram(data: &[u8]) -> Vec<u32> {
    let mut hist = vec![0u32; 256];
    for &v in data {
        hist[v as usize] += 1;
    }
    hist
}

/// Auto window level from u8 pixel data using percentiles (1st and 99th)
#[wasm_bindgen]
pub fn auto_window_level_u8(data: &[u8]) -> Vec<f64> {
    if data.is_empty() {
        return vec![128.0, 256.0]; // default
    }
    let mut hist = [0u32; 256];
    for &v in data {
        hist[v as usize] += 1;
    }
    let total = data.len() as f64;
    let p1_target = total * 0.01;
    let p99_target = total * 0.99;

    let mut cumsum = 0.0;
    let mut p1: f64 = 0.0;
    let mut p99: f64 = 255.0;
    for (i, &count) in hist.iter().enumerate() {
        cumsum += count as f64;
        if cumsum >= p1_target && p1 == 0.0 {
            p1 = i as f64;
        }
        if cumsum >= p99_target {
            p99 = i as f64;
            break;
        }
    }
    let ww = (p99 - p1).max(1.0);
    let wc = p1 + ww / 2.0;
    vec![wc, ww]
}

/// Auto window level from i16 pixel data using percentiles
#[wasm_bindgen]
pub fn auto_window_level_i16(data: &[i16]) -> Vec<f64> {
    if data.is_empty() {
        return vec![0.0, 1000.0];
    }
    // Sample for speed if large
    let sample_step = if data.len() > 100_000 { data.len() / 50_000 } else { 1 };
    let mut values: Vec<i16> = data.iter().step_by(sample_step).copied().collect();
    values.sort_unstable();

    let p1 = values[(values.len() as f64 * 0.01) as usize] as f64;
    let p99 = values[(values.len() as f64 * 0.99).min(values.len() as f64 - 1.0) as usize] as f64;

    let ww = (p99 - p1).max(1.0);
    let wc = p1 + ww / 2.0;
    vec![wc, ww]
}

/// Compute absolute difference map between two u8 images, scaled to 0-255
#[wasm_bindgen]
pub fn compute_diff_map(a: &[u8], b: &[u8]) -> Vec<u8> {
    let len = a.len().min(b.len());
    let mut max_diff: u8 = 1;
    let mut diffs: Vec<u8> = Vec::with_capacity(len);
    for i in 0..len {
        let d = (a[i] as i16 - b[i] as i16).unsigned_abs() as u8;
        if d > max_diff { max_diff = d; }
        diffs.push(d);
    }
    // Normalize to 0-255
    let scale = 255.0 / max_diff as f64;
    for d in diffs.iter_mut() {
        *d = (*d as f64 * scale).min(255.0) as u8;
    }
    diffs
}
