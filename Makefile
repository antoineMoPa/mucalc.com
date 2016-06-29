download:
	wget -N http://cdnjs.cloudflare.com/ajax/libs/mathjs/3.2.1/math.min.js -P public/lib/
	wget -N https://raw.githubusercontent.com/socketio/socket.io-client/master/socket.io.js -P public/lib/
	wget -N https://raw.githubusercontent.com/maurizzzio/function-plot/master/dist/function-plot.js -P public/lib/
	wget -N https://github.com/d3/d3/releases/download/v3.5.17/d3.zip -P public/lib/
	unzip public/lib/d3.zip -d public/lib/d3
	mv -f public/lib/d3/d3.min.js public/lib/
	rm -f public/lib/d3/*
	rmdir public/lib/d3
	rm public/lib/d3.zip

	rm -rf public/fonts/fira

fira:
	wget -N https://github.com/mozilla/Fira/archive/4.202.tar.gz -P public/fonts/fira-download
	mkdir -p public/fonts/fira-extract/
	tar -zxvf public/fonts/fira-download/*.tar.gz -C public/fonts/fira-extract/ --exclude "source/*"
	mv public/fonts/fira-extract/* public/fonts/fira
	rm -rf public/fonts/fira-download public/fonts/fira-extract
