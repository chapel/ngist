#!/usr/bin/env node

var exec, finish, get_clip, get_creds, next, ngist, opt, os, run, serial, set_clip, spit_error;
os = require('os');
ngist = require('./ngist');
exec = require('child_process').exec;
opt = require('optimist').argv;
run = function() {
  if (opt._.length === 0) {
    opt._ = null;
  }
  opt.help = opt.help || opt.h;
  opt.clip = opt.clip || opt.c;
  opt.desc = opt.desc || opt.d;
  opt.private = opt.private || opt.p;
  opt.user = opt.user || opt.u;
  opt.token = opt.token || opt.t;
  opt.out = opt.out || opt.o;
  if (opt.help) {
    return console.log('  \nUsage: ngist [file.js file2.js ...] [options]\n\n[Options]\n-h, --help         Display this help page\n-c, --clip         Use clipboard content\n                       ex: ngist [file.js] -c file.js\n-d, --desc         Set description of gist\n                       ex: ngist file.js -d \'Description\'\n-u, --user         Github username\n-t, --token        Github API token | https://github.com/account#admin_bucket\n                       ex: ngist file.js -u username -t token\n-p, --private      Make gist private\n-o, --out          Copy gist url to clipboard\n\n[How to set user/token with git config]\nOnce you get your Github API token from https://github.com/account#admin_bucket\nIf you set your Github username and API token using these steps, ngist will\nautomatically gather them and authenticate for you.\n\nRun these two commands:\n  git config --add github.user [github_username]\n  git config --add github.token [github_api_token]\n\nTo verify that they have been set, use:\n  git config --get github.[user/token]');
  }
  if (opt._ && opt.clip) {
    return ngist.files(opt._, function(err, files) {
      if (err) {
        spit_error(err);
      }
      return get_clip(function(clip) {
        files = files.concat(clip);
        return next(files);
      });
    });
  } else if (opt._) {
    return ngist.files(opt._, function(err, files) {
      if (err) {
        spit_error(err);
      }
      return next(files);
    });
  } else if (opt.clip) {
    return get_clip(function(clip) {
      return next(clip);
    });
  } else {
    return spit_error('You must set file(s) and/or a clip from the clipboard (-c)');
  }
};
next = function(files) {
  if (opt.user && opt.token) {
    return finish(files, opt.user, opt.token);
  } else if ((opt.user && !opt.token) || (opt.token && !opt.user)) {
    return spit_error('Both user (-u) and token (-t) must be set if you wish to login');
  } else {
    return get_creds(files);
  }
};
finish = function(files, user, token) {
  var options;
  if (opt.desc || opt.private || (user && token)) {
    options = {};
  } else {
    options = null;
  }
  if (opt.private) {
    options.private = true;
  }
  if (opt.desc) {
    options.description = opt.desc;
  }
  if (user) {
    options.user = user;
  }
  if (token) {
    options.token = token;
  }
  return ngist.send(files, options, function(err, url) {
    if (err) {
      spit_error(err);
    }
    if (opt.out) {
      set_clip(url);
    }
    return console.log("Gist: " + url);
  });
};
get_creds = function(files) {
  var keys;
  keys = ['get', 'system', 'global', 'simple'];
  return serial(keys, function(key, i, _next) {
    return exec("git config --" + key + " github.user", function(err, stdout, stderr) {
      var user;
      if (!err) {
        user = stdout.replace("\n", "");
        return exec("git config --" + key + " github.token", function(err, stdout, stderr) {
          var token;
          if (!err) {
            token = stdout.replace("\n", "");
            return finish(files, user, token);
          }
        });
      } else {
        return _next();
      }
    });
  }, function() {
    console.log("For instructions on how to authenticate your gists: ngist -h");
    return finish(files, null, null);
  });
};
set_clip = function(url) {
  var clipboard;
  switch (os.type()) {
    case 'Darwin':
      clipboard = "echo " + url + " | pbcopy";
      break;
    case 'Linux':
      clipboard = "echo " + url + " | xclip";
  }
  return exec(clipboard, function(err, stdout) {
    if (err) {
      return spit_error('Problem sending url to clipboard');
    }
  });
};
get_clip = function(callback) {
  var clip, clipboard;
  clip = [];
  switch (os.type()) {
    case 'Darwin':
      clipboard = 'pbpaste';
      break;
    case 'Linux':
      clipboard = 'xclip -out -selection clipboard';
  }
  return exec(clipboard, function(err, stdout) {
    if (stdout === '') {
      spit_error('Nothing in clipboard');
    }
    if (err) {
      spit_error('Problem getting contents of clipboard');
    }
    clip.push({
      name: opt.clip,
      contents: stdout
    });
    return callback(clip);
  });
};
spit_error = function(err) {
  console.error("" + err + "\nFor more help see: ngist -h");
  return process.exit(1);
};
serial = function(array, iterator, next) {
  var cycle;
  cycle = function(i) {
    if (i < array.length) {
      return iterator(array[i], i, function() {
        return cycle(i + 1);
      });
    } else {
      return next();
    }
  };
  return cycle(0);
};
run();