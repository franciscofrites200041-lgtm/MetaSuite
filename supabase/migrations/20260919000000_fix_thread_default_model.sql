-- Fix bug: chat_threads.model_id had a stale default `anthropic/claude-sonnet-4-5`
-- (with dashes) that isn't a real OpenRouter slug. Any thread inserted without an
-- explicit model_id landed on that value, which then couldn't be matched against
-- the live catalog and made the model selector open on a random first option
-- (usually claude-fable-5).
--
-- 1) Update the column default to the current canonical DEFAULT_MODEL_ID.
-- 2) Migrate existing rows off the stale slug so users don't have to change
--    their model manually.

alter table public.chat_threads
  alter column model_id set default 'anthropic/claude-sonnet-4.6';

update public.chat_threads
   set model_id = 'anthropic/claude-sonnet-4.6'
 where model_id = 'anthropic/claude-sonnet-4-5';
