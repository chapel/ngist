fs             = require 'fs'
path           = require 'path'
https          = require 'https'
querystring    = require 'querystring'


exports.send = (files, options, callback) ->
  gist = {}
  if typeof options is 'function'
    callback = options
    options = null
  return callback new Error "#{files.length} files is more than the maximum of 10 files" if files.length > 10
  files.forEach (file, i) ->
    gist["file_ext[gistfile#{i+1}]"] = path.extname file.name
    gist["file_name[gistfile#{i+1}]"] = file.name
    gist["file_contents[gistfile#{i+1}]"] = file.contents
  unless options is null
    if (options.user and not options.token) or (options.token and not options.user)
      return callback new Error 'To login both options.user and options.token must be given'
    gist['login'] = options.user if options.user
    gist['token'] = options.token if options.token
    gist['description'] = options.description if options.description
    gist['action_button'] = 'private' if options.private is true
  return post gist, callback

exports.files = (files, callback) ->
  tmp = []
  serial files, (file, i, next) ->
    path.exists file, (exists) ->
      return callback new Error "File not found: #{file}" unless exists
      fs.readFile file, 'utf8', (err, data) ->
        tmp.push
          'name': path.basename file
          'contents': data
        next()
  , ->
    callback null, tmp
                
post = (gist, callback) ->
  gistData = querystring.stringify gist
  options = 
    host: 'gist.github.com'
    port: 443
    path: '/gists'
    method: 'POST'
    headers:
      'Content-Type': 'application/x-www-form-urlencoded'
      'Content-Length': gistData.length

  req = https.request options, (res) ->
    if res.statusCode == 401
      return callback new Error 'Username or token not authorized on Github.com'

    res.on 'end', ->
      callback null, res.headers.location

  req.end gistData
  
serial = (array, iterator, next) ->
  cycle = (i) ->
    if i < array.length
      iterator array[i], i, ->
        cycle i+1
    else
      next()
  cycle 0