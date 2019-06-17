# This automatically generates various compound files for beingmeta
# web applications

# We define this because some versions of make (like on OSX) seem to
# have a built-in version of echo which doesn't handle the -n argument
ECHO=/bin/echo
CLEAN=/bin/rm -f
PATH:=/usr/local/bin:${PATH}
FDJT_FILES=fdjt/header.js \
	fdjt/promise.js fdjt/async.js fdjt/fetch.js \
	fdjt/charnames.js fdjt/string.js fdjt/time.js \
	fdjt/template.js fdjt/hash.js \
	fdjt/log.js fdjt/init.js fdjt/state.js \
	fdjt/dom.js fdjt/adjustfont.js \
	fdjt/json.js fdjt/refdb.js fdjt/ajax.js fdjt/wsn.js \
	fdjt/textindex.js \
	fdjt/ui.js fdjt/showpage.js fdjt/dialog.js fdjt/completions.js \
	fdjt/taphold.js fdjt/selecting.js \
	fdjt/globals.js
FDJT_EXTRA=fdjt/syze.js fdjt/scrollever.js
BUILDUUID:=`uuidgen`
BUILDTIME:=`date`
BUILDHOST:=`hostname`
BRANCH=master
UGLIFY:=uglifyjs2
UGLIFY_FLAGS:=-b
UGLIFY_OFLAGS:=-c -b
CLEANCSS:=`which cleancss`
POSTCSS:=`which postcss`
AUTOPREFIXER:=`which autoprefixer`
CLEANGRAPHICS=rm -f *.svgz *.png *.navicon *.sqlogo *.hudbutton *.docicon \
		*.glossbutton *.textbg *.skimbutton *.typeicon *.sqicon \
		*.rct *.ico
SVN=svn --non-interactive --trust-server-cert
POSTCSSOPTS=-u postcss-import -u postcss-url -u postcss-cssnext -u cssnano

FDJT_CSS=fdjt/fdjt.css fdjt/normalize.css
KNODULES_FILES=knodules/knodules.js knodules/tags.js \
	knodules/html.js
KNODULES_HINTS=knodules/knodules.hint knodules/tags.hint \
	knodules/html.hint
KNODULES_CSS=knodules/knodules.css
PAGEDOWN_FILES=js/pagedown.js

METAREADER_FILES=\
	js/root.js js/config.js js/mycopyid.js \
	js/core.js js/nav.js \
	js/domscan.js js/glossdata.js \
	js/cover.js js/body.js js/tagindex.js \
	js/syncstate.js js/mycopyid.js \
	js/user.js js/getglosses.js \
	js/startup.js \
	js/slices.js js/clouds.js js/tocslice.js \
	js/hud.js js/preview.js js/resize.js \
	js/social.js js/search.js js/glosses.js \
	js/interaction.js js/pagebar.js js/zoom.js \
	js/layout.js js/debug.js
METAREADER_HINTS=\
	js/core.hint js/config.hint js/syncstate.hint \
	js/nav.hint js/mycopyid.hint \
	js/domscan.hint js/glossdata.hint \
	js/user.hint js/getglosses.hint \
	js/cover.hint js/body.hint js/tagindex.hint \
	js/startup.hint \
	js/preview.hint js/hud.hint js/tocslice.hint \
	js/resize.hint \
	js/slices.hint js/clouds.hint js/tocslice.hint \
	js/social.hint js/search.hint js/glosses.hint \
	js/interaction.hint js/pagebar.hint js/zoom.hint \
	js/layout.hint
METAREADER_DERIVED_FILES=\
	html/searchbox.js html/addgloss.js \
	html/hud.js html/heart.js html/attach.js  \
	html/help.js html/hudhelp.js html/menu.js \
	html/console.js html/messages.js     \
	html/cover.js html/settings.js \
	html/layoutwait.js

METAREADER_HTML_FILES=\
	html/searchbox.html html/addgloss.html \
	html/hud.html html/heart.html \
	html/attach.html html/menu.html \
	html/help.html html/hudhelp.html \
	html/console.html html/messages.html \
	html/cover.html html/settings.html \
	html/layoutwait.html

