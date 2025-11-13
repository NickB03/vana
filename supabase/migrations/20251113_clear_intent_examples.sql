-- Clear old intent examples (from setup-intent-examples function)
-- This allows the new intent-examples function to populate with updated examples
-- including 40 image examples

DELETE FROM intent_examples;

-- Reset the sequence if needed
ALTER SEQUENCE IF EXISTS intent_examples_id_seq RESTART WITH 1;

