export const uid = () => globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
export const num = v => Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0;
export function fresh(demo=false) {
  return {version:1,name:demo?'مثال: رحلة إسطنبول':'رحلتي الأولى',demo,
    settings:{duty:5,ifu:0.5,uplift:30,allocation:'value',target:25,sellingFee:0,reserve:0,trips:4,casnos:24000,annual:0,startup:0,loss:0,round:10,paidAnnual:true},
    currencies:[{code:'DZD',actual:1,customs:1},{code:'TRY',actual:0,customs:0},{code:'EUR',actual:0,customs:0},{code:'USD',actual:0,customs:0}],
    products:demo?[{id:uid(),name:'حقيبة يومية',qty:50,price:2000,currency:'DZD',customs:'',weight:0.5,extra:0,sale:3800},{id:uid(),name:'قميص قطني',qty:100,price:900,currency:'DZD',customs:'',weight:0.2,extra:0,sale:1900}]:[],
    expenses:[['تذكرة الطائرة ذهابًا وإيابًا',demo?45000:0,1],['الفندق / الليلة',demo?6000:0,demo?5:1],['الأكل / اليوم',demo?2000:0,demo?6:1],['التنقلات',demo?6000:0,1],['التأشيرة والتأمين',0,1],['الأمتعة والشحن',0,1],['عمولات البنك والصرف',0,1],['الإنترنت والهاتف',0,1]].map(([name,amount,count])=>({id:uid(),name,amount,count,currency:'DZD',business:100})),checklist:[]};
}
export function calculate(s) {
 const cfg=s.settings, warnings=[];
 const rate=(code,type)=>{const v=s.currencies.find(c=>c.code===code)?.[type];if(!num(v)){warnings.push('أدخل سعر صرف '+code+' '+(type==='actual'?'الفعلي':'الجمركي'));return 0;}return num(v);};
 const products=s.products.map(p=>{const q=num(p.qty),cost=num(p.price)*rate(p.currency,'actual')*q;
   const customs=p.customs!==''?num(p.customs)*q:num(p.price)*rate(p.currency,'customs')*q;
   const duty=customs*num(cfg.duty)/100, base=(customs+duty)*(1+num(cfg.uplift)/100),ifu=base*num(cfg.ifu)/100;
   return {...p,q,buy:cost,customValue:customs,duty,ifu,base,direct:cost+duty+ifu+num(p.extra)*q,sellable:Math.floor(q*(100-Math.min(100,num(cfg.loss)))/100+1e-9)};
 });
 const sum=(key)=>products.reduce((a,p)=>a+num(p[key]),0);
 const tripAll=s.expenses.reduce((a,e)=>a+num(e.amount)*num(e.count)*rate(e.currency,'actual'),0);
 const tripBusiness=s.expenses.reduce((a,e)=>a+num(e.amount)*num(e.count)*rate(e.currency,'actual')*Math.min(100,num(e.business))/100,0);
 const annual=num(cfg.casnos)+num(cfg.annual), overhead=annual/Math.max(1,num(cfg.trips))+num(cfg.startup);
 const reserve=(sum('direct')+tripBusiness)*num(cfg.reserve)/100;
 const shared=tripBusiness+overhead+reserve;
 const key=p=>cfg.allocation==='qty'?p.q:cfg.allocation==='weight'?num(p.weight)*p.q:p.buy;
 const totalWeight=products.reduce((a,p)=>a+key(p),0);
 if(products.length&&cfg.allocation==='weight'&&products.some(p=>p.q>0&&!num(p.weight)))warnings.push('أدخل وزن كل منتج لتوزيع المصاريف بالوزن');
 if(sum('customValue')>1800000)warnings.push('القيمة الجمركية تتجاوز سقف 1,800,000 دج للرحلة في نظام الاستيراد المصغّر');
 if(products.some(p=>p.q===0||!Number.isInteger(p.q)))warnings.push('كمية المنتج لازم تكون عددًا صحيحًا أكبر من صفر');
 if(products.some(p=>!num(p.price)))warnings.push('يوجد منتج بدون ثمن شراء؛ أكمل بياناته قبل اعتماد النتيجة');
 if(products.some(p=>!p.sellable))warnings.push('يوجد منتج بدون قطع قابلة للبيع بعد احتساب التلف');
 const fee=Math.min(100,num(cfg.sellingFee))/100, margin=Math.min(100,num(cfg.target))/100;
 if(fee+margin>=1)warnings.push('مجموع هامش الربح وعمولة البيع يجب أن يكون أقل من 100%');
 if(cfg.duty!==5||cfg.ifu!==0.5||cfg.uplift!==30)warnings.push('تستعمل نسبًا مخصصة بدل إعدادات الاستيراد المصغّر المرجعية');
 const rows=products.map(p=>{const share=totalWeight?key(p)/totalWeight:(sum('q')?p.q/sum('q'):0),allocated=shared*share,total=p.direct+allocated;
  const unit=p.sellable?total/p.sellable:null,breakEven=unit!==null&&fee<1?unit/(1-fee):null;
  const raw=unit!==null&&fee+margin<1?unit/(1-fee-margin):null;
  const suggested=raw===null?null:Math.ceil(raw/Math.max(1,num(cfg.round)))*Math.max(1,num(cfg.round));
  const revenue=num(p.sale)*p.sellable,netRevenue=revenue*(1-fee),profit=netRevenue-total;
  return {...p,share,allocated,total,unit,breakEven,suggested,revenue,netRevenue,profit,unitProfit:p.sellable?profit/p.sellable:null};});
 const totalCost=sum('direct')+shared;
 const revenue=rows.reduce((a,p)=>a+p.revenue,0),netRevenue=rows.reduce((a,p)=>a+p.netRevenue,0);
 const cash=sum('direct')+tripAll+num(cfg.startup)+(cfg.paidAnnual?annual:0)+reserve;
 return {rows,tripAll,tripBusiness,personal:tripAll-tripBusiness,annual,overhead,reserve,shared,buy:sum('buy'),duty:sum('duty'),ifu:sum('ifu'),customValue:sum('customValue'),qty:sum('q'),sellable:sum('sellable'),totalCost,revenue,netRevenue,profit:netRevenue-totalCost,cash,warnings:[...new Set(warnings)],valid:warnings.length===0,fee,margin};
}
export function validateImport(d){
 if(!d||d.version!==1||!Array.isArray(d.products)||!Array.isArray(d.expenses)||!Array.isArray(d.currencies)||!d.settings)throw Error('صيغة الملف غير متوافقة');
 if(d.products.length>500||d.expenses.length>200||d.currencies.length>20)throw Error('الملف كبير جدًا');
 const clean=fresh(); clean.name=String(d.name||'رحلة مستوردة').slice(0,120);clean.demo=!!d.demo;
 const n=(v,max=1e10)=>{if(!Number.isFinite(Number(v))||Number(v)<0||Number(v)>max)throw Error('قيمة رقمية غير صالحة');return Number(v);};
 for(const k of Object.keys(clean.settings)){if(k==='allocation'){if(!['value','qty','weight'].includes(d.settings[k]))throw Error('طريقة توزيع غير صالحة');clean.settings[k]=d.settings[k];}else if(k==='paidAnnual')clean.settings[k]=!!d.settings[k];else clean.settings[k]=n(d.settings[k]);}
 for(const k of ['target','sellingFee','loss'])if(clean.settings[k]>100)throw Error('نسبة غير صالحة');
 if(clean.settings.trips<1)throw Error('عدد الرحلات غير صالح');
 clean.currencies=d.currencies.map(c=>{if(!/^[A-Z]{3}$/.test(c.code))throw Error('رمز عملة غير صالح');return {code:c.code,actual:n(c.actual),customs:n(c.customs)};});
 if(new Set(clean.currencies.map(c=>c.code)).size!==clean.currencies.length)throw Error('عملة مكررة');
 clean.currencies=clean.currencies.filter(c=>c.code!=='DZD');clean.currencies.unshift({code:'DZD',actual:1,customs:1});
 const curr=c=>{if(!clean.currencies.some(v=>v.code===c))throw Error('عملة غير موجودة');return c;};
 clean.products=d.products.map(p=>({id:uid(),name:String(p.name||'منتج').slice(0,120),qty:n(p.qty,1e6),price:n(p.price),currency:curr(p.currency),customs:p.customs===''?'':n(p.customs),weight:n(p.weight),extra:n(p.extra),sale:n(p.sale)}));
 clean.expenses=d.expenses.map(e=>({id:uid(),name:String(e.name||'مصروف').slice(0,120),amount:n(e.amount),count:n(e.count),currency:curr(e.currency),business:n(e.business,100)}));
 clean.checklist=Array.isArray(d.checklist)?d.checklist.filter(v=>Number.isInteger(v)&&v>=0&&v<8):[];return clean;
}
