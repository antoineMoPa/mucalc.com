download:
# math.js
	wget -N http://cdnjs.cloudflare.com/ajax/libs/mathjs/3.2.1/math.min.js -P public/lib/
# socket.io
	wget -N https://raw.githubusercontent.com/socketio/socket.io-client/master/socket.io.js -P public/lib/
# function-plot.js
	wget -N https://raw.githubusercontent.com/maurizzzio/function-plot/master/dist/function-plot.js -P public/lib/
# d3.js
	wget -N https://github.com/d3/d3/releases/download/v3.5.17/d3.zip -P public/lib/
	unzip public/lib/d3.zip -d public/lib/d3
	mv -f public/lib/d3/d3.min.js public/lib/
	rm -f public/lib/d3/*
	rmdir public/lib/d3
	rm public/lib/d3.zip
# diff.js
# https://github.com/kpdecker/jsdiff
	wget -N https://cdnjs.cloudflare.com/ajax/libs/jsdiff/2.2.3/diff.min.js -P public/lib
# moment.js
	wget -N http://momentjs.com/downloads/moment.min.js -P public/lib/
	wget -N https://raw.githubusercontent.com/fffunction/please/master/dist/please.min.js -P public/lib
fira:
	wget -N https://github.com/mozilla/Fira/archive/4.202.tar.gz -P public/fonts/fira-download
# Remove old folder
	rm -rf public/fonts/fira-extract/
	rm -rf public/fonts/fira/
	mkdir -p public/fonts/fira-extract/
	tar -zxvf public/fonts/fira-download/*.tar.gz -C public/fonts/fira-extract/ --exclude "source/*"
	mv public/fonts/fira-extract/* public/fonts/fira
	rm -rf public/fonts/fira-download public/fonts/fira-extract
	rm -rf public/fonts/fira/technical\ reports/

katex:
	mkdir -p public/lib/katex
	mkdir KaTeX;\
	cd KaTeX;\
	wget https://github.com/Khan/KaTeX/releases/download/v0.6.0/katex.tar.gz;\
	tar -zxvf katex.tar.gz;\
	rm katex.tar.gz
	mv KaTeX/katex/* public/lib/katex
	rm -rf KaTeX

screenshot:
	wget -N https://cloud.githubusercontent.com/assets/2675724/16932125/736ffbac-4d12-11e6-9af7-3904af973d41.png -O public/images/screenshot.png
