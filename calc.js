/* Cálculos financeiros puros — sem DOM, sem Firebase. Testado por calc.test.js (rode: node calc.test.js). */
(function(root){
function num(v){const n=Number(v);return isFinite(n)?n:0;}

// Saldo de uma conta = saldo inicial + receitas nela - despesas nela (inclui pagamentos de dívida, que saem da
// conta) +/- transferências (débito na origem, crédito no destino — não é receita nem despesa "de verdade").
function saldoConta(data,contaId){
  const conta=(data.contas||[]).find(c=>c.id===contaId);
  if(!conta)return 0;
  let s=num(conta.saldoInicial);
  (data.lancamentos||[]).forEach(l=>{
    if(l.tipo==="transferencia"){
      if(l.contaOrigemId===contaId)s-=num(l.valor);
      if(l.contaDestinoId===contaId)s+=num(l.valor);
      return;
    }
    if(l.contaId!==contaId)return;
    s+=l.tipo==="receita"?num(l.valor):-num(l.valor);
  });
  return s;
}

// Soma de todas as contas — acumula mês a mês (nunca zera), o que já "aproveita a sobra do mês passado".
function saldoTotal(data){
  return (data.contas||[]).reduce((sum,c)=>sum+saldoConta(data,c.id),0);
}

// Saldo devedor de uma dívida = valor inicial - abatimento de cada pagamento vinculado a ela.
// Abatimento normalmente é o próprio valor pago, mas juros não abate (é custo puro, some da conta mas não da
// dívida) e desconto abate a mais (você pagou menos, mas a dívida cai como se tivesse pago o valor cheio).
function saldoDivida(data,dividaId){
  const divida=(data.dividas||[]).find(d=>d.id===dividaId);
  if(!divida)return 0;
  let s=num(divida.saldoInicial);
  (data.lancamentos||[]).forEach(l=>{
    if(l.dividaId!==dividaId)return;
    s-=num(l.valor)-num(l.juros)+num(l.desconto);
  });
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
  return (data.lancamentos||[]).filter(l=>l.contaId===contaId||l.contaOrigemId===contaId||l.contaDestinoId===contaId).sort((a,b)=>b.data.localeCompare(a.data));
}
function extratoDivida(data,dividaId){
  return (data.lancamentos||[]).filter(l=>l.dividaId===dividaId).sort((a,b)=>b.data.localeCompare(a.data));
}

// Resumo de parcelas de uma dívida (opcional — só se ela tiver `parcelas` cadastrado).
// `pagas` conta números de parcela distintos com pagamento vinculado. Pagamentos ANTIGOS (de antes dessa
// função existir) não têm `numeroParcela` — ponytail: assumimos que eles cobrem as primeiras parcelas em
// ordem (1, 2, 3...), senão dívidas já em andamento apareceriam com parcelas "atrasadas" que na verdade já
// foram pagas. É uma heurística (não garante a ordem real), mas evita alarme falso pros dados que já existiam.
function resumoParcelas(data,dividaId){
  const divida=(data.dividas||[]).find(d=>d.id===dividaId);
  if(!divida||!divida.parcelas)return null;
  const pagamentos=extratoDivida(data,dividaId);
  const semNumero=pagamentos.filter(l=>l.numeroParcela==null).length;
  const numerosPagos=new Set(pagamentos.map(l=>l.numeroParcela).filter(n=>n!=null));
  for(let n=1;n<=semNumero;n++)numerosPagos.add(n);
  const pagas=numerosPagos.size;
  const restantes=Math.max(0,divida.parcelas-pagas);
  const numerosPendentes=[];
  for(let n=1;n<=divida.parcelas;n++)if(!numerosPagos.has(n))numerosPendentes.push(n);
  const valorParcela=num(divida.valorParcela);
  const valorNominalRestante=restantes*valorParcela;
  const desconto=num(divida.descontoAntecipacao);
  const economia=valorNominalRestante*desconto/100;
  const totalJuros=pagamentos.reduce((s,l)=>s+num(l.juros),0);
  return{parcelas:divida.parcelas,pagas,restantes,numerosPagos:Array.from(numerosPagos).sort((a,b)=>a-b),numerosPendentes,valorParcela,valorNominalRestante,desconto,economia,valorQuitacaoAntecipada:valorNominalRestante-economia,totalJuros};
}

// Data (ISO) de vencimento da N-ésima parcela, contando a partir do vencimento da 1ª (mensal, mesmo dia).
function dataVencimentoParcela(primeiroVencimento,numeroParcela){
  const[y,m,d]=primeiroVencimento.split("-").map(Number);
  const dt=new Date(y,m-1+(numeroParcela-1),d);
  return dt.getFullYear()+"-"+String(dt.getMonth()+1).padStart(2,"0")+"-"+String(dt.getDate()).padStart(2,"0");
}

// Situação das parcelas em aberto de uma dívida (opcional — só se tiver `parcelas` E `primeiroVencimento`
// cadastrados): quantas estão atrasadas (venceram e não têm pagamento vinculado) e qual a próxima a vencer.
function situacaoParcelas(data,dividaId,hojeISO){
  const divida=(data.dividas||[]).find(d=>d.id===dividaId);
  if(!divida||!divida.parcelas||!divida.primeiroVencimento)return null;
  const hoje=hojeISO||new Date().toISOString().slice(0,10);
  const resumo=resumoParcelas(data,dividaId);
  const comVencimento=resumo.numerosPendentes.map(n=>({numero:n,vencimento:dataVencimentoParcela(divida.primeiroVencimento,n)}));
  const atrasadas=comVencimento.filter(p=>p.vencimento<hoje);
  const proximas=comVencimento.filter(p=>p.vencimento>=hoje).sort((a,b)=>a.vencimento.localeCompare(b.vencimento));
  return{atrasadas:atrasadas.length,proximoNumero:proximas[0]?proximas[0].numero:null,proximoVencimento:proximas[0]?proximas[0].vencimento:null};
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

const api={saldoConta,saldoTotal,saldoDivida,lancamentosDoMes,resumoMes,despesasPorCategoria,extratoConta,extratoDivida,resumoParcelas,dataVencimentoParcela,situacaoParcelas,extratoContaVencer,situacaoContaVencer};
if(typeof module!=="undefined"&&module.exports)module.exports=api;
else root.FinCalc=api;
})(typeof window!=="undefined"?window:this);
