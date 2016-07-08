Code Status: Some features are broken today since I am working on login. Not production ready yet.

# livecalc.xyz

livecalc.xyz is a multi-user math web app. The math is parsed & computed in the browser by [math.js](http://mathjs.org/).

[Live demo](https://www.livecalc.xyz/sheet/demo)

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

I was too hipster for browserify. So I decided to create a makefile to download frontend dependencies: 

    make download

If you want to use the fira firefox font:

    make fira

Run

    nodejs index.js

You can now visit [http://127.0.0.1:3000](http://127.0.0.1:3000).

# Contributing

You can submit issues.

You can also clone and code then send a pull request.
