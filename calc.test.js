const assert=require("assert");
const{saldoConta,saldoTotal,saldoDivida,resumoMes,despesasPorCategoria,extratoDivida,resumoParcelas,situacaoContaVencer}=require("./calc.js");

const data={
  contas:[{id:"c1",nome:"Nubank",saldoInicial:1000},{id:"c2",nome:"Dinheiro",saldoInicial:100}],
  dividas:[
    {id:"d1",nome:"Cartão de crédito",saldoInicial:500},
    {id:"d2",nome:"Empréstimo",saldoInicial:1800,parcelas:12,valorParcela:150,descontoAntecipacao:10}
  ],
  contasAVencer:[
    {id:"cv1",nome:"Internet",diaVencimento:15},
    {id:"cv2",nome:"Energia",diaVencimento:10},
    {id:"cv3",nome:"Streaming"}
  ],
  lancamentos:[
    {id:"l1",data:"2026-09-05",tipo:"receita",valor:2000,categoria:"Salário/Pró-labore",contaId:"c1"},
    {id:"l2",data:"2026-09-10",tipo:"despesa",valor:300,categoria:"Alimentação",contaId:"c1"},
    {id:"l3",data:"2026-09-15",tipo:"despesa",valor:150,categoria:"Pagamento de dívida",contaId:"c1",dividaId:"d1"},
    {id:"l4",data:"2026-08-20",tipo:"despesa",valor:50,categoria:"Lazer",contaId:"c2"},
    {id:"l5",data:"2026-08-05",tipo:"despesa",valor:150,categoria:"Pagamento de dívida",contaId:"c1",dividaId:"d2"},
    {id:"l6",data:"2026-09-05",tipo:"despesa",valor:150,categoria:"Pagamento de dívida",contaId:"c1",dividaId:"d2"},
    {id:"l7",data:"2026-09-08",tipo:"despesa",valor:80,categoria:"Pagamento de conta a vencer",contaId:"c1",contaVencerId:"cv2"}
  ]
};

assert.strictEqual(saldoConta(data,"c1"),2170,"saldo conta c1");
assert.strictEqual(saldoConta(data,"c2"),50,"saldo conta c2");
assert.strictEqual(saldoConta(data,"inexistente"),0,"conta inexistente = 0");
assert.strictEqual(saldoTotal(data),2220,"saldo total");
assert.strictEqual(saldoDivida(data,"d1"),350,"saldo devedor abate com pagamento");

const r=resumoMes(data,"2026-09");
assert.strictEqual(r.receitas,2000,"receitas do mês");
assert.strictEqual(r.despesas,680,"despesas do mês (inclui pagamento de dívida e de conta a vencer)");
assert.strictEqual(r.saldo,1320,"saldo do mês");

const rAgo=resumoMes(data,"2026-08");
assert.strictEqual(rAgo.despesas,200,"mês anterior isolado");

const cat=despesasPorCategoria(data,"2026-09");
assert.deepStrictEqual(cat,[["Alimentação",300],["Pagamento de dívida",300],["Pagamento de conta a vencer",80]],"ordenado por valor desc");

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

assert.deepStrictEqual(situacaoContaVencer(data,"cv1","2026-09-09"),{status:"pendente",dias:6},"ainda dentro do prazo este mês");
assert.deepStrictEqual(situacaoContaVencer(data,"cv1","2026-09-20"),{status:"atrasada",dias:5},"passou do dia 15 e não tem pagamento vinculado = atrasada, não pula pro mês seguinte");
assert.deepStrictEqual(situacaoContaVencer(data,"cv2","2026-09-09"),{status:"pago",ultimoPagamento:"2026-09-08"},"tem lançamento vinculado neste mês = paga");
assert.deepStrictEqual(situacaoContaVencer(data,"cv2","2026-10-01"),{status:"pendente",dias:9},"mês virou, o pagamento de setembro não conta mais pro ciclo de outubro");
assert.deepStrictEqual(situacaoContaVencer(data,"cv3","2026-09-09"),{status:"pendente",dias:null},"sem dia de vencimento cadastrado");
assert.strictEqual(situacaoContaVencer(data,"inexistente","2026-09-09"),null,"conta a vencer inexistente = null");

console.log("OK — calc.js verificado (24 asserts)");
