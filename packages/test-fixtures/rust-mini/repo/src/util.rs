use super::hook::run;
use crate::hook::run as hook_run;

pub fn helper() -> &'static str {
    run();
    hook_run();
    "ok"
}
