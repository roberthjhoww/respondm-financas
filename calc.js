/* Cálculos financeiros puros — sem DOM, sem Firebase. Testado por calc.test.js (rode: node calc.test.js). */
(function(root){
function num(v){const n=Number(v);return isFinite(n)?n:0;}

// Saldo de uma conta = saldo inicial + receitas nela - despesas nela (inclui pagamentos de dívida, que saem da conta).
function saldoConta(data,contaId){
  const conta=(data.contas||[]).find(c=>c.id===contaId);
  if(!conta)return 0;
  let s=num(conta.saldoInicial);
  (data.lancamentos||[]).forEach(l=>{
    if(l.contaId!==contaId)return;
    s+=l.tipo==="receita"?num(l.valor):-num(l.valor);
  });
  return s;
}

// Soma de todas as contas — acumula mês a mês (nunca zera), o que já "aproveita a sobra do mês passado".
function saldoTotal(data){
  return (data.contas||[]).reduce((sum,c)=>sum+saldoConta(data,c.id),0);
}

// Saldo devedor de uma dívida = valor inicial - pagamentos feitos (lançamentos vinculados a ela).
function saldoDivida(data,dividaId){
  const divida=(data.dividas||[]).find(d=>d.id===dividaId);
  if(!divida)return 0;
  let s=num(divida.saldoInicial);
  (data.lancamentos||[]).forEach(l=>{if(l.dividaId===dividaId)s-=num(l.valor);});
  return s;
}

function lancamentosDoMes(data,mesRef){
  return (data.lancamentos||[]).filter(l=>(l.data||"").slice(0,7)===mesRef);
}

function resumoMes(data,mesRef){
  const ls=lancamentosDoMes(data,mesRef);
  const receitas=ls.filter(l=>l.tipo==="receita").reduce((s,l)=>s+num(l.valor),0);
  const despesas=ls.filter(l=>l.tipo==="despesa").reduce((s,l)=>s+num(l.valor),0);
  return{receitas,despesas,saldo:receitas-despesas};
}

function despesasPorCategoria(data,mesRef){
  const map={};
  lancamentosDoMes(data,mesRef).filter(l=>l.tipo==="despesa").forEach(l=>{
    map[l.categoria]=(map[l.categoria]||0)+num(l.valor);
  });
  return Object.entries(map).sort((a,b)=>b[1]-a[1]);
}

function extratoConta(data,contaId){
  return (data.lancamentos||[]).filter(l=>l.contaId===contaId).sort((a,b)=>b.data.localeCompare(a.data));
}
function extratoDivida(data,dividaId){
  return (data.lancamentos||[]).filter(l=>l.dividaId===dividaId).sort((a,b)=>b.data.localeCompare(a.data));
}

// Resumo de parcelas de uma dívida (opcional — só se ela tiver `parcelas` cadastrado).
// ponytail: cada lançamento vinculado à dívida conta como "1 parcela paga", seja qual for o valor
// (cheia ou com desconto de antecipação). Não rastreia qual número de parcela foi pago, só a contagem.
function resumoParcelas(data,dividaId){
  const divida=(data.dividas||[]).find(d=>d.id===dividaId);
  if(!divida||!divida.parcelas)return null;
  const pagas=extratoDivida(data,dividaId).length;
  const restantes=Math.max(0,divida.parcelas-pagas);
  const valorParcela=num(divida.valorParcela);
  const valorNominalRestante=restantes*valorParcela;
  const desconto=num(divida.descontoAntecipacao);
  const economia=valorNominalRestante*desconto/100;
  return{parcelas:divida.parcelas,pagas,restantes,valorParcela,valorNominalRestante,desconto,economia,valorQuitacaoAntecipada:valorNominalRestante-economia};
}

function extratoContaVencer(data,contaVencerId){
  return (data.lancamentos||[]).filter(l=>l.contaVencerId===contaVencerId).sort((a,b)=>b.data.localeCompare(a.data));
}

// Situação de uma conta a vencer (internet, energia...): "pago" (já quitada neste ciclo, via lançamento
// vinculado com data no mês atual), "atrasada" (o dia já passou este mês e não tem pagamento) ou
// "pendente" (ainda dentro do prazo este mês, ou sem dia de vencimento cadastrado — nesse caso dias=null).
// hojeISO é injetável pra dar pra testar.
function situacaoContaVencer(data,contaVencerId,hojeISO){
  const cv=(data.contasAVencer||[]).find(c=>c.id===contaVencerId);
  if(!cv)return null;
  const hoje=hojeISO?new Date(hojeISO+"T00:00:00"):new Date();
  hoje.setHours(0,0,0,0);
  const mesAtual=hoje.getFullYear()+"-"+String(hoje.getMonth()+1).padStart(2,"0");
  const ultimo=extratoContaVencer(data,contaVencerId)[0];
  if(ultimo&&ultimo.data.slice(0,7)===mesAtual)return{status:"pago",ultimoPagamento:ultimo.data};
  if(!cv.diaVencimento)return{status:"pendente",dias:null};
  const vencimentoEsteMes=new Date(hoje.getFullYear(),hoje.getMonth(),cv.diaVencimento);
  const diasParaVencer=Math.round((vencimentoEsteMes-hoje)/86400000);
  if(diasParaVencer<0)return{status:"atrasada",dias:-diasParaVencer};
  return{status:"pendente",dias:diasParaVencer};
}

const api={saldoConta,saldoTotal,saldoDivida,lancamentosDoMes,resumoMes,despesasPorCategoria,extratoConta,extratoDivida,resumoParcelas,extratoContaVencer,situacaoContaVencer};
if(typeof module!=="undefined"&&module.exports)module.exports=api;
else root.FinCalc=api;
})(typeof window!=="undefined"?window:this);
