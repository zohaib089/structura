use core::fmt;
use self::inner::step;
mod inner;

pub fn run() {
    let _ = fmt::format;
    step();
}
