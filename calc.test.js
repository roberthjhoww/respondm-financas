const assert=require("assert");
const{saldoConta,saldoTotal,saldoDivida,resumoMes,despesasPorCategoria,extratoConta,extratoDivida,resumoParcelas,numerosDoPagamento,dataVencimentoParcela,situacaoParcelas,situacaoContaVencer}=require("./calc.js");
const arred=v=>Math.round(v*100)/100; // evita ruído de ponto flutuante nos asserts

const data={
  contas:[{id:"c1",nome:"Nubank",saldoInicial:1000},{id:"c2",nome:"Dinheiro",saldoInicial:100}],
  dividas:[
    {id:"d1",nome:"Cartão de crédito",saldoInicial:500},
    {id:"d2",nome:"Empréstimo",saldoInicial:1800,parcelas:12,valorParcela:150,descontoAntecipacao:10,primeiroVencimento:"2026-08-05"},
    {id:"d3",nome:"Empréstimo Nubank",saldoInicial:5865.24,parcelas:12,valorParcela:488.77}
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
    {id:"l7",data:"2026-09-08",tipo:"despesa",valor:80,categoria:"Pagamento de conta a vencer",contaId:"c1",contaVencerId:"cv2"},
    {id:"l8",data:"2026-09-12",tipo:"transferencia",valor:300,contaOrigemId:"c1",contaDestinoId:"c2"},
    {id:"l9",data:"2026-10-08",tipo:"despesa",valor:170,categoria:"Pagamento de dívida",contaId:"c1",dividaId:"d2",numeroParcela:3,juros:20},
    {id:"l10",data:"2026-10-15",tipo:"despesa",valor:140,categoria:"Pagamento de dívida",contaId:"c1",dividaId:"d2",numeroParcela:4,desconto:10},
    {id:"l11",data:"2026-10-20",tipo:"despesa",valor:679.14,categoria:"Pagamento de dívida",contaId:"c1",dividaId:"d3",numerosParcela:[1,12],desconto:298.40}
  ]
};

assert.strictEqual(arred(saldoConta(data,"c1")),880.86,"saldo conta c1 (debita valor cheio pago, inclusive juros)");
assert.strictEqual(saldoConta(data,"c2"),350,"saldo conta c2 (credita a transferência que entrou)");
assert.strictEqual(saldoConta(data,"inexistente"),0,"conta inexistente = 0");
assert.strictEqual(arred(saldoTotal(data)),1230.86,"saldo total não muda com transferência entre as próprias contas");
assert.strictEqual(saldoDivida(data,"d1"),350,"saldo devedor abate com pagamento");
assert.strictEqual(saldoDivida(data,"d2"),1200,"1800 - 4x150 abatido (juros nao abate, desconto abate a mais, os dois viram 150 liquido)");
assert.strictEqual(arred(saldoDivida(data,"d3")),4887.70,"5865.24 - 977.54 abatido (679.14 pagos + 298.40 de desconto = 2 parcelas inteiras)");

const r=resumoMes(data,"2026-09");
assert.strictEqual(r.receitas,2000,"receitas do mês");
assert.strictEqual(r.despesas,680,"despesas do mês (transferência não conta como despesa)");
assert.strictEqual(r.saldo,1320,"saldo do mês");

const rAgo=resumoMes(data,"2026-08");
assert.strictEqual(rAgo.despesas,200,"mês anterior isolado");

const cat=despesasPorCategoria(data,"2026-09");
assert.deepStrictEqual(cat,[["Alimentação",300],["Pagamento de dívida",300],["Pagamento de conta a vencer",80]],"ordenado por valor desc");

