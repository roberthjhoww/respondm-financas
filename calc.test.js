const assert=require("assert");
const{saldoConta,saldoTotal,saldoDivida,resumoMes,despesasPorCategoria,extratoDivida}=require("./calc.js");

const data={
  contas:[{id:"c1",nome:"Nubank",saldoInicial:1000},{id:"c2",nome:"Dinheiro",saldoInicial:100}],
  dividas:[{id:"d1",nome:"Cartão de crédito",saldoInicial:500}],
  lancamentos:[
    {id:"l1",data:"2026-09-05",tipo:"receita",valor:2000,categoria:"Salário/Pró-labore",contaId:"c1"},
    {id:"l2",data:"2026-09-10",tipo:"despesa",valor:300,categoria:"Alimentação",contaId:"c1"},
    {id:"l3",data:"2026-09-15",tipo:"despesa",valor:150,categoria:"Pagamento de dívida",contaId:"c1",dividaId:"d1"},
    {id:"l4",data:"2026-08-20",tipo:"despesa",valor:50,categoria:"Lazer",contaId:"c2"}
  ]
};

assert.strictEqual(saldoConta(data,"c1"),2550,"saldo conta c1");
assert.strictEqual(saldoConta(data,"c2"),50,"saldo conta c2");
assert.strictEqual(saldoConta(data,"inexistente"),0,"conta inexistente = 0");
assert.strictEqual(saldoTotal(data),2600,"saldo total");
assert.strictEqual(saldoDivida(data,"d1"),350,"saldo devedor abate com pagamento");

const r=resumoMes(data,"2026-09");
assert.strictEqual(r.receitas,2000,"receitas do mês");
assert.strictEqual(r.despesas,450,"despesas do mês (inclui pagamento de dívida)");
assert.strictEqual(r.saldo,1550,"saldo do mês");

const rAgo=resumoMes(data,"2026-08");
assert.strictEqual(rAgo.despesas,50,"mês anterior isolado");

const cat=despesasPorCategoria(data,"2026-09");
assert.deepStrictEqual(cat,[["Alimentação",300],["Pagamento de dívida",150]],"ordenado por valor desc");

const extD1=extratoDivida(data,"d1");
assert.strictEqual(extD1.length,1);
assert.strictEqual(extD1[0].id,"l3");

console.log("OK — calc.js verificado (8 asserts)");
