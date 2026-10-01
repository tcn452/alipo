import test from 'node:test';
import assert from 'node:assert/strict';
import { trackFuelUpdate } from '../src/lib/gtag.ts';
test('fuel analytics tracks all stages and excludes personal data', () => {
  const events=[];
  globalThis.window={gtag:(...args)=>events.push(args)};
  for (const stage of ['started','submitted','failed']) trackFuelUpdate(stage,{station_id:'station',fuel_type:'diesel',fuel_status:'available',phone:'+265123456789',latitude:-13,longitude:33,error:'private text'});
  assert.deepEqual(events.map(event=>event[1]),['fuel_update_started','fuel_update_submitted','fuel_update_failed']);
  for(const event of events) {
    assert.equal(event[2].fuel_type,'diesel');
    for(const key of ['phone','latitude','longitude','error']) assert.equal(key in event[2],false);
  }
  delete globalThis.window;
});
