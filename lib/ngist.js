(function() {
  var EventEmitter, anError, emitter, exec, fs, getClip, getCredentials, getFiles, https, opt, os, path, post, querystring, run, setClipboard, setCredentials, usage;
  fs = require('fs');
  os = require('os');
  path = require('path');
  https = require('https');
  querystring = require('querystring');
  exec = require('child_process').exec;
  EventEmitter = require('events').EventEmitter;
  opt = require('optimist').usage('Usage: ngist [options] [file.ext] [file...]').argv;
  emitter = new EventEmitter;
  run = function() {
    if (opt.h || opt.help) {
      return usage();
    }
    if ((opt.f || opt.file) && !(opt.c || opt.clip)) {
      return getFiles();
    }
    if ((opt.c || opt.clip) && !(opt.f || opt.file)) {
      return getClip();
    }
    if ((opt.c || opt.clip) && (opt.f || opt.file)) {
      anError('You cannot use files and clipboard together.');
    }
    if (!((opt.f || opt.file) || (opt.c || opt.f))) {
      return anError('File or clipboard not specified. For help: ngist -h');
    }
  };
  getCredentials = function() {
    if ((opt.u || opt.user) && (opt.t || opt.token)) {
      return setCredentials();
    } else {
      return exec("git config --global github.user", function(err, stdout, stderr) {
        var user;
        if (!err) {
          user = stdout.replace("\n", "");
          return exec("git config --global github.token", function(err, stdout, stderr) {
            var token;
            if (!err) {
              token = stdout.replace("\n", "");
              return emitter.emit('credentials', user, token);
            } else {
              return anError('No token set with git.\nFor help: ngist -h');
            }
          });
        } else {
          return anError('No username or token set with git.\nFor help: ngist -h');
        }
      });
    }
  };
  setCredentials = function() {
    return exec("git config --global github.user " + (opt.u || opt.user), function(err, stdout, stderr) {
      if (!err) {
        return exec("git config --global github.token " + (opt.t || opt.token), function(err, stdout, stderr) {
          return emitter.emit('credentials', opt.u || opt.user, opt.t || opt.token);
        });
      }
    });
  };
  setClipboard = function(url) {
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
        return anError('Problem sending url to clipboard');
      }
    });
  };
  post = function(gist) {
    var gistData, options, req;
    gistData = querystring.stringify(gist);
    options = {
      host: 'gist.github.com',
      port: 443,
      path: '/gists',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': gistData.length
      }
    };
    req = https.request(options, function(res) {
      if (res.statusCode === 401) {
        anError("Github.com username or token are not valid.\n      username: " + gist.login + "      token: " + gist.token + "\n      For help: gist -h");
        process.exit(1);
      }
      return res.on('end', function() {
        if (opt.o || opt.out) {
          setClipboard(res.headers.location);
        }
        return console.log('Gist URL: ' + res.headers.location);
      });
    });
    return req.end(gistData);
  };
  getFiles = function() {
    var files, gist, i;
    gist = {};
    files = [];
    files.push(opt.f || opt.file);
    if (opt._) {
      for (i in opt._) {
        files.push(opt._[i]);
      }
    }
    files.forEach(function(file, i, arr) {
      return path.exists(file, function(exists) {
        if (!exists) {
          anError("File not found: " + file);
        }
        gist["file_ext[gistfile" + (i + 1) + "]"] = path.extname(file);
        gist["file_name[gistfile" + (i + 1) + "]"] = path.basename(file);
        gist["file_contents[gistfile" + (i + 1) + "]"] = fs.readFileSync(file, 'utf8');
        if (opt.p || opt.private) {
          gist['action_button'] = 'private';
        }
        if (i === arr.length - 1) {
          return emitter.emit('filesDone');
        }
      });
    });
    return emitter.on('filesDone', function() {
      if (opt.l || opt.login) {
        getCredentials();
        return emitter.on('credentials', function(user, token) {
          gist['login'] = user;
          gist['token'] = token;
          return post(gist);
        });
      } else {
        return post(gist);
      }
    });
  };
  getClip = function() {
    var clipboard, gist;
    gist = {};
    switch (os.type()) {
      case 'Darwin':
        clipboard = 'pbpaste';
        break;
      case 'Linux':
        clipboard = 'xclip -out -selection clipboard';
    }
    return exec(clipboard, function(err, stdout) {
      if (stdout === '') {
        anError('Nothing in clipboard');
      }
      if (err) {
        anError('Problem getting contents of clipboard');
      }
      gist['file_ext[gistfile1]'] = path.extname(opt.c || opt.clip);
      gist['file_name[gistfile1]'] = opt.c || opt.clip;
      gist['file_contents[gistfile1]'] = stdout;
      if (opt.p || opt.private) {
        gist['action_button'] = 'private';
      }
      if (opt.l || opt.login) {
        getCredentials();
        return emitter.on('credentials', function(user, token) {
          gist['login'] = user;
          gist['token'] = token;
          return post(gist);
        });
      } else {
        return post(gist);
      }
    });
  };
  anError = function(text) {
    console.error(text);
    return process.exit(1);
  };
  usage = function() {
    return console.log('\n            Usage: ngist [options] [-f file.ext] [files...]\n            \n            -f, --file         use file(s) for gist\n            -c, --clip         use clipboard for gist\n            -p, --private      make private gist\n            -l, --login        use github.com credentials\n            -u, --username     github.com username\n            -t, --token        github.com API token\n            -o, --out          copy new gist url to clipboard\n            -h, --help         display this help message\n            \n            \n            Examples\n            \n            Single File\n              ngist -f file.js\n            \n            Multiple Files\n              ngist -f file.js file2.js file3.js\n            \n            Use clipboard\n              ngist -c file.js\n            \n            Login and set user and token\n              ngist -f file.js -l -u user -t fj920df\n              \n            Login after user and token are set\n              ngist -f file.js -l\n            \n            Private gist\n              ngist -p -f file.js\n              ');
  };
  run();
}).call(this);
