os             = require 'os'
ngist          = require './ngist'
{exec}         = require 'child_process'
opt            = require('optimist').argv

run = ->
  # Set args to the appropriate values
  opt._ = null if opt._.length is 0
  opt.help = opt.help or opt.h
  opt.clip = opt.clip or opt.c
  opt.desc = opt.desc or opt.d
  opt.private = opt.private or opt.p
  opt.user = opt.user or opt.u
  opt.token = opt.token or opt.t
  opt.out = opt.out or opt.o
  
  # Return help message if -h or --help is set
  if opt.help
    return console.log '''
    
Usage: ngist [file.js file2.js ...] [options]

[Options]
-h, --help         Display this help page
-c, --clip         Use clipboard content
                         ex: ngist [file.js] -c file.js
-d, --desc         Set description of gist
                         ex: ngist file.js -d 'Description'
-u, --user         Github username
-t, --token        Github API token | https://github.com/account#admin_bucket
                         ex: ngist file.js -u username -t token
-p, --private      Make gist private
-o, --out          Copy gist url to clipboard

[How to set user/token with git config]
Once you get your Github API token from https://github.com/account#admin_bucket
If you set your Github username and API token using these steps, ngist will
automatically gather them and authenticate for you.

Run these two commands:
    git config --add github.user [github_username]
    git config --add github.token [github_api_token]
  
To verify that they have been set, use:
    git config --get github.[user/token]
'''
  
  if opt._ and opt.clip
    ngist.files opt._, (err, files) ->
      spit_error err if err
      get_clip (clip) ->
        files = files.concat clip
        next(files)
  else if opt._
    ngist.files opt._, (err, files) ->
      spit_error err if err
      next(files)
  else if opt.clip
    get_clip (clip) ->
      next clip
  else
    spit_error 'You must set file(s) and/or a clip from the clipboard (-c)'
    

next = (files) ->
  if opt.user and opt.token
    finish files, opt.user, opt.token
  else if (opt.user and not opt.token) or (opt.token and not opt.user)
    spit_error 'Both user (-u) and token (-t) must be set if you wish to login'
  else
    get_creds files

finish = (files, user, token) ->
  if opt.desc or opt.private or (user and token)
    options = {}
  else
    options = null
  options.private = true if opt.private
  options.description = opt.desc if opt.desc
  options.user = user if user
  options.token = token if token
  ngist.send files, options, (err, url) ->
    spit_error err if err
    set_clip url if opt.out
    console.log "Gist: #{url}"
  
get_creds = (files) ->
  keys = ['get', 'system', 'global', 'simple']
  serial keys, (key, i, _next) ->
    exec "git config --#{key} github.user", (err, stdout, stderr) ->
      unless err
        user = stdout.replace("\n", "")
        exec "git config --#{key} github.token", (err, stdout, stderr) ->
          unless err
            token = stdout.replace("\n", "")
            return finish files, user, token
      else
        _next()
  , ->
    console.log "For instructions on how to authenticate your gists: ngist -h"
    return finish files, null, null
        
set_clip = (url) ->
  switch os.type()
     when 'Darwin' then clipboard = "echo #{url} | pbcopy"
     when 'Linux' then clipboard = "echo #{url} | xclip"
 
  exec clipboard, (err, stdout) ->
    spit_error 'Problem sending url to clipboard' if err
            
get_clip = (callback) ->
  clip = []
  switch os.type()
     when 'Darwin' then clipboard = 'pbpaste'
     when 'Linux' then clipboard = 'xclip -out -selection clipboard'
 
  exec clipboard, (err, stdout) ->
    spit_error 'Nothing in clipboard' if stdout == ''
    spit_error 'Problem getting contents of clipboard' if err
    clip.push
      name: opt.clip
      contents: stdout
    callback clip

spit_error = (err) ->
  console.error "#{err}\nFor more help see: ngist -h"
  process.exit 1
  
serial = (array, iterator, next) ->
  cycle = (i) ->
    if i < array.length
      iterator array[i], i, ->
        cycle i+1
    else
      next()
  cycle 0

run()