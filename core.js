/* -*- Mode: Javascript; Character-encoding: utf-8; -*- */

/* ###################### metabook/core.js ###################### */

/* Copyright (C) 2009-2014 beingmeta, inc.
   This file implements a Javascript/DHTML web application for reading
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

/* Initialize these here, even though they should always be
   initialized before hand.  This will cause various code checkers to
   not generate unbound variable warnings when called on individual
   files. */
//var fdjt=((typeof fdjt !== "undefined")?(fdjt):({}));
//var Knodule=((typeof Knodule !== "undefined")?(Knodule):({}));
//var iScroll=((typeof iScroll !== "undefined")?(iScroll):({}));
//var fdjtMap=fdjt.Map;

var metaBook={
    mode: false,hudup: false,scrolling: false,query: false,
    head: false,target: false,glosstarget: false,location: false,
    root: false,start: false,HUD: false,locsync: false,
    user: false, loggedin: false, cxthelp: false,
    _setup: false,_user_setup: false,_gloss_setup: false,_social_setup: false,
    // Whether we have a real connection to the server
    connected: false,
    // Keeping track of paginated context
    curpage: false,curoff: false,curinfo: false, curbottom: false,
    // For tracking UI state
    last_mode: false, last_heartmode: "about", demo: false,
    // How long it takes a gesture to go from tap to hold
    taptapmsecs: 500, holdmsecs: 250, edgeclick: 50, pagesize: 250,
    dontanimate: false, nativeselect: false,
    // Ignore swipes shorter than this:
    minswipe: 7,
    // Control audio effects
    uisound: false, readsound: false,
    glossmodes: /(addtag)|(addoutlet)|(editdetail)|(hamburger)|(attach)/,
    // Various device properties which can effect behaviors
    fullheight: false, fullwidth: false, handheld: false,
    updatehash: true, iscroll: false,
    // This tracks missing node identifiers
    missing_nodes: [],
    // Whether to cache layouts locally; the value is a threshold
    // (in milliseconds) for when to cache
    cache_layout_thresh: 2500,
    // Ask about updating layouts which took longer than this
    //  many milliseconds to generate
    long_layout_thresh: 5000,
    // Whether to force new layouts
    forcelayout: false,
    // Whether layout is temporarily frozen, for example during text
    // input (on tablets, there may be extraneous resizes when the
    // on-screen keyboard appears)
    freezelayout: false,
    // Whether to locally store user information for offline availability
    persist: false,
    // Whether to locally save glosses, etc for offline availability,
    cacheglosses: false,
    // Which properties of the metaBook object to save
    saveprops: ["sources","outlets","layers","sync","nodeid","state"],
    // Whether to store glosses, etc for offline access and improved
    // performance.  This is no longer used, replaced by the two values
    // above.
    keepdata: false,
    // Dominant interaction mode
    mouse: true, touch: false, kbd: false,
    // Whether there is a keyboard
    keyboard: true,
    // This is a table for iScroll scrollers, when used
    scrollers: {},
    // Restrictions on excerpts
    min_excerpt: 3, max_excerpt: false,
    // These are the UUIDs of locally stored glosses which are queued
    //  to be saved when possible (online and connected).
    queued: [],
    // These are weights assigned to search tags
    tagweights: false, tagmaxweight: 0, tagminweight: 200000000,
    // This is the base URI for this document, also known as the REFURI
    // A document (for instance an anthology or collection) may include
    // several refuri's, but this is the default.
    refuri: false,
    // These are the refuris used in this document
    refuris: [],
    // This is the document URI, which is usually the same as the REFURI.
    docuri: false,
    // This is the unique signed DOC+USER identifier used by myCopy
    // social DRM
    mycopyid: false, 
    // This is the time of the last update
    syncstamp: false,
    // Number of milliseconds between gloss updates
    update_interval: 5*60*1000,
    // Number of milliseconds between location sync
    sync_interval: 15*1000,
    // Various handlers, settings, and status information for the
    // metaBook interface
    UI: {
        // This maps device types into sets of node->event handlers
        handlers: {mouse: {}, touch: {}, kbd: {}, ios: {}}},
    Debug: {},
    /* This is where HTML source strings for UI components are placed */
    HTML: {},
    /* This is where we store pointers into the DOM, CSS, and TapHold objects */
    DOM: {}, CSS: {}, TapHold: {},
    /* XTARGETS are procedures linked to fragment ids */
    xtargets: {},
    // Where various event timestamps are stored
    Timeline: {},
    // Word/phrase indexing structures
    allterms: [], prefixes: {},
    // What to trace, for debugging
    Trace: {
        startup: 0,       // Whether to trace startup
        config: 0,        // Whether to trace config setup/modification/etc
        mode: false,      // Whether to trace mode changes
        nav: false,       // Whether to trace book navigation
        domscan: 0,       // How much to trace initial DOM scanning
        search: 0,        // How much to trace searches
        clouds: 0,        // How much to trace cloud generation
        target: false,    // Whether to trace target changes
        toc: false,       // Whether we're debugging TOC tracking
        storage: 0,       // How much to trace offline persistence
        network: 0,       // How much to trace server interaction
        state: 0,         // Whether to trace state synchronization
        savegloss: 0,     // When glosses are saved to the server
        glosses: 0,       // How much we're tracing gloss processing
        addgloss: 0,      // Note whenever a gloss post completes
        layout: 0,        // How much to trace document layout
        knodules: 0,      // How much to trace knodule processing
        flips: false,     // Whether to trace page flips (movement by pages)
        messages: false,  // Whether to trace inter-window messages
        glossing: false,  // Whether to trace gloss adding or edition
        selection: false, // Whether to trace text selection events
        iscroll: false,   // Whether to trace HUD scrolling with iScroll
        highlight: 0,     // Whether to trace highlighting
        indexing: 0,      // How much to trace document indexing
        gestures: 0}      // How much to trace gestures
};