# fonts/open_sans.css 
METAREADER_CSS=\
	css/app.css css/framing.css css/menu.css \
	fonts/open_dyslexic.css css/fonts.css \
	css/cover.css css/settings.css css/hud.css \
	css/foot.css css/body.css css/help.css \
	css/slices.css css/tocslice.css css/clouds.css \
	css/skimmer.css css/card.css css/search.css \
	css/addgloss.css css/heart.css \
	css/preview.css css/colors.css \
	css/debug.css

# js/fontcheck.js
METAREADER_JS_BUNDLE=fdjt/idbshim.js ${FDJT_FILES} fdjt/codex.js \
	${KNODULES_FILES} \
	${PAGEDOWN_FILES} ${METAREADER_FILES} \
	${METAREADER_DERIVED_FILES}
# removed sbooks/reset.css 
METAREADER_CSS_BUNDLE=${FDJT_CSS} fdjt/codexlayout.css \
	${KNODULES_CSS} ${METAREADER_CSS}

ALLFILES=$(FDJT_FILES) $(KNODULES_FILES) $(METAREADER_FILES)

SBOOKSTYLES=sbooks/sbookstyles.css

%.gz: %
	@gzip $< -c > $@

%.gpg: %
	gpg --output $@ -r ops@beingmeta.com --encrypt $<

%.cfg: %.cfg.gpg
	gpg --output $@ --decrypt $<
%.profile: %.profile.gpg
	gpg --output $@ --decrypt $<
%.sh.cfg: %.sh.gpg
	gpg --output $@ --decrypt $<

fdjt/%.hint: fdjt/%.js
	@echo Checking $@
	@JSHINT=`which jshint`; \
	if test "x$${JSHINT}" = "x"; then touch $@; \
	else $${JSHINT} --config fdjt/.jshintrc $< | tee $@; \
	fi
knodules/%.hint: knodules/%.js
	@echo Checking $@
	@JSHINT=`which jshint`; \
	if test "x$${JSHINT}" = "x"; then touch $@; \
	else $${JSHINT} --config knodules/.jshintrc $< | tee $@; \
	fi
js/%.hint: js/%.js
	@echo Checking $@
	@JSHINT=`which jshint`; \
	if test "x$${JSHINT}" = "x"; then touch $@; \
	else $${JSHINT} --config js/.jshintrc $< | tee $@; \
	fi

%: fdjt/%
	cp $< $@

html/%.js: html/%.html makefile
	@./text2js metaReader.HTML.`basename $@ .js` $< $@

%.gz: %
	@gzip $< -c > $@
fdjt/%.gz: fdjt/%
	@gzip $< -c > $@

.SUFFIXES: .js .css .gz

default: root alltags allhints index.html

root: ${ROOT_FDJT} ${ROOT_METAREADER}

#${ROOT_METAREADER} ${DIST_METAREADER}: fdjt metareader knodules webfontloader
#${ROOT_FDJT} ${DIST_FDJT}: fdjt
dist: ${DIST_FDJT} ${DIST_METAREADER}

allhints: fdjt/fdjt.hints js/metareader.hints knodules/knodules.hints

cleanhints:
	rm -f fdjt/*.hint fdjt/fdjt.hints
	rm -f js/*.hint js/metareader.hints 
	rm -f knodules/*.hint knodules/knodules.hints

hints:
	make cleanhints
	make allhints

.PHONY: ssc dist allhints hints cleanhints

fdjt/fdjt.hints: $(FDJT_HINTS)
	cd fdjt; make fdjt.hints
js/metareader.hints: $(METAREADER_HINTS) js/.jshintrc
	@cat $^ > $@
knodules/knodules.hints: $(KNODULES_HINTS) knodules/.jshintrc
	@cat $^ > $@

css/debug.css:
	echo "/* No debugging CSS rules */" > css/debug.css
js/debug.js:
	echo "/* No debugging Javascript */" > js/debug.js

tidy:
	rm -f *~

clean: tidy
	cd fdjt; make clean
	make cleanhints
	rm -f ${METAREADER_DERIVED_FILES}
	rm -f TAGS
	rm -f metareader*js metareader*css fdjt*js fdjt*css *.map
	rm -f metareader*js.gz metareader*css.gz fdjt*js.gz fdjt*css.gz
	rm -f js/buildstamp.js fdjt/buildstamp.js
	rm -f knodules/buildstamp.js

