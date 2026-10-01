import test from 'node:test';
import assert from 'node:assert/strict';
import { nextSponsor } from '../src/lib/sponsor-rotation.ts';
const sponsors = [{id:'giants'}, {id:'specials'}, {id:'future'}];
test('different feed slots start with different sponsors', () => {
  assert.equal(nextSponsor(sponsors,null,0).id,'giants');
  assert.equal(nextSponsor(sponsors,null,1).id,'specials');
});
test('refresh advances from the last sponsor and cycles through future sponsors', () => {
  assert.equal(nextSponsor(sponsors,'giants').id,'specials');
  assert.equal(nextSponsor(sponsors,'specials').id,'future');
  assert.equal(nextSponsor(sponsors,'future').id,'giants');
});
test('empty and single sponsor lists are safe', () => {
  assert.equal(nextSponsor([],null),null);
  assert.equal(nextSponsor([{id:'only'}],'only').id,'only');
});
