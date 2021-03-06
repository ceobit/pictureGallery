const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const { NotFoundError, Conflict } = require('../errors/errors');
const { SECRET_KEY } = require('../config');

const opts = { runValidators: true };

module.exports.getAllUsers = (req, res, next) => {
  User.find({})
    .then((users) => res.send({ data: users }))
    .catch(next);
};

module.exports.getUser = (req, res, next) => {
  User.findById(req.params.userId)
    .orFail(() => new NotFoundError('Данные в базе данных не обнаружены'))
    .then((users) => res.send({ data: users }))
    .catch(next);
};

module.exports.createUser = (req, res, next) => {
  const {
    name, about, avatar, email, password,
  } = req.body;
  //  перед созданием пользователя, проверим, что такого маила нет в базе и выдадим понятную ошибку
  User.findOne({ email })
    .then((userExist) => {
      if (userExist) {
        return Promise.reject(new Conflict('Имя пользователя занято'));
      }
      //  Cоздаем пользователя. Пароль хешируем
      return bcrypt.hash(password, 10)
        .then((hash) => User.create({
          name, about, avatar, email, password: hash,
        }))
        .then((user) => res.send({ data: user.omitPrivate() }));
    })
    .catch(next);
};

module.exports.updateUser = (req, res, next) => {
  const { name, about } = req.body;
  User.findByIdAndUpdate(req.user._id, { name, about }, opts)
    .orFail(() => new NotFoundError('Данные в базе данных не обнаружены'))
    .then((user) => res.send({ data: user }))
    .catch(next);
};

module.exports.updateUserAvatar = (req, res, next) => {
  const { avatar } = req.body;
  User.findByIdAndUpdate(req.user._id, { avatar }, opts)
    .orFail(() => new NotFoundError('Данные в базе данных не обнаружены'))
    .then((user) => res.send({ data: user }))
    .catch(next);
};

module.exports.login = (req, res, next) => {
  const { email, password } = req.body;
  const sevenDays = 3600000 * 24 * 7;

  return User.findUserByCredentials(email, password)
    .then((user) => {
      const token = jwt.sign({ _id: user._id }, SECRET_KEY, { expiresIn: '7d' });
      res
        .cookie('jwt', token, {
          maxAge: sevenDays,
          httpOnly: true,
          sameSite: true,
        })
        .end();
    })
    .catch(next);
};