.PHONY: tidy clean undist cleandist freshdist redist

fdjt/fdjt.js: $(FDJT_FILES) $(FDJT_EXTRA) fdjt/fdjt.hints
	cd fdjt; make all
fdjt/buildstamp.js: $(FDJT_FILES) $(FDJT_EXTRA) $(FDJT_CSS)
	cd fdjt; make all
fdjt/codexhash.js: fdjt/codex.js
	@echo \
          "fdjt.Codex.sourcehash='`etc/sha1 fdjt/codexlayout.js`';" \
		> fdjt/codexhash.js 
	@echo >> fdjt/codexhash.js
	@echo >> fdjt/codexhash.js
	cd fdjt; make all

fdjt.js: fdjt/fdjt.js makefile fdjt/makefile fdjt/fdjt.hints
	cp fdjt/fdjt.js fdjt.js

fdjt.min.js: ${FDJT_FILES} $(FDJT_EXTRA) fdjt/buildstamp.js makefile fdjt/fdjt.hints
	@echo Building ./fdjt.min.js
	$(UGLIFY) $(UGLIFY_FLAGS) \
	  --source-map fdjt.min.js.map \
	    ${FDJT_FILES} $(FDJT_EXTRA) fdjt/buildstamp.js \
	  > $@

js/buildstamp.js: $(METAREADER_JS_BUNDLE) $(METAREADER_CSS_BUNDLE) \
			$(METAREADER_HTML)
	@$(ECHO) "// sBooks metareader build information" > $@
	@echo "metareader.version='"`git describe`"';" >> \
		buildstamp.js
	@$(ECHO) "metareader.buildid='${BUILDUUID}';" >> $@
	@$(ECHO) "metareader.buildtime='${BUILDTIME}';" >> $@
	@$(ECHO) "metareader.buildhost='${BUILDHOST}';" >> $@
	@$(ECHO) >> $@
	@echo "Created $@"
knodules/buildstamp.js: $(KNODULES_FILES) $(KNODULES_CSS)
	@cd knodules; echo "Knodule.version='"`git describe`"';" \
		> buildstamp.js
	@echo "Created knodules/buildstamp.js"


metareader_bundle.css: makefile $(METAREADER_CSS_BUNDLE)
	echo "/* metareader CSS bundle */" > metareader_bundle.css
	for cssfile in $(METAREADER_CSS_BUNDLE); \
	  do echo "@import '$${cssfile}';" >> metareader_bundle.css; \
	done
metareader.post.css: metareader_bundle.css makefile postcss.config.json
	@echo Building ./metareader.post.css
	$(POSTCSS) ${POSTCSSOPTS} -m \
		    -o metareader.post.css \
	            < metareader_bundle.css

metareader.raw.css: $(METAREADER_CSS_BUNDLE) makefile
	@echo Building ./metareader.raw.css
	@cat $(METAREADER_CSS_BUNDLE) > $@
metareader.raw.js: $(METAREADER_JS_BUNDLE) makefile \
	fdjt/fdjt.hints js/metareader.hints knodules/knodules.hints \
	fdjt/buildstamp.js fdjt/codexhash.js \
	knodules/buildstamp.js js/buildstamp.js \
	js/tieoff.js js/autoload.js
	@echo Building ./metareader.raw.js
	@cat js/amalgam.js \
		$(METAREADER_JS_BUNDLE) \
		fdjt/buildstamp.js fdjt/codexhash.js \
		knodules/buildstamp.js js/buildstamp.js \
		js/tieoff.js \
	     js/autoload.js > $@
	@echo "fdjt.Codex.sourcehash='`etc/sha1 fdjt/codex.js`';" \
		>> $@

metareader.raw.js.gz: metareader.raw.js.gz
	rm -f metareader.raw.js.gz
	ln -sf metareader.raw.js.gz metareader.js

js/tieoff.js:
	@touch $@

