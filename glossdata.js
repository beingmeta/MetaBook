/* -*- Mode: Javascript; Character-encoding: utf-8; -*- */

/* ###################### metabook/glossdata.js ###################### */

/* Copyright (C) 2009-2017 beingmeta, inc.
   This file implements a Javascript/DHTML web application for reading
   large structured documents.

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

// config.js
(function(){
    "use strict";
    var fdjtLog=fdjt.Log, fdjtState=fdjt.State;
    var setLocal=fdjtState.setLocal, getLocal=fdjtState.getLocal;
    var dropLocal=fdjtState.dropLocal;
    var pushLocal=fdjtState.pushLocal, removeLocal=fdjtState.removeLocal;

    var mB=metaBook, Trace=metaBook.Trace;
    
    /* Noting (and caching) glossdata */

    var glossdata=metaBook.glossdata, glossdata_state={};
    var glossdata_waiting={};
    var createObjectURL=
        ((window.URL)&&(window.URL.createObjectURL))||
        ((window.webkitURL)&&(window.webkitURL.createObjectURL));
    var Blob=window.Blob;

    function setupGlossData(){
        var cached=getLocal("mB("+mB.docid+").glossdata",true);
        var i=0, len=cached.length; while (i<len) 
            glossdata_state[cached[i++]]="cached";}
    metaBook.setupGlossData=setupGlossData;

    function cacheGlossData(uri){
        function caching(resolved,rejected){
            if (uri.search(mB.cachelink)!==0) return;
            if (glossdata[uri]) return resolved(glossdata[uri]);
            if (glossdata_state[uri]==="cached") return;
            else if (glossdata_state[uri]) {
                if (glossdata_waiting[uri])
                    glossdata_waiting[uri].push(resolved);
                else glossdata_waiting[uri]=[resolved];
                return;}
            else glossdata_state[uri]="fetching";
            var req=new XMLHttpRequest(), endpoint, rtype;
            if ((!(Blob))||(!(createObjectURL))) {
                // This endpoint returns a datauri as text
                endpoint="https://glossdata.bookhub.io/U/"+
                    uri.slice("https://glossdata.bookhub.io/".length);
                rtype="";}
            else {endpoint=uri; rtype="blob";}
            // We provide credentials in the query string because we
            //  need to have .withCredentials be false to avoid some
            //  CORS-related errors on redirects to sites like S3.
            var mycopyid=mB.mycopyid;
            if (mycopyid) {
                endpoint=endpoint+"?MYCOPYID="+encodeURIComponent(mycopyid)+
                    "&DOC="+encodeURIComponent(mB.docref);}
            if (Trace.glossdata) {
                fdjtLog("Fetching glossdata %s (%s) to cache locally",uri,rtype);}
            req.onreadystatechange=function () {
                if ((req.readyState === 4)&&(req.status === 200)) {
                    try {
                        var local_uri=false, data_uri=false;
                        if (Trace.glossdata)
                            fdjtLog("Glossdata from %s (%s) status %d",
                                    endpoint,rtype||"any",req.status);
                        if (rtype!=="blob")
                            data_uri=local_uri=req.responseText;
                        else if (createObjectURL) 
                            local_uri=createObjectURL(req.response);
                        else local_uri=false;
                        if (local_uri) gotLocalURL(uri,local_uri,resolved);
                        if (data_uri) {
                            glossdata_state[uri]="caching";
                            cacheDataURI(uri,data_uri);}
                        else {
                            // Need to get a data uri
                            var reader=new FileReader(req.response);
                            glossdata_state[uri]="reading";
                            reader.onload=function(){
                                try {
                                    if (!(local_uri))
                                        gotLocalURL(uri,reader.result,resolved);
                                    glossdata_state[uri]="caching";
                                    cacheDataURI(uri,reader.result);}
                                catch (ex) {
                                    fdjtLog.warn("Error encoding %s from %s: %s",
                                                 uri,endpoint,ex);
                                    glossdata_state[uri]=false;}};
                            reader.readAsDataURL(req.response);}}
                    catch (ex) {
                        fdjtLog.warn("Error fetching %s via %s: %s",uri,endpoint,ex);
                        glossdata_state[uri]=false;
                        if (rejected) rejected(ex);}}
                else if (req.readyState === 4) {
                    fdjtLog.warn("Error (%d) fetching %s via %s",
                                 req.status,uri,endpoint);
                    glossdata_state[uri]=false;
                    if (rejected) rejected(req);}};
            req.open("GET",endpoint);
            req.responseType=rtype;
            // req.withCredentials=true;
            req.send(null);}
        return new Promise(caching);}

    var glossdata_wait=60000;
    var glossdata_timer=false;
    var need_glossdata=[];

    function needGlossData(uri){
        if ((glossdata[uri])||(glossdata_state[uri]==="cached")) return;
        if (!(navigator.onLine)) {
            if (need_glossdata.length===0) 
                fdjt.DOM.addListener(window,"online",load_glossdata);
            if (need_glossdata.indexOf(uri)<0) need_glossdata.push(uri);
            return;}
        if ((mB.mycopyid)&&(mB.mycopyid_expires<(new Date())))
            return cacheGlossData(uri).catch(function(){delay_glossdata(uri);});
        else {
            var req=mB.getMyCopyId();
            return req.then(function(mycopyid){
                if (mycopyid)
                    return cacheGlossData(uri).catch(function(trouble){
                        fdjtLog("Couldn't cache %s: %o",uri,trouble);
                        delay_glossdata(uri);});
                else delay_glossdata(uri);})
                .catch(function(){delay_glossdata(uri);});}}
    metaBook.needGlossData=needGlossData;
    
    function delay_glossdata(uri){
        need_glossdata.push(uri);
        if (!(glossdata_timer))
            glossdata_timer=setTimeout(load_glossdata,glossdata_wait);}

    function load_glossdata(){
        if ((navigator.onLine)&&(need_glossdata.length)) {
            if (glossdata_timer) {
                clearTimeout(glossdata_timer); glossdata_timer=false;}
            var needed=need_glossdata; need_glossdata=[];
            var i=0, lim=needed.length; while (i<lim) {
                needGlossData(needed[i++]);}}}

    function getGlossData(uri){
        function getting(resolved,failed){
            if (glossdata[uri]) resolved(glossdata[uri]);
            else if (glossdata_state[uri]==="cached")  {
                return metaBook.getDB().then(function(db){
                    var txn=db.transaction(["glossdata"],"readwrite");
                    var storage=txn.objectStore("glossdata");
                    var req=storage.get(uri);
                    req.onsuccess=function(event){
                        var object=event.target.result;
                        if (object)
                            gotLocalURL(uri,object.datauri,resolved);
                        else {
                            fdjtLog("Corrupted local glossdata cache for %s",uri);
                            glossdata_state[uri]=false;
                            return fillCache(resolved,failed);}};
                    req.onerror=function(ex){
                        fdjtLog("Error getting %s from glossdata cache: %s",
                                uri,ex);
                        glossdata_state[uri]=false;
                        return fillCache(resolved,failed);};})
                    .catch(failed);}
            else return fillCache(resolved,failed);}
        function fillCache(resolved,failed){
            if ((mB.mycopyid)&&(mB.mycopyid_expires<(new Date())))
                setTimeout(function(){
                    cacheGlossData(uri).then(resolved).catch(failed);},
                           2000);
            else mB.getMyCopyId().then(function(mycopyid){
                if (mycopyid)
                    setTimeout(function(){
                        cacheGlossData(uri).then(resolved).catch(failed);},
                               2000);
                else failed(new Error("Couldn't get MYCOPYID"));})
                .catch(failed);}
        return new Promise(getting);}
    metaBook.getGlossData=getGlossData;

    function gotLocalURL(uri,local_url,resolved){
        var i, lim;
        var waiting_elts=mB.srcloading[uri], waiting=glossdata_waiting[uri];
        mB.srcloading[uri]=false; glossdata_waiting[uri]=false;
        glossdata[uri]=local_url;
        if (resolved) resolved(local_url);
        if (waiting_elts) {
            i=0; lim=waiting_elts.length;
            if (Trace.glossdata)
                fdjtLog("Setting glossdata src for %d element(s)",lim);
            while (i<lim) waiting_elts[i++].src=local_url;}
        if (waiting) {
            i=0; lim=waiting.length;
            while (i<lim) waiting[i++](local_url);
            mB.srcloading[uri]=false;}}

    function cacheDataURI(url,datauri){
        var key="gD("+url+").glossdata";
        metaBook.getDB().then(function(db){
            var txn=db.transaction(["glossdata"],"readwrite");
            var storage=txn.objectStore("glossdata");
            var req=storage.put({url: url,datauri: datauri});
            var completed=false;
            req.onerror=function(event){
                glossdata_state[url]=false; completed=true;
                fdjtLog("Error saving %s in indexedDB: %o",
                        url,event.target.errorCode);};
            req.onsuccess=function(){
                glossdata_state[url]="cached"; completed=true;
                if (Trace.glossdata)
                    fdjtLog("Saved glossdata for %s in IndexedDB",url);
                glossDataSaved(url);};
            if ((req.status==="done")&&(!(completed))) req.onsuccess();})
            .catch(function(){setLocal(key,datauri);});}

    function glossDataSaved(url){
        if (Trace.glossdata) fdjtLog("GlossData cached for %s",url);
        pushLocal("mB("+mB.docid+").glossdata",url);}

    function clearGlossData(docid){
        var key="mB("+docid+").glossdata", urls=getLocal(key,true);
        if ((urls)&&(urls.length)) {
            clearGlossDataCache(urls,key);}
        else dropLocal(key);}
    metaBook.clearGlossData=clearGlossData;

    function clearGlossDataCache(urls,key){
        function clearing(resolve){
            metaBook.getDB().then(function(db){
                var txn=db.transaction(["glossdata"],"readwrite");
                var storage=txn.objectStore("glossdata");
                storage.openCursor().onsuccess=function(event){
                    var cursor=event.target.result;
                    if (cursor) {
                        if (urls.indexOf(cursor.key)>=0) {
                            var req=cursor['delete']();
                            req.onsuccess=function(){
                                removeLocal(key,cursor.key);
                                cursor['continue']();};
                            req.onerror=function(){cursor['continue']();};}
                        else cursor['continue']();}
                    else resolve();};});}
        return new Promise(clearing);}

})();

/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  indent-tabs-mode: nil ***
   ;;;  End: ***
*/
