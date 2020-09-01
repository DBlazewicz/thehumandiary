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

//setup node app settings
const app = express();

app.use(express.static("public"));

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended:true}));

//passport/authentication
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

//db connection
mongoose.connect('mongodb://localhost/test', {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false});
const db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error'));
db.once('open', function() {
  console.log("Connected to db");
});

mongoose.set("useCreateIndex", true);

//mongoose schemas:
//entries
const entrySchema = new mongoose.Schema({
  author: String,
  content: String,
  page: String //date as id
});

const Entry = mongoose.model('Entry', entrySchema);

//prompt
const promptSchema = new mongoose.Schema({
  author: String,
  quote: String
});

const Prompt = mongoose.model('Prompt', promptSchema);

//user (and setup for OAuth)
const userSchema = new mongoose.Schema ({
  googleId: String,
  myEntries: [mongoose.ObjectId],
  savedEntries: [mongoose.ObjectId],
  datesPosted: [String]
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

//page
const pageSchema = new mongoose.Schema({
  dateId: String,
  title: String,
  prompt: promptSchema,
  recentEntries: [entrySchema],
  allEntries: [mongoose.ObjectId]
});

const Page = mongoose.model('Page', pageSchema);

app.get("/", function(req, res) {
  const day = date.getDateAsObject();

  console.log(day.id);
  if(Page.findOne({dateId: day.id}, function(err, foundPage) {
    if(err) {
      console.log(err);
    } else {
      if(foundPage) {

        Page.find({}, function(err, pages) {
          if(err) {
            console.log(err);
          } else {
              pages.sort(function(a, b) {return date.compareDateIds(a, b)});

              if(req.isAuthenticated()) {

                User.findById(req.user.id, function(err, foundUser) {
                  res.render("home", {pageList: pages, id: req.user.id, datesPosted: foundUser.datesPosted, signedIn: true});
                });
              } else {
                res.render("home", {pageList: pages, id: 'none', datesPosted: [], signedIn: false});
              }
          }
        });
      } else {

        newPage(day, function(newPage)  {
          newPage.save();
          res.redirect("/");
        });
      }
    }
  }));

});

app.get("/compose/:day", function(req, res) {
  if (req.isAuthenticated()){
    Page.findOne({dateId: req.params.day}, function(err, foundPage) {
      if(err) {
        console.log(err);
      } else {
        res.render("compose", {page: foundPage, signedIn: true});

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
      content: req.body.newEntry,
      page: req.params.day
    });

    console.log(req.body.newEntry);
    Page.findOne({dateId: req.params.day}, function(err, foundPage) {
      if(err) {
        console.log(err);
      } else {
        foundPage.recentEntries.push(newEntry);
        foundPage.allEntries.push(newEntry._id);
        foundPage.save();
      }
    });
    User.findById(req.user.id, function(err, foundUser) {
      if(err) {
        console.log(err);
      } else {
        foundUser.myEntries.push(newEntry._id);
        foundUser.datesPosted.push(req.params.day);
        foundUser.save();
      }
    });

    newEntry.save();
  }

  res.redirect("/");
})

app.post("/delete/:entryId", function(req, res) {

  Entry.findByIdAndDelete(req.params.entryId, function(err, foundEntry) {

      Page.findOneAndUpdate(
        {dateId: foundEntry.page},
        {$pull: {recentEntries: {_id: foundEntry._id}, allEntries: foundEntry._id}},
        function(err, foundPage) {
          if(!err) {
            User.findByIdAndUpdate(foundEntry.author,
            {$pull: {myEntries: foundEntry._id, datesPosted: foundEntry.page}},
            function(err, foundUser) {
              res.redirect("/");
            })
          }
        }
      );
  })
})

app.get("/about", function(req, res) {
  res.render("about", {signedIn: req.isAuthenticated()});
})

app.get("/login", function(req, res) {
  res.render("login", {signedIn: req.isAuthenticated()});
})

app.get("/signout", function(req, res) {
  req.logout();
  res.redirect("/");
})

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/home",
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    res.redirect("/");
  }
);

app.listen(3000, function() {
  console.log("server started on port 3000");
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
          recentEntries: [],
          allEntries: []
        });

        callback(newPage);
      })
}
