const express = require('express');
const app = express();
const path = require('path')
const multer = require('multer')
const crypto = require('crypto')
const userModel = require('./models/user');
const postModel = require('./models/post');
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser');
const { log } = require('console');
const user = require('./models/user');
const multerConfig = require('./config/multerConfig');
const upload = require('./config/multerConfig');

app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());


app.get('/', (req, res) => {
  res.render('index')
})

app.post('/register', async (req, res) => {
  let { username, name, email, password, age } = req.body;

  let user = await userModel.findOne({ email });
  if (user) return
  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(password, salt, async (err, hash) => {
      let user = await userModel.create({
        username,
        name,
        email,
        age,
        password: hash
      })
      let token = jwt.sign({ email: email, userid: user._id }, 'secreat')
      res.cookie('token', token)
      res.redirect('/profile')

    })
  })
})

app.get('/login', (req, res) => {
  res.render('login')
})

app.get('/profile', isLogedIn, async (req, res) => {
  let user = await userModel.findOne({ email: req.user.email }).populate('post')
  res.render('profile', { user })
})

app.post('/login', async (req, res) => {
  let { email, password } = req.body;
  let user = await userModel.findOne({ email });
  if (!user) return res.send("somthing went wrong")

  bcrypt.compare(password, user.password, (err, result) => {
    if (result) {
      let token = jwt.sign({ email: email, userid: user._id }, 'secreat')
      res.cookie('token', token)
      res.status(200).redirect('/profile')
    }
    else res.redirect('/login')
  })
})

app.get('/logout', (req, res) => {
  res.cookie('token', '')
  res.redirect('/login')
})

function isLogedIn(req, res, next) {
  if (req.cookies.token === '') res.redirect('/login')
  else {
    let data = jwt.verify(req.cookies.token, 'secreat');
    req.user = data;
  }
  next()
}

app.post('/create/post', isLogedIn, async (req, res) => {
  let user = await userModel.findOne({ email: req.user.email })
  let content = req.body.post;
  let post = await postModel.create({
    user: user._id,
    content: content
  })
  user.post.push(post._id)
  await user.save()
  res.redirect('/profile')
})

app.get('/like/:id', isLogedIn, async (req, res) => {
  let post = await postModel.findOne({ _id: req.params.id }).populate('user')

  if (post.likes.indexOf(req.user.userid) === -1) {
    post.likes.push(req.user.userid);
  }
  else {
    post.likes.splice(post.likes.indexOf(req.user.userid))
  }

  await post.save()
  res.redirect('/profile')

})

app.get('/edit/:id', isLogedIn, async (req, res) => {
  let post = await postModel.findOne({ _id: req.params.id })
  res.render('edit', { post })
})

app.post('/update/:id', isLogedIn, async (req, res) => {
  let post = await postModel.findOneAndUpdate({ _id: req.params.id }, { content: req.body.edit })
  res.redirect('/profile')
})

app.get('/profile/upload', isLogedIn,(req,res)=>{
  res.render('profileUpload')
})

app.post('/upload/profile',upload.single('profile'), isLogedIn, async (req, res) => {
  let user = await userModel.findOne({email: req.user.email});
  user.profilepic = req.file.filename;
  await user.save();
  res.redirect('/profile');
})

app.listen(3000);
