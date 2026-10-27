-- Apply to an existing Brown Derby order database before releasing item notes.
-- Existing orders and items remain unchanged; prior items have empty notes.
alter table public.order_items
  add column if not exists item_notes text not null default '';

alter table public.order_items
  drop constraint if exists order_items_item_notes_length;
alter table public.order_items
  add constraint order_items_item_notes_length
  check (char_length(item_notes) <= 500);
