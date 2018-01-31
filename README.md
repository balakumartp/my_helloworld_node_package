Creating Node Package

This is a simple exmaple of creating node pakcage.

To create a node package
Create a folder say 'hello-world-node-package'
Under this filder create package.json - you can create package.json manually or run 'npm init' to auto generate the file.
My package.json looks something like this
{
  "name": "my_hello_world_node_package",
  "version": "1.0.1",
  "description": "Creating Node Package. This is a simple exmaple of creating node pakcage.",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "KK",
  "license": "ISC",
  "repository": {
    "type": "git",
    "url": "https://github.com/balakumartp/my_hello_world_node_package.git"
  },
  "bugs": {
    "url": "https://github.com/balakumartp/my_hello_world_node_package/issues"
  },
  "homepage": "https://github.com/balakumartp/my_hello_world_node_package#readme"
}
In the same folder create index.js and add all your package logic in this file.
For example for 'hello-world-node-package' package I have following JavaScript
function helloWorld() {
  console.log('Hello World!');
}
function doSomethingAwesome() {
  console.log('Doing something awesome...');  
}
function doSomethingElse() {
  console.log('Now something else...'); 
}
module.exports = {
  helloWorld: helloWorld,
  doSomethingAwesome: doSomethingAwesome,
  doSomethingElse: doSomethingElse
}
Now when you are done with the package implimentation its a time to publish the package...
To publish the package run
npm adduser
It will prompt to ask your your name, password and your email id, provide the information and hit enter...
Verify your email address from npm site
Once the email id is confirmed, you can now publish the package using using ...
npm publish
If everything went as expected your package is added to the NPM
You can confirm that the package is added successfuly by visiting https://www.npmjs.com/~your-user-name
Thats all, we are done adding the package and its ready to used and download.
To verify if out package is working fine, you can install the package using

npm install --save
create a file 'index.js' and add

var test = require('hello-world-node-package');

test.helloWorld();
test.doSomethingAwesome();
test.doSomethingElse();