metareader.js: fdjt/fdjt.hints js/metareader.hints knodules/knodules.hints \
	$(METAREADER_JS_BUNDLE) js/autoload.js \
	fdjt/buildstamp.js fdjt/codexhash.js \
	knodules/buildstamp.js js/buildstamp.js \
	tieoff.js etc/sha1
	@echo Building metareader.js
	@cat js/amalgam.js $(METAREADER_JS_BUNDLE) \
		fdjt/buildstamp.js fdjt/codexhash.js \
		knodules/buildstamp.js js/buildstamp.js \
		tieoff.js js/autoload.js > $@
	@echo "fdjt.Codex.sourcehash='`etc/sha1 fdjt/codex.js`';" \
		>> $@
metareader.css: $(METAREADER_CSS_BUNDLE)
	@echo Rebuilding metareader.css
	@cat $(METAREADER_CSS_BUNDLE) > $@

metareader.min.js: fdjt/fdjt.hints js/metareader.hints knodules/knodules.hints \
		js/amalgam.js $(METAREADER_JS_BUNDLE) \
		fdjt/buildstamp.js fdjt/codexhash.js \
	        knodules/buildstamp.js js/buildstamp.js \
		js/tieoff.js js/autoload.js
	@echo Building metareader.min.js
	@$(UGLIFY) $(UGLIFY_OFLAGS) \
	  --source-map metareader.min.js.map \
	  --source-map-root /static \
	    js/amalgam.js $(METAREADER_JS_BUNDLE) \
	    fdjt/buildstamp.js fdjt/codexhash.js \
	    knodules/buildstamp.js js/buildstamp.js \
	    js/tieoff.js js/autoload.js > $@
metareader.min.js.map: metareader.min.js

# Compiled

metareader.compiled.js:  js/metareader.hints knodules/knodules.hints makefile \
	$(METAREADER_JS_BUNDLE) knodules/buildstamp.js js/buildstamp.js \
	tieoff.js etc/sha1
	java -jar closure/compiler.jar \
		--language_in ECMASCRIPT5 \
		--create_source_map metareader.compiled.map \
	        --compilation_level SIMPLE_OPTIMIZATIONS \
		js/amalgam.js     \
		$(METAREADER_JS_BUNDLE)   \
	        fdjt/buildstamp.js      \
	        fdjt/codexhash.js \
	        knodules/buildstamp.js  \
		js/buildstamp.js  \
                js/tieoff.js      \
                js/autoload.js    \
		--js_output_file metareader.compiled.js

compiled: metareader.compiled.js metareader.compiled.js.gz

# Generating the HTML

index.html: etc/index_head.html etc/index_foot.html
	@cat etc/index_head.html > index.html
	@echo "<p>Build host: " `hostname` "</p>" >> index.html
	@echo "<p>Build date: " `date` "</p>" >> index.html
	@cd fdjt; echo "<p>FDJT version: " `git describe` "</p>" \
		>> ../index.html
	@echo "<p>metareader version: " `git describe` "</p>" \
		>> ../index.html
	@cat etc/index_foot.html >> index.html

# Generating javascript strings from HTML

TAGS: ${FDJT_FILES} fdjt/codex.js ${KNODULES_FILES} \
	${METAREADER_FILES} ${METAREADER_CSS_BUNDLE} ${METAREADER_HTML_FILES}
	@etags -o $@ $^

jsmin/jsmin: jsmin/jsmin.c
	${CC} -o jsmin/jsmin jsmin/jsmin.c

# Fileinfo gets version-related information about a file to pass in
# with -D
etc/sha1: etc/sha1.c
	$(CC) -o etc/sha1 etc/sha1.c

metabuild buildbuild:
	npm install uglify-js -g --save-dev
	npm install uglify-js2 -g --save-dev
	npm install rucksack -g --save-dev
	npm install rucksack-css -g --save-dev
	npm install clean-css -g --save-dev
	npm install jshint -g --save-dev
	npm install autoprefixer -g --save-dev
	npm install postcss-cli -g --save-dev
	npm install postcss-cssnext postcss-import postcss-url -g --save-dev
	npm install postcss-reporter postcss-browser-reporter -g --save-dev
	npm install cssnano -g --save-dev
	npm install stylelint -g --save-dev

.PHONY: fresh compiled alltags checkout diff status pull \
	update update-code clean-graphics update-graphics \
	push convert sync-graphics publish release \
	publish-bundle fdiff kdiff mdiff \
	metabuild build build


