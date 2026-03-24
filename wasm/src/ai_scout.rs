use wasm_bindgen::prelude::*;

/// Compute a downscaled change map between two u8 frames.
/// Returns a smaller heatmap where each pixel represents a block's mean absolute difference.
#[wasm_bindgen]
pub fn compute_change_map(current: &[u8], previous: &[u8], width: u32, height: u32) -> Vec<u8> {
    let block = 16u32;
    let out_w = (width + block - 1) / block;
    let out_h = (height + block - 1) / block;
    let mut map = vec![0u8; (out_w * out_h) as usize];

    let len = current.len().min(previous.len());
    let mut max_val: f64 = 1.0;
    let mut raw: Vec<f64> = vec![0.0; (out_w * out_h) as usize];

    for by in 0..out_h {
        for bx in 0..out_w {
            let mut sum: f64 = 0.0;
            let mut count: u32 = 0;
            for dy in 0..block {
                for dx in 0..block {
                    let x = bx * block + dx;
                    let y = by * block + dy;
                    if x < width && y < height {
                        let idx = (y * width + x) as usize;
                        if idx < len {
                            let diff = (current[idx] as f64 - previous[idx] as f64).abs();
                            sum += diff;
                            count += 1;
                        }
                    }
                }
            }
            let mean = if count > 0 { sum / count as f64 } else { 0.0 };
            let oi = (by * out_w + bx) as usize;
            raw[oi] = mean;
            if mean > max_val { max_val = mean; }
        }
    }

    // Normalize using 95th percentile
    let mut sorted = raw.clone();
    sorted.sort_by(|a, b| a.partial_cmp(b).unwrap());
    let p95 = sorted[(sorted.len() as f64 * 0.95) as usize];
    let norm = if p95 > 0.0 { p95 } else { max_val };

    for (i, &v) in raw.iter().enumerate() {
        map[i] = ((v / norm) * 255.0).min(255.0) as u8;
    }
    map
}

/// Compute slice importance score (0.0 - 1.0) based on entropy + edge density.
#[wasm_bindgen]
pub fn compute_slice_importance(data: &[u8], width: u32, height: u32) -> f64 {
    if data.is_empty() { return 0.0; }

    // Shannon entropy from histogram
    let mut hist = [0u32; 256];
    for &v in data {
        hist[v as usize] += 1;
    }
    let total = data.len() as f64;
    let mut entropy: f64 = 0.0;
    for &count in &hist {
        if count > 0 {
            let p = count as f64 / total;
            entropy -= p * p.log2();
        }
    }
    let max_entropy = 8.0; // log2(256)
    let norm_entropy = (entropy / max_entropy).min(1.0);

    // Edge density (sampled gradient magnitude)
    let w = width as usize;
    let h = height as usize;
    let sample_step = if w * h > 100_000 { 4 } else { 2 };
    let mut edge_sum: f64 = 0.0;
    let mut edge_count: u32 = 0;

    for y in (1..h-1).step_by(sample_step) {
        for x in (1..w-1).step_by(sample_step) {
            let idx = y * w + x;
            let gx = data[idx + 1] as f64 - data[idx - 1] as f64;
            let gy = data[idx + w] as f64 - data[idx - w] as f64;
            edge_sum += (gx * gx + gy * gy).sqrt();
            edge_count += 1;
        }
    }
    let mean_edge = if edge_count > 0 { edge_sum / edge_count as f64 } else { 0.0 };
    let norm_edge = (mean_edge / 100.0).min(1.0); // 100 is a reasonable normalization factor

    // Combine: 60% entropy + 40% edge
    (norm_entropy * 0.6 + norm_edge * 0.4).min(1.0)
}

/// Same as compute_slice_importance but with internal downsampling to 128x128
#[wasm_bindgen]
pub fn compute_slice_importance_downsampled(data: &[u8], width: u32, height: u32) -> f64 {
    let target = 128usize;
    let w = width as usize;
    let h = height as usize;

    if w <= target && h <= target {
        return compute_slice_importance(data, width, height);
    }

    // Area-average downsample
    let mut downsampled = vec![0u8; target * target];
    let sx = w as f64 / target as f64;
    let sy = h as f64 / target as f64;

    for ty in 0..target {
        for tx in 0..target {
            let src_x = (tx as f64 * sx) as usize;
            let src_y = (ty as f64 * sy) as usize;
            let idx = src_y.min(h - 1) * w + src_x.min(w - 1);
            downsampled[ty * target + tx] = if idx < data.len() { data[idx] } else { 0 };
        }
    }

    compute_slice_importance(&downsampled, target as u32, target as u32)
}

/// Compute change score between two slices (0.0 - 1.0)
#[wasm_bindgen]
pub fn compute_slice_change(current: &[u8], previous: &[u8], _width: u32, _height: u32) -> f64 {
    let len = current.len().min(previous.len());
    if len == 0 { return 0.0; }

    let sample_step = if len > 100_000 { len / 50_000 } else { 1 };
    let mut sum: f64 = 0.0;
    let mut count: u32 = 0;

    for i in (0..len).step_by(sample_step) {
        sum += (current[i] as f64 - previous[i] as f64).abs();
        count += 1;
    }

    let mean = if count > 0 { sum / count as f64 } else { 0.0 };
    (mean / 128.0).min(1.0) // normalize: 128 = half of 255
}
