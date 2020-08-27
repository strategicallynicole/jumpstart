const tempaw = require( 'tempaw-functions' );

tempaw.init( `${process.cwd().replace( /\\/g, '/' )}/config.js` );


const
	gulp        = require( 'gulp' ),
	browserSync = require( 'browser-sync' ),
	express     = require('express'),
	sass        = require( 'gulp-sass' ),
	path        = require( 'path' );

function expressServer () {
	const
		app = express(),
		sassMiddleware = require( 'node-sass-middleware' );

	// sets template engine
	app.set( 'view engine', 'pug' );

	// sets directory name
	app.set( 'views', './dev/' );

	app.get( '/', function ( req, res ) {
		console.log( '[request] root: index.pug' );
		res.render( `pages/index.pug` );
	});

	app.get( /.+\.pug/, function ( req, res ) {
		console.log( `[request] pug: ${req.url}` );
		res.render( `pages${req.url}` );
	});

	app.get( /.+\.html/, function ( req, res ) {
		let tmp = req.url.replace( /html$/, 'pug' );
		console.log( '[request] html:', tmp );
		res.render( `pages${tmp}` );
	});

	app.use( sassMiddleware({
		src: path.resolve( __dirname, 'dev' ),
		dest: path.resolve( __dirname, 'dev' ),
		debug: true,
		outputStyle: 'expanded',
		indentType: 'tab',
		indentWidth: 1,
		linefeed: 'cr'
	}));

	// static files
	app.use( express.static( 'dev' ) );

	// listens to server at PORT
	app.listen( 3000, function () {
		console.log( `[Express] Server listening on port 3000` );

		browserSync({
			open: false,
			notify: true,
			port: 8000,
			proxy: 'localhost:3000',
			ui: false,
			ghostMode: {
				clicks: false,
				forms: false,
				scroll: false
			}
		});
	});

	gulp.watch( [ 'dev/**/*.pug', 'dev/**/*.js', 'dev/**/*.md' ] ).on( 'change', function() {
		browserSync.reload();
	});

	gulp.watch( [ 'dev/**/*.scss' ] ).on( 'change', function() {
		browserSync.reload( '*.css' );
	});
}

exports[ 'Express' ] = expressServer;
