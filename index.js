const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const Sequelize = require('sequelize');
const bcrypt = require('bcrypt');
const saltRounds = 10;
require('dotenv').config();

const app = express();
const PORT = 3000;

// Middleware para análise de corpo JSON
app.use(bodyParser.json());

// Database setup
const sequelize = new Sequelize('userDB', 'user', '654321', {
  host: 'db',
  dialect: 'mysql',
});

const User = sequelize.define('user', {
  nome: Sequelize.STRING,
  email: Sequelize.STRING,
  senha: Sequelize.STRING,
  telefones: Sequelize.JSONB,
  data_criacao: Sequelize.DATE,
  data_atualizacao: Sequelize.DATE,
  ultimo_login: Sequelize.DATE,
}, {
  tableName: 'Users',
  timestamps: false, // disable automatic timestamp fields
});

// Middleware para verificar a autenticação
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ mensagem: 'Não autorizado' });

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.status(403).json({ mensagem: 'Sessão inválida' });
    req.user = user;
    next();
  });
};
module.exports = { authenticateToken };

// Endpoint for sign up
app.post('/signup', (req, res) => {
  const { nome, email, senha, telefones } = req.body;

  // Hash the password
  bcrypt.hash(senha, saltRounds, function(err, hash) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'An error occurred while hashing the password.' });
    }

    // Check if the email is already registered
    User.findOne({ where: { email } })
      .then(existingUser => {
        if (existingUser) {
          return res.status(400).json({ mensagem: 'E-mail já existente' });
        }

        // Create new user
        return User.create({
          nome,
          email,
          senha: hash, // store the hashed password
          telefones,
          data_criacao: new Date(),
          data_atualizacao: new Date(),
          ultimo_login: new Date(),
        });
      })
      .then(newUser => {
        // Generate JWT token
        const token = jwt.sign({ id: newUser.id, email: newUser.email }, process.env.ACCESS_TOKEN_SECRET);

        res.status(201).json({
          id: newUser.id,
          data_criacao: newUser.data_criacao,
          data_atualizacao: newUser.data_atualizacao,
          ultimo_login: newUser.ultimo_login,
          token
        });
      })
      .catch(err => {
        // Handle error
        console.error(err);
        res.status(500).json({ error: 'An error occurred while creating the user.' });
      });
  });
});
// Endpoint para autenticação (Sign In)
app.post('/signin', (req, res) => {
  const { email, senha } = req.body;

  // Verificar credenciais
  User.findOne({ where: { email } })
    .then(user => {
      if (!user) {
        return res.status(401).json({ mensagem: 'Usuário e/ou senha inválidos' });
      }

      // Check password
      bcrypt.compare(senha, user.senha, function(err, result) {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'An error occurred while checking the password.' });
        }

        if (!result) {
          return res.status(401).json({ mensagem: 'Usuário e/ou senha inválidos' });
        }

        // Update ultimo_login
        user.ultimo_login = new Date();

        // Generate JWT token
        const token = jwt.sign({ id: user.id, email: user.email }, process.env.ACCESS_TOKEN_SECRET);

        res.status(200).json({
          id: user.id,
          data_criacao: user.data_criacao,
          data_atualizacao: user.data_atualizacao,
          ultimo_login: user.ultimo_login,
          token
        });
      });
    })
    .catch(err => {
      // Handle error
      console.error(err);
      res.status(500).json({ error: 'An error occurred while signing in.' });
    });
});


  // Endpoint para buscar usuário autenticado
  app.get('/user', authenticateToken, (req, res) => {
    User.findOne({ where: { id: req.user.id } })
      .then(user => {
        res.status(200).json({
          id: user.id,
          data_criacao: user.data_criacao,
          data_atualizacao: user.data_atualizacao,
          ultimo_login: user.ultimo_login,
        });
      })
      .catch(err => {
        // Handle error
        console.error(err);
        res.status(500).json({ error: 'An error occurred while retrieving the user.' });
      });
  });

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


