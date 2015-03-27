/* -*- Mode: Javascript; Character-encoding: utf-8; -*- */

/* ###################### metabook/glossdata.js ###################### */

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
        var cached=getLocal("mB.glossdata("+mB.docuri+")",true);
        var i=0, len=cached.length; while (i<len) 
            glossdata_state[cached[i++]]="cached";}
    metaBook.setupGlossData=setupGlossData;

    function cacheGlossData(uri){
        function caching(resolved){
            if (uri.search("https://glossdata.sbooks.net/")!==0) return;
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
                endpoint="https://glossdata.sbooks.net/U/"+
                    uri.slice("https://glossdata.sbooks.net/".length);
                rtype="";}
            else {endpoint=uri; rtype="blob";}
            // We provide credentials in the query string because we
            //  need to have .withCredentials be false to avoid some
            //  CORS-related errors on redirects to sites like S3.
            if (fdjt.State.getCookie("SBOOKS:AUTH")) 
                endpoint=endpoint+"?SBOOKS:AUTH="+
                encodeURIComponent(fdjt.State.getCookie("SBOOKS:AUTH"));
            else if (fdjt.State.getCookie("SBOOKS:AUTH-"))
                endpoint=endpoint+"?SBOOKS:AUTH-="+
                encodeURIComponent(fdjt.State.getCookie("SBOOKS:AUTH-"));
            else {}
            if (Trace.glossdata)
                fdjtLog("Fetching glossdata %s (%s) to cache locally",uri,rtype);
            req.onreadystatechange=function () {
                if ((req.readyState === 4)&&(req.status === 200)) try {
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
                    glossdata_state[uri]=false;}};
            req.open("GET",endpoint);
            req.responseType=rtype;
            // req.withCredentials=true;
            req.send(null);}
        return new Promise(caching);}
    metaBook.cacheGlossData=cacheGlossData;

    function getGlossData(uri){
        function getting(resolved){
            if (glossdata[uri]) resolved(glossdata[uri]);
            else if (glossdata_state[uri]==="cached")  {
                metaBook.getDB().then(function(db){
                    var txn=db.transaction(["glossdata"],"readwrite");
                    var storage=txn.objectStore("glossdata");
                    var req=storage.get(uri);
                    req.onsuccess=function(event){
                        var object=event.target.result;
                        gotLocalURL(uri,object.datauri,resolved);};
                    req.onerror=function(ex){
                        fdjtLog("Error getting %s from glossdata cache: %s",
                                uri,ex);
                        glossdata_state[uri]=false;
                        setTimeout(function(){cacheGlossData(uri);},2000);};});}
            else cacheGlossData(uri).then(resolved);}
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
        var key="mB.glossdata("+url+")";
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
        pushLocal("mB.glossdata("+mB.docuri+")",url);}

    function clearGlossData(url){
        var key="mB.glossdata("+url+")", urls=getLocal(key,true);
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
