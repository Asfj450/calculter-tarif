// Parse only complete, nonnegative decimal input. Never reformat the user's
// draft or move its caret; callers keep the last valid calculation on errors.
export function parseNumericInput(raw, {integer=false,min=0,max=1e12,optional=false}={}) {
 const normalized=String(raw).trim().replace(/[٠-٩]/g,d=>String(d.charCodeAt(0)-1632)).replace(/[۰-۹]/g,d=>String(d.charCodeAt(0)-1776)).replace(/[\s\u066c]/g,'').replace(/[,\u066b]/g,'.');
 if(normalized==='') return optional?{valid:true,value:''}:min>0?{valid:false,error:'أدخل عددًا أكبر من صفر'}:{valid:true,value:0};
 if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized))return {valid:false,error:'أدخل رقمًا موجبًا؛ استعمل النقطة أو الفاصلة للعشري'};
 const value=Number(normalized);
 if(!Number.isFinite(value)||value<min||value>max)return {valid:false,error:`أدخل قيمة بين ${min} و${max}`};
 if(integer&&!Number.isInteger(value))return {valid:false,error:'عدد القطع والرحلات لازم يكون عددًا صحيحًا'};
 return {valid:true,value};
}
