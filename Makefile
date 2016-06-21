download:
	wget -N http://cdnjs.cloudflare.com/ajax/libs/mathjs/3.2.1/math.min.js -P public/lib/
	wget -N https://raw.githubusercontent.com/socketio/socket.io-client/master/socket.io.js -P public/lib/
	wget -N https://raw.githubusercontent.com/maurizzzio/function-plot/master/dist/function-plot.js -P public/lib/
	wget -N https://github.com/d3/d3/releases/download/v3.5.17/d3.zip -P public/lib/
	unzip public/lib/d3.zip -d public/lib/d3
	mv public/lib/d3/d3.min.js public/lib/
	rm -f public/lib/d3/*
	rmdir public/lib/d3
	rm public/lib/d3.zip