const rp=resumoParcelas(data,"d2");
assert.strictEqual(rp.pagas,4,"2 pagamentos antigos sem número (assumidos como parcelas 1 e 2) + parcelas 3 e 4 numeradas");
assert.strictEqual(rp.restantes,8,"12 - 4 pagas");
assert.deepStrictEqual(rp.numerosPagos,[1,2,3,4],"1 e 2 vieram dos pagamentos antigos sem número (heurística sequencial)");
assert.deepStrictEqual(rp.numerosPendentes,[5,6,7,8,9,10,11,12]);
assert.strictEqual(rp.valorNominalRestante,1200,"8 x 150");
assert.strictEqual(rp.economia,120,"10% de desconto sobre 1200");
assert.strictEqual(rp.valorQuitacaoAntecipada,1080,"1200 - economia");
assert.strictEqual(rp.totalJuros,20,"só o pagamento da parcela 3 teve juros");
assert.strictEqual(resumoParcelas(data,"d1"),null,"dívida sem parcelas cadastradas = null");

// caso real do Robert: 1 pagamento só quitando 2 parcelas (1 e 12) juntas, com desconto por antecipar
const rp3=resumoParcelas(data,"d3");
assert.strictEqual(rp3.pagas,2,"1 pagamento cobrindo 2 números = 2 parcelas pagas, não 1");
assert.deepStrictEqual(rp3.numerosPagos,[1,12]);
assert.strictEqual(arred(rp3.valorNominalRestante),4887.70,"10 parcelas restantes x 488.77");
assert.deepStrictEqual(numerosDoPagamento(data.lancamentos.find(l=>l.id==="l11")),[1,12]);
assert.deepStrictEqual(numerosDoPagamento(data.lancamentos.find(l=>l.id==="l9")),[3],"campo antigo numeroParcela (singular) ainda funciona");

assert.strictEqual(dataVencimentoParcela("2026-08-05",1),"2026-08-05","1ª parcela = o próprio primeiro vencimento");
assert.strictEqual(dataVencimentoParcela("2026-08-05",5),"2026-12-05","5ª parcela = 4 meses depois, mesmo dia");

assert.deepStrictEqual(situacaoParcelas(data,"d2","2026-09-09"),{atrasadas:0,diasAtraso:null,proximoNumero:5,proximoVencimento:"2026-12-05",diasProximo:87},"nenhuma pendente vencida ainda");
assert.deepStrictEqual(situacaoParcelas(data,"d2","2026-12-10"),{atrasadas:1,diasAtraso:5,proximoNumero:6,proximoVencimento:"2027-01-05",diasProximo:26},"parcela 5 (venceu 05/12, 5 dias atrás) ainda sem pagamento = atrasada");
assert.strictEqual(situacaoParcelas(data,"d1","2026-09-09"),null,"dívida sem parcelas/primeiroVencimento cadastrados = null");

const extD1=extratoDivida(data,"d1");
assert.strictEqual(extD1.length,1);
assert.strictEqual(extD1[0].id,"l3");

const extC1=extratoConta(data,"c1");
assert.ok(extC1.some(l=>l.id==="l8"),"extrato da conta origem inclui a transferência");
const extC2=extratoConta(data,"c2");
assert.ok(extC2.some(l=>l.id==="l8"),"extrato da conta destino também inclui a mesma transferência");

assert.deepStrictEqual(situacaoContaVencer(data,"cv1","2026-09-09"),{status:"pendente",dias:6},"ainda dentro do prazo este mês");
assert.deepStrictEqual(situacaoContaVencer(data,"cv1","2026-09-20"),{status:"atrasada",dias:5},"passou do dia 15 e não tem pagamento vinculado = atrasada, não pula pro mês seguinte");
assert.deepStrictEqual(situacaoContaVencer(data,"cv2","2026-09-09"),{status:"pago",ultimoPagamento:"2026-09-08"},"tem lançamento vinculado neste mês = paga");
assert.deepStrictEqual(situacaoContaVencer(data,"cv2","2026-10-01"),{status:"pendente",dias:9},"mês virou, o pagamento de setembro não conta mais pro ciclo de outubro");
assert.deepStrictEqual(situacaoContaVencer(data,"cv3","2026-09-09"),{status:"pendente",dias:null},"sem dia de vencimento cadastrado");
assert.strictEqual(situacaoContaVencer(data,"inexistente","2026-09-09"),null,"conta a vencer inexistente = null");

console.log("OK — calc.js verificado (43 asserts)");
