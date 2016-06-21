# eecalc

eecalc is a multi-user math web app. The math syntax is parsed in the browser by [math.js](http://mathjs.org/).

[Live demo](http://a-mo-pa.com:3000/sheet/demo)

# Example

    sin(45 deg) => 0.7071067811865475

# Code

A node.js backend with socket.io is used for synchronisation of sheets between multiple users.
The client UI is mostly written in vanilla JS. No jQuery, no angular, no react, no whatever (for now).

# Install

Clone:

    git clone https://github.com/antoineMoPa/livecalc.git

Backend dependencies:

    npm install

I was too lazy and hipster to learn browserify. So I decided to create a makefile to download frontend dependencies: 

    make download

Run

    nodejs index.js

You can now visit [http://127.0.0.1:3000](http://127.0.0.1:3000).

# Contributing

You can submit issues.

You cans also clone and code then send a pull request.
