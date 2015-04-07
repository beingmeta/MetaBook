/* -*- Mode: Javascript; Character-encoding: utf-8; -*- */

/* ###################### metabook/startup.js ###################### */

/* Copyright (C) 2009-2015 beingmeta, inc.

   This file specifies the startup of the metaBook web application,
   initializing both internal data structures and the DOM.

   This file is part of metaBook, a Javascript/DHTML web application for reading
   large structured documents (sBooks).

   For more information on sbooks, visit www.sbooks.net
   For more information on knodules, visit www.knodules.net
   For more information about beingmeta, visit www.beingmeta.com

   This library uses the FDJT (www.fdjt.org) toolkit.

   This program comes with absolutely NO WARRANTY, including implied
   warranties of merchantability or fitness for any particular
   purpose.

   Use and redistribution (especially embedding in other
   CC licensed content) is permitted under the terms of the
   Creative Commons "Attribution-NonCommercial" license:

   http://creativecommons.org/licenses/by-nc/3.0/ 

   Other uses may be allowed based on prior agreement with
   beingmeta, inc.  Inquiries can be addressed to:

   licensing@beingmeta.com

   Enjoy!

*/
/* jshint browser: true */
/* global metaBook: false, Markdown: false */

/* Initialize these here, even though they should always be
   initialized before hand.  This will cause various code checkers to
   not generate unbound variable warnings when called on individual
   files. */
//var fdjt=((typeof fdjt !== "undefined")?(fdjt):({}));
//var metaBook=((typeof metaBook !== "undefined")?(metaBook):({}));
//var Knodule=((typeof Knodule !== "undefined")?(Knodule):({}));

