var fs, https, path, post, querystring, serial;
fs = require('fs');
path = require('path');
https = require('https');
querystring = require('querystring');
exports.send = function(files, options, callback) {
  var gist;
  gist = {};
  if (typeof options === 'function') {
    callback = options;
    options = null;
  }
  if (files.length > 10) {
    return callback(new Error("" + files.length + " files is more than the maximum of 10 files"));
  }
  files.forEach(function(file, i) {
    gist["file_ext[gistfile" + (i + 1) + "]"] = path.extname(file.name);
    gist["file_name[gistfile" + (i + 1) + "]"] = file.name;
    return gist["file_contents[gistfile" + (i + 1) + "]"] = file.contents;
  });
  if (options !== null) {
    if ((options.user && !options.token) || (options.token && !options.user)) {
      return callback(new Error('To login both options.user and options.token must be given'));
    }
    if (options.user) {
      gist['login'] = options.user;
    }
    if (options.token) {
      gist['token'] = options.token;
    }
    if (options.description) {
      gist['description'] = options.description;
    }
    if (options.private === true) {
      gist['action_button'] = 'private';
    }
  }
  return post(gist, callback);
};
exports.files = function(files, callback) {
  var tmp;
  tmp = [];
  return serial(files, function(file, i, next) {
    return path.exists(file, function(exists) {
      if (!exists) {
        return callback(new Error("File not found: " + file));
      }
      return fs.readFile(file, 'utf8', function(err, data) {
        tmp.push({
          'name': path.basename(file),
          'contents': data
        });
        return next();
      });
    });
  }, function() {
    return callback(null, tmp);
  });
};
post = function(gist, callback) {
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
      return callback(new Error('Username or token not authorized on Github.com'));
    }
    return res.on('end', function() {
      return callback(null, res.headers.location);
    });
  });
  return req.end(gistData);
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