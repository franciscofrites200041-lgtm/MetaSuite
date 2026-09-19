-- Product decision: pin the chat model to Qwen3.8 Flash. The UI no longer
-- exposes a selector, so both the schema default and any existing threads
-- should point at the same slug to keep the flow deterministic.

alter table public.chat_threads
  alter column model_id set default 'qwen/qwen3.8-flash';

update public.chat_threads
   set model_id = 'qwen/qwen3.8-flash'
 where model_id in ('anthropic/claude-sonnet-4.6', 'anthropic/claude-sonnet-4-5');
