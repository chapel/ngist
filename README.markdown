ngist
=====

ngist is a node.js module and CLI tool for easy posting of [gists](http://gist.github.com).


Installation
------------

With [npm](http://github.com/isaacs/npm):

	npm install ngist
	
Clone this project:

	git clone http://github.com/chapel/ngist.git


CLI
---

	Usage: ngist [file.js file2.js ...] [options]

	[Options]
	-h, --help         Display this help page
	-c, --clip         Use clipboard content
	                     ex: ngist [file.js] -c file.js
	-d, --desc         Set description of gist
	                     ex: ngist file.js -d 'Description'
	-u, --user         Github username
	-t, --token        Github API token
	                     ex: ngist file.js -u username -t token
	-p, --private      Make gist private
	-o, --out          Copy gist url to clipboard

How to set user/token with git config
-------------------------------------

Once you get your Github API token from your [Github Account](https://github.com/account#admin_bucket)
If you set your Github username and API token using these steps, ngist will
automatically gather them and authenticate for you.

Run these two commands:

	git config --add github.user [github_username]
	git config --add github.token [github_api_token]

To verify that they have been set, use:

	git config --get github.user
	git config --get github.token
	

Module
------

The ngist module is simple and easy to use.

**Example**

ngist_text.js

	var ngist = require('ngist');
	
	var files = [{name: 'file1.js', content: "function(){ console.log('x'); };"}, 
				{name: 'file2.js', content: "function(){ test.x; };"}];
	var options = {
		user: chapel, // Your username!
		token: asa09fjew0f, // [Github Account](https://github.com/account#admin_bucket)
		description: 'This is an example gist', // Set for whole gist and is optional.
		private: true; // Set to true if you want the gist to be private, otherwise omit.
	};
	
	ngist.send(files, options, function(err, url) {
		console.log(url); // Example: https://gist.github.com/830022
	});

ngist_files.js

	var ngist = require('ngist');
	
	var files = ['file1.js', 'file2.js'];
	var options = {
		user: chapel, 
		token: asa09fjew0f, 
		description: 'This is an example gist', 
		private: true; 
	};
	
	ngist.files(files, function(err, processed_files) {
		ngist.send(processed_files, options, function(err, url) {
			console.log(url); 
		});
	});
	
ngist_files.coffee
	
	ngist = require 'ngist'
	
	files = ['file1.js', 'file2.js']
	options = 
		user: chapel
		token: pajsdfjoafe
		description: 'This is an example gist'
		private: true;
		
	ngist.files files, (err, processed_files) ->
		ngist.send processed_files, options, (err, url) ->
			console.log url
			

Functions
---------

**ngist.files**

Takes an array of file names, fetches the files, while sending an error if a file is not found. If all files are found, then it returns an array of objects that have the files extension, name, and contents ready to be sent.

**ngist.send**

Takes an array of objects, as well as an object that has optional parameters like user/token, description and private. If there are no errors, it will return a gist url.
			

Inspired By
-----------

The original CLI tool was inspired by [defunkt's gist](https://github.com/defunkt/gist) as well as those on [#node.js](irc://freenode.net) that gave advice and criticism. It is always welcome.