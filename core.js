/* -*- Mode: Javascript; Character-encoding: utf-8; -*- */

/* ###################### metabook/core.js ###################### */

/* Copyright (C) 2009-2015 beingmeta, inc.
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
/* globals Promise */

/* Initialize these here, even though they should always be
   initialized before hand.  This will cause various code checkers to
   not generate unbound variable warnings when called on individual
   files. */
//var fdjt=((typeof fdjt !== "undefined")?(fdjt):({}));
//var Knodule=((typeof Knodule !== "undefined")?(Knodule):({}));
//var iScroll=((typeof iScroll !== "undefined")?(iScroll):({}));
//var fdjtMap=fdjt.Map;

(function(){
    "use strict";

    var fdjtString=fdjt.String;
    var fdjtState=fdjt.State;
    var fdjtAsync=fdjt.Async;
    var fdjtLog=fdjt.Log;
    var fdjtDOM=fdjt.DOM;
    var fdjtUI=fdjt.UI;
    var $ID=fdjt.ID;
    var RefDB=fdjt.RefDB, Ref=fdjt.Ref;
    var ObjectMap=fdjt.Map||RefDB.Map;

    var hasClass=fdjtDOM.hasClass;
    var addClass=fdjtDOM.addClass;
    var hasParent=fdjtDOM.hasParent;

    var getLocal=fdjtState.getLocal;
    var setLocal=fdjtState.setLocal;
    var existsLocal=fdjtState.existsLocal;
    
    var mB=metaBook;
    var Trace=metaBook.Trace;

    metaBook.tagweights=new ObjectMap();
    metaBook.tagscores=new ObjectMap();

    function hasLocal(key){
        if (mB.persist) return existsLocal(key);
        else return fdjtState.existsSession(key);}
    metaBook.hasLocal=hasLocal;
    function saveLocal(key,value,unparse){
        if (mB.persist) setLocal(key,value,unparse);
        else fdjtState.setSession(key,value,unparse);}
    metaBook.saveLocal=saveLocal;
    function readLocal(key,parse){
        if (mB.persist) {
            if (existsLocal(key))
                return getLocal(key,parse);
            else if (fdjtState.existsSession(key)) {
                setLocal(key,fdjtState.getSession(key));
                return getLocal(key,parse);}
            else return false;}
        else return fdjtState.getSession(key,parse)||getLocal(key,parse);}
    metaBook.readLocal=readLocal;
    function clearLocal(key){
        fdjtState.dropLocal(key);
        fdjtState.dropSession(key);}
    metaBook.clearLocal=clearLocal;

    metaBook.focusBody=function(){
        // document.body.focus();
    };
    
    /* Initialize the indexedDB database, when used */

    var metaBookDB=false, dbwait=[], dbfail=[];

    function getDB(){
        function gettingdb(resolve,reject){
            if (metaBookDB) resolve(metaBookDB);
            else {
                dbwait.push(resolve);
                if (reject) dbfail.push(reject);}}
        return new Promise(gettingdb);}
    metaBook.getDB=getDB;

    function gotDB(db){
        metaBook.metaBookDB=metaBookDB=db;
        fdjtAsync(function(){
            fdjt.CodexLayout.useIndexedDB(db.name);});
        var waiting=dbwait; dbwait=[]; dbfail=[];
        var i=0, len=waiting.length; while (i<len)
            waiting[i++](db);}
    function notDB(action,name,ex){
        var waiting=dbfail; dbwait=[]; dbfail=[];
        fdjtLog("Error %s database %s: %o",action,name,ex);
        var i=0, len=waiting.length; while (i<len)
            waiting[i++](ex);}

    
    if (window.indexedDB) {
        var req=window.indexedDB.open("metaBook",1);
        req.onerror=function(event){
            notDB("opening","metaBook",event.errorCode);};
        req.onsuccess=function(event) {
            var db=event.target.result;
            fdjtLog("Using existing metaBook IndexedDB");
            gotDB(db);};
        req.onupgradeneeded=function(event) {
            var db=event.target.result;
            db.onerror=function(event){
                notDB("upgrading","metaBook",event.target.errorCode);
                event=false;};
            db.onsuccess=function(event){
                var db=event.target.result;
                fdjtLog("Initialized metaBook indexedDB");
                gotDB(db);};
            db.createObjectStore("glossdata",{keyPath: "url"});
            db.createObjectStore("layouts",{keyPath: "layout_id"});
            db.createObjectStore("sources",{keyPath: "_id"});
            db.createObjectStore("docs",{keyPath: "_id"});
            db.createObjectStore("glosses",{keyPath: "glossid"});};}

    /* Initialize the runtime for the core databases */

    function initDB() {
        if (Trace.start>1) fdjtLog("Initializing DB");
        var refuri=(metaBook.refuri||document.location.href);
        if (refuri.indexOf('#')>0) refuri=refuri.slice(0,refuri.indexOf('#'));

        metaBook.setupGlossData();

        var taglist=metaBook.taglist||$ID("METABOOKTAGLIST");
        if (!(taglist)) {
            taglist=metaBook.taglist=fdjt.DOM("datalist#METABOOKTAGLIST");
            document.body.appendChild(taglist);}
        
        metaBook.docdb=new RefDB(
            refuri+"#",{indices: ["frag","head","heads",
                                  "tags","tags*",
                                  "*tags","**tags","~tags",
                                  "*tags","**tags","~tags",
                                  "*tags*","**tags*","~tags*",
                                  "^tags","~^tags","*^tags","**^tags",
                                  "^tags*","~^tags*","*^tags*","**^tags*"]});
        metaBook.docdb.slots=["head","heads"];
        
        var knodeToOption=Knodule.knodeToOption;

        var cachelink=/^https:\/\/glossdata.sbooks.net\//;
        
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
        var glossdbname="glosses@"+metaBook.refuri;
        var glossdb=metaBook.glossdb=new RefDB(glossdbname,glosses_init); {
            glossdb.absrefs=true;
            glossdb.dbname="glosses";
            glossdb.addAlias("glossdb");
            glossdb.addAlias("-UUIDTYPE=61");
            glossdb.addAlias(":@31055/");
            glossdb.addAlias("@31055/");
            glossdb.onLoad(function initGloss(item) {
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
                if ((!(item.maker))&&(metaBook.user))
                    item.maker=(metaBook.user);
                var addTags=metaBook.addTags;
                var addTag2Cloud=metaBook.addTag2Cloud;
                var empty_cloud=metaBook.empty_cloud;
                var maker=(item.maker)&&(metaBook.sourcedb.ref(item.maker));
                if (item.links) {
                    var links=item.links; for (var link in links) {
                        if ((links.hasOwnProperty(link))&&
                            (cachelink.exec(link)))
                            metaBook.cacheGlossData(link);}}
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
                        if ((make_cue)&&(entry)) addClass(entry,"cue");
                        taglist.appendChild(knodeToOption(each_tag));}
                    var tag_slots=["tags","*tags","**tags"];
                    var s=0, n_slots=tag_slots.length; while (s<n_slots) {
                        var tagslot=tag_slots[s++], tags=item[tagslot];
                        if ((tags)&&(tags.length)) {
                            var fragslot="+"+tagslot;
                            if (item.thread) {
                                addTags(item.thread,tags,fragslot);
                                if (item.replyto!==item.thread)
                                    addTags(item.replyto,tags,fragslot);}
                            if (info) addTags(
                                info,tags,fragslot,maker_knodule);}}}},
                           "initgloss");
            if ((metaBook.user)&&(mB.persist)&&(metaBook.cacheglosses)) {
                if (mB.useidb)
                    getDB(function(db){glossdb.storage=db;});
                else glossdb.storage=localStorage;}}
        
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
        
        var sourcedbname="sources@"+metaBook.refuri;
        var sourcedb=metaBook.sourcedb=new RefDB(sourcedbname);{
            sourcedb.absrefs=true;
            sourcedb.dbname="sources";
            sourcedb.oidrefs=true;
            sourcedb.addAlias("@1961/");
            sourcedb.addAlias(":@1961/");            
            sourcedb.forDOM=function(source){
                var spec="span.source"+((source.kind)?".":"")+
                    ((source.kind)?(source.kind.slice(1).toLowerCase()):"");
                var name=source.name||source.oid||source.uuid||source.uuid;
                var span=fdjtDOM(spec,name);
                if (source.about) span.title=source.about;
                return span;};}

        metaBook.queued=
            ((metaBook.cacheglosses)&&
             (getLocal("mB.queued("+metaBook.refuri+")",true)))||[];

        function setCacheGlosses(value){
            var saveprops=metaBook.saveprops, uri=metaBook.docuri;
            if (value) {
                if (metaBook.user) {
                    if (mB.useidb) getDB(function(db){
                        metaBook.sourcedb.storage=db;
                        metaBook.glossdb.storage=db;});
                    else {
                        var storage=((mB.persist)?(window.localStorage):
                                     (window.sessionStorage));
                        if (!(metaBook.sourcedb.storage))
                            metaBook.sourcedb.storage=storage;
                        if (!metaBook.glossdb.storage)
                            metaBook.glossdb.storage=storage;}
                    var props=metaBook.saveprops, i=0, lim=props.length;
                    while (i<lim) {
                        var prop=saveprops[i++];
                        if (metaBook[prop]) saveLocal(
                            "mB."+prop+"("+uri+")",metaBook[prop],true);}
                    metaBook.glossdb.save(true);
                    metaBook.sourcedb.save(true);
                    if ((metaBook.queued)&&(metaBook.queued.length)) 
                        metaBook.queued=metaBook.queued.concat(
                            getLocal("mB.queued("+uri+")",true)||[]);
                    else metaBook.queued=
                        getLocal("mB.queued("+uri+")",true)||[];}
                metaBook.cacheglosses=true;}
            else {
                clearOffline(metaBook.docuri);
                if (uri) fdjtState.dropLocal("mB.queued("+uri+")");
                metaBook.queued=[];
                metaBook.cacheglosses=false;}}
        metaBook.setCacheGlosses=setCacheGlosses;
        
        /* Setting persistence */

        function setPersist(){
            metaBook.persist=true;
            var refuri=mB.refuri, docuri=mB.docuri;
            // We also initialize .refuris/.docuris
            var refuris=readLocal("mB.refuris",true);
            var docuris=readLocal("mB.docuris",true);
            if (!(refuris))
                saveLocal("mB.refuris",[refuri],true);
            else if (refuris.indexOf(refuri)<0) {
                refuris.push(refuri);
                saveLocal("mB.refuris",refuris,true);}
            else {}
            if (!(docuris))
                saveLocal("mB.docuris",[docuri],true);
            else if (docuris.indexOf(docuri)<0) {
                docuris.push(docuri);
                saveLocal("mB.docuris",docuris,true);}
            else {}
            if (mB.sourceid)
                saveLocal("mB.sourceid("+docuri+")",mB.sourceid);}
        metaBook.setPersist=setPersist;

        /* Clearing offline data */

        function clearOffline(uri){
            var dropLocal=fdjtState.dropLocal;
            if (!(uri)) {
                var books=readLocal("mB.docuris",true);
                if (books) {
                    var i=0, lim=books.length;
                    while (i<lim) clearOffline(books[i++]);}
                dropLocal("mB.user");
                dropLocal("mB.docuris");
                // We clear layouts, because they might
                //  contain personalized information
                fdjt.CodexLayout.clearLayouts();
                fdjtState.clearLocal();
                fdjtState.clearSession();}
            else {
                if (typeof uri !== "string") uri=metaBook.docuri;
                var sourceid=getLocal("mB.sourceid("+uri+")");
                if (sourceid) metaBook.clearLayouts(sourceid);
                metaBook.sync=false;
                clearLocal("mB.sources("+uri+")");
                clearLocal("mB.outlets("+uri+")");
                clearLocal("mB.layers("+uri+")");
                clearLocal("mB.etc("+uri+")");
                clearLocal("mB.sync("+uri+")");
                // We don't currently clear sources when doing book
                // specific clearing because they might be shared
                // between books.  This is a bug.
                metaBook.glossdb.clearOffline(function(){
                    clearLocal("mB.sync("+uri+")");});
                metaBook.clearGlossData(uri);}}
        metaBook.clearOffline=clearOffline;
        
        function refreshOffline(){
            var uri=metaBook.docuri;
            metaBook.sync=false;
            clearLocal("mB.sources("+uri+")");
            clearLocal("mB.outlets("+uri+")");
            clearLocal("mB.layers("+uri+")");
            clearLocal("mB.etc("+uri+")");
            // We don't currently clear sources when doing book
            // specific clearing because they might be shared
            // between books
            metaBook.glossdb.clearOffline(function(){
                clearLocal("mB.sync("+uri+")");
                setTimeout(metaBook.updateInfo,25);});}
        metaBook.refreshOffline=refreshOffline;

        Query.prototype.dbs=[metaBook.glossdb,metaBook.docdb];
        Query.prototype.weights={
            "+tags": 8,"tags": 4,"+tags*": 2,"tags*": 2,"^+tags": 2,
            "strings": 1,"head": 2,"heads": 1};
        Query.prototype.uniqueids=true;
        metaBook.query=metaBook.empty_query=new Query([]);

        if (Trace.start>1) fdjtLog("Initialized DB");}
    metaBook.initDB=initDB;

    /* Queries */

    function Query(tags,base_query){
        if (!(this instanceof Query))
            return new Query(tags,base_query);
        else if (arguments.length===0) return this;
        else {
            var query=Knodule.TagQuery.call(this,tags);
            if (Trace.search) query.log={};
            return query;}}
    Query.prototype=new Knodule.TagQuery();
    metaBook.Query=Query;

    function reduce_tags(query){
        var cotags=query.getCoTags();
        var tagfreqs=query.tagfreqs, n=query.results.length;
        var termindex=metaBook.textindex.termindex;
        var global_n=metaBook.textindex.allids.length;
        var i=0, lim=cotags.length, results=[];
        while (i<lim) {
            var t=cotags[i++]; 
            if (typeof t !== "string") results.push(t);
            else {
                var f=tagfreqs.getItem(t);
                if ((f>0.9*n)||(f<3)||((f/n)<0.1)) continue;
                var gl=termindex[t], gf=((gl)?(gl.length):(0));
                if (gf===0) results.push(t);
                if (gf/global_n>0.4) continue;
                if ((f/n)>(5*(gf/global_n))) {
                    results.push(t);}}}
        return results;}
    metaBook.Query.prototype.getRefiners=function getRefiners(){
        if (this._refiners) return this._refiners;
        else {
            var r=reduce_tags(this);
            this._refiners=r;
            return r;}};

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
                    ((metaBook.skimpoint)?("(skimming)"):""),metaBook.mode,
                    metaBook.target,metaBook.head,metaBook.skimpoint);
        else fdjtLog(trace2,handler,cxt,
                     ((metaBook.skimpoint)?("(skimming)"):""),metaBook.mode,
                     metaBook.target,metaBook.head,metaBook.skimpoint);}
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
    var mbicon=metaBook.icon;

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
    /*
    if ((!(fdjt.device.standalone))&&(fdjt.device.mobilesafari))
        fdjt.addInit(setupKludgeTimer,"setupKludgeTimer");
    */
    
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
             replace(/\n\n+/g," // ").
             replace(/\n/g," ").
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
            if (passages.length) passages=[].concat(passages);
            if ((passages)&&(passages.length))
                knoduleAddTags(passages,tags,docdb,tagdb,
                               "^"+slotid,metaBook.tagscores);
            var subheads=docdb.find('heads',node);
            if (subheads.length) subheads=[].concat(subheads);
            if ((subheads)&&(subheads.length))
                addTags(subheads,tags,"^"+slotid,tagdb);}}
    metaBook.addTags=addTags;
    
    // Assert whether we're connected and update body classes
    //  to reflect the state. Also, run run any delayed thunks
    //  queued for connection.
    function setConnected(val){
        var root=document.documentElement||document.body;
        if ((val)&&(!(metaBook.connected))) {
            var onconnect=metaBook._onconnect;
            metaBook._onconnect=false;
            if ((onconnect)&&(onconnect.length)) {
                var i=0; var lim=onconnect.length;
                while (i<lim) (onconnect[i++])();}
            if (fdjtState.getLocal("mB.queued("+metaBook.refuri+")"))
                metaBook.writeQueuedGlosses();}
        if (((val)&&(!(metaBook.connected)))||
            ((!(val))&&(metaBook.connected)))
            fdjtDOM.swapClass(root,/\b(_|cx)(CONN|DISCONN)\b/,
                              ((val)?("_CONN"):("_DISCONN")));
        metaBook.connected=val;
    } metaBook.setConnected=setConnected;


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
    
    function getCoverPage(){
        if (metaBook.coverpage) return metaBook.coverpage;
        var coverpage=$ID("METABOOKCOVERPAGE")||
            $ID("SBOOKCOVERPAGE")||
            $ID("COVERPAGE");
        if (coverpage) metaBook.coverpage=coverpage;
        return coverpage;}
    metaBook.getCoverPage=getCoverPage;

    var fillIn=fdjtString.fillIn;
    var expand=fdjtString.expandEntities;
    function fixStaticRefs(string){
        return fillIn(expand(string).replace(
                /http(s)?:\/\/static.beingmeta.com\//g,metaBook.root),
                      {bmg: metaBook.root+"g/",
                       coverimage: metaBook.coverimage});}
    metaBook.fixStaticRefs=fixStaticRefs;
    
    fdjtString.entities.beingmeta=
        "<span class='beingmeta'>being<span class='bmm'>m<span class='bme'>e<span class='bmt'>t<span class='bma'>a</span></span></span></span></span>";
    fdjtString.entities.sBooks="<span class='sbooks'><em>s</em>Books</span>";
    fdjtString.entities.sBook="<span class='sbooks'><em>s</em>Book</span>";
    fdjtString.entities.metaBook=
        "<span class='metabook'><span class='bmm'>m<span class='bme'>e<span class='bmt'>t<span class='bma'>a</span></span></span></span>Book<sub>β</sub></span>";
    fdjtString.entities.metaBook=
        "<span class='metabook'><span class='bmm'>m<span class='bme'>e<span class='bmt'>t<span class='bma'>a</span></span></span></span>Book</span>";

    function urlType(url){
        if (url.search(/\.(jpg|jpeg)$/g)>0) return "image/jpeg";
        else if (url.search(/\.png$/g)>0) return "image/png";
        else if (url.search(/\.gif$/g)>0) return "image/gif";
        else if (url.search(/\.wav$/g)>0) return "audio/wav";
        else if (url.search(/\.ogg$/g)>0) return "audio/ogg";
        else if (url.search(/\.mp3$/g)>0) return "audio/mpeg";
        else if (url.search(/\.mp4$/g)>0) return "video/mp4";
        else return false;}
    metaBook.urlType=urlType;
    function typeIcon(type,w){
        if (!(w)) w=64;
        if (!(type)) return mbicon("diaglink",w,w);
        else if (type==="audio/mpeg") 
            return mbicon("music",w,w);
        else if (type.slice(0,6)==="image/") 
            return mbicon("photo",w,w);
        else if (type.slice(0,6)==="audio/")
            return mbicon("sound",w,w);
        else return mbicon("diaglink",w,w);}
    metaBook.typeIcon=typeIcon;
    function mediaTypeClass(type){
        if (!(type)) return false;
        else if (type==="audio/mpeg")
            return "musiclink";
        else if (type.slice(0,6)==="image/") 
            return "imagelink";
        else if (type.slice(0,6)==="audio/")
            return "audiolink";
        else return false;}
    metaBook.mediaTypeClass=mediaTypeClass;

})();

fdjt.DOM.noautofontadjust=true;


/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  indent-tabs-mode: nil ***
   ;;;  End: ***
*/
