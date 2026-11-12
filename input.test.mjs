import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseNumericInput as parse} from './docs/input.mjs';
test('typed and pasted numbers retain numeric meaning',()=>{
 for(const [raw,expected] of [['2',2],['25',25],['250',250],['250.50',250.5],['250,50',250.5],['٢٥٠٫٥',250.5],['۲۵۰',250],['2 500',2500],['0.',0],['.25',.25],['',0]])assert.deepEqual(parse(raw),{valid:true,value:expected});
});
test('optional blank customs override differs from explicit zero',()=>{
 assert.deepEqual(parse('',{optional:true}),{valid:true,value:''});assert.equal(parse('0',{optional:true}).value,0);
});
test('invalid numbers are rejected, never coerced into another amount',()=>{
 for(const raw of ['-250','2x50','1e3','2.5.0','Infinity'])assert.equal(parse(raw).valid,false);
 assert.equal(parse('2.5',{integer:true,min:1}).valid,false);assert.equal(parse('',{min:1}).valid,false);
 assert.equal(parse('101',{max:100}).valid,false);assert.equal(parse('100',{max:100}).valid,true);
});
