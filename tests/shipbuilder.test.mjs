import test from 'node:test';
import assert from 'node:assert/strict';
import { createShipBuilder, normalizeShipBuilder, reviewShipBuilder, applyShipBuilder, shipTalentLimit, shipTalents } from '../shipbuilder.mjs';
import {createShip, createCrewMember, createCampaign, normalizeCampaign} from '../model.mjs';

function validShip() {
  const p=createShipBuilder();
  Object.assign(p,{era:'Selected era', className:'Selected class',scale:'3',polityTrait:'Polity',
    name:'User ship',registry:'Owner registry',talents:'Own talent A\nOwn talent B\nOwn talent C'});
  for(const k of Object.keys(p.systems))p.systems[k]='8';
  for(const k of Object.keys(p.departments))p.departments[k]='2';
  return p;
}
test('ship builder starts blank without inventing a ship or talent',()=>{
  const p=createShipBuilder();
  assert.equal(p.name,'');assert.equal(p.talents,'');assert.equal(p.systems.comms,'');
});
test('ship requires a source-entered class, stats, named talents and identity',()=>{
  const review=reviewShipBuilder(validShip());
  assert.equal(review.ready,true,review.errors.join('; '));
  assert.equal(review.talentCount,3);
  assert.equal(review.talentLimit,3);
});
test('ship talents must equal scale, station talents may be fewer than floor half scale',()=>{
  assert.equal(shipTalentLimit('starship',4),4);
  assert.equal(shipTalentLimit('station',7),3);
  const ship=validShip();ship.talents='Only one';
  assert.match(reviewShipBuilder(ship).errors.join('; '),/3 talents/);
  const station={...validShip(),kind:'station',className:'',registry:'',scale:'7',talents:'One\nTwo'};
  assert.equal(reviewShipBuilder(station).ready,true,reviewShipBuilder(station).errors.join('; '));
  station.talents='One\nTwo\nThree\nFour';
  assert.match(reviewShipBuilder(station).errors.join('; '),/up to 3/);
});
test('systems and departments reject missing ratings and source caps',()=>{
  const p=validShip();p.systems.comms='13';p.departments.science='6';
  assert.equal(reviewShipBuilder(p).ready,false);
  assert.match(reviewShipBuilder(p).errors.join('; '),/Comms system/);
  assert.match(reviewShipBuilder(p).errors.join('; '),/Science department/);
});
test('applying ship builder preserves player notes and stores source choices',()=>{
  const current=createShip();current.notes='Crew history';
  const result=applyShipBuilder(current,validShip());
  assert.equal(result.name,'User ship');
  assert.equal(result.notes,'Crew history');
  assert.equal(result.systems.engines,'8');
  assert.equal(result.builder.era,'Selected era');
  assert.ok(result.builder.appliedAt);
});
test('empty ship builder is rejected rather than silently filled',()=>{
  assert.throws(()=>applyShipBuilder(createShip(),createShipBuilder()),/era/);
});
test('ship builder normalization preserves old draft choices and fills missing ratings',()=>{
  const result=normalizeShipBuilder({name:'Own name',systems:{weapons:'9'}});
  assert.equal(result.name,'Own name');assert.equal(result.systems.weapons,'9');assert.equal(result.systems.comms,'');
});
test('crew records have stable ids and user-owned editable fields',()=>{
  assert.throws(()=>createCrewMember(' '));
  const a=createCrewMember('Alice');const b=createCrewMember('Bob');
  assert.notEqual(a.id,b.id);
  assert.equal(a.relationship,'');
  const camp=createCampaign('Survey');camp.crew.push(a);
  assert.equal(normalizeCampaign(camp).crew[0].name,'Alice');
  assert.deepEqual(normalizeCampaign({...camp,crew:undefined}).crew,[]);
});
test('talents are entered as separate nonempty lines',()=>{
  assert.deepEqual(shipTalents('\nAlpha\n\nBeta  \n'),['Alpha','Beta']);
});