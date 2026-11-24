use std::collections::HashMap;
use std::io::{self, Write as IoWrite};
use crate::util::helper;
use crate::hook::{self, run as run_hook};
pub use crate::util::helper as help;
extern crate alloc;
mod util;
mod hook;

fn main() {
    let _map: HashMap<(), ()> = HashMap::new();
    let _ = helper();
    run_hook();
    let _ = IoWrite::write;
}
