require('dotenv').config();

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const date = require("./date");
const https = require("https");
const swal = require("sweetalert");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate = require('mongoose-findorcreate');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();

app.use(express.static("public"));

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended:true}));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb://localhost/test', {useNewUrlParser: true, useUnifiedTopology: true});
const db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error'));
db.once('open', function() {
  console.log("Connected to db");
});

mongoose.set("useCreateIndex", true);

const entrySchema = new mongoose.Schema({
  author: String,
  content: String
});

const Entry = mongoose.model('Entry', entrySchema);

const promptSchema = new mongoose.Schema({
  author: String,
  quote: String
});

const Prompt = mongoose.model('Prompt', promptSchema);

const pageSchema = new mongoose.Schema({
  dateId: String,
  title: String,
  prompt: promptSchema,
  entries: [entrySchema]
});

const userSchema = new mongoose.Schema ({
  googleId: String,
  entries: [entrySchema]
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/home",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);

    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

const Page = mongoose.model('Page', pageSchema);

const exampleEntry = new Entry({author: 'example', content: 'Here is an example entry'});

var examplePrompt = new Prompt({
  author: 'Carl Jung',
  quote: 'Mistakes are, after all, the foundations of truth, and if a man does not know what a thing is, it is at least an increase in knowledge if he knows what it is not.'
});

const examplePage = new Page({dateId: "2020-01-01", title: "Monday, Jan 1", prompt: examplePrompt, entries: [exampleEntry]});

app.get("/", function(req, res) {
  const day = date.getDateAsObject();
  // const apiKey=	"4e8af86d0d4a212eb3eead0b2bbcba8e";
  //
  // const url = "https://favqs.com/api/qotd";
  //
  // https.get(url, function(response) {
  //   response.on("data", function(data) {
  //     const quoteData = JSON.parse(data);
  //     const author = quoteData.quote.author;
  //     const quote = quoteData.quote.body;
  //
  //
  //   })
  // })
  console.log(day.id);
  if(Page.findOne({dateId: day.id}, function(err, foundPage) {
    if(err) {
      console.log(err);
    } else {
      if(foundPage) {
        console.log("found a page");
        Page.find({}, function(err, pages) {
          if(err) {
            console.log(err);
          } else {
            // if(pages.length === 0) {
            //   Page.insertMany(examplePage);
            //   res.redirect("/");
            // } else {
              pages.sort(function(a, b) {return date.compareDateIds(a, b)});

              if(req.isAuthenticated()) {
                res.render("home", {pageList: pages, id: req.user.id});
              } else {
                res.render("home", {pageList: pages, id: 'none'});
              }
            // }
          }
        });
      } else {
        console.log("need to create a page");
        newPage(day, function(newPage)  {
          newPage.save();
          res.redirect("/");
        });
      }
    }
  }));


  // res.render("home", {today: day.title, id: day.id, quote: quote, author: author, entryList: entries});

});

app.get("/compose/:day", function(req, res) {
  if (req.isAuthenticated()){
    Page.findOne({dateId: req.params.day}, function(err, foundPage) {
      if(err) {
        console.log(err);
      } else {
        res.render("compose", {page: foundPage});

      }
    });
  } else {
    res.redirect("/login");
  }

})

app.post("/compose/:day", function(req, res) {

  if(req.body.newEntry !== '') {
    let newEntry = Entry({
      author: req.user.id,
      content: req.body.newEntry
    });

    console.log(req.body.newEntry);
    Page.findOne({dateId: req.params.day}, function(err, foundPage) {
      if(err) {
        console.log(err);
      } else {
        foundPage.entries.push(newEntry);
        foundPage.save();
      }
    });
    User.findById(req.user.id, function(err, foundUser) {
      if(err) {
        console.log(err);
      } else {
        foundUser.entries.push(newEntry);
        foundUser.save();
      }
    })
  }

  res.redirect("/");
})

app.get("/about", function(req, res) {
  res.render("about");
})

app.get("/login", function(req, res) {
  res.render("login");
})

app.listen(3000, function() {
  console.log("server started on port 3000");
});

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/home",
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect("/");
    // res.send("Logged in");
  });


//things that should probably be modularized out
function getQuote(callback) {
  const url = "https://favqs.com/api/qotd";

  https.get(url, function(response) {
    response.on("data", function(data) {
      const quoteData = JSON.parse(data);

      callback(quoteData);
    })
  })
}

function newPage(date, callback) {

      getQuote(function(quoteData) {
        const foundAuthor = quoteData.quote.author;
        const foundQuote = quoteData.quote.body;

        const newPrompt = new Prompt({
          author: foundAuthor,
          quote: foundQuote
        });

        let newPage = new Page({
          dateId: date.id,
          title: date.title,
          prompt: newPrompt,
          entries: []
        });

        callback(newPage);
      })
}
