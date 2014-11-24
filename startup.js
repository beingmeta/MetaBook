/* -*- Mode: Javascript; Character-encoding: utf-8; -*- */

/* ###################### metabook/startup.js ###################### */

/* Copyright (C) 2009-2014 beingmeta, inc.

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
//var iScroll=((typeof iScroll !== "undefined")?(iScroll):({}));

metaBook.Startup=
    (function(){
        "use strict";

        var fdjtString=fdjt.String;
        var fdjtDevice=fdjt.device;
        var fdjtState=fdjt.State;
        var fdjtAjax=fdjt.Ajax;
        var fdjtTime=fdjt.Time;
        var fdjtLog=fdjt.Log;
        var fdjtDOM=fdjt.DOM;
        var fdjtUI=fdjt.UI;
        var fdjtID=fdjt.ID;
        var mbID=metaBook.ID;
        var RefDB=fdjt.RefDB, Ref=fdjt.Ref;
        
        var CodexLayout=fdjt.CodexLayout;

        var https_root="https://s3.amazonaws.com/beingmeta/static/";

        // Imported functions
        var getLocal=fdjtState.getLocal;
        var setLocal=fdjtState.setLocal;
        var getQuery=fdjtState.getQuery;
        var getHash=fdjtState.getHash;
        var getCookie=fdjtState.getCookie;
        var getMeta=fdjtDOM.getMeta;
        var getLink=fdjtDOM.getLink;
        var hasClass=fdjtDOM.hasClass;
        var addClass=fdjtDOM.addClass;
        var dropClass=fdjtDOM.dropClass;
        var getChildren=fdjtDOM.getChildren;
        var getGeometry=fdjtDOM.getGeometry;
        var hasContent=fdjtDOM.hasContent;

        function hasAnyContent(n){return hasContent(n,true);}

        var mB=metaBook;
        var Trace=metaBook.Trace;
        var fixStaticRefs=metaBook.fixStaticRefs;

        // This is the window outer dimensions, which is stable across
        // most chrome changes, especially on-screen keyboards.  We
        // track so that we can avoid resizes which shouldn't force
        // layout updates.
        var outer_height=false, outer_width=false;

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

        /* Save local */

        var readLocal=metaBook.readLocal;
        var saveLocal=metaBook.saveLocal;
        var clearOffline=metaBook.clearOffline;

        /* Whether to resize by default */
        var resize_default=false;

        /* Interval timers */
        var ticktock=false, synctock=false;
        
        /* Configuration information */

        var config_handlers={};
        var default_config=
            {layout: 'bypage',forcelayout: false,
             bodysize: 'normal',bodyfamily: 'serif',
             justify: false,linespacing: 'normal',
             uisize: 'normal',showconsole: false,
             animatecontent: true,animatehud: true,
             hidesplash: false,keyboardhelp: true,
             holdmsecs: 150,wandermsecs: 1500,
             syncinterval: 60,glossupdate: 5*60,
             locsync: 15, cacheglosses: true,
             soundeffects: false, buzzeffects: false,
             controlc: false};
        var current_config={};
        var saved_config={};

        var setCheckSpan=fdjtUI.CheckSpan.set;

        function addConfig(name,handler){
            if (Trace.config>1)
                fdjtLog("Adding config handler for %s: %s",name,handler);
            config_handlers[name]=handler;
            if (current_config.hasOwnProperty(name)) {
                if (Trace.config>1)
                    fdjtLog("Applying config handler to current %s=%s",
                            name,current_config[name]);
                handler(name,current_config[name]);}}
        metaBook.addConfig=addConfig;

        function getConfig(name){
            if (!(name)) return current_config;
            else return current_config[name];}
        metaBook.getConfig=getConfig;

        function setConfig(name,value,save){
            if (arguments.length===1) {
                var config=name;
                metaBook.postconfig=[];
                if (Trace.config) fdjtLog("batch setConfig: %s",config);
                for (var setting in config) {
                    if (config.hasOwnProperty(setting))
                        setConfig(setting,config[setting]);}
                var dopost=metaBook.postconfig;
                metaBook.postconfig=false;
                if ((Trace.config>1)&&(!((dopost)||(dopost.length===0))))
                    fdjtLog("batch setConfig, no post processing",config);
                var post_i=0; var post_lim=dopost.length;
                while (post_i<post_lim) {
                    if (Trace.config>1)
                        fdjtLog("batch setConfig, post processing %s",
                                dopost[post_i]);
                    dopost[post_i++]();}
                return;}
            if (Trace.config) fdjtLog("setConfig %o=%o",name,value);
            var input_name="METABOOK"+(name.toUpperCase());
            var inputs=document.getElementsByName(input_name);
            var input_i=0, input_lim=inputs.length;
            while (input_i<input_lim) {
                var input=inputs[input_i++];
                if (input.tagName!=='INPUT') continue;
                if (input.type==='checkbox') {
                    if (value) setCheckSpan(input,true);
                    else setCheckSpan(input,false);}
                else if (input.type==='radio') {
                    if (value===input.value) setCheckSpan(input,true);
                    else setCheckSpan(input,false);}
                else input.value=value;}
            if (!((current_config.hasOwnProperty(name))&&
                  (current_config[name]===value))) {
                if (config_handlers[name]) {
                    if (Trace.config)
                        fdjtLog("setConfig (handler=%s) %o=%o",
                                config_handlers[name],name,value);
                    config_handlers[name](name,value);}
                else if (Trace.config)
                    fdjtLog("setConfig (no handler) %o=%o",name,value);
                else {}}
            else if (Trace.config)
                fdjtLog("Redundant setConfig %o=%o",name,value);
            else {}
            if (current_config[name]!==value) {
                current_config[name]=value;
                if ((!(save))&&(inputs.length))
                    fdjtDOM.addClass("METABOOKSETTINGS","changed");}
            if ((save)&&(saved_config[name]!==value)) {
                saved_config[name]=value;
                saveConfig(saved_config);}}
        metaBook.setConfig=setConfig;
        metaBook.resetConfig=function(){setConfig(saved_config);};

        function saveConfig(config){
            if (Trace.config) {
                fdjtLog("saveConfig %o",config);
                fdjtLog("saved_config=%o",saved_config);}
            if (!(config)) config=saved_config;
            // Save automatically applies (seems only fair)
            else setConfig(config);
            var saved={};
            for (var setting in config) {
                if ((default_config.hasOwnProperty(setting))&&
                    (config[setting]!==default_config[setting])&&
                    (!(getQuery(setting)))) {
                    saved[setting]=config[setting];}}
            if (Trace.config) fdjtLog("Saving config %o",saved);
            saveLocal("metabook.config("+mB.docuri+")",JSON.stringify(saved));
            fdjtDOM.dropClass("METABOOKSETTINGS","changed");
            saved_config=saved;}
        metaBook.saveConfig=saveConfig;

        function initConfig(){
            var setting, started=fdjtTime(); // changed=false;
            var config=getLocal("metabook.config("+mB.docuri+")",true)||
                fdjtState.getSession("metabook.config("+mB.docuri+")",
                                     true);
            metaBook.postconfig=[];
            if (config) {
                for (setting in config) {
                    if ((config.hasOwnProperty(setting))&&
                        (!(getQuery(setting)))) {
                        // if ((!(default_config.hasOwnProperty(setting)))||
                        //    (config[setting]!==default_config[setting]))
                        //    changed=true;
                        setConfig(setting,config[setting]);}}}
            else config={};
            if (Trace.config)
                fdjtLog("initConfig (default) %j",default_config);
            for (setting in default_config) {
                if (!(config.hasOwnProperty(setting)))
                    if (default_config.hasOwnProperty(setting)) {
                        if (getQuery(setting))
                            setConfig(setting,getQuery(setting));
                        else if (getMeta("METABOOK."+setting))
                            setConfig(setting,getMeta("METABOOK."+setting));
                        else setConfig(setting,default_config[setting]);}}
            var dopost=metaBook.postconfig;
            metaBook.postconfig=false;
            var i=0; var lim=dopost.length;
            while (i<lim) dopost[i++]();
            
            // if (changed) fdjtDOM.addClass("METABOOKSETTINGS","changed");
            
            var devicename=current_config.devicename;
            if ((devicename)&&(!(fdjtString.isEmpty(devicename))))
                metaBook.deviceName=devicename;
            if (Trace.startup>1)
                fdjtLog("initConfig took %dms",fdjtTime()-started);}
        
        var getParent=fdjtDOM.getParent;
        var hasParent=fdjtDOM.hasParent;
        var getChild=fdjtDOM.getChild;

        function updateConfig(name,id,save){
            if (typeof save === 'undefined') save=false;
            var elt=((typeof id === 'string')&&(document.getElementById(id)))||
                ((id.nodeType)&&(getParent(id,'input')))||
                ((id.nodeType)&&(getChild(id,'input')))||
                ((id.nodeType)&&(getChild(id,'textarea')))||
                ((id.nodeType)&&(getChild(id,'select')))||
                (id);
            if (Trace.config) fdjtLog("Update config %s",name);
            if ((elt.type==='radio')||(elt.type==='checkbox'))
                setConfig(name,elt.checked||false,save);
            else setConfig(name,elt.value,save);}
        metaBook.updateConfig=updateConfig;

        function metabookPropConfig(name,value){
            metaBook[name]=value;}
        metaBook.propConfig=metabookPropConfig;
        metaBook.addConfig("forcelayout",metabookPropConfig);

        metaBook.addConfig("keyboardhelp",function(name,value){
            metaBook.keyboardhelp=value;
            fdjtUI.CheckSpan.set(
                document.getElementsByName("METABOOKKEYBOARDHELP"),
                value);});
        metaBook.addConfig("devicename",function(name,value){
            if (fdjtString.isEmpty(value)) metaBook.deviceName=false;
            else metaBook.deviceName=value;});

        metaBook.addConfig("holdmsecs",function(name,value){
            metaBook.holdmsecs=value;
            fdjtUI.TapHold.default_opts.holdthresh=value;});
        metaBook.addConfig("wandermsecs",function(name,value){
            metaBook.wandermsecs=value;
            fdjtUI.TapHold.default_opts.wanderthresh=value;});
        metaBook.addConfig("taptapmsecs",function(name,value){
            metaBook.taptapmsecs=value;
            fdjtUI.TapHold.default_opts.taptapthresh=value;});

        metaBook.addConfig("glossupdate",function(name,value){
            metaBook.update_interval=value;
            if (ticktock) {
                clearInterval(metaBook.ticktock);
                metaBook.ticktock=ticktock=false;
                if (value) metaBook.ticktock=ticktock=
                    setInterval(updateInfo,value*1000);}});

        metaBook.addConfig("syncinterval",function(name,value){
            metaBook.sync_interval=value;
            if (metaBook.synctock) {
                clearInterval(metaBook.synctock);
                metaBook.synctock=synctock=false;}
            if ((value)&&(metaBook.locsync))
                metaBook.synctock=synctock=
                setInterval(metaBook.syncState,value*1000);});
        metaBook.addConfig("locsync",function(name,value){
            // Start or clear the sync check interval timer
            if ((!(value))&&(metaBook.synctock)) {
                clearInterval(metaBook.synctock);
                metaBook.synctock=synctock=false;}
            else if ((value)&&(!(metaBook.synctock))&&
                     (metaBook.sync_interval))
                metaBook.synctock=synctock=
                setInterval(metaBook.syncState,(metaBook.sync_interval)*1000);
            else {}
            metaBook.locsync=value;});
        
        function syncStartup(){
            // This is the startup code which is run
            //  synchronously, before the time-sliced processing
            fdjtLog.console="METABOOKCONSOLELOG";
            fdjtLog.consoletoo=true;
            if (!(metaBook._setup_start)) metaBook._setup_start=new Date();
            fdjtLog("This is metaBook v%s, built %s on %s, launched %s, from %s",
                    mB.version,mB.buildtime,mB.buildhost,
                    mB._setup_start.toString(),
                    mB.root||"somewhere");
            if (fdjtID("METABOOKBODY")) metaBook.body=fdjtID("METABOOKBODY");

            // Get window outer dimensions (this doesn't count Chrome,
            // onscreen keyboards, etc)
            outer_height=window.outerHeight;
            outer_width=window.outerWidth;

            if ((fdjtDevice.standalone)&&
                (fdjtDevice.ios)&&(fdjtDevice.mobile)&&
                (!(getLocal("metabook.user")))&&
                (fdjtState.getQuery("SBOOKS:AUTH-"))) {
                var authkey=fdjt.State.getQuery("SBOOKS:AUTH-");
                fdjtLog("Got auth key %s",authkey);
                metaBook.authkey=authkey;}

            // Check for any trace settings passed as query arguments
            if (getQuery("cxtrace")) readTraceSettings();
            
            // Get various settings for the sBook from the HTML
            // (META tags, etc), including settings or guidance for
            // skimming, graphics, layout, glosses, etc.
            readBookSettings();
            fdjtLog("Book %s (%s) %s (%s%s)",
                    mB.docref||"@??",mB.bookbuild||"",
                    mB.refuri,mB.sourceid,
                    ((mB.sourcetime)?(": "+mB.sourcetime):("")));
            
            // Initialize the databases
            metaBook.initDB();

            // Get config information
            initConfig();

            // This sets various aspects of the environment
            readEnvSettings();

            // Figure out if we have a user and whether we can keep
            // user information
            if (getLocal("metabook.user")) {
                metaBook.persist=true;
                userSetup();}

            // Initialize the book state (location, targets, etc)
            metaBook.initState(); metaBook.syncState();

            // If we have no clue who the user is, ask right away (updateInfo())
            if (!((metaBook.user)||(window._sbook_loadinfo)||
                  (metaBook.userinfo)||(window._userinfo)||
                  (getLocal("metabook.user")))) {
                if (Trace.startup)
                    fdjtLog("No local user info, requesting from sBooks server %s",
                            mB.server);
                // When metaBook.user is not defined, this just
                // requests identity information
                updateInfo();}

            // Execute any FDJT initializations
            fdjt.Init();

            bookSetup();
            deviceSetup();
            appSetup();
            metaBook._ui_setup=fdjtTime();
            showMessage();
            if (metaBook._user_setup) setupUI4User();
            contentSetup();

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
            if ((getLocal("metabook.nologin"))||(getQuery("nologin")))
                metaBook.nologin=true;
            var sbooksrv=getMeta("SBOOKS.server")||getMeta("SBOOKSERVER");
            if (sbooksrv) metaBook.server=sbooksrv;
            else if (fdjtState.getCookie("SBOOKSERVER"))
                metaBook.server=fdjtState.getCookie("SBOOKSERVER");
            else metaBook.server=lookupServer(document.domain);
            if (!(metaBook.server)) metaBook.server=metaBook.default_server;

            // Get the settings for scanning the document structure
            getScanSettings();}

        function appSetup() {

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
            setupCover();

            if (metaBook.refuri) {
                var refuris=document.getElementsByName("REFURI");
                if (refuris) {
                    var j=0; var len=refuris.length;
                    while (j<len) {
                        if (refuris[j].value==='fillin')
                            refuris[j++].value=metaBook.refuri;
                        else j++;}}}

            addConfig("cacheglosses",
                      function(name,value){metaBook.cacheGlosses(value);});

            imageSetup();

            // Setup the reticle (if desired)
            if ((typeof (body.style["pointer-events"])!== "undefined")&&
                ((metaBook.demo)||(fdjtState.getLocal("metabook.demo"))||
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
        
        function contentSetup(){
            var started=fdjtTime();
            // Modifies the DOM in various ways
            initBody();
            // Size the content
            sizeContent();
            // Setup the UI components for the body and HUD
            metaBook.setupGestures();
            if (Trace.gestures)
                fdjtLog("Content setup in %dms",fdjtTime()-started);}

        metaBook.setSync=function setSync(val){
            if (!(val)) return false;
            var cur=metaBook.sync;
            if ((cur)&&(cur>val)) return cur;
            metaBook.sync=val;
            if (metaBook.persist)
                saveLocal("metabook.sync("+metaBook.docuri+")",val);
            return val;};

        function userSetup(){
            // Get any local sync information
            var sync=metaBook.sync=
                getLocal("metabook.sync("+metaBook.refuri+")",true)||0;
            var started=fdjtTime();
            var loadinfo=false, userinfo=false;

            // If the configuration is set to not persist, but there's
            //  a sync timestamp, we should erase what's there.
            if ((metaBook.sync)&&(!(metaBook.persist))) clearOffline();

            if (metaBook.nologin) {}
            else if ((metaBook.persist)&&(getLocal("metabook.user"))) {
                initUserOffline();
                if (Trace.storage) 
                    fdjtLog("Local info for %o (%s) from %o",
                            metaBook.user._id,metaBook.user.name,metaBook.sync);
                // Clear any loadinfo read on startup from the
                // application cache but already stored locally.
                if ((metaBook.user)&&(metaBook.sync)&&(metaBook.cacheglosses)&&
                    (window._sbook_loadinfo))
                    // Clear the loadinfo "left over" from startup,
                    //  which should now be in the database
                    window._sbook_loadinfo=false;}
            
            if (metaBook.nologin) {}
            else if ((window._sbook_loadinfo)&&
                     (window._sbook_loadinfo.userinfo)) {
                // Get the userinfo from the loadinfo that might have already been loaded
                loadinfo=window._sbook_loadinfo;
                userinfo=loadinfo.userinfo;
                window._sbook_loadinfo=false;
                if (Trace.storage) 
                    fdjtLog("Have window._sbook_loadinfo for %o (%s) dated %o: %j",
                            userinfo._id,userinfo.name||userinfo.email,
                            loadinfo.sync,userinfo);
                setUser(userinfo,
                        loadinfo.outlets,loadinfo.layers,
                        loadinfo.sync);
                if (loadinfo.nodeid) setNodeID(loadinfo.nodeid);}
            else if ((metaBook.userinfo)||(window._userinfo)) {
                userinfo=(metaBook.userinfo)||(window._userinfo);
                if ((Trace.storage)||(Trace.startup))
                    fdjtLog("Have %s for %o (%s) dated %o: %j",
                            ((metaBook.userinfo)?("metaBook.userinfo"):("window._userinfo")),
                            userinfo._id,userinfo.name||userinfo.email,
                            userinfo.sync||userinfo.modified,userinfo);
                setUser(userinfo,userinfo.outlets,userinfo.layers,
                        userinfo.sync||userinfo.modified);}
            else {}
            if (Trace.startup>1)
                fdjtLog("userSetup done in %dms",fdjtTime()-started);
            if (metaBook.nologin) return;
            else if (!(metaBook.refuri)) return;
            else {}
            if (window.navigator.onLine) {
                if ((metaBook.user)&&(sync))
                    fdjtLog("Requesting new (> %s (%d)) glosses on %s from %s for %s",
                            fdjtTime.timeString(metaBook.sync),metaBook.sync,
                            metaBook.refuri,metaBook.server,metaBook.user._id,metaBook.user.name);
                else if (metaBook.user)
                    fdjtLog("Requesting all glosses on %s from %s for %s (%s)",
                            metaBook.refuri,metaBook.server,metaBook.user._id,metaBook.user.name);
                else fdjtLog(
                    "No user, requesting user info and glosses from %s",
                    metaBook.server);
                updateInfo();
                return;}
            else return;}
        metaBook.userSetup=userSetup;

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

            // Set sizes
            setTimeout(function(){
                if (Trace.startup>1)
                    fdjtLog("Resizing UI (HUD and COVER)");

                var adjstart=fdjt.Time();

                metaBook.resizeCover(fdjtID("METABOOKCOVER"));
                metaBook.resizeHUD(fdjtID("METABOOKHUD"));
                
                if (Trace.startup)
                    fdjtLog("Resized UI in %fsecs",
                            ((fdjt.Time()-adjstart)/1000));},
                       50);

            // The rest of the stuff we timeslice
            fdjtTime.timeslice
            ([  // Scan the DOM for metadata.  This is surprisingly
                //  fast, so we don't currently try to timeslice it or
                //  cache it, though we could.
                function(){
                    applyTOCRules();
                    metadata=scanDOM();},
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
                    var tocmsg=fdjtID("METABOOKSTARTUPTOC");
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
                // Load all account information
                function(){
                    if (Trace.startup>1) fdjtLog("Loading sourcedb");
                    metaBook.sourcedb.load(true);},
                // Read knowledge bases (knodules) used by the book
                ((Knodule)&&(Knodule.HTML)&&
                 (Knodule.HTML.Setup)&&(metaBook.knodule)&&
                 (function(){
                     var knomsg=fdjtID("METABOOKSTARTUPKNO");
                     var knodetails=fdjtID("METABOOKSTARTUPKNODETAILS");
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
                        if (metaBook.cacheglosses) return initGlossesOffline();}
                    else if (window._sbook_loadinfo) {
                        loadInfo(window._sbook_loadinfo);
                        window._sbook_loadinfo=false;}},
                // Process anything we got via JSONP ahead of processing
                //  _sbook_loadinfo
                ((window._sbook_newinfo)&&(function(){
                    loadInfo(window._sbook_newinfo);
                    window._sbook_newinfo=false;})),
                function(){
                    if ((Trace.startup>1)||(Trace.indexing>1))
                        fdjtLog("Finding and applying Technorati-style tags");
                    applyAnchorTags();},
                function(){
                    if ((Trace.startup>1)||(Trace.indexing>1))
                        fdjtLog("Finding and applying tag elements from body");
                    applyTagSpans();
                    applyMultiTagSpans();
                    applyTagAttributes(metadata);},
                function(){
                    var pubindex=metaBook._publisher_index||
                        window._sbook_autoindex;
                    if (pubindex) {
                        handlePublisherIndex(pubindex,indexingDone);
                        metaBook._publisher_index=false;
                        window._sbook_autoindex=false;}
                    else if (fdjtID("SBOOKAUTOINDEX")) {
                        var elt=fdjtID("SBOOKAUTOINDEX");
                        fdjtDOM.addListener(elt,"load",function(evt){
                            evt=evt||window.event;
                            handlePublisherIndex(false,indexingDone);
                            metaBook._publisher_index=false;
                            window._sbook_autoindex=false;});}
                    else {
                        var indexref=getLink("SBOOKS.bookindex");
                        if (indexref) {
                            var script_elt=document.createElement("SCRIPT");
                            script_elt.setAttribute("src",indexref);
                            script_elt.setAttribute("language","javascript");
                            script_elt.setAttribute("async","async");
                            fdjtDOM.addListener(script_elt,"load",function(){
                                handlePublisherIndex(false,indexingDone);
                                metaBook._publisher_index=false;
                                window._sbook_autoindex=false;});
                            document.body.appendChild(script_elt);}
                        else indexingDone();}},
                startupDone],
             100,25);}
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

        function handlePublisherIndex(pubindex,whendone){
            if (!(pubindex))
                pubindex=metaBook._publisher_index||window._sbook_autoindex;
            if (!(pubindex)) {
                if (whendone) whendone();
                return;}
            if ((Trace.startup>1)||(Trace.indexing)) {
                if (pubindex._nkeys)
                    fdjtLog("Processing provided index of %d keys and %d refs",
                            pubindex._nkeys,pubindex._nrefs);
                else fdjtLog("Processing provided index");}
            metaBook.useIndexData(pubindex,metaBook.knodule,false,whendone);}

        function scanDOM(){
            var scanmsg=fdjtID("METABOOKSTARTUPSCAN");
            addClass(scanmsg,"running");
            var metadata=new metaBook.DOMScan(metaBook.content,metaBook.refuri+"#");
            metaBook.docinfo=metadata;
            metaBook.ends_at=metaBook.docinfo._maxloc;
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
                else initLocation();}
            else initLocation();
            window.onpopstate=function onpopstate(evt){
                if (evt.state) metaBook.restoreState(evt.state,"popstate");};
            fdjtLog("Startup done");
            metaBook.displaySync();
            fdjtDOM.dropClass(document.body,"mbSTARTUP");
            fdjtDOM.addClass(document.body,"mbREADY");
            var rmsg=fdjtID("METABOOKREADYMESSAGE");
            if (!(fdjtID("METABOOKOPENTAB"))) {
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
                    "metabook.opened("+metaBook.docuri+")",true);
                if ((opened)&&((opened+((3600+1800)*1000))>fdjtTime()))
                    metaBook.hideCover();}
            if (fdjtDOM.vischange)
                fdjtDOM.addListener(document,fdjtDOM.vischange,
                                    metaBook.visibilityChange);
            fdjtDOM.addListener(window,"resize",resizeHandler);}
        
        /* Application settings */
        
        function readBookSettings(){
            // Basic stuff
            var refuri=_getsbookrefuri();
            var locuri=window.location.href;
            var hashpos=locuri.indexOf('#');
            if (hashpos>0) metaBook.locuri=locuri.slice(0,hashpos);
            else metaBook.locuri=locuri;
            document.body.refuri=metaBook.refuri=refuri;
            metaBook.docuri=_getsbookdocuri();
            metaBook.topuri=document.location.href;
            
            var refuris=getLocal("metabook.refuris",true)||[];

            metaBook.sourceid=
                getMeta("SBOOKS.sourceid")||getMeta("SBOOKS.fileid")||
                metaBook.docuri;
            metaBook.sourcetime=getMeta("SBOOKS.sourcetime");
            var oldid=getLocal("metabook.sourceid("+metaBook.docuri+")");
            if ((oldid)&&(oldid!==metaBook.sourceid)) {
                var layouts=getLocal("metabook.layouts("+oldid+")");
                if ((layouts)&&(layouts.length)) {
                    var i=0, lim=layouts.length; while (i<lim) 
                        CodexLayout.dropLayout(layouts[i++]);}}
            else saveLocal("metabook.sourceid("+metaBook.docuri+")",metaBook.sourceid);

            metaBook.bookbuild=getMeta("SBOOKS.buildstamp");

            metaBook.bypage=(metaBook.page_style==='bypage'); 
            metaBook.max_excerpt=getMeta("SBOOKS.maxexcerpt")||(metaBook.max_excerpt);
            metaBook.min_excerpt=getMeta("SBOOKS.minexcerpt")||(metaBook.min_excerpt);
            
            var notespecs=getMeta("sbooknote",true).concat(
                getMeta("SBOOKS.note",true));
            var noterefspecs=getMeta("sbooknoteref",true).concat(
                getMeta("SBOOKS.noteref",true));
            metaBook.sbooknotes=(((notespecs)&&(notespecs.length))?
                                 (fdjtDOM.sel(notespecs)):(false));
            metaBook.sbooknoterefs=(((noterefspecs)&&(noterefspecs.length))?
                                    (fdjtDOM.sel(noterefspecs)):(false));

            refuris.push(refuri);

            var docref=getMeta("SBOOKS.docref");
            if (docref) metaBook.docref=docref;

            var coverpage=getLink("SBOOKS.coverpage",false,true)||
                getLink("coverpage",false,true);
            if (coverpage) metaBook.coverpage=coverpage;
            var coverimage=getLink("SBOOKS.coverimage",false,true)||
                getLink("coverimage",false,true);
            if (coverimage) metaBook.coverimage=coverimage;
            var thumbnail=getLink("SBOOKS.thumbnail",false,true)||
                getLink("thumbnail",false,true);
            if (thumbnail) metaBook.thumbnail=thumbnail;
            var icon=getLink("SBOOKS.icon",false,true)||
                getLink("icon",false,true);
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
                    false;}
            if (metaBook.persist) saveLocal("metabook.refuris",refuris,true);}

        function deviceSetup(){
            var useragent=navigator.userAgent;
            var device=fdjtDevice;
            var body=document.body;
            if (Trace.startup>2) 
                fdjtLog("Starting device setup for %s",useragent);

            var started=fdjtTime();

            if ((!(device.touch))&&(getQuery("touch")))
                device.touch=getQuery("touch");
            
            // Don't bubble from TapHold regions (by default)
            fdjt.TapHold.default_opts.bubble=false;
            
            if (device.touch) {
                fdjtDOM.addClass(body,"_TOUCH");
                fdjt.TapHold.default_opts.fortouch=true;
                metaBook.ui="touch";
                metaBook.touch=true;
                metaBook.keyboard=false;
                viewportSetup();}
            if ((device.android)&&(device.android>=3)) {
                default_config.keyboardhelp=false;
                metaBook.updatehash=false;
                metaBook.iscroll=false;}
            else if (device.android) {
                default_config.keyboardhelp=false;
                metaBook.updatehash=false;
                metaBook.iscroll=true;}
            else if ((useragent.search("Safari/")>0)&&
                     (useragent.search("Mobile/")>0)) { 
                hide_mobile_safari_address_bar();
                metaBook.iscroll=false;
                metaBook.updatehash=false;
                // Animation seems to increase crashes in iOS
                // metaBook.dontanimate=true;
                // default_config.layout='fastpage';
                default_config.keyboardhelp=false;
                // Have fdjtLog do it's own format conversion for the log
                fdjtLog.doformat=true;}
            else if (device.touch) {
                fdjtDOM.addClass(body,"_TOUCH");
                metaBook.ui="touch";}
            else if (!(metaBook.ui)) {
                // Assume desktop or laptop
                fdjtDOM.addClass(body,"_MOUSE");
                metaBook.ui="mouse";}
            else {}
            if (metaBook.iscroll) {
                fdjtDOM.addClass(body,"_ISCROLL");
                device.iscroll=true;}
            device.string=device.string+" "+
                ((metaBook.iscroll)?("iScroll"):("nativescroll"));
            if (Trace.startup>1) {
                fdjtLog("deviceSetup done in %dms: %s/%dx%d %s",
                        fdjtTime()-started,
                        metaBook.ui,fdjtDOM.viewWidth(),fdjtDOM.viewHeight(),
                        device.string);}}

        function bookSetup(){
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
            bookinfo.converted=fdjtID("SBOOKS.converted")||
                getMeta("SBOOKS.converted");
            if (Trace.startup>1)
                fdjtLog("bookSetup done in %dms",fdjtTime()-started);}
        function getBookInfo(){
            if (metaBook.bookinfo) return metaBook.bookinfo;
            else {bookSetup(); return metaBook.bookinfo;}}
        metaBook.getBookInfo=getBookInfo;
        
        function initUserOffline(){
            var refuri=metaBook.refuri;
            var user=getLocal("metabook.user");
            var sync=metaBook.sync;
            var nodeid=getLocal("metabook.nodeid("+refuri+")",true);
            // We store the information for the current user
            //  in both localStorage and in the "real" sourcedb.
            // We fetch the user from local storage because we
            //  can do that synchronously.
            var userinfo=user&&getLocal(user,true);
            if (Trace.storage)
                fdjtLog("initOffline user=%s sync=%s nodeid=%s info=%j",
                        user,sync,nodeid,userinfo);
            if (!(sync)) return;
            if (!(user)) return;
            if (Trace.startup>1)
                fdjtLog("initOffline userinfo=%j",userinfo);
            // Should these really be refs in sourcedb?
            var outlets=metaBook.outlets=
                getLocal("metabook.outlets("+refuri+")",true)||[];
            var layers=metaBook.layers=
                getLocal("metabook.layers("+refuri+")",true)||[];
            if (userinfo) setUser(userinfo,outlets,layers,sync);
            if (nodeid) setNodeID(nodeid);}

        var offline_init=false;

        function initGlossesOffline(){
            if (offline_init) return false;
            else offline_init=true;
            var sync=metaBook.sync;
            if (!(sync)) return;
            if ((Trace.glosses)||(Trace.startup))
                fdjtLog("Starting initializing glosses from local storage");
            metaBook.glosses.setLive(false);
            metaBook.sourcedb.load(true);
            metaBook.glossdb.load(true,function(){
                metaBook.glosses.setLive(true);
                if (metaBook.heartscroller)
                    metaBook.heartscroller.refresh();
                if ((metaBook.glossdb.allrefs.length)||
                    (metaBook.sourcedb.allrefs.length))
                    fdjtLog("Initialized %d glosses (%d sources) from local storage",
                            metaBook.glossdb.allrefs.length,
                            metaBook.sourcedb.allrefs.length);});}

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
            else metaBook.docroot=fdjtID("SBOOKCONTENT")||document.body;
            if (!(metaBook.start))
                if (getMeta("SBOOKS.start"))
                    metaBook.start=mbID(getMeta("SBOOKS.start"));
            else if (fdjtID("SBOOKSTART"))
                metaBook.start=fdjtID("SBOOKSTART");
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

        function applyMetaClass(name){
            var meta=getMeta(name,true);
            var i=0; var lim=meta.length;
            while (i<lim) fdjtDOM.addClass(fdjtDOM.$(meta[i++]),name);}

        // Console input and evaluation
        // These are used by the input handlers of the console log
        var input_console=false, input_button=false;
        
        /* Console methods */
        function console_eval(){
            /* jshint evil: true */
            fdjtLog("Executing %s",input_console.value);
            var result=eval(input_console.value);
            var string_result=
                ((result.nodeType)?
                 (fdjtString("%o",result)):
                 (fdjtString("%j",result)));
            fdjtLog("Result is %s",string_result);}
        function consolebutton_click(evt){
            if (Trace.gesture>1) fdjtLog("consolebutton_click %o",evt);
            console_eval();}
        function consoleinput_keypress(evt){
            evt=evt||window.event;
            if (evt.keyCode===13) {
                if (!(evt.ctrlKey)) {
                    fdjtUI.cancel(evt);
                    console_eval();
                    if (evt.shiftKey) input_console.value="";}}}

        function setupScroller(div){
            var c=fdjtDOM("div");
            var children=div.childNodes; var cnodes=[];
            var i=0, lim=children.length; while (i<lim)
                cnodes.push(children[i++]);
            i=0; while (i<lim) c.appendChild(cnodes[i++]);
            div.appendChild(c);
            return new iScroll(div);}

        // Cover setup
        function setupCover(){
            var frame=fdjtID("METABOOKFRAME"), started=fdjtTime();
            var cover=fdjtDOM("div#METABOOKCOVER.metabookcover");
            var existing_cover=fdjtID("METABOOKCOVER");
            if (Trace.startup>2) fdjtLog("Setting up cover");
            if (!(frame)) {
                frame=fdjtDOM("div#METABOOKFRAME");
                fdjtDOM.prepend(document.body,frame);}
            metaBook.Frame=frame;
            cover.innerHTML=fixStaticRefs(metaBook.HTML.cover);
            
            var coverpage=fdjtID("METABOOKCOVERPAGE")||
                fdjtID("METABOOKBOOKCOVER")||
                fdjtID("METABOOKCOVERHOLDER")||
                fdjtID("METABOOKBOOKCOVERHOLDER");
            if (coverpage) {
                coverpage=coverpage.cloneNode(true);
                coverpage.id="METABOOKCOVERPAGE";
                coverpage.removeAttribute("style");}
            else if (fdjtID("SBOOKCOVERPAGE")) {
                coverpage=fdjtID("SBOOKCOVERPAGE").cloneNode(true);
                coverpage.removeAttribute("style");
                fdjtDOM.stripIDs(coverpage);}
            else if (metaBook.coverimage) {
                var coverimage=fdjtDOM.Image(metaBook.covermage);
                coverpage=fdjtDOM("div#METABOOKCOVERPAGE",coverimage);}
            else {}
            if (coverpage) {
                cover.setAttribute("data-defaultclass","coverpage");
                addClass(cover,"coverpage");
                addToCover(cover,coverpage);}

            var titlepage=fdjtID("METABOOKTITLEPAGE")||
                fdjtID("METABOOKTITLEPAGEHOLDER");
            if (titlepage) {
                titlepage=titlepage.cloneNode(true);
                titlepage.removeAttribute("style");
                titlepage.id="METABOOKTITLEPAGE";}
            else {
                titlepage=fdjtID("SBOOKSTITLEPAGE")||
                    fdjtID("SBOOKTITLEPAGE")||
                    fdjtID("TITLEPAGE");
                if (titlepage) {
                    titlepage=titlepage.cloneNode(true);
                    fdjtDOM.dropClass(
                        titlepage,/\b(codex|metabook)[A-Za-z0-9]+\b/);
                    fdjtDOM.stripIDs(titlepage);
                    titlepage.setAttribute("style","");}
                else {
                    var info=getBookInfo();
                    titlepage=fdjtDOM(
                        "div#METABOOKTITLEPAGE.sbooktitlepage",
                        fdjtDOM("DIV.title",info.title),
                        fdjtDOM("DIV.credits",
                                ((info.byline)?(fdjtDOM("DIV.byline",info.byline)):
                                 ((info.authors)&&(info.authors.length))?
                                 (fdjtDOM("DIV.author",info.authors[0])):
                                 (false))),
                        fdjtDOM("DIV.pubinfo",
                                ((info.publisher)&&
                                 (fdjtDOM("P",info.publisher)))));}}
            if (titlepage) addToCover(cover,titlepage);

            var creditspage=fdjtID("METABOOKCREDITSPAGE");
            if (creditspage)
                creditspage=creditspage.cloneNode(true);
            else {
                creditspage=fdjtID("SBOOKSCREDITSPAGE")||fdjtID("CREDITSPAGE");
                if (creditspage) {
                    creditspage=creditspage.cloneNode(true);
                    fdjtDOM.stripIDs(creditspage);
                    creditspage.removeAttribute("style");}}
            if ((creditspage)&&(hasAnyContent(creditspage))) {
                var curcredits=cover.getElementById("METABOOKCREDITSPAGE");
                if (curcredits)
                    curcredits.parentNode.replaceChild(creditspage,curcredits);
                else cover.appendChild(creditspage);}
            else creditspage=false;
            if (creditspage) addToCover(cover,creditspage);
            
            var aboutpage=fdjtID("METABOOKABOUTPAGE");
            if (aboutpage) {
                aboutpage=aboutpage.cloneNode(true);
                aboutpage.removeAttribute("style");}
            else {
                var about_book=fdjtID("SBOOKSABOUTPAGE");
                var about_author=fdjtID("SBOOKSABOUTAUTHORS")||
                    fdjtID("SBOOKSABOUTAUTHOR");
                if ((about_book)||(about_author))
                    aboutpage=fdjtDOM(
                        "div#METABOOKABOUTPAGE.metabookaboutpage",
                        "\n",about_book,"\n",about_author,"\n");}
            if (aboutpage) addToCover(cover,aboutpage);
            
            var settings=fdjtDOM("div#METABOOKSETTINGS");
            settings.innerHTML=fixStaticRefs(metaBook.HTML.settings);
            metaBook.DOM.settings=settings;
            if (settings) addToCover(cover,settings);
            
            var cover_help=fdjtDOM("div#METABOOKAPPHELP.metabookhelp");
            cover_help.innerHTML=fixStaticRefs(metaBook.HTML.help);
            if (cover_help) addToCover(cover,cover_help);
            
            var console=metaBook.DOM.console=fdjtDOM("div#METABOOKCONSOLE");
            if (Trace.startup>2) fdjtLog("Setting up console %o",console);
            console.innerHTML=fixStaticRefs(metaBook.HTML.console);
            metaBook.DOM.input_console=input_console=
                fdjtDOM.getChild(console,"TEXTAREA");
            metaBook.DOM.input_button=input_button=
                fdjtDOM.getChild(console,"span.button");
            input_button.onclick=consolebutton_click;
            input_console.onkeypress=consoleinput_keypress;
            if (console) addToCover(cover,console);
            
            var layers=fdjtDOM("div#METABOOKLAYERS");
            var sbooksapp=fdjtDOM("iframe#SBOOKSAPP");
            sbooksapp.setAttribute("frameborder",0);
            sbooksapp.setAttribute("scrolling","auto");
            layers.appendChild(sbooksapp);
            metaBook.DOM.sbooksapp=sbooksapp;
            if (layers) addToCover(cover,layers);
            
            var cc=fdjtID("METABOOKCOVERCONTROLS");
            if (cc) {
                if (!(coverpage)) addClass(cc,"nobookcover");
                if (aboutpage) addClass(cc,"haveaboutpage");
                if (creditspage) addClass(cc,"havecreditspage");}
            
            if (metaBook.touch)
                fdjtDOM.addListener(cover,"touchstart",cover_clicked);
            else fdjtDOM.addListener(cover,"click",cover_clicked);
        
            if (metaBook.iscroll) {
                metaBook.scrollers.about=setupScroller(aboutpage);
                metaBook.scrollers.help=setupScroller(cover_help);
                metaBook.scrollers.console=setupScroller(console);
                metaBook.scrollers.settings=setupScroller(settings);}
            
            if ((existing_cover)&&(existing_cover.parentNode===frame))
                frame.replaceChild(cover,existing_cover);
            else {
                frame.appendChild(cover); 
                if (existing_cover)
                    existing_cover.parentNode.removeChild(existing_cover);}
            
            metaBook.showCover();
        
            // Make the cover hidden by default
            metaBook.CSS.hidecover=fdjtDOM.addCSSRule(
                "#METABOOKCOVER","opacity: 0.0; z-index: -10; pointer-events: none; height: 0px; width: 0px;");
            if (Trace.startup>1)
                fdjtLog("Cover setup done in %dms",fdjtTime()-started);
            return cover;}
        metaBook.setupCover=setupCover;

        var toArray=fdjtDOM.toArray;
        function addToCover(cover,item){
            var children=toArray(cover.childNodes);
            var i=0, lim=children.length; while (i<lim) {
                var child=children[i++];
                if ((child.nodeType===1)&&
                    ((child.id===item.id)||(child.id===(item.id+"HOLDER")))) {
                    cover.replaceChild(item,child);
                    return;}}
            cover.appendChild(item);}

        function resizeCover(cover){
            if (!(cover)) cover=fdjt.ID("METABOOKCOVER");
            var style=cover.style, display=style.display, zindex=style.zIndex;
            var opacity=style.opacity, viz=style.visibility;
            var restore=0;
            if (!(cover.offsetHeight)) {
                restore=1; style.zIndex=-500; style.visibility='hidden';
                style.opacity=0; style.display='block';}
            fdjtDOM.adjustFonts(cover);
            var covertitle=fdjtID("METABOOKTITLEPAGE");
            if ((covertitle)&&
                (!(hasClass(covertitle,/\b(adjustfont|fdjtadjustfont)\b/))))
                fdjtDOM.adjustFontSize(covertitle);
            if (restore) {
                style.zIndex=zindex; style.display=display;
                style.opacity=opacity; style.visibility=viz;}}
        metaBook.resizeCover=resizeCover;

        var coverids={"bookcover": "METABOOKCOVERPAGE",
                      "titlepage": "METABOOKTITLEPAGE",
                      "bookcredits": "METABOOKCREDITSPAGE",
                      "aboutbook": "METABOOKABOUTBOOK",
                      "help": "METABOOKAPPHELP",
                      "settings": "METABOOKSETTINGS",
                      "layers": "METABOOKLAYERS"};

        function cover_clicked(evt){
            var target=fdjtUI.T(evt);
            var cover=fdjtID("METABOOKCOVER");
            if (fdjt.UI.isClickable(target)) return;
            if (!(hasParent(target,fdjtID("METABOOKCOVERCONTROLS")))) {
                if (!(hasParent(target,fdjtID("METABOOKCOVERMESSAGE")))) {
                    var section=target;
                    while ((section)&&(section.parentNode!==cover))
                        section=section.parentNode;
                    if ((section)&&(section.nodeType===1)&&
                        (section.scrollHeight>section.offsetHeight))
                        return;}
                metaBook.clearStateDialog();
                metaBook.hideCover();
                fdjtUI.cancel(evt);
                return;}
            var scan=target;
            while (scan) {
                if (scan===document.body) break;
                else if (scan.getAttribute("data-mode")) break;
                else scan=scan.parentNode;}
            var mode=scan.getAttribute("data-mode");
            // No longer have cover buttons be toggles
            /* 
               if ((mode)&&(cover.className===mode)) {
               if (cover.getAttribute("data-defaultclass"))
               cover.className=cover.getAttribute("data-defaultclass");
               else cover.className="bookcover";
               fdjt.UI.cancel(evt);
               return;}
            */
            if ((mode==="layers")&&
                (!(fdjtID("SBOOKSAPP").src))&&
                (!(metaBook.appinit)))
                metaBook.initIFrameApp();

            var curclass=cover.className;
            var cur=((curclass)&&(coverids[curclass])&&(fdjtID(coverids[curclass])));
            var nxt=((mode)&&(coverids[mode])&&(fdjtID(coverids[mode])));
            if ((cur)&&(nxt)) {
                cur.style.display='block';
                nxt.style.display='block';
                setTimeout(function(){
                    cur.style.display="";
                    nxt.style.display="";},
                           3000);}
            setTimeout(function(){
                if (Trace.mode)
                    fdjtLog("On %o, switching cover mode to %s from %s",
                            evt,mode,curclass);
                if (mode==="console") fdjtLog.update();
                cover.className=mode;
                metaBook.mode=mode;},
                       20);
            fdjt.UI.cancel(evt);}

        metaBook.addConfig("showconsole",function(name,value){
            if (value) addClass(document.body,"_SHOWCONSOLE");
            else dropClass(document.body,"_SHOWCONSOLE");});
        
        metaBook.addConfig("uisound",function(name,value){
            metaBook.uisound=(value)&&(true);});
        metaBook. addConfig("readsound",function(name,value){
            metaBook.readsound=(value)&&(true);});

        /* Initializing the body and content */

        function initBody(){
            var body=document.body, started=fdjtTime();
            var init_content=fdjtID("CODEXCONTENT");
            var content=(init_content)||(fdjtDOM("div#CODEXCONTENT"));
            var i, lim;
            if (Trace.startup>2) fdjtLog("Starting initBody");

            body.setAttribute("tabindex",1);
            /* Remove explicit constraints */
            body.style.fontSize=""; body.style.width="";

            // Save those DOM elements in a handy place
            metaBook.content=content;

            // Move all the notes together
            var notesblock=fdjtID("SBOOKNOTES")||
                fdjtDOM("div.sbookbackmatter#SBOOKNOTES");
            applyMetaClass("sbooknote");
            var note_counter=1;
            var allnotes=getChildren(content,".sbooknote");
            i=0; lim=allnotes.length; while (i<lim) {
                var notable=allnotes[i++];
                if (!(notable.id)) notable.id="METABOOKNOTE"+(note_counter++);
                var noteref=notable.id+"_REF";
                if (!(mbID(noteref))) {
                    var label=getChild(notable,"label")||
                        getChild(notable,"summary")||
                        getChild(notable,".sbooklabel")||
                        getChild(notable,".sbooksummary")||
                        getChild(notable,"span")||"Note";
                    var anchor=fdjtDOM.Anchor("#"+notable.id,"A",label);
                    anchor.rel="sbooknote";
                    anchor.id=noteref;
                    fdjtDOM.replace(notable,anchor);
                    fdjtDOM.append(notesblock,notable,"\n");}
                else fdjtDOM.append(notesblock,notable,"\n");}
            
            // Interpet links
            var notelinks=getChildren(
                body,"a[rel='sbooknote'],a[rel='footnote'],a[rel='endnote']");
            i=0; lim=notelinks.length; while (i<lim) {
                var ref=notelinks[i++];
                var href=ref.href;
                if (!(fdjtDOM.hasText(ref))) ref.innerHTML="Note";
                if ((href)&&(href[0]==="#")) {
                    addClass(fdjt.ID(href.slice(1)),"sbooknote");}}
            
            if (!(init_content)) {
                var children=[], childnodes=body.childNodes;
                i=0; lim=childnodes.length;
                while (i<lim) children.push(childnodes[i++]);
                i=0; while (i<lim) {
                    // Copy all of the content nodes
                    var child=children[i++];
                    if (child.nodeType!==1) content.appendChild(child);
                    else if ((child.id)&&(child.id.search("METABOOK")===0)) {}
                    else if (/(META|LINK|SCRIPT)/gi.test(child.tagName)) {}
                    else content.appendChild(child);}}
            // Append the notes block to the content
            if (notesblock.childNodes.length)
                fdjtDOM.append(content,"\n",notesblock,"\n");
            
            // Initialize cover and titlepage (if specified)
            metaBook.cover=metaBook.getCover();
            metaBook.titlepage=fdjtID("SBOOKTITLEPAGE");

            var pages=metaBook.pages=fdjtID("METABOOKPAGES")||
                fdjtDOM("div#METABOOKPAGES");
            var page=metaBook.page=fdjtDOM(
                "div#CODEXPAGE",
                fdjtDOM("div#METABOOKPAGINATING","Formatted ",
                        fdjtDOM("span#METABOOKPAGEPROGRESS",""),
                        " pages"),
                pages);
            
            metaBook.body=fdjtID("METABOOKBODY");
            if (!(metaBook.body)) {
                var cxbody=metaBook.body=
                    fdjtDOM("div#METABOOKBODY.metabookbody",content,page);
                if (metaBook.justify) addClass(cxbody,"metabookjustify");
                if (metaBook.bodysize)
                    addClass(cxbody,"metabookbodysize"+metaBook.bodysize);
                if (metaBook.bodyfamily)
                    addClass(cxbody,"metabookbodyfamily"+metaBook.bodyfamily);
                if (metaBook.bodyspacing)
                    addClass(cxbody,"metabookbodyspacing"+metaBook.bodyspacing);
                body.appendChild(cxbody);}
            else metaBook.body.appendChild(page);
            // Initialize the margins
            initMargins();
            if (Trace.startup>1)
                fdjtLog("initBody took %dms",fdjtTime()-started);
            metaBook.Timeline.initBody=fdjtTime();}

        function sizeContent(){
            var started=metaBook.sized=fdjtTime();
            var content=metaBook.content, page=metaBook.page, body=document.body;
            var view_height=fdjtDOM.viewHeight();
            var view_width=fdjtDOM.viewWidth();

            // Clear any explicit left/right settings to get at
            //  whatever the CSS actually specifies
            content.style.left=page.style.left='';
            content.style.right=page.style.right='';
            body.style.overflow='hidden';
            // Get geometry
            metaBook.sizeCodexPage();
            var geom=getGeometry(page,page.offsetParent,true);
            var fakepage=fdjtDOM("DIV.codexpage.curpage");
            page.appendChild(fakepage);
            // There might be a better way to get the .codexpage settings,
            //  but this seems to work.
            var fakepage_geom=getGeometry(fakepage,page,true);
            var inner_width=geom.inner_width;
            var inner_height=geom.inner_height;
            // The (-2) is for the two pixel wide border on the right side of
            //  the glossmark
            var page_margin=view_width-inner_width;
            var glossmark_offset=Math.floor(page_margin/2)+(-3)+
                fakepage_geom.right_border+
                geom.right_padding+geom.right_border;
            fdjtDOM.remove(fakepage);
            // var glossmark_offset=page_margin;
            // The 2 here is for the right border of the glossmark,
            // which appears as a vertical mark on the margin.
            if (metaBook.CSS.pagerule) {
                metaBook.CSS.pagerule.style.width=inner_width+"px";
                metaBook.CSS.pagerule.style.height=inner_height+"px";}
            else metaBook.CSS.pagerule=fdjtDOM.addCSSRule(
                "div.codexpage",
                "width: "+inner_width+"px; "+"height: "+inner_height+"px;");
            if (metaBook.CSS.glossmark_rule) {
                metaBook.CSS.glossmark_rule.style.marginRight=
                    (-glossmark_offset)+"px";}
            else metaBook.CSS.glossmark_rule=fdjtDOM.addCSSRule(
                "#CODEXPAGE .glossmark","margin-right: "+
                    (-glossmark_offset)+"px;");
            
            var shrinkrule=metaBook.CSS.shrinkrule;
            if (!(shrinkrule)) {
                shrinkrule=fdjtDOM.addCSSRule(
                    "body.mbSHRINK #CODEXPAGE,body.mbPREVIEW #CODEXPAGE, body.mbSKIMMING #CODEXPAGE", "");
                metaBook.CSS.shrinkrule=shrinkrule;}
            var sh=view_height-150;
            var vs=(sh/geom.height);
            if (vs>1) vs=1;
            shrinkrule.style[fdjtDOM.transform]="scale("+vs+","+vs+")";

            document.body.style.overflow='';
            if (Trace.startup>1)
                fdjtLog("Content sizing took %dms",fdjtTime()-started);}
        metaBook.sizeContent=sizeContent;
        
        /* Margin creation */

        function initMargins(){
            var topleading=fdjtDOM("div#SBOOKTOPLEADING.leading.top"," ");
            var bottomleading=
                fdjtDOM("div#SBOOKBOTTOMLEADING.leading.bottom"," ");
            topleading.metabookui=true; bottomleading.metabookui=true;
            
            var skimleft=document.createDocumentFragment();
            var skimright=document.createDocumentFragment();
            var holder=fdjtDOM("div");
            holder.innerHTML=fixStaticRefs(metaBook.HTML.pageleft);
            var nodes=toArray(holder.childNodes);
            var i=0, lim=nodes.length;
            while (i<lim) skimleft.appendChild(nodes[i++]);
            holder.innerHTML=fixStaticRefs(metaBook.HTML.pageright);
            nodes=toArray(holder.childNodes); i=0; lim=nodes.length;
            while (i<lim) skimright.appendChild(nodes[i++]);

            fdjtDOM.prepend(document.body,skimleft,skimright);

            window.scrollTo(0,0);
            
            // The better way to do this might be to change the stylesheet,
            //  but fdjtDOM doesn't currently handle that 
            var bgcolor=getBGColor(document.body)||"white";
            metaBook.backgroundColor=bgcolor;
            if (bgcolor==='transparent')
                bgcolor=fdjtDOM.getStyle(document.body).backgroundColor;
            if ((bgcolor)&&(bgcolor.search("rgba")>=0)) {
                if (bgcolor.search(/,\s*0\s*\)/)>0) bgcolor='white';
                else {
                    bgcolor=bgcolor.replace("rgba","rgb");
                    bgcolor=bgcolor.replace(/,\s*((\d+)|(\d+.\d+))\s*\)/,")");}}
            else if (bgcolor==="transparent") bgcolor="white";}

        var resizing=false;
        var resize_wait=false;
        var choosing_resize=false;
        
        function resizeHandler(evt){
            evt=evt||window.event;
            if (resize_wait) clearTimeout(resize_wait);
            if (choosing_resize) {
                fdjt.Dialog.close(choosing_resize);
                choosing_resize=false;}
            resize_wait=setTimeout(metabookResize,1000);}

        function metabookResize(){
            var layout=metaBook.layout;
            if (resizing) {
                clearTimeout(resizing); resizing=false;}
            metaBook.resizeHUD();
            metaBook.resizeCover();
            metaBook.scaleLayout(false);
            if (!(layout)) return;
            if ((window.outerWidth===outer_width)&&
                (window.outerHeight===outer_height)) {
                // Not a real change (we think), so just scale the
                // layout, don't make a new one.
                metaBook.scaleLayout(true);
                return;}
            // Set these values to the new one
            outer_width=window.outerWidth;
            outer_height=window.outerHeight;
            // Possibly a new layout
            var width=getGeometry(fdjtID("CODEXPAGE"),false,true).width;
            var height=getGeometry(fdjtID("CODEXPAGE"),false,true).inner_height;
            if ((layout)&&(layout.width===width)&&(layout.height===height))
                return;
            if ((layout)&&(layout.onresize)&&(!(metaBook.freezelayout))) {
                // This handles prompting for whether or not to update
                // the layout.  We don't prompt if the layout didn't
                // take very long (metaBook.long_layout_thresh) or is already
                // cached (metaBook.layoutCached()).
                if ((metaBook.long_layout_thresh)&&(layout.started)&&
                    ((layout.done-layout.started)<=metaBook.long_layout_thresh))
                    resizing=setTimeout(resizeNow,50);
                else if (metaBook.layoutCached())
                    resizing=setTimeout(resizeNow,50);
                else if (choosing_resize) {}
                else {
                    // This prompts for updating the layout
                    var msg=fdjtDOM("div.title","Update layout?");
                    // This should be fast, so we do it right away.
                    metaBook.scaleLayout();
                    choosing_resize=true;
                    // When a choice is made, it becomes the default
                    // When a choice is made to not resize, the
                    // choice timeout is reduced.
                    var choices=[
                        {label: "Yes",
                         handler: function(){
                             choosing_resize=false;
                             resize_default=true;
                             metaBook.layout_choice_timeout=10;
                             resizing=setTimeout(resizeNow,50);},
                         isdefault: resize_default},
                        {label: "No",
                         handler: function(){
                             choosing_resize=false;
                             resize_default=false;
                             metaBook.layout_choice_timeout=10;},
                         isdefault: (!(resize_default))}];
                    var spec={choices: choices,
                              timeout: (metaBook.layout_choice_timeout||
                                        metaBook.choice_timeout||20),
                              spec: "div.fdjtdialog.fdjtconfirm.updatelayout"};
                    choosing_resize=fdjtUI.choose(spec,msg);}}}

        function resizeNow(evt){
            if (resizing) clearTimeout(resizing);
            resizing=false;
            metaBook.sizeContent();
            metaBook.layout.onresize(evt);}
        
        function getBGColor(arg){
            var color=fdjtDOM.getStyle(arg).backgroundColor;
            if (!(color)) return false;
            else if (color==="transparent") return false;
            else if (color.search(/rgba/)>=0) return false;
            else return color;}

        /* Loading meta info (user, glosses, etc) */

        function loadInfo(info) {
            if (metaBook.nouser) {
                metaBook.setConnected(false);
                return;}
            if (window._sbook_loadinfo!==info)
                metaBook.setConnected(true);
            if (info.sticky) metaBook.persist=true;
            if (!(metaBook.user)) {
                if (info.userinfo)
                    setUser(info.userinfo,
                            info.outlets,info.layers,
                            info.sync);
                else {
                    if (getLocal("metabook.queued("+metaBook.refuri+")"))
                        metaBook.glossdb.load(
                            getLocal("metabook.queued("+metaBook.refuri+")",true));
                    fdjtID("METABOOKCOVER").className="bookcover";
                    addClass(document.body,"_NOUSER");}
                if (info.nodeid) setNodeID(info.nodeid);}
            else if (info.wronguser) {
                clearOffline();
                window.location=window.location.href;
                return;}
            else if ((info.userinfo)&&(metaBook.user)) {
                metaBook.user.importValue(info.userinfo);
                metaBook.user.save();
                setupUI4User();}
            if (info.mycopyid) {
                if ((metaBook.mycopyid)&&
                    (info.mycopid!==metaBook.mycopyid))
                    fdjtLog.warn("Mismatched mycopyids");
                else metaBook.mycopyid=info.mycopyid;}
            if (!(metaBook.docinfo)) { /* Scan not done */
                metaBook.scandone=function(){loadInfo(info);};
                return;}
            else if (info.loaded) return;
            if ((window._sbook_loadinfo)&&
                (window._sbook_loadinfo!==info)) {
                // This means that we have more information from the gloss
                // server before the local app has gotten around to
                // processing  the app-cached loadinfo.js
                // In this case, we put it in _sbook_new_loadinfo
                window._sbook_newinfo=info;
                return;}
            var refuri=metaBook.refuri;
            if ((metaBook.persist)&&(metaBook.cacheglosses)&&
                (info)&&(info.userinfo)&&(metaBook.user)&&
                (info.userinfo._id!==metaBook.user._id)) {
                clearOffline();}
            info.loaded=fdjtTime();
            if ((!(metaBook.localglosses))&&
                ((getLocal("metabook.sync("+refuri+")"))||
                 (getLocal("metabook.queued("+refuri+")"))))
                initGlossesOffline();
            if (Trace.glosses) {
                fdjtLog("loadInfo for %d %sglosses and %d refs (sync=%d)",
                        ((info.glosses)?(info.glosses.length):(0)),
                        ((metaBook.sync)?("updated "):("")),
                        ((info.etc)?(info.etc.length):(0)),
                        info.sync);
                fdjtLog("loadInfo got %d sources, %d outlets, and %d layers",
                        ((info.sources)?(info.sources.length):(0)),
                        ((info.outlets)?(info.outlets.length):(0)),
                        ((info.layers)?(info.layers.length):(0)));}
            if ((info.glosses)||(info.etc))
                initGlosses(info.glosses||[],info.etc||[],
                            function(){infoLoaded(info);});
            if (metaBook.glosses) metaBook.glosses.update();}
        metaBook.loadInfo=loadInfo;

        function infoLoaded(info){
            var keepdata=(metaBook.cacheglosses);
            if (info.etc) gotInfo("etc",info.etc,keepdata);
            if (info.sources) gotInfo("sources",info.sources,keepdata);
            if (info.outlets) gotInfo("outlets",info.outlets,keepdata);
            if (info.layers) gotInfo("layers",info.layers,keepdata);
            addOutlets2UI(info.outlets);
            if ((info.sync)&&((!(metaBook.sync))||(info.sync>=metaBook.sync))) {
                metaBook.setSync(info.sync);}
            metaBook.loaded=info.loaded=fdjtTime();
            if (metaBook.whenloaded) {
                var whenloaded=metaBook.whenloaded;
                metaBook.whenloaded=false;
                setTimeout(whenloaded,10);}
            if (keepdata) {
                metaBook.glossdb.save(true);
                metaBook.sourcedb.save(true);}
            if (metaBook.glosshash) {
                if (metaBook.showGloss(metaBook.glosshash))
                    metaBook.glosshash=false;}}

        var updating=false;
        var noajax=false;
        function updatedInfo(data,source,start){
            var user=metaBook.user;
            if ((Trace.network)||
                ((Trace.glosses)&&(data.glosses)&&(data.glosses.length))||
                ((Trace.startup)&&
                 ((!(user))||
                  ((metaBook.update_interval)&&
                   (!(metaBook.ticktock))&&
                   (Trace.startup))))) {
                if (start)
                    fdjtLog("Response (%dms) from %s",fdjtTime()-start,source||metaBook.server);
                else fdjtLog("Response from %s",source||metaBook.server);}
            updating=false; loadInfo(data);
            if ((!(user))&&(metaBook.user)) userSetup();
            else if (metaBook._ui_setup) setupUI4User();}
        metaBook.updatedInfo=updatedInfo;
        function updateInfo(callback,jsonp){
            var user=metaBook.user; var start=fdjtTime();
            var uri="https://"+metaBook.server+"/v1/loadinfo.js?REFURI="+
                encodeURIComponent(metaBook.refuri);
            var ajax_headers=((metaBook.sync)?({}):(false));
            if (metaBook.sync) ajax_headers["If-Modified-Since"]=((new Date(metaBook.sync*1000)).toString());
            function gotInfo(req){
                updating=false;
                metaBook.authkey=false; // No longer needed, we should have our own authentication keys
                var response=JSON.parse(req.responseText);
                if ((response.glosses)&&(response.glosses.length))
                    fdjtLog("Received %d glosses from the server",response.glosses.length);
                metaBook.updatedInfo(response,uri+((user)?("&SYNCUSER="+user._id):("&JUSTUSER=yes")),start);
                if (user) {
                    // If there was already a user, just startup
                    //  regular updates now
                    if ((!(ticktock))&&(metaBook.update_interval)) 
                        metaBook.ticktock=ticktock=
                        setInterval(updateInfo,metaBook.update_interval*1000);}
                else if (metaBook.user)
                    // This response gave us a user, so we start
                    //  another request, which will get glosses.  The
                    //  response to this request will start the
                    //  interval timer.
                    setTimeout(updateInfo,50);
                else {
                    // The response back didn't give us any user information
                    fdjtLog.warn("Couldn't determine user!");}}
            function ajaxFailed(req){
                if ((req.readyState===4)&&(req.status<500)) {
                    fdjtLog.warn(
                        "Ajax call to %s failed on callback, falling back to JSONP",
                        uri);
                    updateInfoJSONP(uri+((user)?(""):("&JUSTUSER=yes")),jsonp);
                    noajax=true;}
                else if (req.readyState===4) {
                    try {
                        fdjtLog.warn(
                            "Ajax call to %s returned status %d %j, taking a break",
                            uri,req.status,JSON.parse(req.responseText));}
                    catch (ex) {
                        fdjtLog.warn(
                            "Ajax call to %s returned status %d, taking a break",
                            uri,req.status);}
                    if (ticktock) {
                        clearInterval(metaBook.ticktock);
                        metaBook.ticktock=ticktock=false;}
                    setTimeout(updateInfo,30*60*1000);}}
            if ((updating)||(!(navigator.onLine))) return; else updating=true;
            // Get any requested glosses and add them to the call
            var i=0, lim, glosses=getQuery("GLOSS",true); {
                i=0; lim=glosses.length; while (i<lim) uri=uri+"&GLOSS="+glosses[i++];}
            glosses=getHash("GLOSS"); {
                i=0; lim=glosses.length; while (i<lim) uri=uri+"&GLOSS="+glosses[i++];}
            if (metaBook.mycopyid) uri=uri+"&MCOPYID="+encodeURIComponent(metaBook.mycopyid);
            if (metaBook.authkey) uri=uri+"&SBOOKS%3aAUTH-="+encodeURIComponent(metaBook.authkey);
            if (metaBook.sync) uri=uri+"&SYNC="+(metaBook.sync+1);
            if (user) uri=uri+"&SYNCUSER="+user._id;
            if ((!(user))&&(Trace.startup))
                fdjtLog("Requesting initial user information with %s using %s",
                        ((noajax)?("JSONP"):("Ajax")),uri);
            if (noajax) {
                updateInfoJSONP(uri+((user)?(""):("&JUSTUSER=yes")),jsonp);
                return;}
            try { fdjtAjax(gotInfo,uri+"&CALLBACK=return"+((user)?(""):("&JUSTUSER=yes")),[],
                           ajaxFailed,
                           ajax_headers);}
            catch (ex) {
                fdjtLog.warn(
                    "Ajax call to %s failed on transmission, falling back to JSONP",uri);
                updateInfoJSONP(uri);}}
        metaBook.updateInfo=updateInfo;
        function updatedInfoJSONP(data){
            var elt=fdjtID("METABOOKUPDATEINFO");
            metaBook.updatedInfo(data,(((elt)&&(elt.src))||"JSON"));}
        metaBook.updatedInfoJSONP=updatedInfoJSONP;
        function updateInfoJSONP(uri,callback){
            if (!(navigator.onLine)) return;
            if (!(callback)) callback="metaBook.updatedInfoJSONP";
            var elt=fdjtID("METABOOKUPDATEINFO");
            if (uri.indexOf('?')>0) {
                if (uri[uri.length-1]!=='&') uri=uri+"&";}
            else uri=uri+"?";
            uri=uri+"CALLBACK="+callback;
            var update_script=fdjtDOM("script#METABOOKUPDATEINFO");
            update_script.language="javascript";
            update_script.type="text/javascript";
            update_script.setAttribute("charset","utf-8");
            update_script.setAttribute("async","async");
            if (metaBook.mycopyid)
                update_script.setAttribute("crossorigin","anonymous");
            else update_script.setAttribute("crossorigin","use-credentials");
            update_script.src=uri;
            if (elt) fdjtDOM.replace(elt,update_script);
            else document.body.appendChild(update_script);}

        function setUser(userinfo,outlets,layers,sync){
            var started=fdjtTime();
            fdjtLog("Setting up user %s (%s)",userinfo._id,
                    userinfo.name||userinfo.email);
            if (userinfo) {
                fdjtDOM.dropClass(document.body,"_NOUSER");
                fdjtDOM.addClass(document.body,"_USER");}
            if (metaBook.user) {
                if (userinfo._id===metaBook.user._id) {}
                else throw { error: "Can't change user"};}
            var cursync=metaBook.sync;
            if ((cursync)&&(cursync>sync)) {
                fdjtLog.warn(
                    "Cached user information is newer (%o) than loaded (%o)",
                    cursync,sync);}
            if ((navigator.onLine)&&(getLocal("metabook.queued("+metaBook.refuri+")")))
                metaBook.writeQueuedGlosses();
            metaBook.user=metaBook.sourcedb.Import(
                userinfo,false,RefDB.REFLOAD|RefDB.REFSTRINGS|RefDB.REFINDEX);
            if (outlets) metaBook.outlets=outlets;
            if (layers) metaBook.layers=layers;
            // No callback needed
            metaBook.user.save();
            saveLocal("metabook.user",metaBook.user._id);
            // We also save it locally so we can get it synchronously
            saveLocal(metaBook.user._id,metaBook.user.Export(),true);
            if (metaBook.locsync) setConfig("locsync",true);
            
            if (Trace.startup) {
                var now=fdjtTime();
                fdjtLog("setUser %s (%s) done in %dms",
                        userinfo._id,userinfo.name||userinfo.email,
                        now-started);}
            metaBook._user_setup=fdjtTime();
            // This sets up for local storage, now that we have a user 
            if (metaBook.cacheglosses) metaBook.cacheGlosses(true);
            if (metaBook._ui_setup) setupUI4User();
            return metaBook.user;}
        metaBook.setUser=setUser;
        
        function setNodeID(nodeid){
            var refuri=metaBook.refuri;
            if (!(metaBook.nodeid)) {
                metaBook.nodeid=nodeid;
                if ((nodeid)&&(metaBook.persist))
                    setLocal("metabook.nodeid("+refuri+")",nodeid,true);}}
        metaBook.setNodeID=setNodeID;

        function setupUI4User(){
            var i=0, lim;
            if (Trace.startup>1) fdjtLog("Starting UI setup for user");
            var startui=fdjtTime();
            if (!(metaBook.user)) {
                fdjtDOM.addClass(document.body,"_NOUSER");
                return;}
            fdjtDOM.dropClass(document.body,"_NOUSER");
            var username=metaBook.user.name||metaBook.user.handle||metaBook.user.email;
            if (username) {
                if (fdjtID("METABOOKUSERNAME"))
                    fdjtID("METABOOKUSERNAME").innerHTML=username;
                if (fdjtID("CODEXUSERNAME"))
                    fdjtID("CODEXUSERNAME").innerHTML=username;
                var names=document.getElementsByName("METABOOKUSERNAME");
                if ((names)&&(names.length)) {
                    i=0; lim=names.length; while (i<lim)
                        names[i++].innerHTML=username;}
                names=document.getElementsByName("CODEXUSERNAME");
                if ((names)&&(names.length)) {
                    i=0; lim=names.length; while (i<lim)
                        names[i++].innerHTML=username;}
                names=fdjtDOM.$(".metabookusername");
                if ((names)&&(names.length)) {
                    i=0; lim=names.length; while (i<lim)
                        names[i++].innerHTML=username;}
                names=fdjtDOM.$(".codexusername");
                if ((names)&&(names.length)) {
                    i=0; lim=names.length; while (i<lim)
                        names[i++].innerHTML=username;}}
            if (fdjtID("SBOOKMARKUSER"))
                fdjtID("SBOOKMARKUSER").value=metaBook.user._id;
            
            /* Initialize add gloss prototype */
            var ss=metaBook.stylesheet;
            var form=fdjtID("METABOOKADDGLOSSPROTOTYPE");
            if (metaBook.user.fbid)  
                ss.insertRule(
                    "#METABOOKHUD span.facebook_share { display: inline;}",
                    ss.cssRules.length);
            if (metaBook.user.twitterid) 
                ss.insertRule(
                    "#METABOOKHUD span.twitter_share { display: inline;}",
                    ss.cssRules.length);
            if (metaBook.user.linkedinid) 
                ss.insertRule(
                    "#METABOOKHUD span.linkedin_share { display: inline;}",
                    ss.cssRules.length);
            if (metaBook.user.googleid) 
                ss.insertRule(
                    "#METABOOKHUD span.google_share { display: inline;}",
                    ss.cssRules.length);
            var maker=fdjtDOM.getInput(form,"MAKER");
            if (maker) maker.value=metaBook.user._id;
            var pic=
                (metaBook.user.pic)||
                ((metaBook.user.fbid)&&
                 ("https://graph.facebook.com/"+metaBook.user.fbid+
                  "/picture?type=square"));
            if (pic) {
                if (fdjtID("SBOOKMARKIMAGE")) fdjtID("SBOOKMARKIMAGE").src=pic;
                if (fdjtID("METABOOKUSERPIC")) fdjtID("METABOOKUSERPIC").src=pic;
                var byname=document.getElementsByName("METABOOKUSERPIC");
                if (byname) {
                    i=0; lim=byname.length; while (i<lim)
                        byname[i++].src=pic;}}
            var idlinks=document.getElementsByName("IDLINK");
            if (idlinks) {
                i=0; lim=idlinks.length; while (i<lim) {
                    var idlink=idlinks[i++];
                    idlink.target='_blank';
                    idlink.title='click to edit your personal information';
                    idlink.href='https://auth.sbooks.net/my/profile';}}
            if (metaBook.user.friends) {
                var friends=metaBook.user.friends; var sourcedb=metaBook.sourcedb;
                i=0; lim=friends.length; while (i<lim) {
                    var friend=RefDB.resolve(friends[i++],sourcedb);
                    metaBook.addTag2Cloud(friend,metaBook.gloss_cloud);
                    metaBook.addTag2Cloud(friend,metaBook.share_cloud);}}
            if (Trace.startup) {
                var now=fdjtTime();
                fdjtLog("setUser %s (%s), UI setup took %dms",
                        metaBook.user._id,metaBook.user.name||metaBook.user.email,
                        now-startui);}
            metaBook._user_ui_setup=true;}

        function loginUser(info){
            metaBook.user=metaBook.sourcedb.Import(
                info,false,RefDB.REFLOAD|RefDB.REFSTRINGS|RefDB.REFINDEX);
            setupUI4User();
            metaBook._user_setup=false;}
        metaBook.loginUser=loginUser;
        
        function gotItem(item,qids){
            if (typeof item === 'string') {
                var load_ref=metaBook.sourcedb.ref(item);
                if (metaBook.persist) load_ref.load();
                qids.push(load_ref._id);}
            else {
                var import_ref=metaBook.sourcedb.Import(
                    item,false,
                    RefDB.REFLOAD|RefDB.REFSTRINGS|RefDB.REFINDEX);
                import_ref.save();
                qids.push(import_ref._id);}}
        function saveItems(qids,name){
            var refuri=metaBook.refuri;
            metaBook[name]=qids;
            if (metaBook.cacheglosses)
                saveLocal("metabook."+name+"("+refuri+")",qids,true);}
        
        // Processes info loaded remotely
        function gotInfo(name,info,persist) {
            if (info) {
                if (info instanceof Array) {
                    var qids=[];
                    if (info.length<7) {
                        var i=0; var lim=info.length; 
                        while (i<lim) gotItem(info[i++],qids);
                        saveItems(qids,name);}
                    else fdjtTime.slowmap(function(item){gotItem(item,qids);},
                                          info,false,
                                          function(){saveItems(qids,name);});}
                else {
                    var ref=metaBook.sourcedb.Import(
                        info,false,
                        RefDB.REFLOAD|RefDB.REFSTRINGS|RefDB.REFINDEX);
                    if (persist) ref.save();
                    metaBook[name]=ref._id;
                    if (persist) saveLocal(
                        "metabook."+name+"("+metaBook.refuri+")",ref._id,true);}}}

        function initGlosses(glosses,etc,callback){
            if (typeof callback === "undefined") callback=true;
            if ((glosses.length===0)&&(etc.length===0)) return;
            var msg=fdjtID("METABOOKNEWGLOSSES");
            var start=fdjtTime();
            if (msg) {
                msg.innerHTML=fdjtString(
                    "Assimilating %d new glosses",glosses.length);
                addClass(msg,"running");}
            if (etc) {
                if (glosses.length)
                    fdjtLog("Assimilating %d new glosses/%d sources...",
                            glosses.length,etc.length);}
            else if ((glosses.length)&&(Trace.glosses)) 
                fdjtLog("Assimilating %d new glosses...",glosses.length);
            else {}
            metaBook.sourcedb.Import(
                etc,false,RefDB.REFLOAD|RefDB.REFSTRINGS|RefDB.REFINDEX,true);
            metaBook.glossdb.Import(
                glosses,{"tags": Knodule.importTagSlot},
                RefDB.REFLOAD|RefDB.REFSTRINGS|RefDB.REFINDEX,
                callback);
            var i=0; var lim=glosses.length;
            var latest=metaBook.syncstamp||0;
            while (i<lim) {
                var gloss=glosses[i++];
                var tstamp=gloss.syncstamp||gloss.tstamp;
                if (tstamp>latest) latest=tstamp;}
            metaBook.syncstamp=latest;
            if (glosses.length)
                fdjtLog("Assimilated %d new glosses in %dms...",
                        glosses.length,fdjtTime()-start);
            dropClass(msg,"running");}
        metaBook.Startup.initGlosses=initGlosses;
        
        function go_online(){return offline_update();}
        function offline_update(){
            metaBook.writeQueuedGlosses(); updateInfo();}
        metaBook.update=offline_update;
        
        fdjtDOM.addListener(window,"online",go_online);

        function getLoc(x){
            var info=metaBook.getLocInfo(x);
            return ((info)&&(info.start));}
        var loc2pct=metaBook.location2pct;

        /* This initializes the sbook state to the initial location with the
           document, using the hash value if there is one. */ 
        function initLocation() {
            var state=metaBook.state;
            if (state) {}
            else {
                var target=fdjtID("METABOOKSTART")||fdjt.$1(".metabookstart")||
                    fdjtID("SBOOKSTART")||fdjt.$1(".sbookstart")||
                    fdjtID("SBOOKTITLEPAGE");
                if (target)
                    state={location: getLoc(target),
                           // This is the beginning of the 21st century
                           changed: 978307200};
                else state={location: 1,changed: 978307200};}
            metaBook.saveState(state,true,true);}
        metaBook.initLocation=initLocation;

        function resolveXState(xstate) {
            var state=metaBook.state;
            if (!(metaBook.sync_interval)) return;
            if (metaBook.statedialog) {
                if (Trace.state)
                    fdjtLog("resolveXState dialog exists: %o",
                            metaBook.statedialog);
                return;}
            if (Trace.state)
                fdjtLog("resolveXState state=%j, xstate=%j",state,xstate);
            if (!(state)) {
                metaBook.restoreState(xstate);
                return;}
            else if (xstate.maxloc>state.maxloc) {
                state.maxloc=xstate.maxloc;
                var statestring=JSON.stringify(state);
                var uri=metaBook.docuri;
                saveLocal("metabook.state("+uri+")",statestring);}
            else {}
            if (state.changed>=xstate.changed) {
                // The locally saved state is newer than the server,
                //  so we ignore the xstate (it might get synced
                //  separately)
                return;}
            var now=fdjtTime.tick();
            if ((now-state.changed)<(30)) {
                // If our state changed in the past 30 seconds, don't
                // bother changing the current state.
                return;}
            if (Trace.state) 
                fdjtLog("Resolving local state %j with remote state %j",
                        state,xstate);
            var msg1="Start at";
            var choices=[];
            var latest=xstate.location, farthest=xstate.maxloc;
            if (farthest>state.location)
                choices.push(
                    {label: "farthest @"+loc2pct(farthest),
                     title: "your farthest location on any device/app",
                     isdefault: false,
                     handler: function(){
                         metaBook.GoTo(xstate.maxloc,"sync");
                         state=metaBook.state; state.changed=fdjtTime.tick();
                         metaBook.saveState(state,true,true);
                         metaBook.hideCover();}});
            if ((latest!==state.location)&&(latest!==farthest))
                choices.push(
                    {label: ("latest @"+loc2pct(latest)),
                     title: "the most recent location on any device/app",
                     isdefault: false,
                     handler: function(){
                         metaBook.restoreState(xstate); state=metaBook.state;
                         state.changed=fdjtTime.tick();
                         metaBook.saveState(state,true,true);
                         metaBook.hideCover();}});
            if ((choices.length)&&(state.location!==0))
                choices.push(
                    {label: ("current @"+loc2pct(state.location)),
                     title: "the most recent location on this device",
                     isdefault: true,
                     handler: function(){
                         state.changed=fdjtTime.tick();
                         metaBook.saveState(state,true,true);
                         metaBook.hideCover();}});
            if (choices.length)
                choices.push(
                    {label: "stop syncing",
                     title: "stop syncing this book on this device",
                     handler: function(){
                         setConfig("locsync",false,true);}});
            if (Trace.state)
                fdjtLog("resolveXState choices=%j",choices);
            if (choices.length)
                metaBook.statedialog=fdjtUI.choose(
                    {choices: choices,cancel: true,timeout: 7,
                     nodefault: true,noauto: true,
                     onclose: function(){metaBook.statedialog=false;},
                     spec: "div.fdjtdialog.resolvestate#METABOOKRESOLVESTATE"},
                    fdjtDOM("div",msg1));}
        metaBook.resolveXState=resolveXState;

        function clearStateDialog(){
            if (metaBook.statedialog) {
                fdjt.Dialog.close(metaBook.statedialog);
                metaBook.statedialog=false;}}
        metaBook.clearStateDialog=clearStateDialog;

        /* Indexing tags */
        
        function indexingDone(){
            startupLog("Content indexing is completed");
            if (metaBook._setup) setupClouds();
            else metaBook.onsetup=setupClouds;}
        
        var cloud_setup_start=false;
        function setupClouds(){
            var tracelevel=Math.max(Trace.startup,Trace.clouds);
            var addTag2Cloud=metaBook.addTag2Cloud;
            var empty_cloud=metaBook.empty_cloud;
            var gloss_cloud=metaBook.gloss_cloud;
            cloud_setup_start=fdjtTime();
            metaBook.empty_query.results=
                [].concat(metaBook.glossdb.allrefs).concat(metaBook.docdb.allrefs);
            var searchtags=metaBook.searchtags=metaBook.empty_query.getCoTags();
            var empty_query=metaBook.empty_query;
            var tagfreqs=empty_query.tagfreqs;
            var max_freq=empty_query.max_freq;
            if (tracelevel)
                fdjtLog("Setting up initial tag clouds for %d tags",
                        searchtags.length);
            addClass(document.body,"mbINDEXING");
            fdjtDOM(empty_cloud.dom,
                    fdjtDOM("div.cloudprogress","Cloud Shaping in Progress"));
            addClass(empty_cloud.dom,"working");
            fdjtDOM(gloss_cloud.dom,
                    fdjtDOM("div.cloudprogress","Cloud Shaping in Progress"));
            addClass(gloss_cloud.dom,"working");
            fdjtTime.slowmap(function(tag){
                if (!(tag instanceof KNode)) return;
                var elt=addTag2Cloud(tag,empty_cloud,metaBook.knodule,
                                     metaBook.tagweights,tagfreqs,false);
                // Ignore section name tags
                if (tag._id[0]==="\u00a7") return;
                var freq=tagfreqs.get(tag);
                if ((tag.prime)||((freq>4)&&(freq<(max_freq/2)))||
                    (tag._db!==metaBook.knodule)) {
                    addClass(elt,"cue");
                    addTag2Cloud(tag,gloss_cloud);}},
                             searchtags,addtags_progress,addtags_done,
                             200,20);}
        
        function addtags_done(searchtags){
            var eq=metaBook.empty_query;
            var empty_cloud=metaBook.empty_cloud;
            var gloss_cloud=metaBook.gloss_cloud;
            if (Trace.startup>1)
                fdjtLog("Done populating clouds with %d tags",
                        searchtags.length);
            dropClass(document.body,"mbINDEXING");
            eq.cloud=empty_cloud;
            if (!(fdjtDOM.getChild(empty_cloud.dom,".showall")))
                fdjtDOM.prepend(empty_cloud.dom,
                                metaBook.UI.getShowAll(
                                    true,empty_cloud.values.length));
            metaBook.sortCloud(empty_cloud);
            metaBook.sortCloud(gloss_cloud);
            metaBook.sizeCloud(empty_cloud,metaBook.tagweights,[]);
            metaBook.sizeCloud(gloss_cloud,metaBook.tagweights,[]);}

        function addtags_progress(state,i,lim){
            var tracelevel=Math.max(Trace.startup,Trace.clouds);
            var pct=((i*100)/lim);
            if (state!=='after') return;
            if (tracelevel>1)
                startupLog("Added %d (%d%% of %d tags) to clouds",
                           i,Math.floor(pct),lim);
            fdjtUI.ProgressBar.setProgress("METABOOKINDEXMESSAGE",pct);
            fdjtUI.ProgressBar.setMessage(
                "METABOOKINDEXMESSAGE",fdjtString(
                    "Added %d tags (%d%% of %d) to clouds",
                    i,Math.floor(pct),lim));}
        
        var addTags=metaBook.addTags;
        
        /* Using the autoindex generated during book building */
        function useIndexData(autoindex,knodule,baseweight,whendone){
            var ntags=0, nitems=0;
            var allterms=metaBook.allterms, prefixes=metaBook.prefixes;
            var tagweights=metaBook.tagweights;
            var maxweight=metaBook.tagmaxweight, minweight=metaBook.tagminweight;
            var tracelevel=Math.max(Trace.startup,Trace.indexing);
            var alltags=[];
            if (!(autoindex)) {
                if (whendone) whendone();
                return;}
            for (var tag in autoindex) {
                if (tag[0]==="_") continue;
                else if (!(autoindex.hasOwnProperty(tag))) continue;
                else alltags.push(tag);}
            function handleIndexEntry(tag){
                var ids=autoindex[tag]; ntags++;
                var occurrences=[];
                var bar=tag.indexOf('|'), tagstart=tag.search(/[^*~]/);
                var taghead=tag, tagterm=tag, knode=false, weight=false;
                if (bar>0) {
                    taghead=tag.slice(0,bar);
                    tagterm=tag.slice(tagstart,bar);}
                else tagterm=taghead=tag.slice(tagstart);
                if (tag[0]!=='~')
                    knode=metaBook.knodule.handleSubjectEntry(tag);
                else knode=metaBook.knodule.probe(taghead)||
                    metaBook.knodule.probe(tagterm);
                /* Track weights */
                if (knode) {
                    weight=knode.weight;
                    tagweights.set(knode,weight);}
                else if (bar>0) {
                    var body=tag.slice(bar);
                    var field_at=body.search("|:weight=");
                    if (field_at>=0) {
                        var end=body.indexOf('|',field_at+1);
                        weight=((end>=0)?
                                (parseFloat(body.slice(field_at+9,end))):
                                (parseFloat(body.slice(field_at+9))));
                        tagweights.set(tagterm,weight);}}
                else {}
                if (weight>maxweight) maxweight=weight;
                if (weight<minweight) minweight=weight;
                if (!(knode)) {
                    var prefix=((tagterm.length<3)?(tagterm):
                                (tagterm.slice(0,3)));
                    allterms.push(tagterm);
                    if (prefixes.hasOwnProperty(prefix))
                        prefixes[prefix].push(tagterm);
                    else prefixes[prefix]=[tagterm];}
                var i=0; var lim=ids.length; nitems=nitems+lim;
                while (i<lim) {
                    var idinfo=ids[i++];
                    var frag=((typeof idinfo === 'string')?
                              (idinfo):
                              (idinfo[0]));
                    var info=metaBook.docinfo[frag];
                    // Pointer to non-existent node.  Warn here?
                    if (!(info)) {
                        metaBook.missing_nodes.push(frag);
                        continue;}
                    if (typeof idinfo !== 'string') {
                        // When the idinfo is an array, the first
                        // element is the id itself and the remaining
                        // elements are the text strings which are the
                        // basis for the tag (we use this for
                        // highlighting).
                        var knodeterms=info.knodeterms, terms;
                        var tagid=((knode)?(knode._qid):(tagterm));
                        // If it's the regular case, we just assume that
                        if (!(info.knodeterms)) {
                            knodeterms=info.knodeterms={};
                            knodeterms[tagid]=terms=[];}
                        else if ((terms=knodeterms[tagid])) {}
                        else knodeterms[tagid]=terms=[];
                        var j=1; var jlim=idinfo.length;
                        while (j<jlim) {terms.push(idinfo[j++]);}}
                    occurrences.push(info);}
                addTags(occurrences,knode||taghead);}
            addClass(document.body,"mbINDEXING");
            fdjtTime.slowmap(
                handleIndexEntry,alltags,
                ((alltags.length>100)&&(tracelevel>1)&&(indexProgress)),
                function(state){
                    fdjtLog("Book index links %d keys to %d refs",ntags,nitems);
                    dropClass(document.body,"mbINDEXING");
                    metaBook.tagmaxweight=maxweight;
                    metaBook.tagminweight=minweight;
                    if (whendone) return whendone();
                    else return state;},
                200,10);}
        metaBook.useIndexData=useIndexData;
        function indexProgress(state,i,lim){
            if (state!=='suspend') return;
            // For chunks:
            var pct=(i*100)/lim;
            fdjtLog("Processed %d/%d (%d%%) of provided tags",
                    i,lim,Math.floor(pct));}
        
        /* Applying various tagging schemes */

        function applyMultiTagSpans() {
            var tags=fdjtDOM.$(".sbooktags");
            var i=0, lim=tags.length;
            while (i<lim) {
                var elt=tags[i++];
                var target=metaBook.getTarget(elt);
                var info=metaBook.docinfo[target.id];
                var tagtext=fdjtDOM.textify(elt);
                var tagsep=elt.getAttribute("tagsep")||";";
                var tagstrings=tagtext.split(tagsep);
                if (tagstrings.length) {
                    var j=0, jlim=tagstrings.length;
                    while (j<jlim) addTags(info,tagstrings[j++]);}}}
        function applyTagSpans() {
            var tags=fdjtDOM.$(".sbooktag");
            var i=0; var lim=tags.length;
            while (i<lim) {
                var tagelt=tags[i++];
                var target=metaBook.getTarget(tagelt);
                var info=metaBook.docinfo[target.id];
                var tagtext=fdjtDOM.textify(tagelt);
                addTags(info,tagtext);}}
        
        function applyAnchorTags() {
            var docinfo=metaBook.docinfo;
            var anchors=document.getElementsByTagName("A");
            if (!(anchors)) return;
            var i=0; var len=anchors.length;
            while (i<len) {
                if (anchors[i].rel==='tag') {
                    var elt=anchors[i++];
                    var cxt=elt;
                    while (cxt) if (cxt.id) break; else cxt=cxt.parentNode;
                    // Nowhere to store it?
                    if (!(cxt)) return;
                    var href=elt.href; var name=elt.name; var tag=false;
                    if (name) { // DTerm style
                        var def=elt.getAttribute('data-def')||
                            elt.getAttribute('data-def');
                        var title=elt.title;
                        if (def) {
                            if (def[0]==='|') tag=tag+def;
                            else tag=tag+"|"+def;}
                        else if (title) {
                            if (title[0]==='|') tag=name+title;
                            else if (title.indexOf('|')>0) {
                                tag=name+"|"+title;}
                            else tag=name+"|~"+title;}
                        else tag=name;}
                    else if (href) {
                        // Technorati style
                        var tagstart=(href.search(/[^\/]+$/));
                        tag=((tagstart<0)?(href):(href.slice(tagstart)));}
                    else {}
                    if (tag) {
                        var info=docinfo[cxt.id];
                        addTags(info,tag);}}
                else i++;}}
        
        /* Handling tag attributes */
        /* These are collected during the domscan; this is where the logic
           is implemented which applies header tags to section elements. */
        
        function applyTagAttributes(docinfo,whendone){
            var tracelevel=Math.max(Trace.startup,Trace.clouds);
            var tohandle=[]; var tagged=0;
            if ((Trace.startup>1)||(Trace.indexing>1))
                startupLog("Applying inline tag attributes from content");
            for (var eltid in docinfo) {
                var info=docinfo[eltid];
                if (info.atags) {tagged++; tohandle.push(info);}
                else if (info.sectag) tohandle.push(info);}
            if (((Trace.indexing)&&(tohandle.length))||
                (Trace.indexing>1)||(Trace.startup>1))
                fdjtLog("Indexing tag attributes for %d nodes",tohandle.length);
            fdjtTime.slowmap(
                handle_inline_tags,
                tohandle,
                ((tohandle.length>100)&&
                 (function(state,i,lim){
                     // For chunks:
                     if (!((state==='suspend')||(state==='finishing')))
                         return;
                     var pct=(i*100)/lim;
                     if (tracelevel>1)
                         fdjtLog("Processed %d/%d (%d%%) inline tags",
                                 i,lim,Math.floor(pct));
                     fdjtUI.ProgressBar.setProgress(
                         "METABOOKINDEXMESSAGE",pct);
                     fdjtUI.ProgressBar.setMessage(
                         "METABOOKINDEXMESSAGE",
                         fdjtString("Assimilated %d (%d%% of %d) inline tags",
                                    i,Math.floor(pct),lim));})),
                function(){
                    if (((Trace.indexing>1)&&(tohandle.length))||
                        (tohandle.length>24))
                        fdjtLog("Finished indexing tag attributes for %d nodes",
                                tohandle.length);
                    if (whendone) whendone();},
                200,5);}
        metaBook.applyTagAttributes=applyTagAttributes;
        
        function handle_inline_tags(info){
            if (info.atags) addTags(info,info.atags);
            if (info.sectag)
                addTags(info,info.sectag,"tags",metaBook.knodule);
            var knode=metaBook.knodule.ref(info.sectag);
            metaBook.tagweights.set(
                knode,metaBook.docdb.find('head',info).length);}
        
        /* Setting up the clouds */
        
        function addOutlets2UI(outlet){
            if (typeof outlet === 'string')
                outlet=metaBook.sourcedb.ref(outlet);
            if (!(outlet)) return;
            if (outlet instanceof Array) {
                var outlets=outlet;
                var i=0; var lim=outlets.length; while (i<lim)
                    addOutlets2UI(outlets[i++]);
                return;}
            if (!(outlet instanceof Ref)) return;
            var completion=fdjtDOM("span.completion.cue.source",outlet._id);
            function init(){
                completion.id="mbOUTLET"+outlet.humid;
                completion.setAttribute("data-value",outlet._id);
                completion.setAttribute("data-key",outlet.name);
                completion.innerHTML=outlet.name;
                if ((outlet.description)&&(outlet.nick))
                    completion.title=outlet.name+": "+
                    outlet.description;
                else if (outlet.description)
                    completion.title=outlet.description;
                else if (outlet.nick) completion.title=outlet.name;
                fdjtDOM("#METABOOKOUTLETS",completion," ");
                metaBook.share_cloud.addCompletion(completion);}
            if (outlet._live) init();
            else outlet.onLoad(init,"addoutlet2cloud");}
        
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
