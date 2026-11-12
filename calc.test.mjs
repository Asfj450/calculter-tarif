import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fresh,calculate,validateImport} from './docs/calc.mjs';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function plan(){const s=fresh();s.settings.casnos=0;s.products=[{id:'a',name:'A',qty:1,price:2000,currency:'DZD',customs:'',weight:1,extra:0,sale:3000}];return s;}
test('2000 DZD tax example without overhead',()=>{const r=calculate(plan());close(r.duty,100);close(r.ifu,13.65);close(r.totalCost,2113.65);close(r.profit,886.35);});
test('foreign purchase uses distinct actual and customs rates',()=>{const s=plan();s.products[0].price=100;s.products[0].currency='EUR';s.currencies.find(c=>c.code==='EUR').actual=200;s.currencies.find(c=>c.code==='EUR').customs=150;const r=calculate(s);close(r.buy,20000);close(r.duty,750);close(r.ifu,102.375);});
test('customs override does not change purchase cost',()=>{const s=plan();s.products[0].customs=3000;const r=calculate(s);close(r.buy,2000);close(r.duty,150);});
test('business/personal split and annual cash are distinct',()=>{const s=plan();s.expenses[0].amount=10000;s.expenses[0].business=50;s.settings.casnos=24000;s.settings.trips=4;s.settings.paidAnnual=false;let r=calculate(s);close(r.totalCost,13113.65);close(r.cash,12113.65);close(r.personal,5000);s.settings.paidAnnual=true;r=calculate(s);close(r.cash,36113.65);});
test('all allocation modes conserve total costs',()=>{for(const mode of ['value','qty','weight']){const s=fresh(true);s.settings.allocation=mode;s.settings.loss=3;s.settings.reserve=5;const r=calculate(s);close(r.rows.reduce((a,p)=>a+p.total,0),r.totalCost);close(r.rows.reduce((a,p)=>a+p.allocated,0),r.shared);}});
test('fees and target margin use sales base, round up',()=>{const s=plan();s.settings.target=25;s.settings.sellingFee=5;const r=calculate(s),p=r.rows[0];assert.ok((p.suggested*.95-p.unit)/p.suggested>=.25);close(p.breakEven,p.unit/.95);});
test('loss spreads all cost across sellable integer units',()=>{const s=plan();s.products[0].qty=10;s.settings.loss=15;const r=calculate(s);assert.equal(r.sellable,8);close(r.rows[0].unit,r.totalCost/8);});
test('invalid FX, all lost inventory and impossible margin are visible',()=>{const s=plan();s.products[0].currency='TRY';s.settings.loss=100;s.settings.target=90;s.settings.sellingFee=20;const r=calculate(s);assert.equal(r.valid,false);assert.equal(r.rows[0].suggested,null);assert.ok(r.warnings.length>=3);});
test('ceiling warning at over 1.8m and import rejects malformed state',()=>{const s=plan();s.products[0].qty=901;assert.ok(calculate(s).warnings.some(x=>x.includes('1,800,000')));assert.throws(()=>validateImport({}));s.settings.loss=-1;assert.throws(()=>validateImport(s));});
test('export/import roundtrip preserves economic results',()=>{const s=fresh(true);const round=validateImport(JSON.parse(JSON.stringify(s)));close(calculate(s).profit,calculate(round).profit);});

test('quantity regression: batch total rises while per-unit fixed cost falls',()=>{
 const s=plan();s.expenses[0].amount=10000;
 s.products[0].qty=10;const a=calculate(s);
 s.products[0].qty=20;const b=calculate(s);
 close(a.totalCost,31136.5);close(b.totalCost,52273);
 close(a.rows[0].unit,3113.65);close(b.rows[0].unit,2613.65);
 assert.ok(b.totalCost>a.totalCost);assert.ok(b.rows[0].unit<a.rows[0].unit);
});
test('total and edited product total increase with quantity in all allocation modes',()=>{
 for(const allocation of ['value','qty','weight']){
  const s=fresh(true);s.settings.allocation=allocation;s.settings.reserve=7;s.settings.loss=12;s.settings.sellingFee=4;
  let previous=calculate(s);
  for(const qty of [51,60,100,250,500]){
   s.products[0].qty=qty;const current=calculate(s);
   assert.ok(current.totalCost>previous.totalCost,allocation);
   assert.ok(current.cash>previous.cash,allocation);
   assert.ok(current.rows[0].total>previous.rows[0].total,allocation);
   close(current.rows.reduce((a,p)=>a+p.total,0),current.totalCost);
   close(current.totalCost-previous.totalCost,(current.buy-previous.buy+current.duty-previous.duty+current.ifu-previous.ifu)*1.07);
   previous=current;
  }
 }
});
test('sellable units avoid binary rounding loss of a whole piece',()=>{
 const s=plan();s.products[0].qty=25;s.settings.loss=56;assert.equal(calculate(s).sellable,11);
 s.products[0].qty=10;s.settings.loss=15;assert.equal(calculate(s).sellable,8);
});
