fs             = require 'fs'
os             = require 'os'
path           = require 'path'
https          = require 'https'
querystring    = require 'querystring'
{exec}         = require 'child_process'
{EventEmitter} = require 'events'
opt            = require('optimist')
               .usage('Usage: ngist [options] [file.ext] [file...]')
               .argv
  
  
emitter = new EventEmitter

run = ->
  return usage() if opt.h or opt.help
  return getFiles() if (opt.f or opt.file) and not (opt.c or opt.clip)
  return getClip() if (opt.c or opt.clip) and not (opt.f or opt.file)
  
  anError 'You cannot use files and clipboard together.' if (opt.c or opt.clip) and (opt.f or opt.file)
  anError 'File or clipboard not specified. For help: ngist -h' unless (opt.f or opt.file) or (opt.c or opt.f)

    
getCredentials = ->
  if (opt.u or opt.user) and (opt.t or opt.token)
    setCredentials()
  else
    exec "git config --global github.user", (err, stdout, stderr) ->
      unless err
        user = stdout.replace("\n", "")
        exec "git config --global github.token", (err, stdout, stderr) ->
          unless err
            token = stdout.replace("\n", "")
            emitter.emit 'credentials', user, token
          else
            anError 'No token set with git.\nFor help: ngist -h'
      else
        anError 'No username or token set with git.\nFor help: ngist -h'
      
setCredentials = ->
  exec "git config --global github.user #{opt.u or opt.user}", (err, stdout, stderr) ->
    unless err
      exec "git config --global github.token #{opt.t or opt.token}", (err, stdout, stderr) ->
        emitter.emit 'credentials', (opt.u or opt.user), (opt.t or opt.token)
        
setClipboard = (url) ->
  switch os.type()
     when 'Darwin' then clipboard = "echo #{url} | pbcopy"
     when 'Linux' then clipboard = "echo #{url} | xclip"
 
  exec clipboard, (err, stdout) ->
    anError 'Problem sending url to clipboard' if err
    
post = (gist) ->
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
      anError "Github.com username or token are not valid.\n
      username: #{gist.login}
      token: #{gist.token}\n
      For help: gist -h"
      process.exit 1
    
    res.on 'end', ->
      setClipboard(res.headers.location) if opt.o or opt.out
      console.log 'Gist URL: ' + res.headers.location
    
  req.end gistData
  
getFiles = ->
  gist = {}
  files = []
  files.push opt.f or opt.file
  if opt._
    for i of opt._
      files.push opt._[i]
  
  files.forEach (file, i, arr) ->
    path.exists file, (exists) ->
      unless exists
        anError "File not found: #{file}"
      gist["file_ext[gistfile#{i+1}]"] = path.extname file
      gist["file_name[gistfile#{i+1}]"] = path.basename file
      gist["file_contents[gistfile#{i+1}]"] = fs.readFileSync file, 'utf8'
      gist['action_button'] = 'private' if (opt.p or opt.private)
      if i == arr.length - 1 then emitter.emit 'filesDone'
  
  emitter.on 'filesDone', ->
    if opt.l or opt.login
      getCredentials()
      emitter.on 'credentials', (user, token) ->
        gist['login'] = user
        gist['token'] = token
        post gist
    else
      post gist
        
getClip = ->
  gist = {}
  switch os.type()
     when 'Darwin' then clipboard = 'pbpaste'
     when 'Linux' then clipboard = 'xclip -out -selection clipboard'
 
  exec clipboard, (err, stdout) ->
    anError 'Nothing in clipboard' if stdout == ''
    anError 'Problem getting contents of clipboard' if err
    gist['file_ext[gistfile1]'] = path.extname opt.c or opt.clip
    gist['file_name[gistfile1]'] = opt.c or opt.clip
    gist['file_contents[gistfile1]'] = stdout
    gist['action_button'] = 'private' if (opt.p or opt.private)
    if opt.l or opt.login
      getCredentials()
      emitter.on 'credentials', (user, token) ->
        gist['login'] = user
        gist['token'] = token
        post gist
    else
      post gist
      
anError = (text) ->
  console.error text
  process.exit 1


usage = ->
  console.log '''
  
              Usage: ngist [options] [-f file.ext] [files...]
              
              -f, --file         use file(s) for gist
              -c, --clip         use clipboard for gist
              -p, --private      make private gist
              -l, --login        use github.com credentials
              -u, --username     github.com username
              -t, --token        github.com API token
              -o, --out          copy new gist url to clipboard
              -h, --help         display this help message
              
              
              Examples
              
              Single File
                ngist -f file.js
              
              Multiple Files
                ngist -f file.js file2.js file3.js
              
              Use clipboard
                ngist -c file.js
              
              Login and set user and token
                ngist -f file.js -l -u user -t fj920df
                
              Login after user and token are set
                ngist -f file.js -l
              
              Private gist
                ngist -p -f file.js
                
              '''

run()