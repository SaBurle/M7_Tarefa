// Valores em centavos (inteiros) para evitar erros de arredondamento com R$ 1,75
const formatarReais = (centavos) => `R$ ${(centavos / 100).toFixed(2).replace('.', ',')}`;

// Troco zerado vira "Sem troco"; senão mostra o rótulo e o valor
const textoTroco = (centavos, rotulo) =>
    centavos === 0 ? 'Sem troco' : `${rotulo}: ${formatarReais(centavos)}`;


// Classe Parquimetro: guarda as regras (saldo, tempo e limite)
class Parquimetro {
    // Regras fixas
    static LIMITE_MINUTOS = 120;
    static TEMPOS = [
        { minutos: 30, preco: 100 },
        { minutos: 60, preco: 175 },
        { minutos: 120, preco: 300 },
    ];

    // Propriedades
    #saldo = 0;
    #minutos = 0;

    // Cada regra diz quando a compra é recusada e qual mensagem mostrar
    #regras = [
        {
            recusa: (tempo) => this.#minutos + tempo.minutos > Parquimetro.LIMITE_MINUTOS,
            mensagem: () => `Máximo de ${Parquimetro.LIMITE_MINUTOS} min de estacionamento.`,
        },
        {
            recusa: (tempo) => tempo.preco > this.#saldo,
            mensagem: (tempo) => `Saldo insuficiente para ${tempo.minutos} min.`,
        },
    ];

    // Métodos
    #buscarTempo(minutos) {
        return Parquimetro.TEMPOS.find((item) => item.minutos === minutos);
    }

    inserirSaldo(centavos) {
        this.#saldo += centavos;
    }

    // Devolve a mensagem da primeira regra que recusa a compra (vazio = tudo certo)
    validar(minutos) {
        const tempo = this.#buscarTempo(minutos);
        const regra = this.#regras.find((item) => item.recusa(tempo));
        return regra ? regra.mensagem(tempo) : '';
    }

    // Faz a compra: o que sobra no saldo é o troco
    comprar(minutos) {
        const motivo = this.validar(minutos);
        if (motivo !== '') {
            return motivo;
        }
        const tempo = this.#buscarTempo(minutos);
        this.#saldo -= tempo.preco;
        this.#minutos += tempo.minutos;
        return '';
    }

    // Encerra o estacionamento: zera o tempo e devolve o saldo (troco)
    finalizar() {
        const troco = this.#saldo;
        this.#saldo = 0;
        this.#minutos = 0;
        return troco;
    }

    // Métodos getter
    get saldo() {
        return this.#saldo;
    }
    get minutos() {
        return this.#minutos;
    }
}


// Classe Formulario: cuida da tela (DOM)
class Formulario {
    #parquimetro;
    #minutosEscolhidos = null;

    constructor(parquimetro) {
        this.#parquimetro = parquimetro;
        this.#montarOpcoes();
        this.#atualizarTela();
    }

    // Cria um botão para cada tempo da tabela do parquímetro
    #montarOpcoes() {
        const area = document.getElementById('opcoes');
        Parquimetro.TEMPOS.forEach(({ minutos, preco }) => {
            const botao = document.createElement('button');
            botao.type = 'button';
            botao.className = 'opcao';
            botao.dataset.minutos = minutos;
            botao.setAttribute('aria-pressed', 'false');
            botao.innerHTML = `${minutos} min<small>${formatarReais(preco)}</small>`;
            botao.addEventListener('click', () => this.escolherTempo(minutos));
            area.appendChild(botao);
        });
    }

    inserirSaldo() {
        // Pegar o valor digitado (em centavos)
        const campo = document.getElementById('valorSaldo');
        const centavos = Math.round(parseFloat(campo.value) * 100);

        // Campo vazio, zero ou negativo não passam nesta comparação
        if (!(centavos > 0)) {
            this.#mostrarMensagem('Digite um valor maior que zero.', 'erro');
            return;
        }

        this.#parquimetro.inserirSaldo(centavos);
        campo.value = '';
        this.#mostrarMensagem('', 'dica');
        this.#atualizarTela();
    }

    escolherTempo(minutos) {
        // Se alguma regra recusar, o botão fica sem seleção e aparece o aviso
        const motivo = this.#parquimetro.validar(minutos);
        this.#marcarOpcao(motivo === '' ? minutos : null);
        this.#mostrarMensagem(motivo, 'erro');
    }

    iniciar() {
        if (this.#minutosEscolhidos === null) {
            this.#mostrarMensagem('Escolha um tempo antes de iniciar.', 'erro');
            return;
        }

        const minutos = this.#minutosEscolhidos;
        const motivo = this.#parquimetro.comprar(minutos);
        this.#marcarOpcao(null);
        this.#atualizarTela();

        if (motivo !== '') {
            this.#mostrarMensagem(motivo, 'erro');
            return;
        }
        this.#mostrarMensagem(
            `Tempo adicionado: ${minutos} min. ${textoTroco(this.#parquimetro.saldo, 'Saldo restante (troco)')}.`,
            'ok'
        );
    }

    finalizar() {
        const troco = this.#parquimetro.finalizar();
        this.#marcarOpcao(null);
        this.#atualizarTela();
        this.#mostrarMensagem(`Estacionamento finalizado. ${textoTroco(troco, 'Troco devolvido')}.`, 'ok');
    }

    #marcarOpcao(minutos) {
        this.#minutosEscolhidos = minutos;
        document.querySelectorAll('.opcao').forEach((botao) => {
            const marcado = Number(botao.dataset.minutos) === minutos;
            botao.setAttribute('aria-pressed', String(marcado));
        });
    }

    #mostrarMensagem(texto, tipo) {
        const elemento = document.getElementById('mensagem');
        elemento.textContent = texto;
        elemento.className = `mensagem ${tipo}`;
    }

    #atualizarTela() {
        document.getElementById('saldo').textContent = formatarReais(this.#parquimetro.saldo);
        document.getElementById('tempoDisponivel').textContent = this.#parquimetro.minutos;
    }
}


// Criar instâncias (nomes diferentes dos das classes)
const parquimetro = new Parquimetro();
const formulario = new Formulario(parquimetro);


// Botão de tema: auto -> claro -> escuro (guarda a escolha no navegador)
const botaoTema = document.getElementById('btn-tema');
const temas = ['auto', 'light', 'dark'];
const nomesTema = { auto: 'auto', light: 'claro', dark: 'escuro' };

function aplicarTema(tema) {
    if (tema === 'auto') {
        document.documentElement.removeAttribute('data-theme');
    } else {
        document.documentElement.setAttribute('data-theme', tema);
    }
    botaoTema.textContent = `Tema: ${nomesTema[tema]}`;
    try {
        localStorage.setItem('tema', tema);
    } catch (erro) {
        // sem armazenamento: a escolha vale só até recarregar
    }
}

let temaAtual = 'auto';
try {
    temaAtual = localStorage.getItem('tema') || 'auto';
} catch (erro) {
    temaAtual = 'auto';
}
aplicarTema(temas.includes(temaAtual) ? temaAtual : 'auto');

botaoTema.addEventListener('click', () => {
    const atual = document.documentElement.getAttribute('data-theme') || 'auto';
    aplicarTema(temas[(temas.indexOf(atual) + 1) % temas.length]);
});