metaBook.Startup=
    (function(){
        "use strict";

        var fdjtString=fdjt.String;
        var fdjtDevice=fdjt.device;
        var fdjtState=fdjt.State;
        var fdjtAsync=fdjt.Async;
        var fdjtAjax=fdjt.Ajax;
        var fdjtTime=fdjt.Time;
        var fdjtLog=fdjt.Log;
        var fdjtDOM=fdjt.DOM;
        var fdjtUI=fdjt.UI;
        var $ID=fdjt.ID;
        var RefDB=fdjt.RefDB;
        var mbID=metaBook.ID;
        
        var CodexLayout=fdjt.CodexLayout;

        var https_root="https://s3.amazonaws.com/beingmeta/static/";

        // Imported functions
        var getLocal=fdjtState.getLocal;
        var getQuery=fdjtState.getQuery;
        var getCookie=fdjtState.getCookie;
        var getMeta=fdjtDOM.getMeta;
        var getLink=fdjtDOM.getLink;
        var addClass=fdjtDOM.addClass;
        var swapClass=fdjtDOM.swapClass;
        var dropClass=fdjtDOM.dropClass;

        var mB=metaBook;
        var Trace=metaBook.Trace;

        var readLocal=metaBook.readLocal;
        var saveLocal=metaBook.saveLocal;

        /* Initialization */
        
        function startupLog(){
            if (!(Trace.startup)) return;
            fdjtLog.apply(null,arguments);}

        function startupMessage(){
            if ((Trace.startup)&&
                (typeof Trace.startup === "number")&&
                (Trace.startup>1))
                fdjtLog.apply(null,arguments);}
        metaBook.startupMessage=startupMessage;

        function dropSplashPage(){
            var splash=$ID("METABOOKSPLASHPAGE");
            if ((splash)&&(splash.parentNode))
                splash.parentNode.removeChild(splash);}
        metaBook.dropSplashPage=dropSplashPage;

        function run_inits(){
            var inits=metaBook.inits;
            var i=0, lim=inits.length;
            while (i<lim) {inits[i++]();}}

        /* Save local */

        function syncStartup(){
            // This is the startup code which is run
            //  synchronously, before the time-sliced processing
            fdjtLog.console="METABOOKCONSOLELOG";
            fdjtLog.consoletoo=true;
            run_inits();
            if (!(metaBook._setup_start)) metaBook._setup_start=new Date();
            metaBook.appsource=getSourceRef();
            fdjtLog("This is metaBook %s, built %s on %s, launched %s, from %s",
                    mB.version,mB.buildtime,mB.buildhost,
                    mB._setup_start.toString(),
                    mB.root||metaBook.appsource||"somewhere");
            if ($ID("METABOOKBODY")) metaBook.body=$ID("METABOOKBODY");

            // Check for any trace settings passed as query arguments
            if (getQuery("cxtrace")) readTraceSettings();
            
            // Get various settings for the sBook from the HTML
            // (META tags, etc), including settings or guidance for
            // skimming, graphics, layout, glosses, etc.
            readBookSettings();
            fdjtLog("Book %s (%s) %s (%s%s)",
                    mB.docref||"@??",mB.bookbuild||"",
                    mB.refuri,mB.sourceid,
                    ((mB.sourcetime)?
                     (": "+mB.sourcetime.toString()):
                     ("")));
            
            // Initialize the databases
            metaBook.initDB();

            // Get config information
            metaBook.initConfig();

            // This sets various aspects of the environment
            readEnvSettings();

            // Figure out if we have a user and whether we can keep
            // user information
            if (getLocal("mB.user")) {
                metaBook.setPersist(true);
                metaBook.userSetup();}

            // Initialize the book state (location, targets, etc)
            metaBook.initState(); metaBook.syncState();

            mB.gotBookie(mB.readLocal("bookie("+mB.docuri+")"));

            // If we have no clue who the user is, ask right away (updateInfo())
            if (!((metaBook.user)||(window._sbook_loadinfo)||
                  (metaBook.userinfo)||(window._userinfo)||
                  (getLocal("mB.user")))) {
                if (Trace.startup)
                    fdjtLog("No local user info, requesting from sBooks server %s",
                            mB.server);
                // When metaBook.user is not defined, this just
                // requests identity information
                metaBook.updateInfo();}

            // Execute any FDJT initializations
            fdjt.Init();

            metaBook.updateSizeClasses();

            setupBook();
            setupDevice();
            setupApp();
            metaBook._ui_setup=fdjtTime();
            showMessage();
            if (metaBook._user_setup) metaBook.setupUI4User();
            setupContent();
            metaBook.setupGestures();

            // Reapply config settings to update the HUD UI
            metaBook.setConfig(metaBook.getConfig());

            if (Trace.startup>1)
                fdjtLog("Initializing markup converter");
            var markdown_converter=new Markdown.Converter();
            metaBook.markdown_converter=markdown_converter;
            metaBook.md2HTML=function(mdstring){
                return markdown_converter.makeHtml(mdstring);};
            function md2DOM(mdstring,inline){
                var div=fdjtDOM("div"), root=div;
                var frag=document.createDocumentFragment();
                div.innerHTML=markdown_converter.makeHtml(mdstring);
                var children=root.childNodes, nodes=[];
                if ((inline)&&(children.length===1)&&
                    (children[0].nodeType===1)&&
                    (children[0].tagName==="P")) {
                    root=children[0]; children=root.childNodes;}
                var i=0, lim=children.length; while (i<lim) {
                    nodes.push(children[i++]);}
                i=0; while (i<lim) frag.appendChild(nodes[i++]);
                return frag;}
            metaBook.md2DOM=md2DOM;

            metaBook.Timeline.sync_startup=new Date();
            if (metaBook.onsyncstartup) {
                var delayed=metaBook.onsyncstartup;
                delete metaBook.onsyncstartup;
                if (Array.isArray(delayed)) {
                    var i=0, lim=delayed.length;
                    while (i<lim) {delayed[i](); i++;}}
                else delayed();}
            if (Trace.startup)
                fdjtLog("Done with sync startup");}

        function getSourceRef(){
            var scripts=fdjtDOM.$("SCRIPT");
            var i=0, len=scripts.length;
            while (i<len) {
                var elt=scripts[i++];
                if ((elt.src)&&(typeof elt.src === "string")&&
                    (elt.src.search(/metabook.js(#|\?|$)/)>=0))
                    return elt.src;}
            return false;}

        function showMessage(){
            var message=fdjt.State.getCookie("SBOOKSPOPUP");
            if (message) fdjt.UI.alertFor(10,message);
            fdjt.State.clearCookie("SBOOKSPOPUP","/","sbooks.net");
            fdjt.State.clearCookie("SBOOKSMESSAGE","/","sbooks.net");}

        function readEnvSettings() {

            // Initialize domain and origin for browsers which care
            try {document.domain="sbooks.net";}
            catch (ex) {fdjtLog.warn("Error setting document.domain");}
            try {document.origin="sbooks.net";}
            catch (ex) {fdjtLog.warn("Error setting document.origin");}

            // First, define common schemas
            fdjtDOM.addAppSchema("SBOOK","http://sbooks.net/");
            fdjtDOM.addAppSchema("SBOOKS","http://sbooks.net/");
            fdjtDOM.addAppSchema("metaBook","http://metabook.sbooks.net/");
            fdjtDOM.addAppSchema("DC","http://purl.org/dc/elements/1.1/");
            fdjtDOM.addAppSchema("DCTERMS","http://purl.org/dc/terms/");
            fdjtDOM.addAppSchema("OLIB","http://openlibrary.org/");

            metaBook.devinfo=fdjtState.versionInfo();
            
            /* Where to get your images from, especially to keep
               references inside https */
            if ((metaBook.root==="http://static.beingmeta.com/")&&
                (window.location.protocol==='https:'))
                metaBook.root=https_root;
            // Whether to suppress login, etc
            if ((getLocal("mB.nologin"))||(getQuery("nologin")))
                metaBook.nologin=true;
            var sbooksrv=getMeta("SBOOKS.server")||getMeta("SBOOKSERVER");
            if (sbooksrv) metaBook.server=sbooksrv;
            else if (fdjtState.getCookie("SBOOKSERVER"))
                metaBook.server=fdjtState.getCookie("SBOOKSERVER");
            else metaBook.server=lookupServer(document.domain);
            if (!(metaBook.server)) metaBook.server=metaBook.default_server;
            updateServerInfo(metaBook.server);

            if (fdjtState.getLocal("mB.devmode")) {
                addClass(document.documentElement,"_DEVMODE");
                metaBook.devmode=true;}

            // Get the settings for scanning the document structure
            getScanSettings();}

        function setupApp(){

            var body=document.body;
            var started=fdjtTime();

            if (Trace.startup>2) fdjtLog("Starting app setup");

            // Create a custom stylesheet for the app
            var style=fdjtDOM("STYLE");
            fdjtDOM(document.head,style);
            metaBook.stylesheet=style.sheet;

            // This initializes the book tools
            //  (the HUD/Heads Up Display and the cover)
            metaBook.initHUD();
            metaBook.setupCover();
            setupBookInfo();
            setupZoom();
            setupMedia();

            metaBook.initSettings();

            if (metaBook.refuri) {
                var refuris=document.getElementsByName("REFURI");
                if (refuris) {
                    var j=0; var len=refuris.length;
                    while (j<len) {
                        if (refuris[j].value==='fillin')
                            refuris[j++].value=metaBook.refuri;
                        else j++;}}}

            metaBook.addConfig(
                "cacheglosses",
                function(name,value){
                    metaBook.setCacheGlosses(value);
                    fdjt.Async(function(){
                        metaBook.updateSettings(name,value);});});

            imageSetup();

            // Setup the reticle (if desired)
            if ((typeof (body.style["pointer-events"])!== "undefined")&&
                ((metaBook.demo)||(fdjtState.getLocal("mB.demo"))||
                 (fdjtState.getCookie("sbooksdemo"))||
                 (getQuery("demo")))) {
                fdjtUI.Reticle.setup();}

            if (Trace.startup)
                fdjtLog("App setup took %dms",fdjtTime()-started);

            fdjtLog("Body: %s",document.body.className);}
        
        function imageSetup(){
            var i, lim, started=fdjtTime();
            var uri=
                ((typeof metaBook.coverimage === "string")&&
                 (metaBook.coverimage))||
                ((typeof metaBook.bookimage === "string")&&
                 (metaBook.bookimage))||
                ((typeof metaBook.bookcover === "string")&&
                 (metaBook.bookcover))||
                ((typeof metaBook.coverpage === "string")&&
                 (metaBook.coverpage));
            if (uri) {
                var bookimages=fdjtDOM.$("img.metabookbookimage");
                i=0; lim=bookimages.length;
                while (i<lim) {
                    if (bookimages[i].src) i++;
                    else bookimages[i++].src=uri;}}
            var thumb_uri=
                ((typeof metaBook.thumbnail === "string")&&(metaBook.thumbnail));
            if (thumb_uri) {
                var thumbimages=fdjtDOM.$("img.metabookbookthumb");
                i=0; lim=thumbimages.length;
                while (i<lim) {
                    if (thumbimages[i].src) i++;
                    else thumbimages[i++].src=thumb_uri;}}
            var icon_uri=
                ((typeof metaBook.icon === "string")&&(metaBook.icon));
            if (icon_uri) {
                var iconimages=fdjtDOM.$("img.metabookbookicon");
                i=0; lim=iconimages.length;
                while (i<lim) {
                    if (iconimages[i].src) i++;
                    else iconimages[i++].src=icon_uri;}}
            if (Trace.startup>1)
                fdjtLog("Image setup took %dms",fdjtTime()-started);}
        
        function setupContent(){
            var started=fdjtTime();
            // Modifies the DOM in various ways
            metaBook.initBody();
            // Size the content
            metaBook.sizeContent();
            if (Trace.gestures)
                fdjtLog("Content setup in %dms",fdjtTime()-started);}

        metaBook.setSync=function setSync(val){
            if (!(val)) return false;
            var cur=metaBook.sync;
            if ((cur)&&(cur>val)) return cur;
            metaBook.sync=val;
            if (metaBook.persist)
                saveLocal("mB.sync("+metaBook.docuri+")",val);
            return val;};

        function readTraceSettings(){
            var tracing=getQuery("cxtrace",true);
            var i=0; var lim=tracing.length;
            while (i<lim) {
                var trace_spec=tracing[i++];
                var colon=trace_spec.indexOf(":");
                if (colon<0) {
                    if (typeof Trace[trace_spec] === 'number')
                        Trace[trace_spec]=1;
                    else Trace[trace_spec]=true;}
                else {
                    var trace_name=trace_spec.substr(0,colon);
                    var trace_val=trace_spec.substr(colon+1);
                    if (typeof Trace[trace_name] === 'number')
                        Trace[trace_name]=parseInt(trace_val,10);
                    else Trace[trace_name]=trace_val;}}}

        var glosshash_pat=/G[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
        
        function metaBookStartup(force){
            var metadata=false;
            if (metaBook._setup) return;
            if ((!force)&&(getQuery("nometabook"))) return;
            /* Cleanup, save initial hash location */
            if ((location.hash==="null")||(location.hash==="#null"))
                location.hash="";
            if ((location.hash)&&(location.hash!=="#")) {
                var hash=location.hash;
                if (hash[0]==='#') hash=hash.slice(1);
                if (glosshash_pat.exec(location.hash))
                    metaBook.glosshash=hash;
                else metaBook.inithash=location.hash;}
            metaBook._starting=fdjtTime();
            addClass(document.body,"mbSTARTUP");
            // This is all of the startup that we need to do synchronously
            syncStartup();

            metaBook.resizeUI().then(function(){dropSplashPage();});
            
            // The rest of the stuff we timeslice
            fdjtAsync.timeslice
            ([  // Scan the DOM for metadata.  This is surprisingly
                //  fast, so we don't currently try to timeslice it or
                //  cache it, though we could.
                function(){
                    applyTOCRules();
                    metadata=scanDOM();},
                function(){
                    var hasText=fdjtDOM.hasText;
                    var rules=fdjtDOM.getMeta("SBOOKS.index",true);
                    var content=$ID("CODEXCONTENT");
                    rules.push("p,li,ul,blockquote,div");
                    rules.push("h1,h2,h3,h4,h5,h6,h7,hgroup,.sbookindex");
                    var nodes=fdjtDOM.getChildren(content,rules.join(","));
                    var index=metaBook.textindex=new fdjt.TextIndex();
                    var i=0, lim=nodes.length; while (i<lim) {
                        var node=nodes[i++];
                        if (hasText(node)) index.indexText(node);}
                    index.finishIndex();},
                function(){
                    var toSet=RefDB.toSet;
                    var docdb=metaBook.docdb;
                    var index=metaBook.textindex;
                    var docinfo=metaBook.docinfo;
                    var allids=index.allids, idterms=index.idterms;
                    var allterms=index.allterms, termindex=index.termindex;
                    var wix=docdb.addIndex('strings',RefDB.StringMap);
                    var t=0, nterms=allterms.length; while (t<nterms) {
                        var term=allterms[t++];
                        wix[term]=toSet(termindex[term]);}
                    var n=0, nids=allids.length; while (n<nids) {
                        var id=allids[n++], doc=docinfo[id];
                        if (doc) doc.strings=toSet(idterms[id]);}},
                /*
                function(){
                    var six=docdb.addIndex('sectag',RefDB.StringMap);
                    var i=0, lim=allinfo.length; while (i<lim) {
                        var node=allinfo[i++], heads=node.heads;
                        if (node.sectag) six.add(node.sectag,node);
                        var h=0, nheads=heads.length;
                        while (h<nheads) {
                            if (heads[h].sectag)
                                six.add(node.sectag,node);}}},
                */
                // Now you're ready to lay out the book, which is
                //  timesliced and runs on its own.  We wait to do
                //  this until we've scanned the DOM because we may
                //  use results of DOM scanning in layout (for example,
                //  heading information).
                function(){
                    if (metaBook.bypage) metaBook.Paginate("initial");
                    else addClass(document.body,"_SCROLL");},
                // Build the display TOC, both the dynamic (top of
                // display) and the static (inside the hudheart)
                function(){
                    var tocmsg=$ID("METABOOKSTARTUPTOC");
                    var tocstart=fdjtTime();
                    if (tocmsg) {
                        tocmsg.innerHTML=fdjtString(
                            "Building table of contents based on %d heads",
                            metaBook.docinfo._headcount);
                        addClass(tocmsg,"running");}
                    metaBook.setupTOC(metadata[metaBook.content.id]);
                    startupLog("Built tables of contents based on %d heads in %fms",
                               metaBook.docinfo._headcount,
                               fdjtTime()-tocstart);
                    if (tocmsg) dropClass(tocmsg,"running");},
                // Load all source (user,layer,etc) information
                function(){
                    if (Trace.startup>1) fdjtLog("Loading sourcedb");
                    metaBook.sourcedb.load(true);},
                // Read knowledge bases (knodules) used by the book
                ((Knodule)&&(Knodule.HTML)&&
                 (Knodule.HTML.Setup)&&(metaBook.knodule)&&
                 (function(){
                     var knomsg=$ID("METABOOKSTARTUPKNO");
                     var knodetails=$ID("METABOOKSTARTUPKNODETAILS");
                     if (knodetails) {
                         knodetails.innerHTML=fdjtString(
                             "Processing knodule %s",metaBook.knodule.name);}
                     addClass(knomsg,"running");
                     if ((Trace.startup>1)||(Trace.indexing))
                         fdjtLog("Processing knodule %s",metaBook.knodule.name);
                     Knodule.HTML.Setup(metaBook.knodule);
                     dropClass(knomsg,"running");})),
                // Process locally stored (offline data) glosses
                function(){
                    if (metaBook.sync) {
                        if (metaBook.cacheglosses) 
                            return metaBook.initGlossesOffline();}
                    else if (window._sbook_loadinfo) {
                        metaBook.loadInfo(window._sbook_loadinfo);
                        window._sbook_loadinfo=false;}},
                // Process anything we got via JSONP ahead of processing
                //  _sbook_loadinfo
                ((window._sbook_newinfo)&&(function(){
                    metaBook.loadInfo(window._sbook_newinfo);
                    window._sbook_newinfo=false;})),
                function(){metaBook.setupIndex(metadata);},
                startupDone],
             {slice: 100, space: 25});}
        metaBook.Startup=metaBookStartup;
        
        function addTOCLevel(specs,level){
            var j=0, nspecs=specs.length; while (j<nspecs) {
                var nodes=fdjtDOM.$(specs[j++]);
                var i=0, lim=nodes.length; while (i<lim) {
                    nodes[i++].setAttribute("data-toclevel",level);}}}
        function applyTOCRules(){
            var h1=getMeta("SBOOKS.h1",true,true)
                .concat(getMeta("SBOOKS.head1",true,true))
                .concat(getMeta("sbook1head",true));
            if (h1.length) addTOCLevel(h1,"1");
            var h2=getMeta("SBOOKS.h2",true,true)
                .concat(getMeta("SBOOKS.head2",true,true))
                .concat(getMeta("sbook2head",true));
            if (h2.length) addTOCLevel(h2,"2");
            var h3=getMeta("SBOOKS.h3",true,true)
                .concat(getMeta("SBOOKS.head3",true,true))
                .concat(getMeta("sbook3head",true));
            if (h3.length) addTOCLevel(h3,"3");
            var h4=getMeta("SBOOKS.h4",true,true)
                .concat(getMeta("SBOOKS.head4",true,true))
                .concat(getMeta("sbook4head",true));
            if (h4.length) addTOCLevel(h4,"4");
            var h5=getMeta("SBOOKS.h5",true,true)
                .concat(getMeta("SBOOKS.head5",true,true))
                .concat(getMeta("sbook5head",true));
            if (h5.length) addTOCLevel(h5,"5");
            var h6=getMeta("SBOOKS.h6",true,true)
                .concat(getMeta("SBOOKS.head6",true,true))
                .concat(getMeta("sbook6head",true));
            if (h6.length) addTOCLevel(h6,"6");
            var h7=getMeta("SBOOKS.h7",true,true)
                .concat(getMeta("SBOOKS.head7",true,true))
                .concat(getMeta("sbook7head",true));
            if (h7.length) addTOCLevel(h7,"7");}

        function scanDOM(){
            if ((Trace.startup)||(Trace.domscan))
                fdjtLog("Starting DOM scan with %o",metaBook.content);
            var scanmsg=$ID("METABOOKSTARTUPSCAN");
            addClass(scanmsg,"running");
            var metadata=new metaBook.DOMScan(
                metaBook.content,metaBook.refuri+"#");
            metaBook.docinfo=metadata;
            metaBook.ends_at=metaBook.docinfo._maxloc;
            if ((Trace.startup)||(Trace.domscan))
                fdjtLog("Done with DOM scan yielding %o",
                        metadata);
            dropClass(scanmsg,"running");
            if ((metaBook.state)&&(metaBook.state.target)&&
                (!((metaBook.state.location)))) {
                var info=metaBook.docinfo[metaBook.state.target];
                if ((info)&&(info.starts_at)) {
                    metaBook.state.location=info.starts_at;
                    // Save current state, skip history, force save
                    metaBook.saveState(false,true,true);}}
            
            if (metaBook.scandone) {
                var donefn=metaBook.scandone;
                delete metaBook.scandone;
                donefn();}
            return metadata;}
        
        function startupDone(mode){
            if ((metaBook.glosshash)&&(metaBook.glossdb.ref(metaBook.glosshash))) {
                if (metaBook.showGloss(metaBook.glosshash)) {
                    metaBook.glosshash=false;
                    metaBook.Timeline.initLocation=fdjtTime();}
                else metaBook.initLocation();}
            else metaBook.initLocation();
            window.onpopstate=function onpopstate(evt){
                if (evt.state) metaBook.restoreState(evt.state,"popstate");};
            fdjtLog("metaBook startup done");
            metaBook.resizeUI(); // Just in case
            metaBook.displaySync();
            fdjtDOM.dropClass(document.body,"mbSTARTUP");
            fdjtDOM.addClass(document.body,"mbREADY");
            if ($ID("METABOOKSPLASHPAGE"))
                setTimeout(function(){
                    addClass("METABOOKSPLASHPAGE","startupdone");},
                           3000);
            var rmsg=$ID("METABOOKREADYMESSAGE");
            if (!($ID("METABOOKOPENTAB"))) {
                rmsg.innerHTML="Open";
                rmsg.id="METABOOKOPENTAB";}
            else rmsg.style.display='none';
            if (mode) {}
            else if (getQuery("startmode"))
                mode=getQuery("startmode");
            else {}
            if (mode) metaBook.setMode(mode);
            else mode=metaBook.mode;
            metaBook._setup=new Date();
            metaBook._starting=false;
            if (metaBook.onsetup) {
                var onsetup=metaBook.onsetup;
                metaBook.onsetup=false;
                setTimeout(onsetup,10);}
            var msg=false, uuid_end=false, msgid=false;
            if ((msg=getQuery("APPMESSAGE"))) {
                if ((msg.slice(0,2)==="#{")&&
                    ((uuid_end=msg.indexOf('}'))>0)) {
                    msgid="MSG_"+msg.slice(2,uuid_end);
                    if (getLocal(msgid)) {}
                    else {
                        saveLocal(msgid,"seen");
                        fdjtUI.alertFor(10,msg.slice(uuid_end+1));}}
                else fdjtUI.alertFor(10,msg);}
            if ((msg=getQuery("SBOOKSMESSAGE"))) {
                if ((msg.slice(0,2)==="#{")&&
                    ((uuid_end=msg.indexOf('}'))>0)) {
                    msgid="MSG_"+msg.slice(2,uuid_end);
                    if (getLocal(msgid)) {}
                    else {
                        saveLocal(msgid,"seen");
                        fdjtUI.alertFor(10,msg.slice(uuid_end+1));}}
                else fdjtUI.alertFor(10,msg);}
            if ((msg=getCookie("APPMESSAGE"))) {
                fdjtUI.alertFor(10,msg);
                fdjtState.clearCookie("APPMESSAGE","sbooks.net","/");}
            if ((msg=getCookie("SBOOKSMESSAGE"))) {
                fdjtUI.alertFor(10,msg);
                fdjtState.clearCookie("SBOOKSMESSAGE","sbooks.net","/");}
            if ((!(mode))&&(location.hash)&&(metaBook.state)&&
                (location.hash.slice(1)!==metaBook.state.target))
                metaBook.hideCover();
            else if ((!(mode))&&(metaBook.user)) {
                var opened=readLocal(
                    "mB.opened("+metaBook.docuri+")",true);
                if ((opened)&&((opened+((3600+1800)*1000))>fdjtTime()))
                    metaBook.hideCover();}
            if (fdjtDOM.vischange)
                fdjtDOM.addListener(document,fdjtDOM.vischange,
                                    metaBook.visibilityChange);
            fdjtDOM.addListener(window,"resize",metaBook.resizeHandler);}
        
        /* Application settings */
        
        var default_config=metaBook.default_config;

        function getRelLink(relname){
            return getLink(relname,false,true,false,true);}

        function readBookSettings(){
            // Basic stuff
            var refuri=_getsbookrefuri();
            var docuri=_getsbookdocuri();
            var locuri=window.location.href;
            var hashpos=locuri.indexOf('#');
            if (hashpos>0) metaBook.locuri=locuri.slice(0,hashpos);
            else metaBook.locuri=locuri;
            document.body.refuri=metaBook.refuri=refuri;
            metaBook.topuri=document.location.href;
            metaBook.docuri=docuri;
            
            var refuris=getLocal("mB.refuris",true)||[];
            var docuris=getLocal("mB.docuris",true)||[];

            metaBook.sourceid=
                getMeta("SBOOKS.sourceid")||getMeta("SBOOKS.fileid")||
                metaBook.docuri;
            metaBook.sourcetime=fdjtTime.parse(getMeta("SBOOKS.sourcetime"));
            var oldid=getLocal("mB.sourceid("+metaBook.docuri+")");
            if ((oldid)&&(oldid!==metaBook.sourceid)) {
                var layouts=getLocal("mB.layouts("+oldid+")");
                if ((layouts)&&(layouts.length)) {
                    var i=0, lim=layouts.length; while (i<lim) 
                        CodexLayout.dropLayout(layouts[i++]);}}
            else saveLocal("mB.sourceid("+metaBook.docuri+")",
                           metaBook.sourceid);

            var bookbuild=getMeta("SBOOKS.buildstamp");
            if (bookbuild) {
                var brk=bookbuild.indexOf(' ');
                if (brk>0) {
                    metaBook.bookbuildhost=bookbuild.slice(0,brk);
                    metaBook.bookbuildtime=
                        fdjtTime.parse(bookbuild.slice(brk+1));}}

            metaBook.bypage=(metaBook.page_style==='bypage'); 
            metaBook.max_excerpt=
                getMeta("SBOOKS.maxexcerpt")||(metaBook.max_excerpt);
            metaBook.min_excerpt=
                getMeta("SBOOKS.minexcerpt")||(metaBook.min_excerpt);
            
            var notespecs=getMeta("sbooknote",true).concat(
                getMeta("SBOOKS.note",true));
            var noterefspecs=getMeta("sbooknoteref",true).concat(
                getMeta("SBOOKS.noteref",true));
            metaBook.sbooknotes=(((notespecs)&&(notespecs.length))?
                                 (fdjtDOM.sel(notespecs)):(false));
            metaBook.sbooknoterefs=(((noterefspecs)&&(noterefspecs.length))?
                                    (fdjtDOM.sel(noterefspecs)):(false));

            if (refuris.indexOf(refuri)<0) {
                refuris.push(refuri);
                saveLocal("mB.refuris",refuris,true);}
            if (docuris.indexOf(docuri)<0) {
                docuris.push(docuri);
                saveLocal("mB.docuris",docuris,true);}

            var docref=getMeta("SBOOKS.docref");
            if (docref) metaBook.docref=docref;

            var coverpage=
                getRelLink("SBOOKS.coverpage")||getRelLink("coverpage");
            if (coverpage) metaBook.coverpage=coverpage;
            var coverimage=
                getRelLink("SBOOKS.coverimage")||getRelLink("coverimage");
            if (coverimage) metaBook.coverimage=coverimage;
            var thumbnail=
                getRelLink("SBOOKS.thumbnail")||getRelLink("thumbnail");
            if (thumbnail) metaBook.thumbnail=thumbnail;
            var icon=getRelLink("SBOOKS.icon")||getRelLink("icon");
            if (icon) metaBook.icon=icon;
            
            var baseid=getMeta("SBOOKS.id")||
                getMeta("SBOOKS.prefix")||getMeta("SBOOKS.baseid");
            if (baseid) metaBook.baseid=baseid;
            var prefix=getMeta("SBOOKS.prefix")||baseid;
            if (prefix) metaBook.prefix=prefix;
            var targetprefix=getMeta("SBOOKS.targetprefix");
            if ((targetprefix)&&(targetprefix==="*"))
                metaBook.targetids=false;
            else if ((targetprefix)&&(targetprefix[0]==='/'))
                metaBook.targetids=new RegExp(targetprefix.slice(1,targetprefix.length-1));
            else if (targetprefix)
                metaBook.targetids=new RegExp("^"+targetprefix);
            else if (prefix)
                metaBook.targetids=new RegExp("^"+prefix);
            else metaBook.targetids=false;
            
            var autofonts=fdjtDOM.getMeta("SBOOKS.adjustfont",true);
            if (autofonts.length)
                fdjt.DOM.autofont=fdjt.DOM.autofont+","+autofonts.join(",");

            if (getMeta("METABOOK.forcelayout"))
                default_config.forcelayout=true;

            var autotoc=getMeta("SBOOKS.autotoc");
            if (autotoc) {
                if ((autotoc[0]==="y")||(autotoc[0]==="Y")||
                    (autotoc==="ON")||(autotoc==="on")||
                    (autotoc==="1")||(autotoc==="enable"))
                    metaBook.autotoc=true;
                else metaBook.autotoc=false;}

            if (!(metaBook.nologin)) {
                metaBook.mycopyid=getMeta("SBOOKS.mycopyid")||
                    (getLocal("mycopy("+refuri+")"))||
                    false;}}

        function setupDevice(){
            var root=document.documentElement||document.body;
            var useragent=navigator.userAgent;
            var device=fdjtDevice;
            if (Trace.startup>2) 
                fdjtLog("Starting device setup for %s",useragent);

            var started=fdjtTime();

            if ((!(device.touch))&&(getQuery("touch")))
                device.touch=getQuery("touch");
            
            // Don't bubble from TapHold regions (by default)
            fdjt.TapHold.default_opts.bubble=false;
            
            if (device.touch) {
                fdjtDOM.addClass(root,"_TOUCH");
                fdjt.TapHold.default_opts.fortouch=true;
                metaBook.ui="touch";
                metaBook.touch=true;
                metaBook.keyboard=false;
                viewportSetup();}
            if (device.android) {
                default_config.keyboardhelp=false;
                metaBook.updatehash=false;}
            else if ((useragent.search("Safari/")>0)&&
                     (useragent.search("Mobile/")>0)) { 
                hide_mobile_safari_address_bar();
                metaBook.updatehash=false;
                // Animation seems to increase crashes in iOS
                // metaBook.dontanimate=true;
                // default_config.layout='fastpage';
                default_config.keyboardhelp=false;
                // Have fdjtLog do it's own format conversion for the log
                fdjtLog.doformat=true;}
            else if (device.touch) {
                fdjtDOM.addClass(root,"_TOUCH");
                metaBook.ui="touch";}
            else if (!(metaBook.ui)) {
                // Assume desktop or laptop
                fdjtDOM.addClass(root,"_MOUSE");
                metaBook.ui="mouse";}
            else {}
            
            if (Trace.startup>1) {
                fdjtLog("setupDevice done in %dms: %s/%dx%d %s",
                        fdjtTime()-started,
                        metaBook.ui,fdjtDOM.viewWidth(),fdjtDOM.viewHeight(),
                        device.string);}}

        function setupBook(){
            if (metaBook.bookinfo) return;
            if (Trace.startup>2) fdjtLog("Book setup");
            var bookinfo=metaBook.bookinfo={}; var started=fdjtTime();
            bookinfo.title=
                getMeta("metaBook.title")||
                getMeta("SBOOKS.title")||
                getMeta("DC.title")||
                getMeta("~TITLE")||
                document.title||"untitled";
            var authors=
                getMeta("SBOOKS.author",true).concat(
                    getMeta("DC.creator",true)).concat(
                        getMeta("AUTHOR")).concat(
                            getMeta("~AUTHOR"));
            if ((authors)&&(authors.length)) bookinfo.authors=authors;
            bookinfo.byline=
                getMeta("metaBook.byline")||
                getMeta("SBOOKS.byline")||
                getMeta("BYLINE")||
                ((authors)&&(authors.length)&&(authors[0]));
            bookinfo.copyright=
                getMeta("SBOOKS.copyright")||
                getMeta("SBOOKS.rights")||
                getMeta("DC.rights")||
                getMeta("COPYRIGHT")||
                getMeta("RIGHTS");
            bookinfo.publisher=
                getMeta("SBOOKS.pubname")||
                getMeta("DC.publisher")||
                getMeta("PUBLISHER");
            bookinfo.pubyear=
                getMeta("SBOOKS.pubyear")||
                getMeta("DC.date");
            bookinfo.description=
                getMeta("SBOOKS.description")||
                getMeta("DC.description")||
                getMeta("DESCRIPTION");
            bookinfo.digitized=
                getMeta("SBOOKS.digitized")||
                getMeta("DIGITIZED");
            bookinfo.converted=$ID("SBOOKS.converted")||
                getMeta("SBOOKS.converted");
            if (Trace.startup>1)
                fdjtLog("setupBook done in %dms",fdjtTime()-started);}
        function getBookInfo(){
            if (metaBook.bookinfo) return metaBook.bookinfo;
            else {setupBook(); return metaBook.bookinfo;}}
        metaBook.getBookInfo=getBookInfo;
        
        /* Viewport setup */

        var viewport_spec=
            "width=device-width,initial-scale=1.0,user-scalable=no";
        function viewportSetup(){
            var head=fdjtDOM.getHEAD();
            var viewport=getMeta("viewport",false,false,true);
            if (!(viewport)) {
                viewport=document.createElement("META");
                viewport.setAttribute("name","viewport");
                viewport.setAttribute("content",viewport_spec);
                head.appendChild(viewport);}
            var isapp=getMeta("apple-mobile-web-app-capable",false,false,true);
            if (!(isapp)) {
                isapp=document.createElement("META");
                isapp.setAttribute("name","apple-mobile-web-app-capable");
                isapp.setAttribute("content","yes");
                head.appendChild(isapp);}}

        function hide_mobile_safari_address_bar(){
            window.scrollTo(0,1);
            setTimeout(function(){window.scrollTo(0,0);},0);}

        /* Getting settings */

        function _getsbookrefuri(){
            var refuri=getLink("SBOOKS.refuri",false,true)||
                getLink("refuri",false,true)||
                getMeta("SBOOKS.refuri",false,true)||
                getMeta("refuri",false,true)||
                getLink("canonical",false,true);
            if (refuri) return decodeURI(refuri);
            else {
                var locref=document.location.href;
                var qstart=locref.indexOf('?');
                if (qstart>=0) locref=locref.slice(0,qstart);
                var hstart=locref.indexOf('#');
                if (hstart>=0) locref=locref.slice(0,hstart);
                return decodeURI(locref);}}
        function _getsbookdocuri(){
            return getLink("SBOOKS.docuri",false)||
                getLink("docuri",false)||
                getLink("canonical",false)||
                _getsbookrefuri();}

        function lookupServer(string){
            var sbook_servers=metaBook.servers;
            var i=0;
            while (i<sbook_servers.length) 
                if (sbook_servers[i][0]===string)
                    return sbook_servers[i][1];
            else if (string.search(sbook_servers[i][0])>=0)
                return sbook_servers[i][1];
            else if ((sbook_servers[i][0].call) &&
                     (sbook_servers[i][0].call(string)))
                return sbook_servers[i][1];
            else i++;
            return false;}

        function gotServerInfo(data){
            var host_spec="<span class='host'>"+metaBook.server+"</span>";
            if ((metaBook.server_info)&&
                (metaBook.server_info.serverip!==data.serverip))
                fdjtLog.warn(
                    "Server %s IP change from %s to %s:\n\t%j\n\t%j",
                    metaBook.server,
                    metaBook.server_info.serverip,data.serverip,
                    metaBook.server_info,data);
            if (data.servername!==metaBook.server)
                host_spec=host_spec+" / "+
                "<span class='host'>"+data.servername+"</span>";
            if (data.hostname!==data.servername)
                host_spec=host_spec+" / "+
                "<span class='host'>"+data.hostname+"</span>";
            if (data.serverip) {
                host_spec=host_spec+" / "+
                    "<span class='host'>"+data.serverip+"</span>";}
            metaBook.server_info=data;
            var info=fdjt.DOM.$(".metabookserverinfo");
            var i=0, lim=info.length; while (i<lim) {
                info[i++].innerHTML="<strong>Glosses</strong> from "+host_spec;}}

        function fetchServerInfo(){
            var servername=metaBook.server;
            fdjtDOM.removeListener(window,"online",fetchServerInfo);
            fdjtAjax.jsonCall(gotServerInfo,"https://"+servername+"/_info");}
        function updateServerInfo(){
            if (navigator.onLine) fetchServerInfo();
            else fdjtDOM.addListener(window,"online",fetchServerInfo);}
        metaBook.updateServerInfo=updateServerInfo;
        
        function hasTOCLevel(elt){
            if ((elt.toclevel)||
                ((elt.getAttributeNS)&&
                 (elt.getAttributeNS('toclevel','http://sbooks.net/')))||
                (elt.getAttribute('toclevel'))||
                (elt.getAttribute('data-toclevel'))||
                ((elt.className)&&
                 ((elt.className.search(/\bsbook\dhead\b/)>=0)||
                  (elt.className.search(/\bsbooknotoc\b/)>=0)||
                  (elt.className.search(/\bsbookignore\b/)>=0))))
                return true;
            else return false;}
        metaBook.hasTOCLevel=hasTOCLevel;

        var headlevels=["not","A","B","C","D","E","F","G","H","I","J","K","L"];

        function getScanSettings(){
            if (!(metaBook.docroot))
                if (getMeta("SBOOKS.root"))
                    metaBook.docroot=mbID(getMeta("SBOOKS.root"));
            else metaBook.docroot=$ID("SBOOKCONTENT")||document.body;
            if (!(metaBook.start))
                if (getMeta("SBOOKS.start"))
                    metaBook.start=mbID(getMeta("SBOOKS.start"));
            else if ($ID("SBOOKSTART"))
                metaBook.start=$ID("SBOOKSTART");
            else {}
            var i=0; while (i<9) {
                var body=document.body;
                var rules=getMeta("sbookhead"+i,true).
                    concat(getMeta("sbook"+i+"head",true)).
                    concat(getMeta("sbook"+headlevels[i]+"head",true)).
                    concat(getMeta("SBOOKS.head"+i,true));
                if ((rules)&&(rules.length)) {
                    var j=0; var lim=rules.length; while (j<lim) {
                        var elements=fdjtDOM.getChildren(body,rules[j++]);
                        var k=0; var n=elements.length;
                        while (k<n) {
                            var elt=elements[k++];
                            if (!(hasTOCLevel(elt))) elt.toclevel=i;}}}
                i++;}
            // These are all meta class definitions, which is why
            //  they don't have regular schema prefixes
            var ignore=(getMeta("sbookignore",true)).concat(
                (getMeta("SBOOKS.ignore",true)));
            if (ignore.length)
                metaBook.ignore=new fdjtDOM.Selector(ignore);
            var notoc=
                getMeta("sbooknotoc",true).concat(
                    getMeta("SBOOKS.notoc",true)).concat(
                        getMeta("SBOOKS.nothead",true)).concat(
                            getMeta("sbooknothead"));
            if (notoc.length)
                metaBook.notoc=new fdjtDOM.Selector(notoc);
            var terminal=getMeta("sbookterminal",true).concat(
                getMeta("SBOOKS.terminal",true));
            if (terminal.length)
                metaBook.terminals=new fdjtDOM.Selector(terminal.length);
            var focus=
                getMeta("sbookfocus",true).concat(
                    getMeta("SBOOKS.focus",true)).concat(
                        getMeta("sbooktarget",true)).concat(
                            getMeta("SBOOKS.target",true)).concat(
                                getMeta("SBOOKS.idify",true));
            if (focus.length)
                metaBook.focus=new fdjtDOM.Selector(focus);
            var nofocus=
                getMeta("sbooknofocus",true).concat(
                    getMeta("SBOOKS.nofocus",true)).concat(
                        getMeta("sbooknotarget",true)).concat(
                            getMeta("SBOOKS.notarget",true));
            if (nofocus.length)
                metaBook.nofocus=new fdjtDOM.Selector(nofocus);}

        function setupBookInfo(){
            var info=fdjt.DOM.$(".metabookrefinfo"), elt;
            var i=0, lim=info.length; while (i<lim) {
                elt=info[i++];
                elt.innerHTML="<strong>Ref:</strong> ";
                fdjtDOM.append(elt,fdjtDOM("span.refuri",metaBook.refuri),
                               " ",fdjtDOM("span.oidref",metaBook.docref));}
            info=fdjt.DOM.$(".metabooksourceinfo");
            i=0; lim=info.length; while (i<lim) {
                elt=info[i++];
                elt.innerHTML="<strong>Source:</strong> ";
                if (metaBook.sourcetime)
                    elt.appendChild(timeDOM(metaBook.sourcetime));
                fdjtDOM.append(
                    elt," ",fdjtDOM("span.uuid",metaBook.sourceid));}
            info=fdjt.DOM.$(".metabookbuildinfo");
            i=0; lim=info.length; while (i<lim) {
                elt=info[i++]; elt.innerHTML="<strong>Book Build:</strong> ";
                if ((metaBook.bookbuild)&&(!(metaBook.bookbuildhost)))
                    elt.appendChild(metaBook.bookbuild);
                else {
                    if (metaBook.bookbuildtime) 
                        elt.appendChild(timeDOM(metaBook.bookbuildtime));
                    fdjtDOM.append(
                        elt," on ",fdjtDOM("span.host",metaBook.bookbuildhost));}}
            info=fdjt.DOM.$(".metabookappinfo");
            i=0; lim=info.length; while (i<lim) {
                elt=info[i++]; elt.innerHTML="";
                fdjtDOM(elt,fdjtDOM("strong","App:")," ",
                        "metaBook version ",metaBook.version,
                        " built on ",fdjtDOM("span.host",metaBook.buildhost),
                        ((metaBook.buildtime)&&(" at ")),
                        timeDOM(metaBook.buildtime), " loaded from ",
                        fdjtDOM("span.host",metaBook.appsource));}
            info=fdjt.DOM.$(".metabookcopyrightinfo");
            i=0; lim=info.length; while (i<lim) {
                info[i++].innerHTML=
                    "Program and Interface "+
                    "<span class='inlinesymbol'>©"+"</span>"+
                    " beingmeta, inc 2008-2015";}}

        function timeDOM(x){
            var elt;
            try {
                if (typeof x === "string")
                    elt=fdjtDOM("time",x);
                else elt=fdjtDOM("time",x.toString());
                if (typeof x === "string")
                    elt.setAttribute("datetime",x);
                else elt.setAttribute("datetime",x.toISOString());
                return elt;}
            catch (ex) {
                return document.createTextNode("??time??");}}

        function setupZoom(){
            var zoom=metaBook.Zoom=fdjtDOM(
                "div#METABOOKZOOM.metabookzoom.metabookcontent",
                fdjtDOM("div#METABOOKZOOMBOX",
                        fdjtDOM("div#METABOOKZOOMTARGET")),
                fdjtDOM("div#METABOOKZOOMCONTROLS",
                        fdjtDOM("div#METABOOKZOOMCLOSE"),
                        fdjtDOM("div#METABOOKUNZOOM"),
                        fdjtDOM("div#METABOOKZOOMIN"),
                        fdjtDOM("div#METABOOKZOOMOUT"),
                        fdjtDOM("div#METABOOKZOOMHELP"),
                        fdjtDOM("div#METABOOKZOOMHELPTEXT",
                                "Drag to pan, use two fingers to zoom")));
            zoom.metabookui=true;
            document.body.appendChild(zoom);}
        metaBook.setupZoom=setupZoom;
        
        function setupMedia(){
            var media=metaBook.Media=fdjtDOM(
                "div#METABOOKMEDIA.metabookmedia.metabookcontent",
                fdjtDOM("div#METABOOKMEDIATARGET"),
                fdjtDOM("div#METABOOKCLOSEMEDIA"));
            media.metabookui=true;
            document.body.appendChild(media);}
        metaBook.setupMedia=setupMedia;

        metaBook.addConfig("uisound",function(name,value){
            metaBook.uisound=(value)&&(true);});
        metaBook. addConfig("readsound",function(name,value){
            metaBook.readsound=(value)&&(true);});
        metaBook.addConfig("bodycontrast",function(name,value){
            var mbody=$ID("METABOOKBODY");
            if (!(value))
                dropClass(mbody,/\bmetabookcontrast[a-z]+\b/g);
            else swapClass(mbody,/\bmetabookcontrast[a-z]+\b/g,
                           "metabookcontrast"+value);
            fdjt.Async(function(){
                metaBook.updateSettings(name,value);});});
        
        /* Enable Open Sans */
        var open_sans_stack=
            "'Open Sans',Verdana, Tahoma, Arial, Helvetica, sans-serif, sans";
        function enableOpenSans(){
            var frame=$ID("METABOOKFRAME");
            if (!(frame)) return;
            frame.style.fontFamily=open_sans_stack;
            metaBook.resizeUI();}
        metaBook.enableOpenSans=enableOpenSans;

        /* Other setup */
        
        metaBook.StartupHandler=function(){
            metaBook.Startup();};

        return metaBookStartup;})();
metaBook.Setup=metaBook.StartupHandler;

//fdjt.DOM.noautotweakfonts="Handled by metaBook";
/*
  sbookStartup=metaBook.StartupHandler;
  sbook={Start: metaBook.Startup,
  setUser: metaBook.setUser,
  Startup: metaBook.Startup};
*/

/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  indent-tabs-mode: nil ***
   ;;;  End: ***
*/