(function(){
    "use strict";

    var fdjtString=fdjt.String;
    var fdjtState=fdjt.State;
    var fdjtTime=fdjt.Time;
    var fdjtLog=fdjt.Log;
    var fdjtDOM=fdjt.DOM;
    var fdjtUI=fdjt.UI;
    var fdjtID=fdjt.ID;
    var RefDB=fdjt.RefDB, Ref=fdjt.Ref;
    var ObjectMap=fdjt.Map||RefDB.Map;

    var hasClass=fdjtDOM.hasClass;
    var addClass=fdjtDOM.addClass;
    var dropClass=fdjtDOM.dropClass;
    var hasParent=fdjtDOM.hasParent;

    var getLocal=fdjtState.getLocal;
    var setLocal=fdjtState.setLocal;
    
    var mB=metaBook;

    metaBook.tagweights=new ObjectMap();
    metaBook.tagscores=new ObjectMap();

    function hasLocal(key){
        if (metaBook.persist) return fdjtState.existsLocal(key);
        else return fdjtState.existsSession(key);}
    metaBook.hasLocal=hasLocal;
    function saveLocal(key,value,unparse){
        if (metaBook.persist) setLocal(key,value,unparse);
        else fdjtState.setSession(key,value,unparse);}
    metaBook.saveLocal=saveLocal;
    function readLocal(key,parse){
        if (metaBook.persist) return getLocal(key,parse)||
            fdjtState.getSession(key,parse);
        else return fdjtState.getSession(key,parse)||getLocal(key,parse);}
    metaBook.readLocal=readLocal;
    function clearLocal(key){
        fdjtState.dropLocal(key);
        fdjtState.dropSession(key);}
    metaBook.clearLocal=clearLocal;

    metaBook.focusBody=function(){
        // document.body.focus();
        };
    
    function initDB() {
        if (mB.Trace.start>1) fdjtLog("Initializing DB");
        var refuri=(metaBook.refuri||document.location.href);
        if (refuri.indexOf('#')>0) refuri=refuri.slice(0,refuri.indexOf('#'));

        metaBook.docdb=new RefDB(
            refuri+"#",{indices: ["frag","head","heads",
                                  "tags","tags*",
                                  "*tags","**tags","~tags",
                                  "*tags","**tags","~tags",
                                  "*tags*","**tags*","~tags*",
                                  "^tags","~^tags","*^tags","**^tags",
                                  "^tags*","~^tags*","*^tags*","**^tags*"]});
        
        var knodule_name=
            fdjtDOM.getMeta("SBOOKS.knodule")||
            fdjtDOM.getMeta("~KNODULE")||
            refuri;
        metaBook.knodule=new Knodule(knodule_name);
        Knodule.current=metaBook.knodule;
        metaBook.BRICO=new Knodule("BRICO");
        metaBook.BRICO.addAlias(":@1/");
        metaBook.BRICO.addAlias("@1/");
        var glosses_init={
            indices: ["frag","maker","outlets",
                      "tags","*tags","**tags",
                      "tags*","*tags*","**tags*"]};
        var stdspace=fdjtString.stdspace;
        metaBook.glossdb=new RefDB("glosses@"+metaBook.refuri,glosses_init); {
            metaBook.glossdb.absrefs=true;
            metaBook.glossdb.addAlias("glossdb");
            metaBook.glossdb.addAlias("-UUIDTYPE=61");
            metaBook.glossdb.addAlias(":@31055/");
            metaBook.glossdb.addAlias("@31055/");
            metaBook.glossdb.onLoad(function initGloss(item) {
                var info=metaBook.docinfo[item.frag];
                if (!(info)) {
                    fdjtLog("Gloss refers to nonexistent '%s': %o",
                            item.frag,item);
                    return;}
                if ((info)&&(info.starts_at)) {
                    item.starts_at=info.starts_at+(item.exoff||0);}
                if ((info)&&(info.ends_at)) {
                    if (item.excerpt)
                        item.ends_at=info.ends_at+(item.exoff||0)+
                        (stdspace(item.excerpt).length);
                    else item.ends_at=info.ends_at;}
                if ((!(item.maker))&&(metaBook.user)) item.maker=(metaBook.user);
                var addTags=metaBook.addTags, addTag2Cloud=metaBook.addTag2Cloud;
                var empty_cloud=metaBook.empty_cloud;
                var maker=(item.maker)&&(metaBook.sourcedb.ref(item.maker));
                if (maker) {
                    metaBook.addTag2Cloud(maker,metaBook.empty_cloud);
                    metaBook.UI.addGlossSource(maker,true);}
                var maker_knodule=metaBook.getMakerKnodule(item.maker);
                var make_cue=(maker===metaBook.user);
                var i, lim, sources=item.sources;
                if (sources) {
                    if (typeof sources === 'string') sources=[sources];
                    if ((sources)&&(sources.length)) {
                        i=0; lim=sources.length; while (i<lim) {
                            var source=sources[i++];
                            var ref=metaBook.sourcedb.ref(source);
                            metaBook.UI.addGlossSource(ref,true);}}}
                var alltags=item.alltags;
                if ((alltags)&&(alltags.length)) {
                    i=0; lim=alltags.length; while (i<lim) {
                        var each_tag=alltags[i++], entry;
                        entry=addTag2Cloud(each_tag,empty_cloud);
                        if ((make_cue)&&(entry)) addClass(entry,"cue");
                        entry=addTag2Cloud(each_tag,metaBook.gloss_cloud);
                        if ((make_cue)&&(entry)) addClass(entry,"cue");}
                    var tag_slots=["tags","*tags","**tags"];
                    var s=0, n_slots=tag_slots.length; while (s<n_slots) {
                        var tagslot=tag_slots[s++], tags=item[tagslot];
                        if ((tags)&&(tags.length)) {
                            var fragslot="+"+tagslot;
                            if (item.thread) {
                                addTags(item.thread,tags,fragslot);
                                if (item.replyto!==item.thread)
                                    addTags(item.replyto,tags,fragslot);}
                            if (info) addTags(info,tags,fragslot,maker_knodule);}}}},
                                 "initgloss");
            if ((metaBook.user)&&(metaBook.persist)&&(metaBook.cacheglosses))
                metaBook.glossdb.storage=window.localStorage;}
        
        function Gloss(){return Ref.apply(this,arguments);}
        Gloss.prototype=new Ref();
        
        var exportTagSlot=Knodule.exportTagSlot;
        var tag_export_rules={
            "*tags": exportTagSlot, "**tags": exportTagSlot,
            "~tags": exportTagSlot, "~~tags": exportTagSlot,
            "tags": exportTagSlot,
            "*tags*": exportTagSlot, "**tags*": exportTagSlot,
            "~tags*": exportTagSlot, "~~tags*": exportTagSlot,
            "tags*": exportTagSlot,
            "*tags**": exportTagSlot, "**tags**": exportTagSlot,
            "~tags**": exportTagSlot, "~~tags**": exportTagSlot,
            "tags**": exportTagSlot};
        metaBook.tag_export_rules=tag_export_rules;
        metaBook.tag_import_rules=tag_export_rules;

        // Use this when generating external summaries.  In particular,
        //  this recovers all of the separate weighted tag slots into
        //  one tags slot which uses prefixed strings to indicate weights.
        Gloss.prototype.ExportExternal=function exportGloss(){
            return Ref.Export.call(this,tag_export_rules);};

        metaBook.glossdb.refclass=Gloss;
        
        metaBook.sourcedb=new RefDB("sources@"+metaBook.refuri);{
            metaBook.sourcedb.absrefs=true;
            metaBook.sourcedb.oidrefs=true;
            metaBook.sourcedb.addAlias("@1961/");
            metaBook.sourcedb.addAlias(":@1961/");            
            metaBook.sourcedb.forDOM=function(source){
                var spec="span.source"+((source.kind)?".":"")+
                    ((source.kind)?(source.kind.slice(1).toLowerCase()):"");
                var name=source.name||source.oid||source.uuid||source.uuid;
                var span=fdjtDOM(spec,name);
                if (source.about) span.title=source.about;
                return span;};
            var anonymous=metaBook.sourcedb.ref("@1961/0");
            metaBook.anonymous=anonymous;
            anonymous.name="anonymous";}

        metaBook.queued=((metaBook.cacheglosses)&&
                      (getLocal("metabook.queued("+metaBook.refuri+")",true)))||[];

        function cacheGlosses(value){
            var saveprops=metaBook.saveprops, uri=metaBook.docuri;
            if (value) {
                if (metaBook.user) {
                    var storage=((metaBook.persist)?(window.localStorage):
                                 (window.sessionStorage));
                    if (!(metaBook.sourcedb.storage)) metaBook.sourcedb.storage=storage;
                    if (!metaBook.glossdb.storage) metaBook.glossdb.storage=storage;
                    var props=metaBook.saveprops, i=0, lim=props.length;
                    while (i<lim) {
                        var prop=saveprops[i++];
                        if (metaBook[prop]) saveLocal(
                            "metabook."+prop+"("+uri+")",metaBook[prop],true);}
                    metaBook.glossdb.save(true);
                    metaBook.sourcedb.save(true);
                    if ((metaBook.queued)&&(metaBook.queued.length)) 
                        metaBook.queued=metaBook.queued.concat(
                            getLocal("metabook.queued("+uri+")",true)||[]);
                    else metaBook.queued=getLocal("metabook.queued("+uri+")",true)||[];}
                metaBook.cacheglosses=true;}
            else {
                clearOffline(metaBook.docuri);
                if (uri) fdjtState.dropLocal("metabook.queued("+uri+")");
                metaBook.queued=[];
                metaBook.cacheglosses=false;}}
        metaBook.cacheGlosses=cacheGlosses;
        
        /* Clearing offline data */

        function clearOffline(uri){
            var dropLocal=fdjtState.dropLocal;
            if (!(uri)) {
                dropLocal("metabook.user");
                if (metaBook.user) {
                    // For now, we clear layouts, because they might
                    //  contain personalized information
                    fdjt.CodexLayout.clearLayouts();}
                fdjtState.clearLocal();
                fdjtState.clearSession();}
            else {
                if (typeof uri !== "string") uri=metaBook.docuri;
                metaBook.sync=false;
                clearLocal("metabook.sources("+uri+")");
                clearLocal("metabook.outlets("+uri+")");
                clearLocal("metabook.layers("+uri+")");
                clearLocal("metabook.etc("+uri+")");
                // We don't currently clear sources when doing book
                // specific clearing because they might be shared
                // between books
                metaBook.glossdb.clearOffline(function(){
                    clearLocal("metabook.sync("+uri+")");});}}
        metaBook.clearOffline=clearOffline;
        
        function refreshOffline(){
            var uri=metaBook.docuri;
            metaBook.sync=false;
            clearLocal("metabook.sources("+uri+")");
            clearLocal("metabook.outlets("+uri+")");
            clearLocal("metabook.layers("+uri+")");
            clearLocal("metabook.etc("+uri+")");
            // We don't currently clear sources when doing book
            // specific clearing because they might be shared
            // between books
            metaBook.glossdb.clearOffline(function(){
                clearLocal("metabook.sync("+uri+")");
                setTimeout(metaBook.updateInfo,25);});}
             metaBook.refreshOffline=refreshOffline;

        function Query(tags,base_query){
            if (!(this instanceof Query))
                return new Query(tags,base_query);
            else if (arguments.length===0) return this;
            else {
                var query=Knodule.TagQuery.call(this,tags);
                if (mB.Trace.search) query.log={};
                return query;}}
        Query.prototype=new Knodule.TagQuery();
        Query.prototype.dbs=[metaBook.glossdb,metaBook.docdb];
        Query.prototype.weights={"tags": 4,"^tags": 2,"+tags": 8,"^+tags": 4};
        Query.prototype.uniqueids=true;
        metaBook.Query=Query;

        metaBook.query=metaBook.empty_query=new Query([]);

        if (mB.Trace.start>1) fdjtLog("Initialized DB");}
    metaBook.initDB=initDB;

    function getMakerKnodule(arg){
        var result;
        if (!(arg)) arg=metaBook.user;
        if (!(arg)) return (metaBook.knodule);
        else if (typeof arg === "string")
            return getMakerKnodule(metaBook.sourcedb.probe(arg));
        else if ((arg.maker)&&(arg.maker instanceof Ref))
            result=new Knodule(arg.maker.getQID());
        else if ((arg.maker)&&(typeof arg.maker === "string"))
            return getMakerKnodule(metaBook.sourcedb.probe(arg.maker));
        else if (arg._qid)
            result=new Knodule(arg._qid);
        else if (arg._id)
            result=new Knodule(arg._i);
        else result=metaBook.knodule;
        result.description=arg.name;
        return result;}
    metaBook.getMakerKnodule=getMakerKnodule;

    var trace1="%s %o in %o: mode%s=%o, target=%o, head=%o skimming=%o";
    var trace2="%s %o: mode%s=%o, target=%o, head=%o skimming=%o";
    function sbook_trace(handler,cxt){
        var target=((cxt.nodeType)?(cxt):(fdjtUI.T(cxt)));
        if (target)
            fdjtLog(trace1,handler,cxt,target,
                    ((metaBook.skimming)?("(skimming)"):""),metaBook.mode,
                    metaBook.target,metaBook.head,metaBook.skimming);
        else fdjtLog(trace2,handler,cxt,
                     ((metaBook.skimming)?("(skimming)"):""),metaBook.mode,
                     metaBook.target,metaBook.head,metaBook.skimming);}
    metaBook.trace=sbook_trace;

    // This is the hostname for the sbookserver.
    metaBook.server=false;
    // This is an array for looking up sbook servers.
    metaBook.servers=[[/.sbooks.net$/g,"glosses.sbooks.net"]];
    //metaBook.servers=[];
    // This is the default server
    metaBook.default_server="glosses.sbooks.net";
    // There be icons here!
    metaBook.root=fdjtDOM.getLink("METABOOK.staticroot")||
        "http://static.beingmeta.com/";
    if (metaBook.root[metaBook.root.length-1]!=="/")
        metaBook.root=metaBook.root+"/";
    metaBook.withsvg=document.implementation.hasFeature(
        "http://www.w3.org/TR/SVG11/feature#Image", "1.1")||
        navigator.mimeTypes["image/svg+xml"];
    metaBook.svg=fdjt.DOM.checkSVG();
    if (fdjtState.getQuery("nosvg")) metaBook.svg=false;
    else if (fdjtState.getQuery("withsvg")) metaBook.svg=true;
    metaBook.icon=function(base,width,height){
        return metaBook.root+"g/metabook/"+base+
            ((metaBook.svg)?(".svgz"):
             ((((width)&&(height))?(width+"x"+height):
               (width)?(width+"w"):(height)?(height+"h"):"")+
              ".png"));};

    function getRefURI(target){
        var scan=target;
        while ((scan)&&(scan!==document)) {
            if (scan.getAttribute("data-refuri"))
                return scan.getAttribute("data-refuri");
            else if ((scan.getAttributeNS)&&
                     (scan.getAttributeNS("refuri","http://sbooks.net/")))
                return scan.getAttributeNS("refuri","http://sbooks.net/");
            else if (scan.getAttribute("refuri"))
                return scan.getAttribute("refuri");
            else scan=scan.parentNode;}
        return metaBook.refuri;}
    metaBook.getRefURI=getRefURI;

    function getDocURI(target){
        var scan=target;
        while ((scan)&&(scan!==document)) {
            if (scan.getAttribute("data-docuri"))
                return scan.getAttribute("data-docuri");
            else if ((scan.getAttributeNS)&&
                     (scan.getAttributeNS("docuri","http://sbooks.net/")))
                return scan.getAttributeNS("docuri","http://sbooks.net/");
            else if (scan.getAttribute("docuri"))
                return scan.getAttribute("docuri");
            else scan=scan.parentNode;}
        return metaBook.docuri;}
    metaBook.getDocURI=getDocURI;

    metaBook.getRefID=function(target){
        if (target.getAttributeNS)
            return (target.getAttributeNS('sbookid','http://sbooks.net/'))||
            (target.getAttributeNS('sbookid'))||
            (target.getAttributeNS('data-sbookid'))||
            (target.codexbaseid)||(target.id);
        else return target.id;};

    /* A Kludge For iOS */

    /* This is a kludge to handle the fact that saving an iOS app
       to the home screen loses any authentication information
       (cookies, etc) that the original page might have had.  To
       avoid forcing the user to login again, we store the current
       SBOOKS:AUTH- token (the encrypted authentication token that
       can travel in the clear) in the .search (query string) of the
       current location.  This IS passed to the homescreen
       standalone app, so we can use it to get a real authentication
       token.*/
    function iosHomeKludge(){
        if ((!(metaBook.user))||(fdjt.device.standalone)||
            (!(fdjt.device.mobilesafari)))
            return;
        var auth=fdjtState.getCookie("SBOOKS:AUTH-");
        if (!(auth)) return;
        var eauth=encodeURIComponent(auth);
        var url=location.href, qmark=url.indexOf('?'), hashmark=url.indexOf('#');
        var base=((qmark<0)?((hashmark<0)?(url):(url.slice(0,hashmark))):
                  (url.slice(0,qmark)));
        var query=((qmark<0)?(""):(hashmark<0)?(url.slice(qmark)):
                   (url.slice(qmark+1,hashmark)));
        var hash=((hashmark<0)?(""):(url.slice(hashmark)));
        var old_query=false, new_query="SBOOKS%3aAUTH-="+eauth;
        if (query.length<=2) query="?"+new_query;
        else if (query.search("SBOOKS%3aAUTH-=")>=0) {
            var auth_start=query.search("SBOOKS%3aAUTH-=");
            var before=query.slice(0,auth_start);
            var auth_len=query.slice(auth_start).search('&');
            var after=((auth_len<0)?(""):(query.slice(auth_start+auth_len)));
            old_query=((auth_len<0)?(query.slice(auth_start)):
                       (query.slice(auth_start,auth_start+auth_len)));
            query=before+new_query+after;}
        else query=query+"&"+new_query;
        if ((!(old_query))||(old_query!==new_query))
            history.replaceState(history.state,window.title,
                                 base+query+hash);}

    var ios_kludge_timer=false;
    function updateKludgeTimer(){
        if (document[fdjtDOM.isHidden]) {
            if (ios_kludge_timer) {
                clearInterval(ios_kludge_timer);
                ios_kludge_timer=false;}}
        else if (ios_kludge_timer) {}
        else ios_kludge_timer=
            setInterval(function(){
                if ((metaBook.user)&&(!(fdjt.device.standalone))&&
                    (!(document[fdjtDOM.isHidden]))&&
                    (fdjt.device.mobilesafari))
                    iosHomeKludge();},
                        300000);}
    function setupKludgeTimer(){
        updateKludgeTimer();
        if (fdjtDOM.isHidden)
            fdjtDOM.addListener(document,fdjtDOM.vischange,
                                updateKludgeTimer);
        updateKludgeTimer();}
    if ((!(fdjt.device.standalone))&&(fdjt.device.mobilesafari))
        fdjt.addInit(setupKludgeTimer,"setupKludgeTimer");
    
    function getHead(target){
        /* First, find some relevant docinfo */
        var targetid=(target.codexbaseid)||(target.id);
        if ((targetid)&&(metaBook.docinfo[targetid]))
            target=metaBook.docinfo[targetid];
        else if (targetid) {
            while (target)
                if ((target.id)&&(metaBook.docinfo[targetid])) {
                    target=metaBook.docinfo[targetid]; break;}
            else target=target.parentNode;}
        else {
            /* First, try scanning forward to find a non-empty node */
            var scan=target.firstChild; var scanid=false;
            var next=target.nextNode;
            while ((scan)&&(scan!==next)) {
                if ((scan.id)||(scan.codexbaseid)) break;
                if ((scan.nodeType===3)&&
                    (!(fdjtString.isEmpty(scan.nodeValue)))) break;
                scan=fdjtDOM.forward(scan);}
            /* If you found something, use it */
            if ((scan)&&(scan.id)&&(scan!==next))
                target=metaBook.docinfo[scanid];
            else {
                while (target)
                    if ((targetid=((target.codexbaseid)||(target.id)))&&
                        (metaBook.docinfo[targetid])) {
                        target=metaBook.docinfo[targetid]; break;}
                else target=target.parentNode;}}
        if (target) {
            if (target.level)
                return mbID(target.frag);
            else if (target.head)
                return mbID(target.head.frag);
            else return false;}
        else return false;}
    metaBook.getHead=getHead;

    metaBook.getRef=function(target){
        while (target)
            if (target.about) break;
        else if ((target.getAttribute)&&(target.getAttribute("about"))) break;
        else target=target.parentNode;
        if (target) {
            var ref=((target.about)||(target.getAttribute("about")));
            if (!(target.about)) target.about=ref;
            if (ref[0]==='#')
                return mbID(ref.slice(1));
            else return mbID(ref);}
        else return false;};
    metaBook.getRefElt=function(target){
        while (target)
            if ((target.about)||
                ((target.getAttribute)&&(target.getAttribute("about"))))
                break;
        else target=target.parentNode;
        return target||false;};

    metaBook.checkTarget=function(){
        if ((metaBook.target)&&(metaBook.mode==='openglossmark'))
            if (!(fdjtDOM.isVisible(metaBook.target))) {
                metaBook.setMode(false); metaBook.setMode(true);}};

    function getDups(id){
        if (!(id)) return false;
        else if (typeof id === "string") {
            if ((metaBook.layout)&&(metaBook.layout.dups)) {
                var dups=metaBook.layout.dups;
                var d=dups[id];
                if (d) return [mbID(id)].concat(d);
                else return [mbID(id)];}
            else return [mbID(id)];}
        else return getDups(id.codexbaseid||id.id);}
    metaBook.getDups=getDups;

    function getTarget(scan,closest){
        scan=((scan.nodeType)?(scan):(scan.target||scan.srcElement||scan));
        var target=false, id=false, targetids=metaBook.targetids;
        var wsn_target=false;
        if (hasParent(scan,metaBook.HUD)) return false;
        else if (hasParent(scan,".metabookmargin")) return false;
        else while (scan) {
            if (scan.metabookui) return false;
            else if ((scan===metaBook.docroot)||(scan===document.body))
                return target;
            else if ((id=(scan.codexbaseid||scan.id))&&(metaBook.docinfo[id])) {
                if ((!(scan.codexbaseid))&&(id.search("METABOOKTMP")===0)) {}
                else if ((target)&&(id.search("WSN_")===0)) {}
                else if (id.search("WSN_")===0) wsn_target=scan;
                else if ((targetids)&&(id.search(targetids)!==0)) {}
                else if (hasClass(scan,"sbooknofocus")) {}
                else if ((metaBook.nofocus)&&(metaBook.nofocus.match(scan))) {}
                else if (hasClass(scan,"sbookfocus")) return scan;
                else if ((metaBook.focus)&&(metaBook.focus.match(scan)))
                    return scan;
                else if (closest) return scan;
                else if ((target)&&
                         ((scan.tagName==='SECTION')||
                          ((scan.className)&&
                           (scan.className.search(/\bhtml5section\b/i)>=0))))
                    return target;
                else if ((target)&&(!(fdjt.DOM.isVisible(scan))))
                    return target;
                else target=scan;}
            else {}
            scan=scan.parentNode;}
        return target||wsn_target;}
    metaBook.getTarget=getTarget;
    
    var isEmpty=fdjtString.isEmpty;

    function notEmpty(arg){
        if (typeof arg === 'string') {
            if (isEmpty(arg)) return false;
            else return arg;}
        else return false;}

    var metabook_docinfo=false;
    function mbID(id){
        var info, elts;
        if ((id)&&(typeof id === "string")&&(id[0]==="#"))
            id=id.slice(1);
        if (!(metabook_docinfo)) metabook_docinfo=metaBook.docinfo;
        var elt=((metabook_docinfo)&&(info=metabook_docinfo[id])&&(info.elt));
        if ((elt)&&(elt.id)) return elt;
        else if ((elt=document.getElementById(id))) return elt;
        else {
            elts=document.getElementsByName(id);
            if (elts.length===1)  return elts[0];
            else if (elts.length>1) return false;}
        elts=fdjtDOM.$("[data-tocid='"+id+"']");
        if (elts.length===1) return elts[0];
        else if (elts.length) {
            elts=fdjtDOM.$(".codexdupstart[data-tocid='"+id+"']");
            if (elts.length===1) return elts[0];
            else return false;}
        else return false;}
    metaBook.ID=mbID;

    metaBook.getTitle=function(target,tryhard) {
        var targetid;
        return target.sbooktitle||
            (((targetid=((target.codexbaseid)||(target.id)))&&
              (metaBook.docinfo[targetid]))?
             (notEmpty(metaBook.docinfo[targetid].title)):
             (notEmpty(target.title)))||
            ((tryhard)&&
             (fdjtDOM.textify(target)).
             replace(/\n(\s*\n)+/g,"\n").
             replace(/^\n+/,"").
             replace(/\n+$/,"").
             replace(/\n+/g," // ").
             replace(/^\s*\/\//,""));};

    function getinfo(arg){
        if (arg) {
            if (typeof arg === 'string')
                return (metaBook.docinfo[arg]||
                        metaBook.glossdb.probe(arg)||
                        RefDB.resolve(arg));
            else if (arg._id) return arg;
            else if (arg.codexbaseid)
                return metaBook.docinfo[arg.codexbaseid];
            else if (arg.id) return metaBook.docinfo[arg.id];
            else return false;}
        else return false;}
    metaBook.Info=getinfo;

    /* Getting tagstrings from a gloss */
    var tag_prefixes=["","*","**","~","~~"];
    function getGlossTags(gloss){
        var results=[];
        var i=0, lim=tag_prefixes.length; while (i<lim) {
            var prefix=tag_prefixes[i++];
            var tags=gloss[prefix+"tags"];
            if (!(tags)) continue;
            else if (!(tags instanceof Array)) tags=[tags];
            var j=0, ntags=tags.length;
            while (j<ntags) {
                var tag=tags[j++];
                if (prefix==="") results.push(tag);
                else results.push({prefix: prefix,tag: tag});}}
        return results;}
    metaBook.getGlossTags=getGlossTags;

    /* Navigation functions */

    function setHead(head){
        if (!(head)) return;
        else if (typeof head === "string") 
            head=getHead(mbID(head))||metaBook.content;
        else {}
        var headid=head.codexbaseid||head.id;
        var headinfo=metaBook.docinfo[headid];
        while ((headinfo)&&(!(headinfo.level))) {
            headinfo=headinfo.head;
            headid=headinfo.frag;
            head=mbID(headid);}
        if (mB.Trace.nav)
            fdjtLog("metaBook.setHead #%s",headid);
        if (head===metaBook.head) {
            if (mB.Trace.target) fdjtLog("Redundant SetHead");
            return;}
        else if (headinfo) {
            if (mB.Trace.target)
                metaBook.trace("metaBook.setHead",head);
            metaBook.TOC.setHead(headinfo);
            window.title=headinfo.title+" ("+document.title+")";
            if (metaBook.head) dropClass(metaBook.head,"sbookhead");
            addClass(head,"sbookhead");
            metaBook.setLocation(metaBook.location);
            metaBook.head=mbID(headid);
            metaBook.TOC.setHead(headinfo);}
        else {
            if (mB.Trace.target)
                metaBook.trace("metaBook.setFalseHead",head);
            metaBook.TOC.setHead(headinfo);
            metaBook.head=false;}}
    metaBook.setHead=setHead;

    function setLocation(location,force){
        if ((!(force)) && (metaBook.location===location)) return;
        if (mB.Trace.toc)
            fdjtLog("Setting location to %o",location);
        var info=metaBook.Info(metaBook.head);
        while (info) {
            var tocelt=document.getElementById("METABOOKTOC4"+info.frag);
            var statictocelt=document.getElementById("METABOOKSTATICTOC4"+info.frag);
            var hinfo=info.head, hhlen=((hinfo)&&(hinfo.ends_at-hinfo.starts_at));
            var start=info.starts_at; var end=info.ends_at;
            var progress=((location-start)*100)/hhlen;
            var bar=false, appbar=false;
            if (tocelt) {
                // tocelt.title=Math.round(progress)+"%";
                bar=fdjtDOM.getFirstChild(tocelt,".progressbar");}
            if (statictocelt) {
                appbar=fdjtDOM.getFirstChild(statictocelt,".progressbar");}
            if (mB.Trace.toc)
                fdjtLog("For tocbar %o/%o loc=%o start=%o end=%o progress=%o",
                        bar,appbar,location,start,end,progress);
            if ((progress>=0) && (progress<=100)) {
                if (bar) bar.style.width=(progress)+"%";
                if (appbar) appbar.style.width=(progress)+"%";}
            info=info.head;}
        var spanbars=fdjtDOM.$(".spanbar");
        var i=0; while (i<spanbars.length) {
            var spanbar=spanbars[i++];
            var width=spanbar.ends-spanbar.starts;
            var ratio=(location-spanbar.starts)/width;
            if (mB.Trace.toc)
                fdjtLog("ratio for spanbar %o[%d] is %o [%o,%o,%o]",
                        spanbar,spanbar.childNodes[0].childNodes.length,
                        ratio,spanbar.starts,location,spanbar.ends);
            if ((ratio>=0) && (ratio<=1)) {
                var progressbox=fdjtDOM.$(".progressbox",spanbar);
                if (progressbox.length>0) {
                    progressbox=progressbox[0];
                    progressbox.style.left=((Math.round(ratio*10000))/100)+"%";}}}
        metaBook.location=location;}
    metaBook.setLocation=setLocation;

    function location2pct(location) {
        var max_loc=metaBook.ends_at;
        var pct=(100*location)/max_loc;
        if (pct>100) pct=100;
        // This is (very roughly) intended to be the precision needed
        //  for line level (40 character) accuracy.
        var prec=Math.round(Math.log(max_loc/40)/Math.log(10))-2;
        if (prec<0) prec=0;
        if (Math.floor(pct)===pct)
            return Math.floor(pct)+"%";
        else return fdjtString.precString(pct,prec)+"%";}
    metaBook.location2pct=location2pct;

    function setTarget(target){
        if (mB.Trace.target) metaBook.trace("metaBook.setTarget",target);
        if (target===metaBook.target) return;
        else if ((metaBook.target)&&
                 (metaBook.target.id===target.codexbaseid))
            return;
        if (metaBook.target) {
            var old_target=metaBook.target, oldid=old_target.id;
            var old_targets=getDups(oldid);
            dropClass(old_target,"metabooktarget");
            dropClass(old_target,"metabooknewtarget");
            dropClass(old_targets,"metabooktarget");
            dropClass(old_targets,"metabooknewtarget");
            if (!(hasParent(old_target,target)))
                clearHighlights(old_targets);
            metaBook.target=false;}
        if (!(target)) {
            if (metaBook.UI.setTarget) metaBook.UI.setTarget(false);
            return;}
        else if ((inUI(target))||(!(target.id||target.codexbaseid)))
            return;
        else {}
        var targetid=target.codexbaseid||target.id;
        var primary=((targetid)&&(mbID(targetid)))||target;
        var targets=getDups(targetid);
        addClass(target,"metabooktarget");
        addClass(target,"metabooknewtarget");
        addClass(targets,"metabooktarget");
        addClass(targets,"metabooknewtarget");
        setTimeout(function(){
            dropClass(target,"metabooknewtarget");
            dropClass(targets,"metabooknewtarget");},
                   3000);
        fdjtState.setCookie(
            "metabooktarget",targetid||target.getAttribute('data-sbookid'));
        metaBook.target=primary;
        if (metaBook.UI.setTarget) metaBook.UI.setTarget(primary);
        if (metaBook.empty_cloud)
            metaBook.setCloudCuesFromTarget(metaBook.empty_cloud,primary);}
    metaBook.setTarget=setTarget;

    function clearHighlights(target){
        if (typeof target === "string") target=mbID(target);
        if (!(target)) return;
        else if (target.length) {
            dropClass(target,"metabookhighlightpassage");
            var i=0, lim=target.length;
            while (i<lim) {
                var node=target[i++];
                fdjtUI.Highlight.clear(node,"metabookhighlightexcerpt");
                fdjtUI.Highlight.clear(node,"metabookhighlightsearch");}}
        else {
            dropClass(target,"metabookhighlightpassage");
            fdjtUI.Highlight.clear(target,"metabookhighlightexcerpt");
            fdjtUI.Highlight.clear(target,"metabookhighlightsearch");}}
    metaBook.clearHighlights=clearHighlights;

    function findExcerpt(node,excerpt,off){
        if (typeof node === "string") node=mbID(node);
        if (!(node)) return false;
        if (node.nodeType) node=getDups(node);
        var found=fdjtDOM.findString(node,excerpt,off||0);
        if (found) return found;
        var trimmed=fdjtString.trim(excerpt);
        var regex_string=fdjtDOM.textRegExp(trimmed);
        var pattern=new RegExp("(\\s*)"+regex_string+"(\\s*)","gm");
        var matches=fdjtDOM.findMatches(node,pattern,off||0,1);
        if ((matches)&&(matches.length)) return matches[0];
        // We could do this more intelligently
        var result=false;
        matches=fdjtDOM.findMatches(node,pattern,0,1);
        while (matches.length>0) {
            result=matches[0];
            matches=fdjtDOM.findMatches(
                node,pattern,result.end_offset+1,1);}
        if ((matches)&&(matches.length)) return matches[0];
        else return result;}
    metaBook.findExcerpt=findExcerpt;

    /* Tags */

    function parseTag(tag,kno){
        var slot="tags"; var usekno=kno||metaBook.knodule;
        if (tag[0]==="~") {
            slot="~tags"; tag=tag.slice(1);}
        else if ((tag[0]==="*")&&(tag[1]==="*")) {
            slot="**tags"; tag=tag.slice(2);}
        else if (tag[0]==="*") {
            slot="*tags"; tag=tag.slice(1);}
        else {}
        var knode=((tag.indexOf('|')>=0)?
                   (usekno.handleSubjectEntry(tag)):
                   (slot==="~tags")?
                   (((kno)&&(kno.probe(tag)))||(tag)):
                   (usekno.handleSubjectEntry(tag)));
        if (slot!=="tags") return {slot: slot,tag: knode};
        else return knode;}
    metaBook.parseTag=parseTag;
    
    var knoduleAddTags=Knodule.addTags;
    function addTags(nodes,tags,slotid,tagdb){
        if (!(slotid)) slotid="tags";
        if (!(tagdb)) tagdb=metaBook.knodule;
        var docdb=metaBook.docdb;
        if (!(nodes instanceof Array)) nodes=[nodes];
        knoduleAddTags(nodes,tags,docdb,tagdb,slotid,metaBook.tagscores);
        var i=0, lim=nodes.length; while (i<lim) {
            var node=nodes[i++];
            if (!(node.toclevel)) continue;
            var passages=docdb.find('head',node);
            if ((passages)&&(passages.length))
                knoduleAddTags(passages,tags,docdb,tagdb,
                               "^"+slotid,metaBook.tagscores);
            var subheads=docdb.find('heads',node);
            if ((subheads)&&(subheads.length))
                addTags(subheads,tags,"^"+slotid,tagdb);}}
    metaBook.addTags=addTags;
        
    /* Navigation */

    var sbookUIclasses=
        /(\bhud\b)|(\bglossmark\b)|(\bleading\b)|(\bmetabookmargin\b)/;

    function inUI(elt){
        if (elt.metabookui) return true;
        else if (hasParent(elt,metaBook.HUD)) return true;
        else while (elt)
            if (elt.metabookui) return true;
        else if (hasClass(elt,sbookUIclasses)) return true;
        else elt=elt.parentNode;
        return false;}
    metaBook.inUI=inUI;

    function setHashID(target){
        var targetid=target.codexbaseid||target.id;
        if ((!(targetid))||(window.location.hash===targetid)||
            ((window.location.hash[0]==='#')&&
             (window.location.hash.slice(1)===targetid)))
            return;
        if ((target===metaBook.body)||(target===document.body)) return;
        if (targetid) window.location.hash=targetid;}
    metaBook.setHashID=setHashID;

    // Assert whether we're connected and update body classes
    //  to reflect the state. Also, run run any delayed thunks
    //  queued for connection.
    function setConnected(val){
        if ((val)&&(!(metaBook.connected))) {
            var onconnect=metaBook._onconnect;
            metaBook._onconnect=false;
            if ((onconnect)&&(onconnect.length)) {
                var i=0; var lim=onconnect.length;
                while (i<lim) (onconnect[i++])();}
            if (fdjtState.getLocal("metabook.queued("+metaBook.refuri+")"))
                metaBook.writeQueuedGlosses();}
        if (((val)&&(!(metaBook.connected)))||
            ((!(val))&&(metaBook.connected)))
            fdjtDOM.swapClass(document.body,/\b(_|cx)(CONN|DISCONN)\b/,
                              ((val)?("_CONN"):("_DISCONN")));
        metaBook.connected=val;
    } metaBook.setConnected=setConnected;


    /* Managing the reader state */

    /* Three aspects of the reading state are saved:

       * the numeric location within the book (in characters from the
          beginning)
       * the most recent target ID
       * the current page (just for messages, since page numbers aren't
         stable
     */

    // We keep track of the current state and the last time that state
    // was changed by a user action.  Restoring a saved state, for
    // example, doesn't bump the change date.

    var syncing=false;
    
    // This initializes the reading state, either from local storage
    //  or the initial hash id from the URL (which was saved in
    //  metaBook.inithash).
    metaBook.initState=function initState() {
        var uri=metaBook.docuri;
        var state=readLocal("metabook.state("+uri+")",true);
        var hash=metaBook.inithash;
        if (hash) {
            if (hash[0]==="#") hash=hash.slice(1);}
        else hash=false;
        var elt=((hash)&&(mbID(hash)));
        if (elt) {
            // If the hash has changed, we take that as a user action
            //  and update the state.  If it hasn't changed, we assume
            //  that the stored state is still current and dated whenever
            //  it was last changed.
            if (!((state)&&(state.target===hash))) {
                if (!(state)) state={};
                // Hash changed
                state.refuri=metaBook.refuri;
                state.docuri=metaBook.docuri;
                state.target=hash;
                state.location=false;
                state.changed=fdjtTime.tick;
                saveLocal("metabook.state("+uri+")",state,true);}}
        if (state) metaBook.state=state;};
    
    // This records the current state of the app, bundled into an
    //  object and primarily consisting a location, a target, and
    //  the time it was last changed.
    // Mechanically, this fills things out and stores the object
    //  in metaBook.state as well as in local storage.  If the changed
    //  date is later than the current metaBook.xstate, it also does
    //  an Ajax call to update the server.
    // Finally, unless skiphist is true, it updates the browser
    //  history to get the browser button to be useful.
    function saveState(state,skiphist,force){
        if ((!force)&&(state)&&
            ((metaBook.state===state)||
             ((metaBook.state)&&
              (metaBook.state.target===state.target)&&
              (metaBook.state.location===state.location)&&
              (metaBook.state.page===state.page))))
            return;
        if (!(state)) state=metaBook.state;
        if (!(state.changed)) state.changed=fdjtTime.tick();
        if (!(state.refuri)) state.refuri=metaBook.refuri;
        if (!(state.docuri)) state.docuri=metaBook.docuri;
        var title=state.title, frag=state.target;
        if ((!(title))&&(frag)&&(metaBook.docinfo[frag])) {
            state.title=title=metaBook.docinfo[frag].title||
                metaBook.docinfo[frag].head.title;}
        if (mB.Trace.state) fdjtLog("Setting state to %j",state);
        if ((state.maxloc)&&(state.maxloc<state.location))
            state.maxloc=state.location;
        else if (!(state.maxloc)) state.maxloc=state.location;
        if (mB.Trace.state)
            fdjtLog("saveState skiphist=? force=? state=%j",
                    skiphist,force,state);
        metaBook.state=state;
        var statestring=JSON.stringify(state);
        var uri=metaBook.docuri;
        saveLocal("metabook.state("+uri+")",statestring);
        if ((!(syncing))&&(metaBook.locsync)&&
            ((!(metaBook.xstate))||(state.changed>metaBook.xstate.changed)))
            syncState(true);
        if ((!(skiphist))&&(frag)&&
            (window.history)&&(window.history.pushState))
            setHistory(state,frag,title);
    } metaBook.saveState=saveState;

    // This sets the browser history from a particular state
    function setHistory(state,hash,title){
        if (mB.Trace.state) {
            if (title)
                fdjtLog("setHistory %s (%s) state=%j",hash,title,state);
            else fdjtLog("setHistory %s state=%j",hash,state);}
        if (!((window.history)&&(window.history.pushState))) return;
        if (!(hash)) hash=state.target;
        if (!(title)) title=state.title;
        var href=fdjtState.getURL();
        if ((!(title))&&(hash)&&(metaBook.docinfo[hash])) {
            state.title=title=metaBook.docinfo[hash].title||
                metaBook.docinfo[hash].head.title;}
        if ((!(hash))&&(state.location)&&
            (typeof state.location === "number"))
            hash="SBOOKLOC"+state.location;
        if (mB.Trace.state)
            fdjtLog("Pushing history %j %s (%s) '%s'",
                    state,href,title);
        window.history.pushState(state,title,href+"#"+hash);
    }

    function restoreState(state,reason,savehist){
        if (mB.Trace.state) fdjtLog("Restoring (%s) state %j",reason,state);
        if (state.location)
            metaBook.GoTo(state.location,reason||"restoreState",
                       ((state.target)&&(mbID(state.target))),
                       false,(!(savehist)));
        else if ((state.page)&&(metaBook.layout)) {
            metaBook.GoToPage(state.page,reason||"restoreState",
                           false,(!(savehist)));
            if ((state.target)&&(mbID(state.target)))
                setTarget(mbID(state.target));}
        else if (state.target) {
            metaBook.GoTo(state.target,reason||"restoreState",
                       true,false,(!(savehist)));
            if ((state.target)&&(mbID(state.target)))
                setTarget(mbID(state.target));}
        if (!(state.refuri)) state.refuri=metaBook.refuri;
        if (!(state.docuri)) state.docuri=metaBook.docuri;
        saveState(state);
    } metaBook.restoreState=restoreState;

    function clearState(){
        var uri=metaBook.docuri;
        metaBook.state=false;
        clearLocal("metabook.state("+uri+")");
        metaBook.xstate=false;
    } metaBook.clearState=clearState;

    function resetState(){
        var uri=metaBook.docuri;
        var state=metaBook.state;
        if (state.location) state.maxloc=location;
        state.reset=true;
        var statestring=JSON.stringify(state);
        saveLocal("metabook.state("+uri+")",statestring);
        syncState(true);}
    metaBook.resetState=resetState;

    var last_sync=false;
    // Post the current state and update synced state from what's
    // returned
    function syncState(force){
        if ((syncing)||(!(metaBook.locsync))) return;
        if ((!(force))&&(last_sync)&&
            ((fdjtTime.tick()-last_sync)<metaBook.sync_interval)) {
            if (mB.Trace.state)
                fdjtLog("Skipping state sync because it's too soon");
            return;}
        if ((!(force))&&(metaBook.state)&&(last_sync)&&
            ((!(fdjtDOM.isHidden))||(document[fdjtDOM.isHidden]))&&
            ((fdjtTime.tick()-last_sync)<(5*metaBook.sync_interval))) {
            if (mB.Trace.state)
                fdjtLog("Skipping state sync because page is hidden");
            return;}
        if ((metaBook.locsync)&&(navigator.onLine)) {
            var uri=metaBook.docuri;
            var traced=(mB.Trace.state)||(mB.Trace.network);
            var state=metaBook.state;
            var refuri=((metaBook.target)&&(metaBook.getRefURI(metaBook.target)))||
                (metaBook.refuri);
            var sync_uri="https://sync.sbooks.net/v1/sync"+
                "?REFURI="+encodeURIComponent(refuri)+
                "&DOCURI="+encodeURIComponent(metaBook.docuri)+
                "&NOW="+fdjtTime.tick();
            metaBook.last_sync=last_sync=fdjtTime.tick(); syncing=state;
            if (metaBook.user) sync_uri=sync_uri+
                "&SYNCUSER="+encodeURIComponent(metaBook.user._id);
            if (metaBook.mycopyid) sync_uri=sync_uri+
                "&MYCOPYID="+encodeURIComponent(metaBook.mycopyid);
            if (metaBook.deviceName) sync_uri=sync_uri+
                "&DEVICE="+encodeURIComponent(metaBook.deviceName);
            if (metaBook.ends_at) sync_uri=sync_uri+
                "&LOCLEN="+encodeURIComponent(metaBook.ends_at);
            if (state) {
                if (state.target) sync_uri=sync_uri+
                    "&TARGET="+encodeURIComponent(state.target);
                if ((state.location)||(state.hasOwnProperty('location')))
                    sync_uri=sync_uri+
                    "&LOCATION="+encodeURIComponent(state.location);
                if (state.changed) sync_uri=sync_uri+
                    "&CHANGED="+encodeURIComponent(state.changed);
                if (state.reset) sync_uri=sync_uri+"&RESET=true";}
            var req=new XMLHttpRequest();
            syncing=state;
            req.onreadystatechange=freshState;
            req.withCredentials=true;
            if (traced) fdjtLog("syncState(call) %s",sync_uri);
            try {
                req.open("GET",sync_uri,true);
                req.send();}
            catch (ex) {
                try {
                    fdjtLog.warn(
                        "Sync request %s returned status %d %j, pausing",
                        uri,req.status,JSON.parse(req.responseText));}
                catch (err) {
                    fdjtLog.warn(
                        "Sync request %s returned status %d, pausing",
                        uri,req.status);}
                metaBook.locsync=false;
                setTimeout(function(){metaBook.locsync=true;},15*60*1000);}}
    } metaBook.syncState=syncState;

    var prompted=false;

    function freshState(evt){
        var req=fdjtUI.T(evt);
        var traced=(mB.Trace.state)||(mB.Trace.network);
        if (req.readyState===4) {
            if ((req.status>=200)&&(req.status<300)) {
                var xstate=JSON.parse(req.responseText);
                var tick=fdjtTime.tick();
                if (xstate.changed) {
                    if (traced)
                        fdjtLog("freshState %o %j\n\t%j",evt,xstate,metaBook.state);
                    if (xstate.changed>(tick+300))
                        fdjtLog.warn(
                            "Beware of oracles (future state date): %j ",
                            xstate);
                    else if (!(metaBook.state)) {
                        metaBook.xstate=xstate;
                        restoreState(xstate);}
                    else if (metaBook.state.changed>xstate.changed)
                        // Our state is later, so we make it the xstate
                        metaBook.xstate=xstate;
                    else if ((prompted)&&(prompted>xstate.changed)) {
                        // We've already bothered the user since this
                        //  change was recorded, so we don't bother them
                        // again
                        }
                    else if (document[fdjtDOM.isHidden])
                        metaBook.freshstate=xstate;
                    else {
                        metaBook.xstate=xstate;
                        prompted=fdjtTime.tick();
                        metaBook.resolveXState(xstate);}}}
                else if (traced)
                    fdjtLog("syncState(callback/error) %o %d %s",
                            evt,req.status,req.responseText);
            if (navigator.onLine) setConnected(true);
            syncing=false;}}

    var last_hidden=false;
    metaBook.visibilityChange=function visibilityChange(){
        if (!(document[fdjtDOM.isHidden])) {
            if ((last_hidden)&&((fdjtTime.tick()-last_hidden)<300)) {}
            else if (navigator.onLine) {
                last_hidden=false;
                syncState(true);}
            else if (metaBook.freshstate) {
                // Something changed while we were hidden
                var freshstate=metaBook.freshstate;
                last_hidden=false;
                metaBook.freshstate=false;
                metaBook.xstate=freshstate;
                prompted=fdjtTime.tick();
                metaBook.resolveXState(freshstate);}
            else {}}
        else last_hidden=fdjtTime.tick();};

    function forceSync(){
        if (metaBook.connected) metaBook.update();
        else if (metaBook._onconnect)
            metaBook._onconnect.push(function(){metaBook.update();});
        else metaBook._onconnect=[function(){metaBook.update();}];
        if (!(metaBook.syncstart)) metaBook.syncLocation();
        else syncState();
    } metaBook.forceSync=forceSync;

    function getLocInfo(elt){
        var eltid=false;
        var counter=0; var lim=200;
        var forward=fdjtDOM.forward;
        while ((elt)&&(counter<lim)) {
            eltid=elt.codexbaseid||elt.id;
            if ((eltid)&&(metaBook.docinfo[eltid])) break;
            else {counter++; elt=forward(elt);}}
        if ((eltid)&&(metaBook.docinfo[eltid])) {
            var info=metaBook.docinfo[eltid];
            return {start: info.starts_at,end: info.ends_at,
                    len: info.ends_at-info.starts_at};}
        else return false;
    } metaBook.getLocInfo=getLocInfo;

    function resolveLocation(loc){
        var allinfo=metaBook.docinfo._allinfo;
        var i=0; var lim=allinfo.length;
        while (i<lim) {
            if (allinfo[i].starts_at<loc) i++;
            else break;}
        while (i<lim)  {
            if (allinfo[i].starts_at>loc) break;
            else i++;}
        return mbID(allinfo[i-1].frag);
    } metaBook.resolveLocation=resolveLocation;

    // This moves within the document in a persistent way
    function metabookGoTo(arg,caller,istarget,savestate,skiphist){
        if (typeof istarget === 'undefined') istarget=true;
        if (typeof savestate === 'undefined') savestate=true;
        var target, location, locinfo;
        if (savestate) metaBook.clearStateDialog();
        if (!(arg)) {
            fdjtLog.warn("falsy arg (%s) to metabookGoTo from %s",arg,caller);
            return;}
        if (typeof arg === 'string') {
            target=mbID(arg);
            locinfo=getLocInfo(target);
            location=locinfo.start;}
        else if (typeof arg === 'number') {
            location=arg;
            target=((istarget)&&
                    (((istarget.nodeType)&&(istarget.id))?(istarget):
                     (resolveLocation(arg))));}
        else if (arg.nodeType) {
            target=getTarget(arg);
            locinfo=getLocInfo(arg);
            location=locinfo.start;}
        else {
            fdjtLog.warn("Bad metabookGoTo %o",arg);
            return;}
        if ((istarget)&&(istarget.nodeType)) target=istarget;
        else if ((typeof istarget === "string")&&(mbID(istarget)))
            target=mbID(istarget);
        else {}
        var info=(target)&&
            metaBook.docinfo[target.getAttribute("data-baseid")||target.id];
        var page=((metaBook.bypage)&&(metaBook.layout)&&
                  (metaBook.getPage(target,location)));
        var pageno=(page)&&(parseInt(page.getAttribute("data-pagenum"),10));
        if (!(target)) {
            if (metaBook.layout instanceof fdjt.CodexLayout)
                metaBook.GoToPage(arg,caller,savestate);
            else if (arg.nodeType) {
                var scan=arg;
                while (scan) {
                    if (scan.offsetTop) break;
                    else scan=scan.parentNode;}
                if (scan) metaBook.content.style.offsetTop=-(scan.offsetTop);}
            else {}
            if (metaBook.curpage)
                saveState({location: metaBook.location,
                           page: metaBook.curpage,
                           npages: metaBook.pagecount},
                          true);
            else saveState({location: metaBook.location},true);
            return;}
        var targetid=target.codexbaseid||target.id;
        if (mB.Trace.nav)
            fdjtLog("metaBook.GoTo%s() #%o@P%o/L%o %o",
                    ((caller)?("/"+caller):""),targetid,pageno,
                    ((info)&&(info.starts_at)),target);
        if (info) {
            metaBook.point=target;
            if (!((metaBook.hudup)||(metaBook.mode))) metaBook.skimming=false;}
        setHead(target);
        setLocation(location);
        if ((istarget)&&(targetid)&&(!(inUI(target)))) setTarget(target);
        if ((savestate)&&(istarget))
            metaBook.saveState({
                target: (target.getAttribute("data-baseid")||target.id),
                location: location,page: pageno,npages: metaBook.pagecount},
                           skiphist);
        else if (savestate)
            metaBook.saveState({location: location,page: pageno,
                             npages: metaBook.pagecount},
                           skiphist);
        else if (skiphist) {}
        else if (istarget)
            setHistory({
                target: (target.getAttribute("data-baseid")||target.id),
                location: location,page: pageno,npages: metaBook.pagecount});
        else setHistory({
            target: (target.getAttribute("data-baseid")||target.id),
            location: location,page: pageno,npages: metaBook.pagecount});
        if (page)
            metaBook.GoToPage(page,caller||"metabookGoTo",false,true);
        else {
            if (metaBook.previewing)
                metaBook.stopPreview(((caller)?("goto/"+caller):("goto")),target);
            var offinfo=fdjtDOM.getGeometry(target,metaBook.content);
            var use_top=offinfo.top-((fdjtDOM.viewHeight()-50)/2);
            if (use_top<0) use_top=0;
            window.scrollTo(0,use_top);}
        if (metaBook.clearGlossmark) metaBook.clearGlossmark();
        if (metaBook.mode==="addgloss") metaBook.setMode(false,false);
        metaBook.location=location;
    } metaBook.GoTo=metabookGoTo;

    function anchorFn(evt){
        var target=fdjtUI.T(evt);
        while (target)
            if (target.href) break; else target=target.parentNode;
        if ((target)&&(target.href)&&(target.href[0]==='#')) {
            var elt=mbID(target.href.slice(1));
            if (elt) {metaBook.GoTo(elt,"anchorFn"); fdjtUI.cancel(evt);}}}
    metaBook.anchorFn=anchorFn;

    // This jumps and disables the HUD at the same time
    function metaBookJumpTo(target){
        if (metaBook.hudup) metaBook.setMode(false);
        metaBook.GoTo(target,"JumpTo");}
    metaBook.JumpTo=metaBookJumpTo;

    function getTOCHead(id){
        var elts=fdjtDOM.$("#METABOOKSTATICTOC div.head[NAME='SBR"+id+"']");
        return ((elts)&&(elts.length===1)&&(elts[0]));}

    // This jumps and disables the HUD at the same time
    function metaBookGoTOC(target){
        if (target) metaBook.GoTo(target,"GoTOC");
        metaBook.setMode("statictoc");
        var headid=((metaBook.head)&&(metaBook.head.id));
        var headinfo=(headid)&&(metaBook.docinfo[headid]);
        var hhid=(headinfo)&&(headinfo.head)&&(headinfo.head.frag);
        var tocelt=(headid)&&getTOCHead(headid);
        var cxtelt=(hhid)&&getTOCHead(hhid);
        if ((cxtelt)&&(tocelt)) {
            cxtelt.scrollIntoView();
            if (fdjtDOM.isVisible(tocelt)) return;
            else tocelt.scrollIntoView();}
        else if (tocelt)
            tocelt.scrollIntoView();
        else if (cxtelt)
            cxtelt.scrollIntoView();
        else {}}
    metaBook.GoTOC=metaBookGoTOC;

    // This jumps and disables the HUD at the same time
    // We try to animate the transition
    function metaBookSkimTo(target){
        if (metaBook.hudup) { // Figure out what mode to go to
            var headinfo=metaBook.docinfo[target]||metaBook.docinfo[target.id];
            if ((headinfo)&&((!(headinfo.sub))||(headinfo.sub.length===0))) {
                metaBook.setMode("statictoc"); metaBook.setHUD(false,false);
                addClass(document.body,"mbSKIMMING");}}
        metaBook.GoTo(target,"metaBookSkimTo");}
    metaBook.Skimto=metaBookSkimTo;

    // Preview functions
    var oldscroll=false, preview_elt=false;
    function scrollPreview(elt,caller){
        var xoff=window.scrollLeft||0, yoff=window.scrollTop||0;
        if (elt) {
            if (elt.frag) elt=elt.frag;
            if (typeof elt==="string") elt=mbID(elt);
            if (!(elt)) return;
            else preview_elt=elt;
            if (!(oldscroll)) oldscroll={x: 0,y: yoff};
            var offinfo=fdjtDOM.getGeometry(elt,metaBook.content);
            if (mB.Trace.flips)
                fdjtLog("startScrollPreview/%s to %d for %o",
                        caller||"nocaller",offinfo.top-100,elt);
            // metaBook.content.style.top=(-offinfo.top)+"px";
            var use_top=offinfo.top-((fdjtDOM.viewHeight()-50)/2);
            if (use_top<0) use_top=0;
            window.scrollTo(0,use_top);}
        else if (oldscroll) {
            if (mB.Trace.flips)
                fdjtLog("stopScrollPreview/%s to %j from %d,%d(%o)",
                        caller||"nocaller",oldscroll,xoff,yoff,
                        preview_elt);
            preview_elt=false;
            window.scrollTo(oldscroll.x,oldscroll.y);
            oldscroll=false;}
        else {
            if (mB.Trace.flips)
                fdjtLog("stopScrollPreview/%s to %j from %d,%d(%o)",
                        caller||"nocaller",oldscroll,xoff,yoff,
                        preview_elt);
            preview_elt=false; oldscroll=false;}}
    
    function clearPreview(){
        var current=fdjtDOM.$(".metabookpreviewtarget");
        var i=0, lim=current.length; while (i<lim) {
            var p=current[i++];
            dropClass(p,"metabookpreviewtarget");
            metaBook.clearHighlights(p);}}

    function startPreview(spec,caller){
        var target=((spec.nodeType)?(spec):(mbID(spec)));
        if (mB.Trace.flips)
            fdjtLog("startPreview %o (%s)",target,caller);
        if (target===metaBook.previewing) {}
        else if (metaBook.layout instanceof fdjt.CodexLayout) {
            var dups=((getTarget(target))&&(metaBook.getDups(target)));
            metaBook.startPagePreview(target,caller);
            if (dups) addClass(dups,"metabookpreviewtarget");}
        else {
            scrollPreview(target,caller);
            addClass(target,"metabookpreviewtarget");}
        metaBook.previewing=target;
        addClass(document.body,"mbPREVIEW");
        if (hasClass(target,"codexpage")) addClass(document.body,"mbPAGEPREVIEW");
        return target;}
    metaBook.startPreview=startPreview;
    function stopPreview(caller,jumpto){
        clearPreview();
        if ((jumpto)&&(!(jumpto.nodeType)))
            jumpto=metaBook.previewTarget||metaBook.previewing;
        if (mB.Trace.flips)
            fdjtLog("stopPreview/%s jump to %o, pt=%o, p=%o",
                    caller||"nocaller",jumpto,
                    metaBook.previewTarget,metaBook.previewing);
        if (metaBook.layout instanceof fdjt.CodexLayout) {
            metaBook.stopPagePreview(caller,jumpto);}
        else if (!(jumpto)) scrollPreview(false,caller);
        else if (jumpto===metaBook.previewing) {
            oldscroll=false; scrollPreview(false,caller);}
        else scrollPreview(false,caller);
        metaBook.previewing=false; metaBook.previewTarget=false;
        dropClass(document.body,"mbPREVIEW");
        dropClass(document.body,"mbPAGEPREVIEW");
        if (jumpto) {
            if (metaBook.hudup) metaBook.setHUD(false);
            metabookGoTo(jumpto);}
        return false;}
    metaBook.stopPreview=stopPreview;

    function getLevel(elt,rel){
        if (elt.toclevel) {
            if (elt.toclevel==='none') {
                elt.toclevel=false;
                return false;}
            else return elt.toclevel;}
        var attrval=
            ((elt.getAttributeNS)&&
             (elt.getAttributeNS('toclevel','http://sbooks.net')))||
            (elt.getAttribute('toclevel'))||
            (elt.getAttribute('data-toclevel'));
        if (attrval) {
            if (attrval==='none') return false;
            else return parseInt(attrval,10);}
        if (elt.className) {
            var cname=elt.className;
            if (cname.search(/\bsbooknotoc\b/)>=0) return 0;
            if (cname.search(/\bsbookignore\b/)>=0) return 0;
            var tocloc=cname.search(/\bsbook\d+(head|sect)\b/);
            if (tocloc>=0)
                return parseInt(cname.slice(tocloc+5),10);
            else if ((typeof rel ==="number")&&
                     (cname.search(/\bsbooksubhead\b/)>=0))
                return rel+1;
            else {}}
        if ((metaBook.notoc)&&(metaBook.notoc.match(elt))) return 0;
        if ((metaBook.ignore)&&(metaBook.ignore.match(elt))) return 0;
        if ((typeof metaBook.autotoc !== 'undefined')&&(!(metaBook.autotoc)))
            return false;
        if ((elt.tagName==='HGROUP')||(elt.tagName==='HEADER'))
            return getFirstTocLevel(elt,true);
        if (elt.tagName.search(/H\d/)===0)
            return parseInt(elt.tagName.slice(1,2),10);
        else return false;}

    function getFirstTocLevel(node,notself){
        if (node.nodeType!==1) return false;
        var level=((!(notself))&&(getLevel(node)));
        if (level) return level;
        var children=node.childNodes;
        var i=0; var lim=children.length;
        while (i<lim) {
            var child=children[i++];
            if (child.nodeType!==1) continue;
            level=getFirstTocLevel(child);
            if (level) return level;}
        return false;}

    metaBook.getTOCLevel=getLevel;
    
    function getCover(){
        if (metaBook.cover) return metaBook.cover;
        var cover=fdjtID("METABOOKCOVERPAGE")||
            fdjtID("SBOOKCOVERPAGE")||
            fdjtID("COVERPAGE");
        if (cover) metaBook.cover=cover;
        return cover;}
    metaBook.getCover=getCover;

    var fillIn=fdjtString.fillIn;
    var expand=fdjtString.expandEntities;
    function fixStaticRefs(string){
        return fillIn(expand(string).replace(
                /http(s)?:\/\/static.beingmeta.com\//g,metaBook.root),
                      {bmg:metaBook.root+"g/"});}
    metaBook.fixStaticRefs=fixStaticRefs;
    
    fdjtString.entities.beingmeta=
        "<span class='beingmeta'>being<span class='bmm'>m<span class='bme'>e<span class='bmt'>t<span class='bma'>a</span></span></span></span></span>";
    fdjtString.entities.sBooks="<span class='sbooks'><em>s</em>Books</span>";
    fdjtString.entities.sBook="<span class='sbooks'><em>s</em>Book</span>";
    fdjtString.entities.metaBook=
        "<span class='metabook'><span class='bmm'>m<span class='bme'>e<span class='bmt'>t<span class='bma'>a</span></span></span></span>Book</span>";

})();

/* Adding qricons */

/*
  function sbookAddQRIcons(){
  var i=0;
  while (i<metaBook.heads.length) {
  var head=metaBook.heads[i++];
  var id=head.id;
  var title=(head.sbookinfo)&&sbook_get_titlepath(head.sbookinfo);
  var qrhref="https://"+metaBook.server+"/glosses/qricon.png?"+
  "URI="+encodeURIComponent(metaBook.docuri||metaBook.refuri)+
  ((id)?("&FRAG="+head.id):"")+
  ((title) ? ("&TITLE="+encodeURIComponent(title)) : "");
  var qricon=fdjtDOM.Image(qrhref,".sbookqricon");
  fdjtDOM.prepend(head,qricon);}}
*/

/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  indent-tabs-mode: nil ***
   ;;;  End: ***
*/
