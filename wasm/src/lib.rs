mod pixel;
mod histogram;
mod ai_scout;

pub use histogram::*;
pub use ai_scout::*;

use wasm_bindgen::prelude::*;
use js_sys::{Int16Array, Uint8Array};

/// Convert 16-bit pixel data to 8-bit using window level/width.
#[wasm_bindgen]
pub fn convert_pixel_data(
    data: &Int16Array,
    window_center: f64,
    window_width: f64,
) -> Uint8Array {
    let input: Vec<i16> = data.to_vec();
    let output = pixel::apply_window_level(&input, window_center, window_width);
    let result = Uint8Array::new_with_length(output.len() as u32);
    result.copy_from(&output);
    result
}

/// Returns the version string of the WASM module.
#[wasm_bindgen]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}
