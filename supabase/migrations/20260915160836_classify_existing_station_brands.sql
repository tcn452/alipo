update public.stations
set brand = case
  when concat_ws(' ', name, brand) ~* '\m(total[[:space:]]*energies|total)\M' then 'TotalEnergies'
  when concat_ws(' ', name, brand) ~* '\m((mount|mt)\.?[[:space:]]+m(e|ee)ru|meru)\M' then 'Mount Meru'
  when concat_ws(' ', name, brand) ~* '\mpuma\M' then 'Puma'
  when concat_ws(' ', name, brand) ~* '\mpetroda\M' then 'Petroda'
  when concat_ws(' ', name, brand) ~* '\moil[[:space:]]*com\M' then 'OilCom'
  when concat_ws(' ', name, brand) ~* '\mengen\M' then 'Engen'
  when concat_ws(' ', name, brand) ~* '\mbp\M' then 'BP'
  when concat_ws(' ', name, brand) ~* '\mshell\M' then 'Shell'
  when concat_ws(' ', name, brand) ~* '\mcaltex\M' then 'Caltex'
  else brand
end
where active
  and concat_ws(' ', name, brand) ~* '\m(total([[:space:]]*energies)?|(mount|mt)\.?[[:space:]]+m(e|ee)ru|meru|puma|petroda|oil[[:space:]]*com|engen|bp|shell|caltex)\M';
