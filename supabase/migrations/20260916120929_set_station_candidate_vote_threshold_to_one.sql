-- Family testing uses a single confirmation. Keep this as a separate migration so
-- the production threshold can be raised later without rewriting migration history.
do $$
declare
  function_definition text;
begin
  select pg_get_functiondef(
    'public.submit_station_candidate_vote(bigint,text,uuid,text)'::regprocedure
  ) into function_definition;

  function_definition := replace(
    function_definition,
    'if v_vote_count < 2 then',
    'if v_vote_count < 1 then'
  );

  if function_definition not like '%if v_vote_count < 1 then%' then
    raise exception 'Could not update the station candidate vote threshold';
  end if;

  execute function_definition;
end;
$$;
