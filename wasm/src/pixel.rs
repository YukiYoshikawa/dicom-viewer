/// Convert 16-bit pixel data to 8-bit by applying window level/width.
pub fn apply_window_level(
    pixel_data: &[i16],
    window_center: f64,
    window_width: f64,
) -> Vec<u8> {
    let lower = window_center - window_width / 2.0;
    let upper = window_center + window_width / 2.0;
    let range = upper - lower;

    pixel_data
        .iter()
        .map(|&val| {
            let v = val as f64;
            if v <= lower {
                0u8
            } else if v >= upper {
                255u8
            } else {
                ((v - lower) / range * 255.0) as u8
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_window_level_basic() {
        let data: Vec<i16> = vec![-100, 0, 40, 100, 200];
        let result = apply_window_level(&data, 40.0, 400.0);
        assert_eq!(result[0], 38);
        assert_eq!(result[2], 127);
    }

    #[test]
    fn test_window_level_clamp() {
        let data: Vec<i16> = vec![-1000, 1000];
        let result = apply_window_level(&data, 0.0, 100.0);
        assert_eq!(result[0], 0);
        assert_eq!(result[1], 255);
    }
}
