const express = require('express');
const session = require('express-session');
const app = express();

// Configurações do Express e EJS
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

// Configuração de Sessão (Gerencia quem está logado)
app.use(session({
    secret: 'chave-secreta-poesia',
    resave: false,
    saveUninitialized: true
}));

// --- "BANCO DE DADOS" EM MEMÓRIA ---
const usuarios = []; // Guarda: { id, nome, email, senha }
const poemas = [
    {
        id: 1,
        autorNome: "Carlos Drummond",
        titulo: "No Meio do Caminho",
        conteudo: "No meio do caminho tinha uma pedra\ntinha uma pedra no meio do caminho...",
        curtidasPor: [], // Guarda o ID de quem já curtiu
        comentarios: [
            { autorNome: "Machado de Assis", texto: "Excelente poema!" }
        ]
    }
];

// Middleware para passar o usuário logado para todas as telas (views)
app.use((req, res, next) => {
    res.locals.usuarioLogado = req.session.usuario || null;
    next();
});

// --- ROTAS DE AUTENTICAÇÃO ---

app.get('/cadastro', (req, res) => res.render('cadastro', { erro: null }));

app.post('/cadastro', (req, res) => {
    const { nome, email, senha } = req.body;
    
    if (usuarios.find(u => u.email === email)) {
        return res.render('cadastro', { erro: 'E-mail já cadastrado!' });
    }

    const novoUsuario = { id: Date.now(), nome, email, senha };
    usuarios.push(novoUsuario);
    req.session.usuario = novoUsuario;
    res.redirect('/');
});
// Rota GET para exibir a tela de login
app.get('/login', (req, res) => {
    // Passa 'erro: null' para evitar erro de variável indefinida no EJS
    res.render('login', { erro: null });
});

// Rota POST para processar o formulário de login
app.post('/login', (req, res) => {
    const { email, senha } = req.body;
    const usuario = usuarios.find(u => u.email === email && u.senha === senha);

    if (!usuario) {
        return res.render('login', { erro: 'E-mail ou senha incorretos!' });
    }

    req.session.usuario = usuario;
    res.redirect('/');
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// --- ROTAS DO FEED, PESQUISA E POEMAS ---

// Feed Principal
app.get('/', (req, res) => {
    res.render('index', { poemas });
});

// Rota de Pesquisa (Filtra por título, conteúdo ou autor)
app.get('/pesquisar', (req, res) => {
    const termo = (req.query.q || '').toLowerCase();
    
    const poemasFiltrados = poemas.filter(p => 
        p.titulo.toLowerCase().includes(termo) ||
        p.conteudo.toLowerCase().includes(termo) ||
        p.autorNome.toLowerCase().includes(termo)
    );

    res.render('index', { poemas: poemasFiltrados });
});

// Publicar Poema
app.post('/publicar', (req, res) => {
    if (!req.session.usuario) return res.redirect('/login');

    const { titulo, conteudo } = req.body;
    poemas.unshift({
        id: Date.now(),
        autorNome: req.session.usuario.nome,
        titulo,
        conteudo,
        curtidasPor: [],
        comentarios: []
    });

    res.redirect('/');
});

// Curtir / Descurtir (Somente 1 vez por usuário)
app.post('/curtir/:id', (req, res) => {
    if (!req.session.usuario) return res.redirect('/login');

    const poema = poemas.find(p => p.id == req.params.id);
    if (poema) {
        const usuarioId = req.session.usuario.id;
        const index = poema.curtidasPor.indexOf(usuarioId);

        if (index === -1) {
            // Se ainda não curtiu, adiciona
            poema.curtidasPor.push(usuarioId);
        } else {
            // Se já curtiu, remove (descurte)
            poema.curtidasPor.splice(index, 1);
        }
    }

    res.redirect('/');
});

// Visualizar um Poema e Comentários
app.get('/poema/:id', (req, res) => {
    const poema = poemas.find(p => p.id == req.params.id);
    if (!poema) return res.redirect('/');
    res.render('poema', { poema });
});

// Comentar em um Poema
app.post('/comentar/:id', (req, res) => {
    if (!req.session.usuario) return res.redirect('/login');

    const poema = poemas.find(p => p.id == req.params.id);
    if (poema) {
        poema.comentarios.push({
            autorNome: req.session.usuario.nome,
            texto: req.body.texto
        });
    }

    res.redirect(`/poema/${req.params.id}`);
});

app.listen(3000, () => console.log('Servidor rodando em http://localhost:3000'));