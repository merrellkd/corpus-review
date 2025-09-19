// Common test utilities and setup
use std::sync::Once;

static INIT: Once = Once::new();

pub fn setup() {
    INIT.call_once(|| {
        // Initialize test environment
        // This could include setting up test database, logging, etc.
    });
}