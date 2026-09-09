const assert=require("assert");
const{saldoConta,saldoTotal,saldoDivida,resumoMes,despesasPorCategoria,extratoDivida,diasAteVencimento,resumoParcelas}=require("./calc.js");

const data={
  contas:[{id:"c1",nome:"Nubank",saldoInicial:1000},{id:"c2",nome:"Dinheiro",saldoInicial:100}],
  dividas:[
    {id:"d1",nome:"Cartão de crédito",saldoInicial:500},
    {id:"d2",nome:"Empréstimo",saldoInicial:1800,parcelas:12,valorParcela:150,descontoAntecipacao:10}
  ],
  lancamentos:[
    {id:"l1",data:"2026-09-05",tipo:"receita",valor:2000,categoria:"Salário/Pró-labore",contaId:"c1"},
    {id:"l2",data:"2026-09-10",tipo:"despesa",valor:300,categoria:"Alimentação",contaId:"c1"},
    {id:"l3",data:"2026-09-15",tipo:"despesa",valor:150,categoria:"Pagamento de dívida",contaId:"c1",dividaId:"d1"},
    {id:"l4",data:"2026-08-20",tipo:"despesa",valor:50,categoria:"Lazer",contaId:"c2"},
    {id:"l5",data:"2026-08-05",tipo:"despesa",valor:150,categoria:"Pagamento de dívida",contaId:"c1",dividaId:"d2"},
    {id:"l6",data:"2026-09-05",tipo:"despesa",valor:150,categoria:"Pagamento de dívida",contaId:"c1",dividaId:"d2"}
  ]
};

assert.strictEqual(saldoConta(data,"c1"),2250,"saldo conta c1");
assert.strictEqual(saldoConta(data,"c2"),50,"saldo conta c2");
assert.strictEqual(saldoConta(data,"inexistente"),0,"conta inexistente = 0");
assert.strictEqual(saldoTotal(data),2300,"saldo total");
assert.strictEqual(saldoDivida(data,"d1"),350,"saldo devedor abate com pagamento");

const r=resumoMes(data,"2026-09");
assert.strictEqual(r.receitas,2000,"receitas do mês");
assert.strictEqual(r.despesas,600,"despesas do mês (inclui pagamento de dívida)");
assert.strictEqual(r.saldo,1400,"saldo do mês");

const rAgo=resumoMes(data,"2026-08");
assert.strictEqual(rAgo.despesas,200,"mês anterior isolado");

const cat=despesasPorCategoria(data,"2026-09");
assert.deepStrictEqual(cat,[["Alimentação",300],["Pagamento de dívida",300]],"ordenado por valor desc");

const rp=resumoParcelas(data,"d2");
assert.strictEqual(rp.pagas,2,"2 lançamentos vinculados = 2 parcelas pagas");
assert.strictEqual(rp.restantes,10,"12 - 2 pagas");
assert.strictEqual(rp.valorNominalRestante,1500,"10 x 150");
assert.strictEqual(rp.economia,150,"10% de desconto sobre 1500");
assert.strictEqual(rp.valorQuitacaoAntecipada,1350,"1500 - economia");
assert.strictEqual(resumoParcelas(data,"d1"),null,"dívida sem parcelas cadastradas = null");

const extD1=extratoDivida(data,"d1");
assert.strictEqual(extD1.length,1);
assert.strictEqual(extD1[0].id,"l3");

assert.strictEqual(diasAteVencimento(15,"2026-09-09"),6,"vencimento ainda este mês");
assert.strictEqual(diasAteVencimento(9,"2026-09-09"),0,"vence hoje");
assert.strictEqual(diasAteVencimento(5,"2026-09-09"),26,"já passou, pula pro dia 5 de outubro");
assert.strictEqual(diasAteVencimento(null,"2026-09-09"),null,"sem dia cadastrado");

console.log("OK — calc.js verificado (18 asserts)");
